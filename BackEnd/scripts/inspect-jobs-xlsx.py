"""Read-only XLSX inspection using only the Python standard library.

This intentionally avoids changing the source workbook. It is used to validate
the jobs workbook before any database import is prepared or executed.
"""

from __future__ import annotations

import argparse
import json
import re
import statistics
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path, PurePosixPath
from typing import Any
from zipfile import ZipFile


MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
DOC_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
NS = {"x": MAIN_NS, "r": DOC_REL_NS, "p": PKG_REL_NS}


def column_index(reference: str) -> int:
    letters = re.match(r"[A-Z]+", reference.upper())
    if not letters:
        return 0
    result = 0
    for char in letters.group(0):
        result = (result * 26) + (ord(char) - 64)
    return result - 1


def parse_number(value: str) -> int | float | str:
    if re.fullmatch(r"[-+]?\d+", value):
        try:
            return int(value)
        except ValueError:
            return value
    if re.fullmatch(r"[-+]?(?:\d+\.\d*|\d*\.\d+)(?:[Ee][-+]?\d+)?", value):
        try:
            return float(value)
        except ValueError:
            return value
    return value


def shared_strings(archive: ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in archive.namelist():
        return []
    root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    return ["".join(node.text or "" for node in item.findall(".//x:t", NS)) for item in root.findall("x:si", NS)]


def worksheet_paths(archive: ZipFile) -> list[tuple[str, str]]:
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    targets = {
        rel.attrib["Id"]: rel.attrib["Target"]
        for rel in relationships.findall("p:Relationship", NS)
    }
    result: list[tuple[str, str]] = []
    for sheet in workbook.findall("x:sheets/x:sheet", NS):
        name = sheet.attrib.get("name", "Sheet")
        relationship_id = sheet.attrib.get(f"{{{DOC_REL_NS}}}id", "")
        target = targets.get(relationship_id, "")
        normalized = str(PurePosixPath("xl") / target).replace("xl/../", "")
        result.append((name, normalized))
    return result


def cell_value(cell: ET.Element, strings: list[str]) -> Any:
    cell_type = cell.attrib.get("t")
    if cell_type == "inlineStr":
        return "".join(node.text or "" for node in cell.findall(".//x:t", NS)).strip()
    value_node = cell.find("x:v", NS)
    if value_node is None or value_node.text is None:
        return None
    raw = value_node.text
    if cell_type == "s":
        index = int(raw)
        return strings[index] if 0 <= index < len(strings) else raw
    if cell_type == "b":
        return raw == "1"
    if cell_type in {"str", "d", "e"}:
        return raw.strip()
    return parse_number(raw)


def read_sheet(archive: ZipFile, path: str, strings: list[str]) -> list[list[Any]]:
    root = ET.fromstring(archive.read(path))
    rows: list[list[Any]] = []
    for row in root.findall("x:sheetData/x:row", NS):
        values: dict[int, Any] = {}
        for cell in row.findall("x:c", NS):
            reference = cell.attrib.get("r", "A1")
            values[column_index(reference)] = cell_value(cell, strings)
        if values:
            width = max(values) + 1
            rows.append([values.get(index) for index in range(width)])
        else:
            rows.append([])
    max_width = max((len(row) for row in rows), default=0)
    return [row + [None] * (max_width - len(row)) for row in rows]


def meaningful(value: Any) -> bool:
    return value is not None and (not isinstance(value, str) or bool(value.strip()))


def compact(value: Any, max_chars: int = 140) -> Any:
    if not isinstance(value, str) or len(value) <= max_chars:
        return value
    return f"{value[: max_chars - 1]}…"


def header_row_index(rows: list[list[Any]]) -> int:
    for index, row in enumerate(rows[:25]):
        populated = [value for value in row if meaningful(value)]
        if len(populated) >= 2 and sum(isinstance(value, str) for value in populated) >= 2:
            return index
    return 0


def normalize_header(value: Any, index: int) -> str:
    text = str(value).strip() if meaningful(value) else ""
    return text or f"Column_{index + 1}"


def analyze_sheet(name: str, rows: list[list[Any]]) -> dict[str, Any]:
    header_index = header_row_index(rows)
    headers = [normalize_header(value, index) for index, value in enumerate(rows[header_index] if rows else [])]
    data_rows = [row for row in rows[header_index + 1 :] if any(meaningful(value) for value in row)]
    columns: list[dict[str, Any]] = []

    for column_index_value, header in enumerate(headers):
        values = [row[column_index_value] if column_index_value < len(row) else None for row in data_rows]
        populated = [value for value in values if meaningful(value)]
        normalized = [str(value).strip().casefold() for value in populated]
        duplicate_values = sum(count - 1 for count in Counter(normalized).values() if count > 1)
        string_lengths = [len(str(value)) for value in populated]
        type_counts = Counter(type(value).__name__ for value in populated)
        columns.append(
            {
                "index": column_index_value + 1,
                "header": header,
                "populated": len(populated),
                "blank": len(values) - len(populated),
                "duplicates": duplicate_values,
                "types": dict(type_counts),
                "maxLength": max(string_lengths, default=0),
                "medianLength": statistics.median(string_lengths) if string_lengths else 0,
                "samples": [compact(value) for value in populated[:5]],
            }
        )

    preview = [
        {header: compact(value) for header, value in zip(headers, row)}
        for row in data_rows[:5]
    ]
    return {
        "name": name,
        "physicalRows": len(rows),
        "headerRow": header_index + 1,
        "headers": headers,
        "dataRows": len(data_rows),
        "columns": columns,
        "preview": preview,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("workbook", type=Path)
    parser.add_argument("--dump-sheet", help="Write all rows for one sheet as JSON")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    with ZipFile(args.workbook) as archive:
        strings = shared_strings(archive)
        sheets = []
        selected_rows: list[list[Any]] | None = None
        selected_name: str | None = None
        for name, path in worksheet_paths(archive):
            rows = read_sheet(archive, path, strings)
            sheets.append(analyze_sheet(name, rows))
            if args.dump_sheet and name.casefold() == args.dump_sheet.casefold():
                selected_rows = rows
                selected_name = name

    if args.dump_sheet:
        if selected_rows is None:
            raise SystemExit(f"Sheet not found: {args.dump_sheet}")
        header_index = header_row_index(selected_rows)
        headers = [normalize_header(value, index) for index, value in enumerate(selected_rows[header_index])]
        data = [
            dict(zip(headers, row))
            for row in selected_rows[header_index + 1 :]
            if any(meaningful(value) for value in row)
        ]
        payload: dict[str, Any] = {"sheet": selected_name, "headers": headers, "rows": data}
    else:
        payload = {"workbook": str(args.workbook), "sheets": sheets}

    serialized = json.dumps(payload, ensure_ascii=False, indent=2, default=str)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(serialized, encoding="utf-8")
        print(json.dumps({"output": str(args.output), "bytes": len(serialized.encode("utf-8"))}))
    else:
        print(serialized)


if __name__ == "__main__":
    main()
