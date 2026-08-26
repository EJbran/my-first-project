"use strict";

require("dotenv").config();

const { QueryTypes } = require("sequelize");
const { sequelize } = require("../src/config/database");

const quoteIdentifier = (identifier) => `[${String(identifier).replace(/]/g, "]]")}]`;

const findColumn = (columns, candidates) => {
  const lookup = new Map(
    columns.map((column) => [String(column.columnName).toLowerCase(), column])
  );
  for (const candidate of candidates) {
    const match = lookup.get(candidate.toLowerCase());
    if (match) return match;
  }
  return undefined;
};

const toNumbers = (row) => Object.fromEntries(
  Object.entries(row || {}).map(([key, value]) => [key, Number(value)])
);

async function main() {
  const columns = await sequelize.query(
    `
      SELECT
        CASE
          WHEN columnMetadata.[object_id] = OBJECT_ID(N'dbo.Vacation', N'U')
            THEN N'Vacation'
          ELSE N'TimeSheetCode'
        END AS [tableName],
        columnMetadata.[column_id] AS [ordinal],
        columnMetadata.[name] AS [columnName],
        TYPE_NAME(columnMetadata.[user_type_id]) AS [dataType]
      FROM sys.columns AS columnMetadata
      WHERE columnMetadata.[object_id] IN (
        OBJECT_ID(N'dbo.Vacation', N'U'),
        OBJECT_ID(N'dbo.TimeSheetCode', N'U')
      )
      ORDER BY
        CASE
          WHEN columnMetadata.[object_id] = OBJECT_ID(N'dbo.Vacation', N'U')
            THEN 1
          ELSE 2
        END,
        columnMetadata.[column_id];
    `,
    { type: QueryTypes.SELECT, raw: true }
  );

  const vacationColumns = columns.filter((column) => column.tableName === "Vacation");
  const timeSheetCodeColumns = columns.filter(
    (column) => column.tableName === "TimeSheetCode"
  );
  if (vacationColumns.length === 0) {
    throw new Error("dbo.Vacation was not found or its metadata is not visible.");
  }

  const employeeReferenceColumn = findColumn(vacationColumns, [
    "Ref_Employee",
    "ID_Employee",
    "EmployeeId",
    "Employee_ID",
    "EmployeeNumber",
    "Employee_No"
  ]);
  if (!employeeReferenceColumn) {
    throw new Error("dbo.Vacation has no recognized employee-number column.");
  }

  const vacationCodeColumn = findColumn(vacationColumns, [
    "Id_CodeTimeSheet",
    "ID_CodeTimeSheet",
    "CodeTimeSheetId",
    "TimeSheetCodeId",
    "TimeSheetCode_ID",
    "Ref_CodeTimeSheet"
  ]);
  const timeSheetCodeIdColumn = findColumn(timeSheetCodeColumns, [
    vacationCodeColumn?.columnName,
    "Id",
    "ID",
    "Id_CodeTimeSheet",
    "ID_CodeTimeSheet",
    "CodeTimeSheetId",
    "TimeSheetCodeId",
    "TimeSheetCode_ID",
    "CodeId",
    "Ref_CodeTimeSheet"
  ].filter(Boolean));

  const employeeReference = `vacation.${quoteIdentifier(employeeReferenceColumn.columnName)}`;
  const linkageRows = await sequelize.query(
    `
      SELECT
        (SELECT COUNT_BIG(*) FROM [dbo].[Vacation]) AS [vacationRows],
        (
          SELECT COUNT_BIG(*)
          FROM [dbo].[Vacation] AS vacation
          WHERE EXISTS (
            SELECT 1
            FROM [dbo].[Employee] AS employee
            WHERE LTRIM(RTRIM(TRY_CONVERT(nvarchar(4000), employee.[Ref_Employee])))
                    COLLATE DATABASE_DEFAULT
              = LTRIM(RTRIM(TRY_CONVERT(nvarchar(4000), ${employeeReference})))
                    COLLATE DATABASE_DEFAULT
          )
        ) AS [matchesEmployeeNumber],
        (
          SELECT COUNT_BIG(*)
          FROM [dbo].[Vacation] AS vacation
          WHERE EXISTS (
            SELECT 1
            FROM [dbo].[Employee] AS employee
            WHERE employee.[ID_Employee]
              = TRY_CONVERT(int, ${employeeReference})
          )
        ) AS [matchesInternalEmployeeId];
    `,
    { type: QueryTypes.SELECT, raw: true }
  );

  let codeLinkage = {
    vacationRowsWithTimeSheetCodeId: 0,
    matchingTimeSheetCodeRows: 0,
    unmatchedTimeSheetCodeRows: 0
  };
  if (vacationCodeColumn && timeSheetCodeIdColumn) {
    const vacationCodeReference =
      `vacation.${quoteIdentifier(vacationCodeColumn.columnName)}`;
    const lookupCodeReference =
      `timeSheetCode.${quoteIdentifier(timeSheetCodeIdColumn.columnName)}`;
    const codeRows = await sequelize.query(
      `
        SELECT
          SUM(CASE WHEN ${vacationCodeReference} IS NOT NULL THEN 1 ELSE 0 END)
            AS [vacationRowsWithTimeSheetCodeId],
          SUM(
            CASE
              WHEN ${vacationCodeReference} IS NOT NULL
                AND EXISTS (
                  SELECT 1
                  FROM [dbo].[TimeSheetCode] AS timeSheetCode
                  WHERE LTRIM(RTRIM(TRY_CONVERT(nvarchar(4000), ${lookupCodeReference})))
                          COLLATE DATABASE_DEFAULT
                    = LTRIM(RTRIM(TRY_CONVERT(nvarchar(4000), ${vacationCodeReference})))
                          COLLATE DATABASE_DEFAULT
                )
              THEN 1 ELSE 0
            END
          ) AS [matchingTimeSheetCodeRows],
          SUM(
            CASE
              WHEN ${vacationCodeReference} IS NOT NULL
                AND NOT EXISTS (
                  SELECT 1
                  FROM [dbo].[TimeSheetCode] AS timeSheetCode
                  WHERE LTRIM(RTRIM(TRY_CONVERT(nvarchar(4000), ${lookupCodeReference})))
                          COLLATE DATABASE_DEFAULT
                    = LTRIM(RTRIM(TRY_CONVERT(nvarchar(4000), ${vacationCodeReference})))
                          COLLATE DATABASE_DEFAULT
                )
              THEN 1 ELSE 0
            END
          ) AS [unmatchedTimeSheetCodeRows]
        FROM [dbo].[Vacation] AS vacation;
      `,
      { type: QueryTypes.SELECT, raw: true }
    );
    codeLinkage = toNumbers(codeRows[0]);
  }

  console.log(JSON.stringify({
    tables: {
      vacation: "dbo.Vacation",
      timeSheetCode: timeSheetCodeColumns.length > 0
        ? "dbo.TimeSheetCode"
        : null
    },
    columns: {
      vacation: vacationColumns,
      timeSheetCode: timeSheetCodeColumns
    },
    resolvedSchema: {
      employeeReferenceColumn: employeeReferenceColumn.columnName,
      vacationCodeReferenceColumn: vacationCodeColumn?.columnName ?? null,
      timeSheetCodeIdColumn: timeSheetCodeIdColumn?.columnName ?? null
    },
    employeeLinkage: toNumbers(linkageRows[0]),
    codeLinkage
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(
      "[vacation-inspect] Failed:",
      error instanceof Error ? error.message : error
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => undefined);
  });
