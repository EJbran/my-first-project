import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Breadcrumbs,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from "@mui/material";
import { DataGrid, type GridColDef, type GridRenderCellParams } from "@mui/x-data-grid";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { afesApi } from "../../../api/afes.api";
import { timeSheetCodesApi } from "../../../api/timeSheetCodes.api";
import { timesheetsApi } from "../../../api/timesheets.api";
import { BrandLogo } from "../../../components/BrandLogo";
import { DataGridToolbar } from "../../../components/DataGridToolbar";
import type { AFE } from "../../../types/afe.types";
import type { TimeSheetCode } from "../../../types/timeSheetCode.types";
import type {
  TimesheetDayCell,
  TimesheetDayHeader,
  TimesheetMonthRow
} from "../../../types/timesheet.types";
import { exportToExcel } from "../../../utils/exportExcel";

const SAVE_BATCH_SIZE = 50;
const CLEAR_CODE_VALUE = "__CLEAR__";
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const KEYBOARD_CODE_TIMEOUT_MS = 700;

const tableContainerSx = {
  bgcolor: "background.paper",
  borderRadius: 2,
  border: 1,
  borderColor: "divider",
  overflow: "hidden",
  "[data-toolpad-color-scheme='light'] &": {
    bgcolor: "#ffffff"
  }
};

const dataGridSx = {
  border: "none",
  bgcolor: "background.paper",
  width: "100%",
  userSelect: "none",
  "& .MuiDataGrid-main": {
    overflow: "hidden"
  },
  "& .MuiDataGrid-virtualScroller": {
    overflowX: "hidden !important"
  },
  "& .MuiDataGrid-columnHeaders, & .MuiDataGrid-footerContainer, & .MuiDataGrid-overlay": {
    bgcolor: "background.paper"
  },
  "& .MuiDataGrid-columnHeader": {
    justifyContent: "center",
    px: "2px !important"
  },
  "& .MuiDataGrid-columnHeaderTitleContainer": {
    justifyContent: "center",
    px: 0
  },
  "& .MuiDataGrid-cell": {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    py: 0.25,
    px: "2px !important"
  },
  "& .MuiDataGrid-cell--day": {
    minWidth: 0,
    cursor: "cell"
  },
  "& .timesheet-cell-selected": {
    bgcolor: "rgba(25, 118, 210, 0.18) !important",
    boxShadow: "inset 0 0 0 2px rgba(25, 118, 210, 0.85)"
  },
  "& .timesheet-cell-dirty": {
    bgcolor: "rgba(46, 125, 50, 0.08)"
  },
  "& .timesheet-cell-locked": {
    cursor: "not-allowed",
    opacity: 0.72
  },
  "[data-toolpad-color-scheme='light'] &": {
    bgcolor: "#ffffff",
    "& .MuiDataGrid-columnHeaders, & .MuiDataGrid-footerContainer, & .MuiDataGrid-overlay": {
      bgcolor: "#ffffff"
    }
  }
};

type TimesheetGridRow = TimesheetMonthRow & {
  id: string;
  dayMap: Record<number, TimesheetMonthRow["days"][number] | undefined>;
  dirty?: boolean;
};

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const cellKey = (rowId: string, dayIndex: number) => `${rowId}:${dayIndex}`;

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }

  return target.isContentEditable;
};

const normalizeTypedCode = (value: string): string => value.trim().toUpperCase();

const findCodeByTypedValue = (
  codesList: TimeSheetCode[],
  typed: string
): TimeSheetCode | null => {
  const normalized = normalizeTypedCode(typed);
  if (!normalized) {
    return null;
  }

  return (
    codesList.find((item) => normalizeTypedCode(item.Code || "") === normalized) || null
  );
};

const hasLongerCodePrefix = (codesList: TimeSheetCode[], typed: string): boolean => {
  const normalized = normalizeTypedCode(typed);
  if (!normalized) {
    return false;
  }

  return codesList.some((item) => {
    const code = normalizeTypedCode(item.Code || "");
    return code.length > normalized.length && code.startsWith(normalized);
  });
};

const codeChipColor = (
  source: string,
  isWeekendOrHoliday: boolean
): "default" | "error" | "warning" | "info" | "success" => {
  if (source === "vacation") return "info";
  if (source === "weekend" || source === "holiday" || isWeekendOrHoliday) return "error";
  if (source === "edited") return "warning";
  if (source === "saved") return "success";
  return "default";
};

type EditMode = "timesheetCode" | "afe";

export default function TimesheetsPage() {
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [hasRequestedData, setHasRequestedData] = useState(false);
  const [rows, setRows] = useState<TimesheetGridRow[]>([]);
  const [dayHeaders, setDayHeaders] = useState<TimesheetDayHeader[]>([]);
  const [periodLabel, setPeriodLabel] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingChanges, setSavingChanges] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [saveProgressOpen, setSaveProgressOpen] = useState(false);
  const [saveProcessed, setSaveProcessed] = useState(0);
  const [saveTotal, setSaveTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [codes, setCodes] = useState<TimeSheetCode[]>([]);
  const [afes, setAfes] = useState<AFE[]>([]);
  const [activeCodeId, setActiveCodeId] = useState<number | typeof CLEAR_CODE_VALUE | null>(null);
  const [editMode, setEditMode] = useState<EditMode>("timesheetCode");
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [typedBuffer, setTypedBuffer] = useState("");
  const [keyboardHint, setKeyboardHint] = useState<string | null>(null);
  const [activeAfeCell, setActiveAfeCell] = useState<{ rowId: string; dayIndex: number } | null>(null);
  const [selectedAfeId, setSelectedAfeId] = useState<number | "">("");

  const isDraggingRef = useRef(false);
  const activeCodeIdRef = useRef(activeCodeId);
  const codesRef = useRef(codes);
  const selectedCellsRef = useRef(selectedCells);
  const typedBufferRef = useRef("");
  const typedTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    activeCodeIdRef.current = activeCodeId;
  }, [activeCodeId]);

  useEffect(() => {
    codesRef.current = codes;
  }, [codes]);

  useEffect(() => {
    selectedCellsRef.current = selectedCells;
  }, [selectedCells]);

  const activeCodeValue = useMemo(() => {
    if (activeCodeId === CLEAR_CODE_VALUE) {
      return null;
    }
    if (activeCodeId == null) {
      return undefined;
    }
    const match = codes.find((item) => item.ID === activeCodeId);
    return match?.Code?.trim() || undefined;
  }, [activeCodeId, codes]);

  const dirtyCount = useMemo(
    () => rows.filter((row) => row.dirty && !row.IS_Approved).length,
    [rows]
  );

  const loadCodes = useCallback(async () => {
    try {
      const response = await timeSheetCodesApi.list({ pageSize: 500 });
      if (response.success) {
        setCodes(
          [...response.data].sort((a, b) =>
            String(a.Code || "").localeCompare(String(b.Code || ""))
          )
        );
      }
    } catch {
      // Keep timesheet grid usable even if codes fail to load.
    }
  }, []);

  const loadAfes = useCallback(async () => {
    try {
      const response = await afesApi.list({ page: 1, pageSize: 500 });
      if (response.success) {
        setAfes(
          [...response.data].sort((a, b) => Number(a.Id) - Number(b.Id))
        );
      }
    } catch {
      // Keep timesheet grid usable even if AFEs fail to load.
    }
  }, []);

  const loadTimesheets = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelectedCells(new Set());

    try {
      const response = await timesheetsApi.listByMonth({
        year,
        month,
        page: page + 1,
        pageSize,
        activeOnly: true,
        ...(search.trim() ? { search: search.trim() } : {})
      });

      if (!response.success) {
        setError(response.message || "Failed to load timesheets");
        setRows([]);
        setDayHeaders([]);
        setTotal(0);
        return;
      }

      setDayHeaders(response.period.dayHeaders);
      setPeriodLabel(`${response.period.start} → ${response.period.end}`);
      setTotal(response.pagination.total);
      setRows(
        response.data
          .filter((row) => {
            const no = String(row.EmployeeNo ?? "").trim();
            if (!no || no === "0") return false;
            const asNumber = Number(no);
            return Number.isNaN(asNumber) || asNumber !== 0;
          })
          .map((row) => ({
            ...row,
            id: String(row.Id ?? `emp-${row.ID_Employee}`),
            dayMap: Object.fromEntries(row.days.map((day) => [day.dayIndex, day])),
            dirty: false
          }))
      );
    } catch {
      setError("Failed to load timesheets");
      setRows([]);
      setDayHeaders([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [month, page, pageSize, search, year]);

  useEffect(() => {
    void loadCodes();
  }, [loadCodes]);

  useEffect(() => {
    void loadAfes();
  }, [loadAfes]);

  useEffect(() => {
    if (!hasRequestedData) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadTimesheets();
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [hasRequestedData, loadTimesheets]);

  const paintCells = useCallback((keys: Set<string>, code: string | null) => {
    if (!keys.size) {
      return;
    }

    setRows((prev) =>
      prev.map((row) => {
        if (row.IS_Approved) {
          return row;
        }

        let changed = false;
        const nextDayMap = { ...row.dayMap };
        const nextDays = row.days.map((day) => {
          const key = cellKey(row.id, day.dayIndex);
          if (!keys.has(key)) {
            return day;
          }

          const nextCode = code;
          if ((day.code || null) === (nextCode || null)) {
            return day;
          }

          changed = true;
          const updated = {
            ...day,
            code: nextCode,
            source: nextCode ? "edited" : "empty"
          } as TimesheetDayCell;
          nextDayMap[day.dayIndex] = updated;
          return updated;
        });

        if (!changed) {
          return row;
        }

        return {
          ...row,
          days: nextDays,
          dayMap: nextDayMap,
          dirty: true
        };
      })
    );
  }, []);

  const resolvePaintCode = useCallback((): string | null | undefined => {
    const selected = activeCodeIdRef.current;
    if (selected === CLEAR_CODE_VALUE) {
      return null;
    }
    if (selected == null) {
      return undefined;
    }
    const match = codesRef.current.find((item) => item.ID === selected);
    return match?.Code?.trim() || undefined;
  }, []);

  const clearTypedBuffer = useCallback(() => {
    typedBufferRef.current = "";
    setTypedBuffer("");
    if (typedTimeoutRef.current != null) {
      window.clearTimeout(typedTimeoutRef.current);
      typedTimeoutRef.current = null;
    }
  }, []);

  const applyMatchedCode = useCallback(
    (matched: TimeSheetCode) => {
      const codeValue = matched.Code?.trim() || null;
      if (!codeValue) {
        return;
      }

      const selection = selectedCellsRef.current;
      if (!selection.size) {
        setKeyboardHint("Select one or more day cells first, then type a code");
        return;
      }

      paintCells(selection, codeValue);
      setActiveCodeId(matched.ID);
      setKeyboardHint(`Applied "${codeValue}" to ${selection.size} cell(s)`);
      clearTypedBuffer();
    },
    [clearTypedBuffer, paintCells]
  );

  const tryApplyTypedCode = useCallback(
    (typed: string, force: boolean) => {
      const codesList = codesRef.current;
      const matched = findCodeByTypedValue(codesList, typed);
      if (!matched) {
        if (force) {
          setKeyboardHint(`Code "${typed}" not found in Time Sheet Codes`);
          clearTypedBuffer();
        }
        return false;
      }

      if (!force && hasLongerCodePrefix(codesList, typed)) {
        setKeyboardHint(`Typing "${normalizeTypedCode(typed)}"… (waiting for more letters)`);
        return false;
      }

      applyMatchedCode(matched);
      return true;
    },
    [applyMatchedCode, clearTypedBuffer]
  );

  const scheduleTypedCodeCommit = useCallback(
    (typed: string) => {
      if (typedTimeoutRef.current != null) {
        window.clearTimeout(typedTimeoutRef.current);
      }

      typedTimeoutRef.current = window.setTimeout(() => {
        tryApplyTypedCode(typed, true);
      }, KEYBOARD_CODE_TIMEOUT_MS);
    },
    [tryApplyTypedCode]
  );

  const beginCellInteraction = useCallback(
    (row: TimesheetGridRow, dayIndex: number) => {
      if (row.IS_Approved) {
        return;
      }

      const key = cellKey(row.id, dayIndex);
      isDraggingRef.current = true;
      setIsDragging(true);
      setSelectedCells(new Set([key]));
      clearTypedBuffer();
      setKeyboardHint(null);

      const paintCode = resolvePaintCode();
      if (paintCode !== undefined) {
        paintCells(new Set([key]), paintCode);
      }
    },
    [clearTypedBuffer, paintCells, resolvePaintCode]
  );

  const continueCellInteraction = useCallback(
    (row: TimesheetGridRow, dayIndex: number) => {
      if (!isDraggingRef.current || row.IS_Approved) {
        return;
      }

      const key = cellKey(row.id, dayIndex);
      setSelectedCells((prev) => {
        if (prev.has(key)) {
          return prev;
        }
        const next = new Set(prev);
        next.add(key);

        const paintCode = resolvePaintCode();
        if (paintCode !== undefined) {
          paintCells(next, paintCode);
        }

        return next;
      });
    },
    [paintCells, resolvePaintCode]
  );

  const applyAfeToCell = useCallback(
    (rowId: string, dayIndex: number, afeId: number | null) => {
      setRows((prev) =>
        prev.map((row) => {
          if (row.id !== rowId || row.IS_Approved) {
            return row;
          }

          let changed = false;
          const nextDayMap = { ...row.dayMap };
          const nextDays = row.days.map((day) => {
            if (day.dayIndex !== dayIndex) {
              return day;
            }

            if ((day.afeId ?? null) === (afeId ?? null)) {
              return day;
            }

            changed = true;
            const updated = {
              ...day,
              afeId,
              source: "edited"
            } as TimesheetDayCell;
            nextDayMap[day.dayIndex] = updated;
            return updated;
          });

          if (!changed) {
            return row;
          }

          return {
            ...row,
            days: nextDays,
            dayMap: nextDayMap,
            dirty: true
          };
        })
      );
    },
    []
  );

  const openAfePicker = useCallback(
    (row: TimesheetGridRow, dayIndex: number) => {
      if (row.IS_Approved) {
        return;
      }

      const key = cellKey(row.id, dayIndex);
      setSelectedCells(new Set([key]));
      setKeyboardHint(null);
      clearTypedBuffer();
      setActiveAfeCell({ rowId: row.id, dayIndex });
      setSelectedAfeId(row.dayMap[dayIndex]?.afeId ?? "");
    },
    [clearTypedBuffer]
  );

  useEffect(() => {
    const endDrag = () => {
      if (!isDraggingRef.current) {
        return;
      }
      isDraggingRef.current = false;
      setIsDragging(false);
    };

    window.addEventListener("mouseup", endDrag);
    window.addEventListener("blur", endDrag);
    return () => {
      window.removeEventListener("mouseup", endDrag);
      window.removeEventListener("blur", endDrag);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      if (confirmSaveOpen || saveProgressOpen || loading) {
        return;
      }

      if (editMode !== "timesheetCode") {
        return;
      }

      if (event.key === "Escape") {
        clearTypedBuffer();
        setKeyboardHint(null);
        return;
      }

      if (event.key === "Enter") {
        const typed = typedBufferRef.current;
        if (!typed) {
          return;
        }
        event.preventDefault();
        tryApplyTypedCode(typed, true);
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        const selection = selectedCellsRef.current;
        if (!selection.size) {
          return;
        }

        if (typedBufferRef.current) {
          event.preventDefault();
          const next = typedBufferRef.current.slice(0, -1);
          typedBufferRef.current = next;
          setTypedBuffer(next);
          setKeyboardHint(next ? `Typing "${next}"…` : null);
          if (next) {
            scheduleTypedCodeCommit(next);
          } else if (typedTimeoutRef.current != null) {
            window.clearTimeout(typedTimeoutRef.current);
            typedTimeoutRef.current = null;
          }
          return;
        }

        event.preventDefault();
        paintCells(selection, null);
        setActiveCodeId(CLEAR_CODE_VALUE);
        setKeyboardHint(`Cleared ${selection.size} cell(s)`);
        return;
      }

      if (event.key.length !== 1 || !/[A-Za-z0-9]/.test(event.key)) {
        return;
      }

      if (!selectedCellsRef.current.size) {
        setKeyboardHint("Select one or more day cells first, then type a code");
        return;
      }

      event.preventDefault();

      const maxCodeLength = Math.max(
        1,
        ...codesRef.current.map((item) => normalizeTypedCode(item.Code || "").length)
      );
      const nextRaw = `${typedBufferRef.current}${event.key}`;
      const next = normalizeTypedCode(nextRaw).slice(0, maxCodeLength);
      typedBufferRef.current = next;
      setTypedBuffer(next);

      const codesList = codesRef.current;
      const prefixExists = codesList.some((item) =>
        normalizeTypedCode(item.Code || "").startsWith(next)
      );

      if (!prefixExists) {
        // Restart buffer with the latest key if previous combo is invalid.
        const restart = normalizeTypedCode(event.key);
        const restartExists = codesList.some((item) =>
          normalizeTypedCode(item.Code || "").startsWith(restart)
        );
        if (!restartExists) {
          typedBufferRef.current = "";
          setTypedBuffer("");
          setKeyboardHint(`Code "${next}" not found in Time Sheet Codes`);
          if (typedTimeoutRef.current != null) {
            window.clearTimeout(typedTimeoutRef.current);
            typedTimeoutRef.current = null;
          }
          return;
        }

        typedBufferRef.current = restart;
        setTypedBuffer(restart);
        if (!tryApplyTypedCode(restart, false)) {
          scheduleTypedCodeCommit(restart);
          setKeyboardHint(`Typing "${restart}"…`);
        }
        return;
      }

      if (!tryApplyTypedCode(next, false)) {
        scheduleTypedCodeCommit(next);
        setKeyboardHint(`Typing "${next}"…`);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (typedTimeoutRef.current != null) {
        window.clearTimeout(typedTimeoutRef.current);
      }
    };
  }, [
    clearTypedBuffer,
    confirmSaveOpen,
    editMode,
    loading,
    paintCells,
    saveProgressOpen,
    scheduleTypedCodeCommit,
    tryApplyTypedCode
  ]);

  const handleExport = () => {
    exportToExcel(
      `timesheets-${year}-${String(month).padStart(2, "0")}`,
      [
        { header: "Employee No", value: (row) => row.EmployeeNo || "" },
        { header: "Employee Name", value: (row) => row.EmployeeName || "" },
        {
          header: "Level",
          value: (row) => row.LineLevelName_EN || row.LineLevelName_AR || ""
        },
        { header: "Job Name", value: (row) => row.Job_Name || "" },
        ...dayHeaders.map((header) => ({
          header: header.label,
          value: (row: TimesheetGridRow) => row.dayMap[header.dayIndex]?.code || ""
        }))
      ],
      rows
    );
  };

  const handleSaveChanges = async () => {
    const dirtyRows = rows.filter((row) => row.dirty && !row.IS_Approved);
    if (!dirtyRows.length) {
      return;
    }

    setSavingChanges(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await timesheetsApi.saveMonth({
        year,
        month,
        rows: dirtyRows.map((row) => ({
          ID_Employee: row.ID_Employee,
          Job_Name: row.Job_Name,
          days: row.days.map((day) => ({
            dayIndex: day.dayIndex,
            code: day.code,
            afeId: day.afeId
          }))
        }))
      });

      if (!response.success) {
        setError(response.message || "Failed to save timesheet changes");
        return;
      }

      setSuccess(
        [
          `Saved ${response.saved}`,
          response.created ? `created ${response.created}` : null,
          response.updated ? `updated ${response.updated}` : null,
          response.skippedApproved ? `skipped approved ${response.skippedApproved}` : null
        ]
          .filter(Boolean)
          .join(" · ")
      );
      await loadTimesheets();
    } catch (saveError) {
      const axiosError = saveError as {
        response?: { status?: number; data?: { message?: string } };
      };
      setError(
        axiosError.response?.data?.message ||
          (axiosError.response?.status
            ? `Failed to save timesheet changes (${axiosError.response.status})`
            : "Failed to save timesheet changes")
      );
    } finally {
      setSavingChanges(false);
    }
  };

  const handleSaveClick = () => {
    if (!total) {
      return;
    }
    setError(null);
    setSuccess(null);
    setConfirmSaveOpen(true);
  };

  const handleSaveAll = async () => {
    setConfirmSaveOpen(false);
    setSaving(true);
    setSaveProgressOpen(true);
    setError(null);
    setSuccess(null);
    setSaveProcessed(0);
    setSaveTotal(total);

    let pageNo = 1;
    let created = 0;
    let updated = 0;
    let skippedApproved = 0;
    let saved = 0;
    let done = false;
    let latestTotal = total;

    try {
      while (!done) {
        const response = await timesheetsApi.saveAllBatch({
          year,
          month,
          page: pageNo,
          pageSize: SAVE_BATCH_SIZE,
          activeOnly: true,
          ...(search.trim() ? { search: search.trim() } : {})
        });

        if (!response.success) {
          setError(response.message || "Failed to save timesheets");
          return;
        }

        created += response.created;
        updated += response.updated;
        skippedApproved += response.skippedApproved;
        saved += response.saved;
        latestTotal = response.total;
        setSaveTotal(response.total);
        setSaveProcessed(response.processed);
        done = response.done;
        pageNo += 1;

        if (!done && response.processed >= response.total) {
          done = true;
        }
      }

      const parts = [
        `Saved ${saved}`,
        created ? `created ${created}` : null,
        updated ? `updated ${updated}` : null,
        skippedApproved ? `skipped approved ${skippedApproved}` : null,
        `of ${latestTotal} employees`
      ].filter(Boolean);

      await loadTimesheets();
      setSuccess(parts.join(" · "));
    } catch (saveError) {
      const axiosError = saveError as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };
      const status = axiosError.response?.status;
      const apiMessage = axiosError.response?.data?.message;
      setError(
        apiMessage ||
          (status ? `Failed to save timesheets (${status})` : "Failed to save timesheets")
      );
    } finally {
      setSaving(false);
      setSaveProgressOpen(false);
    }
  };

  const saveProgressPercent =
    saveTotal > 0 ? Math.min(100, Math.round((saveProcessed / saveTotal) * 100)) : 0;

  const columns = useMemo<GridColDef<TimesheetGridRow>[]>(() => {
    const base: GridColDef<TimesheetGridRow>[] = [
      {
        field: "EmployeeNo",
        headerName: "No",
        width: 72,
        minWidth: 56,
        maxWidth: 88,
        flex: 0,
        renderCell: (params) => (
          <Typography variant="body2" sx={{ fontWeight: 800, fontSize: "0.75rem" }}>
            {params.row.EmployeeNo || "—"}
          </Typography>
        )
      },
      {
        field: "EmployeeName",
        headerName: "Employee",
        width: 150,
        minWidth: 100,
        maxWidth: 180,
        flex: 0,
        renderCell: (params) => (
          <Stack sx={{ lineHeight: 1.15, py: 0.2, minWidth: 0, overflow: "hidden" }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                fontSize: "0.75rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
              dir="rtl"
              title={params.row.EmployeeName || undefined}
            >
              {params.row.EmployeeName || "—"}
            </Typography>
            {params.row.EmployeeName_En ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontSize: "0.65rem",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}
                title={params.row.EmployeeName_En}
              >
                {params.row.EmployeeName_En}
              </Typography>
            ) : null}
          </Stack>
        )
      },
      {
        field: "Job_Name",
        headerName: "Job",
        width: 100,
        minWidth: 72,
        maxWidth: 130,
        flex: 0,
        renderCell: (params) => (
          <Typography
            variant="body2"
            sx={{
              fontSize: "0.72rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
            title={params.row.Job_Name || undefined}
          >
            {params.row.Job_Name || "—"}
          </Typography>
        )
      },
      {
        field: "LineLevelName_EN",
        headerName: "Level",
        width: 120,
        minWidth: 90,
        maxWidth: 170,
        flex: 0,
        renderCell: (params) => {
          const levelName = params.row.LineLevelName_EN || params.row.LineLevelName_AR || "—";
          return (
            <Typography
              variant="body2"
              sx={{
                fontSize: "0.72rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
              title={levelName}
            >
              {levelName}
            </Typography>
          );
        }
      }
    ];

    const dayColumns: GridColDef<TimesheetGridRow>[] = dayHeaders.map((header) => ({
      field: `j_${header.dayIndex}`,
      headerName: header.label,
      flex: 1,
      minWidth: 0,
      sortable: false,
      filterable: false,
      resizable: false,
      align: "center",
      headerAlign: "center",
      description: `${header.date} (j_${header.dayIndex} · ${WEEKDAY_SHORT[header.weekday] || ""})`,
      cellClassName: (params) => {
        const classes = ["MuiDataGrid-cell--day"];
        const key = cellKey(params.row.id, header.dayIndex);
        if (selectedCells.has(key)) {
          classes.push("timesheet-cell-selected");
        }
        if (params.row.dirty) {
          classes.push("timesheet-cell-dirty");
        }
        if (params.row.IS_Approved) {
          classes.push("timesheet-cell-locked");
        }
        return classes.join(" ");
      },
      renderHeader: () => (
        <Stack alignItems="center" spacing={0} sx={{ lineHeight: 1, width: "100%", minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              fontSize: "0.62rem",
              color: header.isWeekendOrHoliday ? "error.main" : "text.primary",
              whiteSpace: "nowrap"
            }}
          >
            {header.label}
          </Typography>
          <Typography
            variant="caption"
            color={header.isWeekendOrHoliday ? "error.main" : "text.secondary"}
            sx={{ fontSize: "0.55rem", lineHeight: 1 }}
          >
            {(WEEKDAY_SHORT[header.weekday] || "").slice(0, 2)}
          </Typography>
        </Stack>
      ),
      renderCell: (params: GridRenderCellParams<TimesheetGridRow>) => {
        const cell = params.row.dayMap[header.dayIndex];
        const code = cell?.code;
        const afeId = cell?.afeId ?? null;
        const locked = Boolean(params.row.IS_Approved);

        return (
          <Box
            onMouseDown={(event) => {
              event.preventDefault();
              if (editMode === "afe") {
                openAfePicker(params.row, header.dayIndex);
                return;
              }
              beginCellInteraction(params.row, header.dayIndex);
            }}
            onMouseEnter={() => {
              if (editMode === "timesheetCode") {
                continueCellInteraction(params.row, header.dayIndex);
              }
            }}
            sx={{
              width: "100%",
              height: "100%",
              minHeight: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: locked ? "not-allowed" : "cell"
            }}
            title={
              locked
                ? "Approved timesheet (locked)"
                : editMode === "timesheetCode"
                  ? `j_${header.dayIndex}${code ? ` · ${code}` : ""}`
                  : `AFE${header.dayIndex}${afeId ? ` · ${afeId}` : ""}`
            }
          >
            {editMode === "timesheetCode" ? (
              !code ? (
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.65rem" }}>
                  —
                </Typography>
              ) : (
                <Chip
                  size="small"
                  label={code}
                  color={codeChipColor(cell?.source || "empty", Boolean(cell?.isWeekendOrHoliday))}
                  variant="outlined"
                  sx={{
                    height: 18,
                    minWidth: 0,
                    maxWidth: "100%",
                    fontWeight: 800,
                    fontSize: "0.62rem",
                    pointerEvents: "none",
                    "& .MuiChip-label": { px: 0.35 }
                  }}
                />
              )
            ) : !afeId ? (
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.65rem" }}>
                —
              </Typography>
            ) : (
              <Chip
                size="small"
                label={String(afeId)}
                color="info"
                variant="outlined"
                sx={{
                  height: 18,
                  minWidth: 0,
                  maxWidth: "100%",
                  fontWeight: 800,
                  fontSize: "0.62rem",
                  pointerEvents: "none",
                  "& .MuiChip-label": { px: 0.35 }
                }}
              />
            )}
          </Box>
        );
      }
    }));

    return [...base, ...dayColumns];
  }, [beginCellInteraction, continueCellInteraction, dayHeaders, editMode, openAfePicker, selectedCells]);

  const closeAfePicker = () => {
    setActiveAfeCell(null);
    setSelectedAfeId("");
  };

  const applySelectedAfe = () => {
    if (!activeAfeCell) {
      return;
    }

    const nextAfeId = selectedAfeId === "" ? null : Number(selectedAfeId);
    applyAfeToCell(activeAfeCell.rowId, activeAfeCell.dayIndex, nextAfeId);
    setKeyboardHint(
      nextAfeId == null
        ? `Cleared AFE${activeAfeCell.dayIndex}`
        : `Set AFE${activeAfeCell.dayIndex} = ${nextAfeId}`
    );
    closeAfePicker();
  };

  const yearOptions = Array.from({ length: 12 }, (_, index) => currentYear - 5 + index);
  const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1);
  return (
    <Box>
      <Box sx={{ mb: 1.25, px: 0.5 }}>
        <Breadcrumbs
          aria-label="breadcrumb"
          separator="/"
          sx={{ mb: 0.4, "& .MuiBreadcrumbs-separator": { color: "text.disabled" } }}
        >
          <Typography
            component={RouterLink}
            to="/human-resources"
            color="text.secondary"
            sx={{ fontSize: "0.78rem", textDecoration: "none", "&:hover": { color: "text.primary" } }}
          >
            Human Resources
          </Typography>
          <Typography
            component={RouterLink}
            to="/human-resources/timesheets-attendance"
            color="text.secondary"
            sx={{ fontSize: "0.78rem", textDecoration: "none", "&:hover": { color: "text.primary" } }}
          >
            Timesheets & Attendance
          </Typography>
          <Typography color="text.primary" sx={{ fontSize: "0.78rem", fontWeight: 700 }}>
            Timesheets
          </Typography>
        </Breadcrumbs>
        <Typography variant="h4" sx={{ fontSize: { xs: "1.65rem", md: "2rem" }, fontWeight: 800, lineHeight: 1.15 }}>
          Timesheets
        </Typography>
      </Box>

      <DataGridToolbar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(0);
        }}
        searchExtra={
          periodLabel ? (
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              label={`Period: ${periodLabel}`}
              sx={{ fontWeight: 700 }}
            />
          ) : null
        }
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <TextField
              select
              size="small"
              label="Year"
              value={year}
              onChange={(event) => {
                setYear(Number(event.target.value));
                setPage(0);
              }}
              sx={{ minWidth: 100 }}
            >
              {yearOptions.map((value) => (
                <MenuItem key={value} value={value}>
                  {value}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Month (DATE_JS)"
              value={month}
              onChange={(event) => {
                setMonth(Number(event.target.value));
                setPage(0);
              }}
              sx={{ minWidth: 150 }}
            >
              {monthOptions.map((value) => (
                <MenuItem key={value} value={value}>
                  {new Date(2000, value - 1, 1).toLocaleString(undefined, {
                    month: "long"
                  })}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="outlined"
              startIcon={<RefreshRoundedIcon />}
              onClick={() => {
                setHasRequestedData(true);
                void loadTimesheets();
              }}
              disabled={loading || saving || savingChanges}
            >
              Get Data
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={
                savingChanges ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <SaveRoundedIcon />
                )
              }
              onClick={() => void handleSaveChanges()}
              disabled={loading || saving || savingChanges || dirtyCount === 0}
            >
              Save Changes{dirtyCount ? ` (${dirtyCount})` : ""}
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={
                saving ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />
              }
              onClick={handleSaveClick}
              disabled={loading || saving || savingChanges || total === 0}
            >
              Save All
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileDownloadRoundedIcon />}
              onClick={handleExport}
              disabled={loading || saving || savingChanges || rows.length === 0}
            >
              Export to Excel
            </Button>
          </Stack>
        }
      />

      <Box
        sx={{
          mb: 1.5,
          p: 1.25,
          borderRadius: 2,
          border: 1,
          borderColor: "divider",
          bgcolor: "background.paper"
        }}
      >
        <Stack spacing={1}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "stretch", md: "center" }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Edit mode
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={editMode}
              onChange={(_event, value: EditMode | null) => {
                if (!value) return;
                setEditMode(value);
                clearTypedBuffer();
                setKeyboardHint(null);
              }}
            >
              <ToggleButton value="timesheetCode" sx={{ textTransform: "none", px: 1.25 }}>
                Set timesheets code
              </ToggleButton>
              <ToggleButton value="afe" sx={{ textTransform: "none", px: 1.25 }}>
                Set AFE
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            alignItems={{ xs: "stretch", md: "center" }}
            justifyContent="space-between"
          >
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {editMode === "timesheetCode"
                ? "Timesheet codes - click palette, drag cells, or type code on keyboard"
                : "AFE mode - click any day cell (AFE1..AFE31) to select AFE by ID"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {editMode === "timesheetCode"
                ? (
                  keyboardHint
                    ? keyboardHint
                    : typedBuffer
                      ? `Typing "${typedBuffer}"...`
                      : activeCodeId === CLEAR_CODE_VALUE
                        ? "Paint mode: Clear"
                        : activeCodeValue
                          ? `Paint mode: ${activeCodeValue}`
                          : "Select cell(s), then type 1-3 letter code (must exist in Time Sheet Codes)"
                )
                : keyboardHint || "Click a cell to open AFE list"}
              {editMode === "timesheetCode" && isDragging ? " · dragging..." : ""}
            </Typography>
          </Stack>

          {editMode === "timesheetCode" ? (
            <ToggleButtonGroup
              exclusive
              size="small"
              value={activeCodeId}
              onChange={(_event, value: number | typeof CLEAR_CODE_VALUE | null) => {
                setActiveCodeId(value);
              }}
              sx={{
                flexWrap: "wrap",
                gap: 0.75,
                "& .MuiToggleButtonGroup-grouped": {
                  border: "1px solid !important",
                  borderColor: "divider !important",
                  borderRadius: "8px !important",
                  m: 0,
                  minHeight: 30,
                  fontSize: "0.76rem",
                  lineHeight: 1,
                  px: 0.9,
                  py: 0.2
                }
              }}
            >
              <ToggleButton value={CLEAR_CODE_VALUE} sx={{ px: 1, minWidth: 42, textTransform: "none", fontWeight: 700 }}>
                Clear
              </ToggleButton>
              {codes.map((item) => (
                <Tooltip
                  key={item.ID}
                  title={item.Code_Description || `Code ID ${item.ID}`}
                  arrow
                >
                  <ToggleButton
                    value={item.ID}
                    sx={{ px: 0.85, minWidth: 38, textTransform: "none", fontWeight: 800 }}
                  >
                    {item.Code || `#${item.ID}`}
                  </ToggleButton>
                </Tooltip>
              ))}
            </ToggleButtonGroup>
          ) : null}

          {editMode === "timesheetCode" && !codes.length ? (
            <Alert severity="warning" sx={{ py: 0 }}>
              No timesheet codes found. Add codes in Setup → HR → Time Sheet Codes.
            </Alert>
          ) : null}

          {editMode === "afe" && !afes.length ? (
            <Alert severity="warning" sx={{ py: 0 }}>
              No AFEs found. Add active AFEs in Finance before assigning AFE1..AFE31.
            </Alert>
          ) : null}
        </Stack>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {success ? (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ ...tableContainerSx, py: 6.5 }}>
          <Stack spacing={2.25} alignItems="center">
            <Box
              sx={{
                animation: "timesheetLogoPulse 1.6s ease-in-out infinite",
                "@keyframes timesheetLogoPulse": {
                  "0%": { transform: "translateY(0px) scale(1)", opacity: 0.9 },
                  "50%": { transform: "translateY(-2px) scale(1.03)", opacity: 1 },
                  "100%": { transform: "translateY(0px) scale(1)", opacity: 0.9 }
                }
              }}
            >
              <BrandLogo />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Getting timesheet data...
            </Typography>
            <Box sx={{ width: "min(460px, 92%)" }}>
              <LinearProgress
                sx={{
                  height: 10,
                  borderRadius: 999,
                  bgcolor: "action.hover",
                  "& .MuiLinearProgress-bar": { borderRadius: 999 }
                }}
              />
            </Box>
          </Stack>
        </Box>
      ) : (
        <Box sx={{ ...tableContainerSx, width: "100%" }}>
          <DataGrid
            autoHeight
            rows={rows}
            columns={columns}
            getRowId={(row) => row.id}
            rowCount={total}
            paginationMode="server"
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={(model) => {
              setPage(model.page);
              setPageSize(model.pageSize);
            }}
            pageSizeOptions={[10, 25, 50, 100]}
            disableRowSelectionOnClick
            disableColumnMenu
            getRowHeight={() => "auto"}
            columnHeaderHeight={44}
            sx={dataGridSx}
          />
        </Box>
      )}

      <Dialog
        open={Boolean(activeAfeCell)}
        onClose={closeAfePicker}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Set AFE</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <DialogContentText>
              Select an AFE for {activeAfeCell ? `AFE${activeAfeCell.dayIndex}` : "the selected day"}.
            </DialogContentText>
            <TextField
              select
              fullWidth
              size="small"
              label="AFE"
              value={selectedAfeId}
              onChange={(event) => {
                const rawValue = event.target.value;
                setSelectedAfeId(rawValue === "" ? "" : Number(rawValue));
              }}
            >
              <MenuItem value="">
                <em>Clear AFE</em>
              </MenuItem>
              {afes.map((afe) => (
                <MenuItem key={afe.Id} value={afe.Id}>
                  {afe.Id} - {afe.AFENo} - {afe.AFEDescription}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAfePicker}>Cancel</Button>
          <Button variant="contained" onClick={applySelectedAfe}>
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmSaveOpen}
        onClose={() => !saving && setConfirmSaveOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box component="img" src="/logo.png" alt="IMS" sx={{ width: 36, height: 36 }} />
            <Typography variant="h6" component="span">
              Confirm Save All
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Save timesheets for all <strong>{total}</strong> employee
            {total === 1 ? "" : "s"} in{" "}
            {new Date(2000, month - 1, 1).toLocaleString(undefined, { month: "long" })}{" "}
            {year}
            {search.trim() ? " (current search filter)" : ""}?
          </DialogContentText>
          {periodLabel ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              Period: {periodLabel}
            </Typography>
          ) : null}
          {dirtyCount ? (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              You have {dirtyCount} unsaved edited row(s) on this page. Save Changes first if you
              want to keep those edits before running Save All.
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmSaveOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<SaveRoundedIcon />}
            onClick={() => void handleSaveAll()}
            disabled={saving}
          >
            Confirm Save All
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={saveProgressOpen}
        disableEscapeKeyDown
        maxWidth="xs"
        fullWidth
        slotProps={{
          backdrop: { sx: { pointerEvents: "none" } }
        }}
        onClose={() => undefined}
      >
        <DialogContent sx={{ py: 3.5, px: 3 }}>
          <Stack spacing={2.5} alignItems="center">
            <BrandLogo />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Saving timesheets…
            </Typography>
            <Box sx={{ width: "100%" }}>
              <LinearProgress
                variant="determinate"
                value={saveProgressPercent}
                sx={{ height: 10, borderRadius: 999 }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {saveProcessed} / {saveTotal || "…"} employees ({saveProgressPercent}%)
            </Typography>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
