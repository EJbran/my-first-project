import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DonutLargeRoundedIcon from "@mui/icons-material/DonutLargeRounded";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import HourglassEmptyRoundedIcon from "@mui/icons-material/HourglassEmptyRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Popover,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useSnackbar } from "notistack";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { vacationsApi } from "../../../api/vacations.api";
import type { EmployeeDatabaseValue } from "../../../types/employee.types";
import type {
  VacationColumnMetadata,
  VacationRecord
} from "../../../types/vacation.types";

interface EmployeeVacationRecordsProps {
  employeeId: number;
  enabled?: boolean;
}

type TimeSheetCodeDetails = {
  id?: string;
  code?: string;
  description?: string;
  englishName?: string;
  arabicName?: string;
};

type LeaveStatus = {
  label: string;
  category: "approved" | "pending" | "rejected" | "cancelled" | "unknown";
  color: string;
  background: string;
  border: string;
};

const PAGE_SIZE = 10;
const FETCH_LIMIT = 100;
const emptyValue = "—";
const emptyVacationRows: VacationRecord[] = [];

const panelSx = {
  border: "1px solid var(--hr-border)",
  borderRadius: "11px",
  bgcolor: "var(--hr-surface)",
  boxShadow: "0 5px 18px rgba(23, 50, 92, 0.055)",
  overflow: "hidden"
};

const normalizeKey = (value: string): string =>
  value.toLocaleLowerCase("en-US").replace(/[^a-z0-9]/g, "");

const displayValue = (value: EmployeeDatabaseValue | undefined): string => {
  if (value === null || value === undefined) return emptyValue;
  const text = String(value).trim();
  return text || emptyValue;
};

const readValue = (
  record: VacationRecord,
  candidates: string[]
): EmployeeDatabaseValue | undefined => {
  const lookup = new Map(
    Object.entries(record).map(([key, value]) => [normalizeKey(key), value])
  );

  for (const candidate of candidates) {
    const value = lookup.get(normalizeKey(candidate));
    if (value !== null && value !== undefined && String(value).trim()) return value;
  }
  return undefined;
};

const toNumber = (value: EmployeeDatabaseValue | undefined): number | null => {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseDate = (value: EmployeeDatabaseValue | undefined): Date | null => {
  const text = displayValue(value);
  if (text === emptyValue) return null;

  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const parsed = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const leaveDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC"
});

const formatLeaveDate = (value: EmployeeDatabaseValue | undefined): string => {
  const parsed = parseDate(value);
  return parsed ? leaveDateFormatter.format(parsed) : displayValue(value);
};

const formatTemporalValue = (
  value: EmployeeDatabaseValue | undefined,
  dataType: string
): string => {
  const text = displayValue(value);
  if (text === emptyValue) return text;

  const normalizedType = dataType.toLocaleLowerCase("en-US");
  if (!normalizedType.includes("date") && !normalizedType.includes("time")) {
    return text;
  }

  const match = text.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (!match) return text;

  const date = `${match[3]}-${match[2]}-${match[1]}`;
  if (normalizedType === "date" || !match[4]) return date;
  return `${date} ${match[4]}:${match[5]}${match[6] ? `:${match[6]}` : ""}`;
};

const readTimeSheetCodeDetails = (
  vacation: VacationRecord
): TimeSheetCodeDetails => {
  const toOptionalText = (
    candidates: string[]
  ): string | undefined => {
    const value = readValue(vacation, candidates);
    const text = displayValue(value);
    return text === emptyValue ? undefined : text;
  };

  return {
    id: toOptionalText([
      "ResolvedTimeSheetCodeId",
      "TimeSheetCode_ID_CodeTimeSheet",
      "TimeSheetCode_Id",
      "TimeSheetCode_ID"
    ]),
    code: toOptionalText([
      "ResolvedTimeSheetCode",
      "TimeSheetCode",
      "TimeSheetCode_Code",
      "TimeSheetCode_CodeTimeSheet"
    ]),
    description: toOptionalText([
      "ResolvedTimeSheetCodeDescription",
      "TimeSheetCodeDescription",
      "TimeSheetCode_Code_Description",
      "TimeSheetCode_Description"
    ]),
    englishName: toOptionalText([
      "ResolvedTimeSheetCodeNameEnglish",
      "TimeSheetCode_Name_English",
      "TimeSheetCode_EnglishName"
    ]),
    arabicName: toOptionalText([
      "ResolvedTimeSheetCodeNameArabic",
      "TimeSheetCode_Name_Arabic",
      "TimeSheetCode_ArabicName"
    ])
  };
};

const sentenceCaseCode = (value: string): string => {
  if (!/^[A-Z0-9_-]+$/.test(value)) return value;
  return value
    .toLocaleLowerCase("en-US")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const leaveType = (vacation: VacationRecord): string => {
  const details = readTimeSheetCodeDetails(vacation);
  const cause = displayValue(readValue(vacation, ["Cause", "Reason"]));
  const resolved = details.description
    ?? details.englishName
    ?? details.arabicName
    ?? details.code;

  if (resolved) return sentenceCaseCode(resolved);
  return cause === emptyValue ? "Leave type unavailable" : cause;
};

const leaveStatus = (vacation: VacationRecord): LeaveStatus => {
  const raw = displayValue(readValue(vacation, ["State", "Status"]));
  const normalized = raw.toLocaleLowerCase("en-US");

  if (
    ["1", "true"].includes(normalized)
    || ["approved", "closed", "accepted", "completed", "complete", "معتمد", "موافق", "مغلق"]
      .some((value) => normalized.includes(value))
  ) {
    return {
      label: "Approved",
      category: "approved",
      color: "var(--hr-success-text)",
      background: "var(--hr-success-bg)",
      border: "light-dark(#c8e8d1, #365943)"
    };
  }
  if (
    ["0", "false"].includes(normalized)
    || ["pending", "recorded", "open", "submitted", "review", "قيد", "مسجل"]
      .some((value) => normalized.includes(value))
  ) {
    return {
      label: "Pending",
      category: "pending",
      color: "#a15c00",
      background: "#fff8e9",
      border: "#f4d39b"
    };
  }
  if (["rejected", "declined", "denied", "مرفوض"].some((value) => normalized.includes(value))) {
    return {
      label: "Rejected",
      category: "rejected",
      color: "#c43229",
      background: "#fff3f2",
      border: "#ffc5c0"
    };
  }
  if (["cancelled", "canceled", "void", "ملغي", "ملغى"].some((value) => normalized.includes(value))) {
    return {
      label: "Cancelled",
      category: "cancelled",
      color: "var(--hr-strong-muted)",
      background: "var(--hr-surface-soft)",
      border: "var(--hr-border)"
    };
  }

  return {
    label: raw === emptyValue ? "Unknown" : raw,
    category: "unknown",
    color: "var(--hr-strong-muted)",
    background: "var(--hr-surface-soft)",
    border: "var(--hr-border)"
  };
};

const vacationId = (vacation: VacationRecord): string => {
  const raw = displayValue(readValue(vacation, ["Id", "ID_Vacation", "VacationId"]));
  if (raw === emptyValue) return emptyValue;
  return raw.toLocaleUpperCase("en-US").startsWith("LV-") ? raw : `LV-${raw}`;
};

const vacationDays = (vacation: VacationRecord): number | null =>
  toNumber(readValue(vacation, ["DeductedLeaveDays", "Deducted_Leave_Days"]))
  ?? toNumber(readValue(vacation, ["Num_VacationDays", "VacationDays"]));

const formatDays = (value: number | null): string => {
  if (value === null) return emptyValue;
  const formatted = Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `${formatted} ${value === 1 ? "day" : "days"}`;
};

const recordOverlapsYear = (vacation: VacationRecord, year: number): boolean => {
  const start = parseDate(readValue(vacation, ["VacationDate_Start", "VacationDateStart"]));
  const end = parseDate(readValue(vacation, ["VacationDate_End", "VacationDateEnd", "ReturnDate"])) ?? start;
  if (!start && !end) return false;

  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
  return (start ?? end!) <= yearEnd && (end ?? start!) >= yearStart;
};

const deriveColumns = (rows: VacationRecord[]): VacationColumnMetadata[] => {
  const firstRow = rows[0];
  if (!firstRow) return [];

  return Object.keys(firstRow)
    .filter((key) =>
      !key.startsWith("ResolvedTimeSheetCode")
      && !key.startsWith("TimeSheetCode_")
      && key !== "TimeSheetCode"
      && key !== "TimeSheetCodeDescription"
    )
    .map((key, index) => ({
      key,
      label: key,
      dataType: "text",
      ordinal: index + 1
    }));
};

const requestErrorMessage = (error: unknown): string => {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message?.trim()
      || error.message
      || "Vacation records could not be loaded.";
  }
  return error instanceof Error && error.message.trim()
    ? error.message
    : "Vacation records could not be loaded.";
};

const SummaryCard = ({
  icon,
  label,
  value,
  suffix,
  tone
}: {
  icon: ReactNode;
  label: string;
  value: string;
  suffix?: string;
  tone: "blue" | "green" | "amber" | "purple";
}) => {
  const tones = {
    blue: { border: "#cfe0ff", card: "#f6f9ff", icon: "#edf4ff", color: "#0b4bea" },
    green: { border: "#cfe9d7", card: "#f6fcf8", icon: "#eaf8ee", color: "#19833b" },
    amber: { border: "#f2dfb6", card: "#fffaf1", icon: "#fff3d4", color: "#9a6300" },
    purple: { border: "#e5d7fa", card: "#fbf8ff", icon: "#f1e9ff", color: "#5e2cb8" }
  } as const;
  const selectedTone = tones[tone];

  return (
    <Card
      variant="outlined"
      sx={{
        minHeight: 101,
        display: "flex",
        alignItems: "center",
        gap: 2,
        px: { xs: 1.7, md: 2.2 },
        borderColor: selectedTone.border,
        borderRadius: "10px",
        bgcolor: selectedTone.card,
        boxShadow: "none"
      }}
    >
      <Box
        sx={{
          width: 59,
          height: 59,
          flex: "0 0 auto",
          display: "grid",
          placeItems: "center",
          borderRadius: "50%",
          color: selectedTone.color,
          bgcolor: selectedTone.icon,
          "& .MuiSvgIcon-root": { fontSize: 31 }
        }}
      >
        {icon}
      </Box>
      <Box minWidth={0}>
        <Typography sx={{ color: "var(--hr-strong-muted)", fontSize: 11.5, lineHeight: 1.25 }}>
          {label}
        </Typography>
        <Stack direction="row" alignItems="baseline" spacing={0.8} sx={{ mt: 0.55 }}>
          <Typography sx={{ color: "var(--hr-text)", fontSize: 29, fontWeight: 900, lineHeight: 1 }}>
            {value}
          </Typography>
          {suffix ? (
            <Typography sx={{ color: "var(--hr-strong-muted)", fontSize: 12.25, fontWeight: 750 }}>
              {suffix}
            </Typography>
          ) : null}
        </Stack>
      </Box>
    </Card>
  );
};

const HeaderCell = ({
  children,
  minWidth = 130
}: {
  children: ReactNode;
  minWidth?: number;
}) => (
  <TableCell
    sx={{
      minWidth,
      height: 43,
      py: 1,
      bgcolor: "var(--hr-surface-soft)",
      borderColor: "var(--hr-border)",
      color: "var(--hr-text)",
      fontSize: 10.75,
      fontWeight: 900,
      whiteSpace: "nowrap"
    }}
  >
    {children}
  </TableCell>
);

const TimeSheetCodeDetailsCard = ({
  vacation,
  lookupAvailable
}: {
  vacation: VacationRecord;
  lookupAvailable: boolean;
}) => {
  const details = readTimeSheetCodeDetails(vacation);
  const rawId = displayValue(readValue(vacation, [
    "Id_CodeTimeSheet",
    "ID_CodeTimeSheet",
    "CodeTimeSheetId"
  ]));

  return (
    <Box
      sx={{
        p: 1.5,
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
        gap: 1.4,
        border: "1px solid var(--hr-border)",
        borderRadius: "9px",
        bgcolor: "var(--hr-surface-soft)"
      }}
    >
      {[
        ["Resolved leave type", leaveType(vacation)],
        ["Timesheet code", details.code ?? emptyValue],
        ["Code reference", details.id ?? (rawId === emptyValue ? emptyValue : rawId)]
      ].map(([label, value]) => (
        <Box key={label}>
          <Typography sx={{ color: "var(--hr-muted)", fontSize: 9.5, fontWeight: 750 }}>{label}</Typography>
          <Typography sx={{ mt: 0.4, color: "var(--hr-text)", fontSize: 11.5, fontWeight: 800, overflowWrap: "anywhere" }}>{value}</Typography>
        </Box>
      ))}
      {!lookupAvailable ? (
        <Typography sx={{ gridColumn: "1 / -1", color: "var(--hr-muted)", fontSize: 10 }}>
          The timesheet-code lookup is unavailable; the raw vacation value is shown instead.
        </Typography>
      ) : null}
    </Box>
  );
};

export const EmployeeVacationRecords = ({
  employeeId,
  enabled = true
}: EmployeeVacationRecordsProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const [selectedVacation, setSelectedVacation] = useState<VacationRecord | null>(null);
  const validEmployeeId = Number.isSafeInteger(employeeId) && employeeId > 0;

  const vacationsQuery = useQuery({
    queryKey: ["employees", employeeId, "vacations", "management"],
    queryFn: () => vacationsApi.listForEmployee(employeeId, { page: 1, pageSize: FETCH_LIMIT }),
    enabled: enabled && validEmployeeId,
    staleTime: 30_000
  });

  const result = vacationsQuery.data;
  const rows = result?.success ? result.data : emptyVacationRows;
  const columns = useMemo(
    () => result?.success && result.columns?.length
      ? result.columns.toSorted((left, right) =>
          (left.ordinal ?? 0) - (right.ordinal ?? 0)
        )
      : deriveColumns(rows),
    [result, rows]
  );
  const lookupStatus = result?.success
    ? result.sources?.timeSheetCodeResolution
    : undefined;
  const lookupAvailable = lookupStatus === "available";
  const errorMessage = result && !result.success
    ? result.errors?.join(". ") || result.message
    : vacationsQuery.isError
      ? requestErrorMessage(vacationsQuery.error)
      : null;

  const availableYears = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    rows.forEach((vacation) => {
      [
        readValue(vacation, ["VacationDate_Start", "VacationDateStart"]),
        readValue(vacation, ["VacationDate_End", "VacationDateEnd"]),
        readValue(vacation, ["ReturnDate", "Return_Date"])
      ].forEach((value) => {
        const parsed = parseDate(value);
        if (parsed) years.add(parsed.getUTCFullYear());
      });
    });
    return [...years].sort((left, right) => right - left);
  }, [rows]);

  const typeOptions = useMemo(
    () => [...new Set(rows.map(leaveType).filter((value) => value !== "Leave type unavailable"))]
      .sort((left, right) => left.localeCompare(right)),
    [rows]
  );
  const statusOptions = useMemo(
    () => [...new Set(rows.map((vacation) => leaveStatus(vacation).label))]
      .sort((left, right) => left.localeCompare(right)),
    [rows]
  );

  const yearRows = useMemo(() => {
    if (!year) return rows;
    const selectedYear = Number(year);
    return rows.filter((vacation) => recordOverlapsYear(vacation, selectedYear));
  }, [rows, year]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("en-US");
    return yearRows.filter((vacation) => {
      const type = leaveType(vacation);
      const status = leaveStatus(vacation).label;
      if (typeFilter && type !== typeFilter) return false;
      if (statusFilter && status !== statusFilter) return false;
      if (!normalizedSearch) return true;

      return [
        vacationId(vacation),
        type,
        status,
        displayValue(readValue(vacation, ["Cause", "Reason"])),
        formatLeaveDate(readValue(vacation, ["VacationDate_Start", "VacationDateStart"])),
        formatLeaveDate(readValue(vacation, ["VacationDate_End", "VacationDateEnd"])),
        formatLeaveDate(readValue(vacation, ["ReturnDate", "Return_Date"]))
      ].join(" ").toLocaleLowerCase("en-US").includes(normalizedSearch);
    });
  }, [search, statusFilter, typeFilter, yearRows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const visibleRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const firstVisibleRecord = filteredRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastVisibleRecord = Math.min(page * PAGE_SIZE, filteredRows.length);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter, year]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const latestBalance = useMemo(() => {
    for (const vacation of rows) {
      const value = toNumber(readValue(vacation, ["RemainingBalance", "Remaining_Balance"]));
      if (value !== null) return value;
    }
    return null;
  }, [rows]);
  const usedDays = yearRows.reduce((total, vacation) => {
    const status = leaveStatus(vacation);
    return status.category === "approved"
      ? total + (vacationDays(vacation) ?? 0)
      : total;
  }, 0);
  const pendingRequests = yearRows.filter(
    (vacation) => leaveStatus(vacation).category === "pending"
  ).length;
  const activeFilterCount = Number(Boolean(statusFilter)) + Number(Boolean(typeFilter));

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_value, index) => index + 1);
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return Array.from({ length: 5 }, (_value, index) => start + index);
  }, [page, totalPages]);

  if (!validEmployeeId) {
    return <Alert severity="warning">A valid employee ID is required to load leave records.</Alert>;
  }

  return (
    <Card data-testid="employee-leave-management" sx={panelSx}>
      <Box sx={{ px: { xs: 1.8, md: 2.6 }, pt: { xs: 1.8, md: 2.1 }, pb: 1.5 }}>
        <Typography component="h2" sx={{ color: "var(--hr-text)", fontSize: { xs: 18, md: 21 }, fontWeight: 900, lineHeight: 1.2 }}>
          Leave Management
        </Typography>
        <Typography sx={{ mt: 0.45, color: "var(--hr-muted)", fontSize: { xs: 11, md: 12.25 } }}>
          Track balances, requests, and employee leave history.
        </Typography>
      </Box>

      {vacationsQuery.isFetching ? <LinearProgress aria-label="Loading leave records" /> : null}

      <Box sx={{ px: { xs: 1.8, md: 2.6 }, pb: { xs: 1.8, md: 2.35 } }}>
        {errorMessage ? (
          <Alert
            severity="error"
            sx={{ mb: 1.5 }}
            action={(
              <Button
                color="inherit"
                size="small"
                startIcon={<RefreshRoundedIcon />}
                onClick={() => void vacationsQuery.refetch()}
              >
                Retry
              </Button>
            )}
          >
            {errorMessage}
          </Alert>
        ) : null}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" },
            gap: { xs: 1.1, md: 1.45 },
            mb: 1.65
          }}
        >
          <SummaryCard
            icon={<CalendarMonthOutlinedIcon />}
            label="Available Balance"
            value={latestBalance === null ? emptyValue : latestBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            suffix={latestBalance === null ? undefined : "days"}
            tone="blue"
          />
          <SummaryCard
            icon={<DonutLargeRoundedIcon />}
            label="Used This Year"
            value={usedDays.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            suffix="days"
            tone="green"
          />
          <SummaryCard
            icon={<HourglassEmptyRoundedIcon />}
            label="Pending Requests"
            value={pendingRequests.toLocaleString()}
            tone="amber"
          />
          <SummaryCard
            icon={<DescriptionOutlinedIcon />}
            label="Total Requests"
            value={yearRows.length.toLocaleString()}
            tone="purple"
          />
        </Box>

        <Card
          variant="outlined"
          sx={{
            overflow: "hidden",
            borderColor: "var(--hr-border)",
            borderRadius: "10px",
            bgcolor: "var(--hr-surface)",
            boxShadow: "none"
          }}
        >
          <Box
            sx={{
              minHeight: 64,
              px: { xs: 1.5, md: 2.1 },
              py: 1.25,
              display: "flex",
              alignItems: { xs: "stretch", lg: "center" },
              justifyContent: "space-between",
              flexDirection: { xs: "column", lg: "row" },
              gap: 1.25,
              borderBottom: "1px solid var(--hr-border)"
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography component="h3" sx={{ color: "var(--hr-text)", fontSize: 17, fontWeight: 900 }}>
                Leave History
              </Typography>
              <Chip
                label={`${filteredRows.length.toLocaleString()} ${filteredRows.length === 1 ? "record" : "records"}`}
                size="small"
                sx={{ height: 24, color: "var(--hr-accent)", bgcolor: "var(--hr-selected)", fontSize: 9.5, fontWeight: 850 }}
              />
            </Stack>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "minmax(230px, 1fr) 120px auto auto" },
                gap: 1,
                alignItems: "center"
              }}
            >
              <TextField
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                size="small"
                placeholder="Search leave records"
                inputProps={{ "aria-label": "Search leave records" }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon sx={{ color: "var(--hr-strong-muted)", fontSize: 20 }} />
                    </InputAdornment>
                  )
                }}
                sx={{
                  minWidth: { sm: 260 },
                  "& .MuiOutlinedInput-root": { height: 40, borderRadius: "8px", fontSize: 11.5 }
                }}
              />
              <FormControl size="small">
                <Select
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                  inputProps={{ "aria-label": "Leave year" }}
                  sx={{ height: 40, borderRadius: "8px", fontSize: 11.5, fontWeight: 750 }}
                >
                  <MenuItem value="">All years</MenuItem>
                  {availableYears.map((option) => (
                    <MenuItem key={option} value={String(option)}>{option}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                startIcon={<FilterListRoundedIcon />}
                onClick={(event) => setFilterAnchor(event.currentTarget)}
                sx={{
                  minHeight: 40,
                  px: 1.55,
                  borderColor: "var(--hr-accent-border)",
                  borderRadius: "8px",
                  color: "var(--hr-text)",
                  fontSize: 11.25,
                  fontWeight: 800,
                  textTransform: "none",
                  whiteSpace: "nowrap"
                }}
              >
                Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
              </Button>
              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={() => enqueueSnackbar("The leave request workflow is not connected yet.", { variant: "info" })}
                sx={{
                  minHeight: 40,
                  px: 1.8,
                  borderRadius: "8px",
                  bgcolor: "var(--hr-accent)",
                  color: "var(--hr-on-accent)",
                  fontSize: 11.25,
                  fontWeight: 850,
                  textTransform: "none",
                  whiteSpace: "nowrap",
                  "&:hover": { bgcolor: "var(--hr-accent-hover)" }
                }}
              >
                Request Leave
              </Button>
            </Box>
          </Box>

          <Popover
            open={Boolean(filterAnchor)}
            anchorEl={filterAnchor}
            onClose={() => setFilterAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{
              paper: {
                sx: {
                  width: 300,
                  mt: 0.7,
                  p: 1.6,
                  border: "1px solid var(--hr-border)",
                  borderRadius: "10px",
                  bgcolor: "var(--hr-surface)",
                  boxShadow: "var(--hr-shadow)"
                }
              }
            }}
          >
            <Stack spacing={1.4}>
              <Typography sx={{ color: "var(--hr-text)", fontSize: 12.5, fontWeight: 850 }}>Filter leave history</Typography>
              <FormControl size="small" fullWidth>
                <InputLabel id="leave-type-filter-label">Leave type</InputLabel>
                <Select
                  labelId="leave-type-filter-label"
                  label="Leave type"
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                >
                  <MenuItem value="">All leave types</MenuItem>
                  {typeOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel id="leave-status-filter-label">Status</InputLabel>
                <Select
                  labelId="leave-status-filter-label"
                  label="Status"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <MenuItem value="">All statuses</MenuItem>
                  {statusOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                </Select>
              </FormControl>
              <Stack direction="row" justifyContent="flex-end" spacing={0.8}>
                <Button
                  onClick={() => {
                    setTypeFilter("");
                    setStatusFilter("");
                  }}
                  sx={{ color: "var(--hr-muted)", fontSize: 10.5, fontWeight: 750, textTransform: "none" }}
                >
                  Clear
                </Button>
                <Button variant="contained" onClick={() => setFilterAnchor(null)} sx={{ fontSize: 10.5, fontWeight: 800, textTransform: "none" }}>
                  Apply
                </Button>
              </Stack>
            </Stack>
          </Popover>

          <TableContainer sx={{ minHeight: 300, overflowX: "auto" }}>
            <Table size="small" aria-label="Employee leave history" sx={{ minWidth: 1080 }}>
              <TableHead>
                <TableRow>
                  <HeaderCell minWidth={130}>Request ID</HeaderCell>
                  <HeaderCell minWidth={165}>Leave Type</HeaderCell>
                  <HeaderCell minWidth={140}>Start Date</HeaderCell>
                  <HeaderCell minWidth={140}>End Date</HeaderCell>
                  <HeaderCell minWidth={110}>Days</HeaderCell>
                  <HeaderCell minWidth={145}>Return Date</HeaderCell>
                  <HeaderCell minWidth={130}>Status</HeaderCell>
                  <HeaderCell minWidth={52}><Box component="span" sx={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden" }}>Actions</Box></HeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vacationsQuery.isPending ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ height: 245, border: 0 }}>
                      <Stack alignItems="center" justifyContent="center" spacing={1.2}>
                        <CircularProgress size={28} />
                        <Typography sx={{ color: "var(--hr-muted)", fontSize: 11 }}>
                          Loading leave records…
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : !errorMessage && rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ height: 245, border: 0 }}>
                      <Stack alignItems="center" justifyContent="center" spacing={1.1}>
                        <Box sx={{ width: 48, height: 48, display: "grid", placeItems: "center", color: "var(--hr-accent)", bgcolor: "var(--hr-selected)", borderRadius: "50%" }}>
                          <CalendarMonthOutlinedIcon />
                        </Box>
                        <Typography sx={{ color: "var(--hr-text)", fontSize: 12.5, fontWeight: 800 }}>
                          No leave records
                        </Typography>
                        <Typography sx={{ color: "var(--hr-muted)", fontSize: 10.5, textAlign: "center" }}>
                          This employee has no records in dbo.Vacation.
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : !errorMessage && filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ height: 245, border: 0, textAlign: "center" }}>
                      <Typography sx={{ color: "var(--hr-text)", fontSize: 12.5, fontWeight: 800 }}>
                        No matching leave records
                      </Typography>
                      <Typography sx={{ mt: 0.4, color: "var(--hr-muted)", fontSize: 10.5 }}>
                        Try changing the year, search text, or filters.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : visibleRows.map((vacation, index) => {
                  const status = leaveStatus(vacation);
                  const rowIdentifier = vacationId(vacation);
                  const rowKey = rowIdentifier === emptyValue
                    ? `${page}-${index}-${displayValue(readValue(vacation, ["VacationDate_Start", "VacationDateStart"]))}`
                    : rowIdentifier;

                  return (
                    <TableRow
                      key={rowKey}
                      hover
                      sx={{
                        "& .MuiTableCell-root": { height: 49 },
                        "&:hover": { bgcolor: "var(--hr-surface-hover)" }
                      }}
                    >
                      <TableCell sx={{ borderColor: "var(--hr-divider-soft)", color: "var(--hr-text)", fontSize: 11.25, fontWeight: 700 }}>
                        {rowIdentifier}
                      </TableCell>
                      <TableCell sx={{ borderColor: "var(--hr-divider-soft)", color: "var(--hr-row-text)", fontSize: 11.25 }}>
                        {leaveType(vacation)}
                      </TableCell>
                      <TableCell sx={{ borderColor: "var(--hr-divider-soft)", color: "var(--hr-row-text)", fontSize: 11.25, whiteSpace: "nowrap" }}>
                        {formatLeaveDate(readValue(vacation, ["VacationDate_Start", "VacationDateStart"]))}
                      </TableCell>
                      <TableCell sx={{ borderColor: "var(--hr-divider-soft)", color: "var(--hr-row-text)", fontSize: 11.25, whiteSpace: "nowrap" }}>
                        {formatLeaveDate(readValue(vacation, ["VacationDate_End", "VacationDateEnd"]))}
                      </TableCell>
                      <TableCell sx={{ borderColor: "var(--hr-divider-soft)", color: "var(--hr-row-text)", fontSize: 11.25, whiteSpace: "nowrap" }}>
                        {formatDays(vacationDays(vacation))}
                      </TableCell>
                      <TableCell sx={{ borderColor: "var(--hr-divider-soft)", color: "var(--hr-row-text)", fontSize: 11.25, whiteSpace: "nowrap" }}>
                        {formatLeaveDate(readValue(vacation, ["ReturnDate", "Return_Date"]))}
                      </TableCell>
                      <TableCell sx={{ borderColor: "var(--hr-divider-soft)" }}>
                        <Chip
                          label={status.label}
                          size="small"
                          variant="outlined"
                          sx={{ height: 25, color: status.color, bgcolor: status.background, borderColor: status.border, fontSize: 9.5, fontWeight: 850 }}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ borderColor: "var(--hr-divider-soft)", px: 0.5 }}>
                        <IconButton
                          size="small"
                          aria-label={`View details for ${rowIdentifier}`}
                          onClick={() => setSelectedVacation(vacation)}
                          sx={{ color: "var(--hr-text)" }}
                        >
                          <MoreVertRoundedIcon sx={{ fontSize: 19 }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Box
            sx={{
              minHeight: 58,
              px: { xs: 1.5, md: 2.1 },
              py: 1.1,
              display: "flex",
              alignItems: { xs: "flex-start", sm: "center" },
              justifyContent: "space-between",
              flexDirection: { xs: "column", sm: "row" },
              gap: 1,
              borderTop: "1px solid var(--hr-border)"
            }}
          >
            <Typography sx={{ color: "var(--hr-strong-muted)", fontSize: 10.5 }}>
              Showing {firstVisibleRecord.toLocaleString()}–{lastVisibleRecord.toLocaleString()} of {filteredRows.length.toLocaleString()} records
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.65}>
              <IconButton
                size="small"
                aria-label="Previous leave page"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                sx={{ width: 35, height: 35, border: "1px solid var(--hr-border)", borderRadius: "7px" }}
              >
                <ChevronLeftRoundedIcon />
              </IconButton>
              {pageNumbers.map((pageNumber) => (
                <Button
                  key={pageNumber}
                  variant={pageNumber === page ? "contained" : "text"}
                  onClick={() => setPage(pageNumber)}
                  aria-label={`Go to leave page ${pageNumber}`}
                  sx={{
                    minWidth: 35,
                    width: 35,
                    height: 35,
                    p: 0,
                    borderRadius: "7px",
                    color: pageNumber === page ? "var(--hr-on-accent)" : "var(--hr-text)",
                    bgcolor: pageNumber === page ? "var(--hr-accent)" : "transparent",
                    fontSize: 11,
                    fontWeight: 850,
                    "&:hover": { bgcolor: pageNumber === page ? "var(--hr-accent-hover)" : "var(--hr-surface-hover)" }
                  }}
                >
                  {pageNumber}
                </Button>
              ))}
              <IconButton
                size="small"
                aria-label="Next leave page"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                sx={{ width: 35, height: 35, border: "1px solid var(--hr-border)", borderRadius: "7px" }}
              >
                <ChevronRightRoundedIcon />
              </IconButton>
            </Stack>
          </Box>
        </Card>

        {result?.success && result.pagination.total > rows.length ? (
          <Typography sx={{ mt: 0.8, color: "var(--hr-muted)", fontSize: 9.75 }}>
            Showing the latest {rows.length.toLocaleString()} records from {result.pagination.total.toLocaleString()} stored leave records.
          </Typography>
        ) : null}
      </Box>

      <Dialog
        open={Boolean(selectedVacation)}
        onClose={() => setSelectedVacation(null)}
        fullWidth
        maxWidth="md"
        aria-labelledby="leave-record-details-title"
        sx={{
          "& .MuiDialog-paper": {
            border: "1px solid var(--hr-border)",
            borderRadius: { xs: 0, sm: "12px" },
            bgcolor: "var(--hr-surface)",
            boxShadow: "0 24px 70px rgba(7, 28, 89, 0.22)"
          }
        }}
      >
        <DialogTitle component="div" sx={{ px: { xs: 2, md: 2.5 }, py: 1.8, borderBottom: "1px solid var(--hr-border)" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Box>
              <Typography id="leave-record-details-title" sx={{ color: "var(--hr-text)", fontSize: 18, fontWeight: 900 }}>
                Leave Record Details
              </Typography>
              <Typography sx={{ mt: 0.35, color: "var(--hr-muted)", fontSize: 11 }}>
                {selectedVacation ? vacationId(selectedVacation) : emptyValue} · Complete dbo.Vacation record
              </Typography>
            </Box>
            <IconButton aria-label="Close leave record details" onClick={() => setSelectedVacation(null)}>
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, md: 2.5 }, bgcolor: "var(--hr-surface-soft)" }}>
          {selectedVacation ? (
            <Stack spacing={1.5}>
              <TimeSheetCodeDetailsCard vacation={selectedVacation} lookupAvailable={lookupAvailable} />
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                  gap: "1px",
                  overflow: "hidden",
                  border: "1px solid var(--hr-border)",
                  borderRadius: "9px",
                  bgcolor: "var(--hr-divider-soft)"
                }}
              >
                {columns.map((column) => {
                  const rawValue = formatTemporalValue(selectedVacation[column.key], column.dataType);
                  return (
                    <Box key={column.key} sx={{ minWidth: 0, p: 1.35, bgcolor: "var(--hr-surface)" }}>
                      <Typography title={column.key} sx={{ color: "var(--hr-muted)", fontSize: 9.5, fontWeight: 750 }}>
                        {column.label || column.key}
                      </Typography>
                      <Typography
                        dir="auto"
                        sx={{
                          mt: 0.45,
                          color: rawValue === emptyValue ? "var(--hr-muted)" : "var(--hr-row-text)",
                          fontSize: 11.25,
                          fontWeight: 700,
                          lineHeight: 1.5,
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere"
                        }}
                      >
                        {rawValue}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, md: 2.5 }, py: 1.5, borderTop: "1px solid var(--hr-border)" }}>
          <Button onClick={() => setSelectedVacation(null)} sx={{ textTransform: "none", fontWeight: 800 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
