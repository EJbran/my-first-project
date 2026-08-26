import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import FilterAltRoundedIcon from "@mui/icons-material/FilterAltRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Select,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSnackbar } from "notistack";
import { useSearchParams } from "react-router-dom";


import { departmentsApi } from "../../../api/departments.api";
import { employeesApi } from "../../../api/employees.api";
import { locationsApi } from "../../../api/locations.api";
import type { Department } from "../../../types/department.types";
import type {
  EmployeeDatabaseValue,
  EmployeeListRecord,
  EmployeeSearchFilters
} from "../../../types/employee.types";
import type { Location } from "../../../types/location.types";
import { exportToExcel } from "../../../utils/exportExcel";
import { HrPageHeader } from "../jobs/PageHeader";
import { EmployeeDeleteDialog, type EmployeeDeleteTarget } from "./EmployeeDeleteDialog";
import {
  EmployeeFormDrawer,
  type EmployeeDepartmentOption
} from "./EmployeeFormDrawer";
import { EmployeeSearchDialog } from "./EmployeeSearchDialog";
import { getEmployeeDataIssueLabel } from "./employeeSearchFilterOptions";
import { getHrThemeVars } from "../jobs/Theme";

export type EmployeeStatus = "Active" | "On Leave" | "Archived" | "Vacancy" | "Unknown";
type EmployeeFormState =
  | { mode: "create"; employeeId: null }
  | { mode: "edit"; employeeId: number };

type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

type DashboardDrilldownFilters = {
  status: string | null;
  departmentId: string | null;
  locationId: string | null;
  jobId: string | null;
  gender: string | null;
  nationality: string | null;
  placeOfBirth: string | null;
  familyBookIssuer: string | null;
  contractType: string | null;
  ageBand: string | null;
  contractRisk: string | null;
  seniorityMilestone: string | null;
  missingField: string | null;
  search: string | null;
};

export interface EmployeeDirectoryRow {
  id: number;
  kind: "employee" | "vacancy" | "unknown";
  employeeNumber: string;
  name: string;
  email: string;
  gender: "male" | "female" | "unknown";
  nationality: string;
  normalizedNationality: string;
  dateOfBirth: CalendarDate | null;
  placeOfBirth: string;
  normalizedPlaceOfBirth: string;
  familyBookIssuer: string;
  normalizedFamilyBookIssuer: string;
  contractTypeKey: string;
  jobId: string;
  hasResolvedJob: boolean;
  locationId: string;
  departmentId: string;
  department: string;
  workLocation: string;
  jobTitle: string;
  employment: string;
  status: EmployeeStatus;
  contractStart: CalendarDate | null;
  contractEnd: CalendarDate | null;
  recognizedServiceYears: number | null;
  recognizedServiceMonths: number | null;
  recognizedServiceDays: number | null;
  searchIndex: string;
}

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 75, 100];
const EMPTY_EMPLOYEE_SEARCH_FILTERS: EmployeeSearchFilters = {};
const tableColumns = "minmax(260px, 1.45fr) 130px 190px 170px minmax(190px, 1.15fr) 130px 120px 96px";
const DASHBOARD_TIME_ZONE = "Africa/Tripoli";
const DASHBOARD_QUERY_KEYS = [
  "status",
  "departmentId",
  "locationId",
  "jobId",
  "gender",
  "nationality",
  "placeOfBirth",
  "familyBookIssuer",
  "contractType",
  "ageBand",
  "contractRisk",
  "seniorityMilestone",
  "missingField",
  "search"
] as const;

const avatarColors = ["#1d4ed8", "#0f766e", "#7c3aed", "#c2410c", "#0369a1", "#9f1239"];

const toText = (value: EmployeeDatabaseValue | undefined): string =>
  value === null || value === undefined ? "" : String(value).trim();

const getEmployeeDeleteErrorMessage = (error: unknown): string => {
  if (error && typeof error === "object") {
    const responseMessage = (error as { response?: { data?: { message?: unknown } } })
      .response?.data?.message;
    if (typeof responseMessage === "string" && responseMessage.trim()) return responseMessage.trim();
  }
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return "Employee could not be deleted. Please try again.";
};

const toFiniteInteger = (value: EmployeeDatabaseValue | undefined): number | null => {
  const text = toText(value);
  if (!text) return null;
  const number = Number(text);
  return Number.isInteger(number) ? number : null;
};

const ARABIC_DIACRITICS_PATTERN = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const SEARCH_SEPARATOR_PATTERN = /[\s\-_/\\.,،]+/g;

const normalizeSearchText = (value: string): string =>
  value
    .normalize("NFKC")
    .toLowerCase()
    .replace(ARABIC_DIACRITICS_PATTERN, "")
    .replace(/ـ/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/[ىی]/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ک/g, "ك")
    .replace(/\u200C|\u200D|\uFEFF/g, "")
    .replace(SEARCH_SEPARATOR_PATTERN, " ")
    .trim();

const normalizeFilterText = (value: string): string =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")
    .replace(/[\u0649\u06CC]/g, "\u064A")
    .replace(/\u0624/g, "\u0648")
    .replace(/\u0626/g, "\u064A")
    .replace(/\u0629/g, "\u0647")
    .replace(/\u06A9/g, "\u0643")
    .replace(/\u200C/g, "")
    .replace(/\u200D/g, "")
    .replace(/\uFEFF/g, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeNationalityKey = (value: string): string => {
  const normalized = normalizeFilterText(value);
  if (["libya", "libyan", "ليبي", "ليبيه"].includes(normalized)) return "libya";
  return normalized;
};

const UNRECORDED_LOCATION_VALUES = new Set([
  "unknown",
  "unassigned",
  "not recorded",
  "missing",
  "none",
  "null",
  "n/a",
  "na",
  "\u0644\u0627 \u064A\u0648\u062C\u062F",
  "\u063A\u064A\u0631 \u0645\u0639\u0644\u0648\u0645",
  "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641"
]);

const normalizeLocationKey = (value: string): string => {
  const normalized = normalizeFilterText(value);
  if (!normalized || !/\p{L}/u.test(normalized) || UNRECORDED_LOCATION_VALUES.has(normalized)) {
    return "unknown";
  }
  return normalized;
};

const normalizeContractTypeKey = (value: string): string => {
  const normalized = normalizeFilterText(value);
  if (!normalized || ["unknown", "unassigned", "missing"].includes(normalized)) return "unknown";
  if (normalized.startsWith("other:")) return normalized;
  if (["annual", "\u0633\u0646\u0648\u064A"].includes(normalized)) return "annual";
  if (["full-time", "full time", "\u062F\u0648\u0627\u0645 \u0643\u0627\u0645\u0644"].includes(normalized)) return "full-time";
  if (normalized === "training" || normalized.includes("\u062A\u062F\u0631\u064A\u0628")) return "training";
  if (
    ["fixed-term", "fixed term"].includes(normalized)
    || normalized.includes("\u0645\u0648\u0642\u062A")
    || normalized.includes("\u0645\u0648\u0641\u062A")
  ) return "fixed-term";
  if (
    ["service-linked", "service linked"].includes(normalized)
    || normalized.includes("\u0631\u0628\u0637")
    || normalized.includes("\u0631\u064A\u0637")
    || normalized.includes("\u0636\u0645 \u0645\u062F\u0647")
  ) return "service-linked";
  return `other:${normalized}`;
};

const isLeapYear = (year: number): boolean =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const daysInMonth = (year: number, month: number): number => {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
};

const isValidCalendarDate = ({ year, month, day }: CalendarDate): boolean =>
  year >= 1
  && year <= 9999
  && month >= 1
  && month <= 12
  && day >= 1
  && day <= daysInMonth(year, month);

const parseCalendarDate = (value: EmployeeDatabaseValue | undefined): CalendarDate | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/.exec(toText(value));
  if (!match) return null;

  const parsed = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3])
  };
  return isValidCalendarDate(parsed) ? parsed : null;
};

const currentCalendarDate = (): CalendarDate => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DASHBOARD_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.get("year")),
    month: Number(values.get("month")),
    day: Number(values.get("day"))
  };
};

const normalizeGender = (value: EmployeeDatabaseValue | undefined): EmployeeDirectoryRow["gender"] => {
  const normalized = normalizeFilterText(toText(value));
  if (["male", "m", "\u0630\u0643\u0631", "\u062f\u0643\u0631"].includes(normalized)) return "male";
  if (["female", "f", "\u0627\u0646\u062b\u064A"].includes(normalized)) return "female";
  return "unknown";
};

const readDashboardQueryValue = (params: URLSearchParams, key: string): string | null => {
  const value = params.get(key)?.trim() ?? "";
  return value && value.toLocaleLowerCase("en-US") !== "all" ? value : null;
};

const readDashboardDrilldownFilters = (params: URLSearchParams): DashboardDrilldownFilters => ({
  status: readDashboardQueryValue(params, "status"),
  departmentId: readDashboardQueryValue(params, "departmentId"),
  locationId: readDashboardQueryValue(params, "locationId"),
  jobId: readDashboardQueryValue(params, "jobId"),
  gender: readDashboardQueryValue(params, "gender"),
  nationality: readDashboardQueryValue(params, "nationality"),
  placeOfBirth: readDashboardQueryValue(params, "placeOfBirth"),
  familyBookIssuer: readDashboardQueryValue(params, "familyBookIssuer"),
  contractType: readDashboardQueryValue(params, "contractType"),
  ageBand: readDashboardQueryValue(params, "ageBand"),
  contractRisk: readDashboardQueryValue(params, "contractRisk"),
  seniorityMilestone: readDashboardQueryValue(params, "seniorityMilestone"),
  missingField: readDashboardQueryValue(params, "missingField"),
  search: readDashboardQueryValue(params, "search")
});

const hasDashboardFilters = (filters: DashboardDrilldownFilters): boolean =>
  Object.values(filters).some((value) => value !== null);

const calendarDateToIso = (date: CalendarDate): string =>
  `${String(date.year).padStart(4, "0")}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;

const dashboardToSearchFilters = (
  filters: DashboardDrilldownFilters,
  asOf: CalendarDate
): EmployeeSearchFilters => ({
  search: filters.search ?? undefined,
  status: filters.status ?? "employee",
  departmentId: filters.departmentId ?? undefined,
  locationId: filters.locationId ?? undefined,
  jobId: filters.jobId ?? undefined,
  gender: filters.gender ?? undefined,
  nationality: filters.nationality ?? undefined,
  placeOfBirth: filters.placeOfBirth ?? undefined,
  familyBookIssuer: filters.familyBookIssuer ?? undefined,
  contractType: filters.contractType ?? undefined,
  ageBand: filters.ageBand ?? undefined,
  contractRisk: filters.contractRisk ?? undefined,
  seniorityMilestone: filters.seniorityMilestone ?? undefined,
  missingField: filters.missingField ?? undefined,
  asOf: calendarDateToIso(asOf)
});

const countAppliedFilters = (filters: EmployeeSearchFilters | null): number =>
  filters
    ? Object.entries(filters).filter(([key, value]) => key !== "asOf" && value !== undefined && value !== "").length
    : 0;

const isVacancyReference = (value: EmployeeDatabaseValue | undefined): boolean => {
  const text = toText(value);
  if (!text) return false;

  const referenceNumber = Number(text);
  return Number.isFinite(referenceNumber) && referenceNumber === 0;
};

const toReferenceLabel = (value: EmployeeDatabaseValue | undefined, label: string): string => {
  const text = toText(value);
  if (!text) return "—";
  return /^\d+$/.test(text) ? `${label} #${text}` : text;
};

const toJobLabel = (record: EmployeeListRecord): string => {
  const jobName = toText(record.ResolvedJobName) || toText(record.Job_Name);
  return jobName || "—";
};

const toLocationOption = (location: Location) => ({
  id: String(location.ID_Location),
  label: location.LocationName_en?.trim()
    || location.LocationName_ar?.trim()
    || `Location #${location.ID_Location}`
});

const toDepartmentOption = (department: Department): EmployeeDepartmentOption => {
  const id = String(department.Id);
  const englishName = department.DepartmentName_English?.trim() ?? "";
  const arabicName = department.DepartmentName_Arabic?.trim() ?? "";
  const type = department.DepartmentType?.trim() ?? "";
  const searchableLabel = [englishName, arabicName, type].filter(Boolean).join(" · ");

  return {
    id,
    englishName,
    arabicName,
    type,
    label: searchableLabel || `Department #${id}`
  };
};

const toEmployeeStatus = (value: EmployeeDatabaseValue | undefined): EmployeeStatus => {
  if (value === true || value === 1) return "Active";
  if (value === false || value === 0) return "Archived";

  const normalized = toText(value).toLowerCase();
  if (!normalized) return "Unknown";
  if (normalized.includes("leave") || normalized.includes("vacation") || normalized.includes("إجاز")) return "On Leave";
  if (["1", "true", "active", "current", "working", "employed"].includes(normalized) || normalized.includes("شغال")) return "Active";
  if (["0", "false", "archived", "inactive", "stopped"].includes(normalized) || normalized.includes("متوقف")) return "Archived";
  return "Unknown";
};

const normalizeQueryKey = (value: string): string =>
  normalizeFilterText(value)
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[_\s]+/g, "-");

const seniorityMilestoneYears = (value: string | null): number | null => {
  if (!value) return null;
  const match = /^(\d+)(?:-(?:year|years))?$/.exec(normalizeQueryKey(value));
  if (!match) return null;
  const years = Number(match[1]);
  return Number.isInteger(years) && years > 0 && years <= 100 ? years : null;
};

const toDirectoryRow = (record: EmployeeListRecord): EmployeeDirectoryRow => {
  const employeeId = toText(record.ID_Employee);
  const employeeNumber = toText(record.Ref_Employee);
  const englishName = toText(record.EmployeeName_En);
  const arabicName = toText(record.EmployeeName);
  const isVacancy = isVacancyReference(record.Ref_Employee);
  const kind = isVacancy ? "vacancy" : employeeNumber ? "employee" : "unknown";
  const id = Number(employeeId);
  const name = isVacancy ? "Vacant Position" : englishName || arabicName || `Employee ${employeeId}`;
  const nationality = toText(record.Nationality);
  const placeOfBirth = toText(record.PlaceOFBirth);
  const familyBookIssuer = toText(record.FamilyBook_Issuer);
  const contractType = toText(record.Contract_Type);
  const jobName = toText(record.ResolvedJobName) || toText(record.Job_Name);
  const departmentName = toText(record.DepartmentName_English)
    || toText(record.DepartmentName_Arabic);
  const workLocation = toText(record.LocationName_en)
    || toText(record.LocationName_ar);

  return {
    id,
    kind,
    employeeNumber: isVacancy ? "—" : employeeNumber || "—",
    name,
    email: isVacancy ? "Not assigned" : toText(record.Email) || "—",
    gender: normalizeGender(record.Gender),
    nationality,
    normalizedNationality: normalizeNationalityKey(nationality),
    dateOfBirth: parseCalendarDate(record.DateOFBirth),
    placeOfBirth,
    normalizedPlaceOfBirth: normalizeLocationKey(placeOfBirth),
    familyBookIssuer,
    normalizedFamilyBookIssuer: normalizeLocationKey(familyBookIssuer),
    contractTypeKey: normalizeContractTypeKey(contractType),
    jobId: toText(record.Job_Id),
    hasResolvedJob: Boolean(jobName),
    locationId: toText(record.Location_Id),
    departmentId: toText(record.Department_Id),
    department: departmentName || toReferenceLabel(record.Department_Id, "Department"),
    workLocation: workLocation || toReferenceLabel(record.Location_Id, "Location"),
    jobTitle: toJobLabel(record),
    employment: toText(record.Type_Employee) || toText(record.Contract_Type) || "—",
    status: isVacancy ? "Vacancy" : toEmployeeStatus(record.State),
    contractStart: parseCalendarDate(record.Start_of_Contract),
    contractEnd: parseCalendarDate(record.End_of_contrat),
    recognizedServiceYears: toFiniteInteger(record.YearSuppliment_YEAR),
    recognizedServiceMonths: toFiniteInteger(record.YearSuppliment_MONTH),
    recognizedServiceDays: toFiniteInteger(record.Year_suppliment_Day),
    searchIndex: [
      employeeId,
      employeeNumber,
      englishName,
      arabicName,
      toText(record.Email),
      toText(record.Gender),
      nationality,
      toText(record.PlaceOFBirth),
      toText(record.FamilyBook_Issuer),
      toText(record.DepartmentName_English),
      toText(record.DepartmentName_Arabic),
      toText(record.Department_Id),
      toText(record.LocationName_en),
      toText(record.LocationName_ar),
      toText(record.Location_Id),
      toText(record.Job_Id),
      jobName,
      toText(record.Type_Employee),
      toText(record.Contract_Type)
    ].map(normalizeSearchText).filter(Boolean).join(" ")
  };
};

const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

const departmentChipSx = (department: string) => {
  const palette = department.includes("Human")
    ? { color: "#15803d", darkColor: "#86efac", background: "#effaf2", border: "#cdeed7" }
    : department.includes("Maintenance")
      ? { color: "#6d28d9", darkColor: "#c4b5fd", background: "#f5f0ff", border: "#dfd2ff" }
      : department.includes("Operations")
        ? { color: "#a16207", darkColor: "#fcd34d", background: "#fff9eb", border: "#f6dfaa" }
        : { color: "#075fd8", darkColor: "#93c5fd", background: "#eff6ff", border: "#c9ddff" };

  return {
    height: 28,
    borderRadius: "7px",
    color: `light-dark(${palette.color}, ${palette.darkColor})`,
    bgcolor: `light-dark(${palette.background}, color-mix(in srgb, ${palette.color} 18%, #111827))`,
    borderColor: `light-dark(${palette.border}, color-mix(in srgb, ${palette.darkColor} 35%, #2b3950))`,
    fontWeight: 500,
    "& .MuiChip-label": { px: 1.15 }
  };
};

const statusChipSx = (status: EmployeeStatus) => {
  const palette = {
    Active: { color: "#15803d", darkColor: "#86efac", background: "#edf9f0", border: "#ccebd4" },
    Archived: { color: "#334155", darkColor: "#cbd5e1", background: "#f3f5f8", border: "#dce1e8" },
    "On Leave": { color: "#ea6a00", darkColor: "#fdba74", background: "#fff5e8", border: "#ffd9aa" },
    Vacancy: { color: "#0969da", darkColor: "#93c5fd", background: "#eef6ff", border: "#c7ddfb" },
    Unknown: { color: "#475569", darkColor: "#cbd5e1", background: "#f8fafc", border: "#dbe3ec" }
  }[status];

  return {
    height: 28,
    borderRadius: "8px",
    color: `light-dark(${palette.color}, ${palette.darkColor})`,
    bgcolor: `light-dark(${palette.background}, color-mix(in srgb, ${palette.color} 18%, #111827))`,
    borderColor: `light-dark(${palette.border}, color-mix(in srgb, ${palette.darkColor} 35%, #2b3950))`,
    fontWeight: 500,
    "& .MuiChip-icon": { color: "inherit", ml: 0.8, fontSize: 8 },
    "& .MuiChip-label": { px: 1 }
  };
};

interface EmployeeDirectoryViewProps {
  onShowHierarchy: () => void;
  onOpenProfile: (employee: EmployeeDirectoryRow) => void;
}

export const EmployeeDirectoryView = ({
  onShowHierarchy,
  onOpenProfile
}: EmployeeDirectoryViewProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const dashboardFilters = useMemo(
    () => readDashboardDrilldownFilters(new URLSearchParams(searchParamsKey)),
    [searchParamsKey]
  );
  const asOf = useMemo(currentCalendarDate, []);
  const hasDashboardDrilldown = hasDashboardFilters(dashboardFilters);
  const [appliedFilters, setAppliedFilters] = useState<EmployeeSearchFilters | null>(() =>
    hasDashboardFilters(dashboardFilters)
      ? dashboardToSearchFilters(dashboardFilters, asOf)
      : null
  );
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState(
    () => appliedFilters?.employeeNumber ?? appliedFilters?.search ?? ""
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [employeeForm, setEmployeeForm] = useState<EmployeeFormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeDeleteTarget | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const dashboardQueryWasActiveRef = useRef(hasDashboardDrilldown);
  const suppressDashboardResetRef = useRef(false);
  const {
    isPending: employeeDeletePending,
    mutateAsync: deleteEmployee,
    reset: resetEmployeeDelete
  } = useMutation({
    mutationFn: (employeeId: number) => employeesApi.remove(employeeId)
  });

  useEffect(() => {
    const filters = readDashboardDrilldownFilters(new URLSearchParams(searchParamsKey));
    const hasFilters = hasDashboardFilters(filters);

    if (hasFilters) {
      setAppliedFilters(dashboardToSearchFilters(filters, asOf));
      setPage(1);
    } else if (dashboardQueryWasActiveRef.current && !suppressDashboardResetRef.current) {
      setAppliedFilters(null);
      setPage(1);
    }

    dashboardQueryWasActiveRef.current = hasFilters;
    suppressDashboardResetRef.current = false;
  }, [asOf, searchParamsKey]);

  useEffect(() => {
    setQuickSearch(
      appliedFilters?.employeeNumber ?? appliedFilters?.search ?? ""
    );
  }, [appliedFilters?.employeeNumber, appliedFilters?.search]);

  const clearDashboardQueryParams = () => {
    const next = new URLSearchParams(searchParams);
    if (hasDashboardFilters(readDashboardDrilldownFilters(next))) {
      suppressDashboardResetRef.current = true;
    }
    DASHBOARD_QUERY_KEYS.forEach((key) => next.delete(key));
    setSearchParams(next, { replace: true });
  };

  const clearDashboardDrilldown = () => {
    clearDashboardQueryParams();
    setAppliedFilters(null);
    setPage(1);
  };

  const searchRequest = appliedFilters
    ? { ...appliedFilters, page, pageSize }
    : null;

  const employeesQuery = useQuery({
    queryKey: ["employees", "directory", searchRequest],
    queryFn: () => employeesApi.search(searchRequest as NonNullable<typeof searchRequest>),
    enabled: searchRequest !== null,
    staleTime: 30_000
  });

  const searchOptionsQuery = useQuery({
    queryKey: ["employees", "search-options"],
    queryFn: employeesApi.searchOptions,
    enabled: searchDialogOpen || hasDashboardDrilldown,
    staleTime: 10 * 60_000
  });

  const locationsQuery = useQuery({
    queryKey: ["locations", "employee-directory"],
    queryFn: () => locationsApi.list(),
    enabled: employeeForm !== null,
    staleTime: 5 * 60_000
  });

  const departmentsQuery = useQuery({
    queryKey: ["departments", "employee-form-options"],
    queryFn: () => departmentsApi.list(),
    enabled: employeeForm !== null,
    staleTime: 5 * 60_000
  });

  const employeeRows = useMemo(
    () => employeesQuery.data?.success
      ? employeesQuery.data.data.map(toDirectoryRow).filter((row) => Number.isSafeInteger(row.id))
      : [],
    [employeesQuery.data]
  );

  const employeeLoadError = employeesQuery.data && !employeesQuery.data.success
    ? employeesQuery.data.message
    : employeesQuery.error instanceof Error
      ? employeesQuery.error.message
      : null;
  const loadError = employeeLoadError;

  const searchOptions = searchOptionsQuery.data?.success
    ? searchOptionsQuery.data.data
    : undefined;
  const searchOptionsError = searchOptionsQuery.data && !searchOptionsQuery.data.success
    ? searchOptionsQuery.data.message
    : searchOptionsQuery.error instanceof Error
      ? searchOptionsQuery.error.message
      : null;
  const workLocations = searchOptions?.workLocations.map(
    (option) => ({ id: option.value, label: option.label })
  ) ?? [];
  const employeeFormLocations = locationsQuery.data?.success
    ? locationsQuery.data.data.map(toLocationOption)
    : workLocations.filter((location) => /^\d+$/.test(location.id) && Number(location.id) > 0);
  const employeeFormDepartments = departmentsQuery.data?.success
    ? departmentsQuery.data.data.map(toDepartmentOption)
    : [];
  const employeeFormDepartmentsError = departmentsQuery.data && !departmentsQuery.data.success
    ? departmentsQuery.data.message
    : departmentsQuery.error instanceof Error
      ? departmentsQuery.error.message
      : null;
  const filteredRows = employeeRows;

  const pagination = employeesQuery.data?.success
    ? employeesQuery.data.pagination
    : { page, pageSize, total: 0, totalPages: 0 };
  const pageCount = Math.max(1, pagination.totalPages);
  const visibleRows = filteredRows;

  useEffect(() => {
    if (!employeesQuery.data?.success) return;
    if (page > pageCount) setPage(pageCount);
  }, [employeesQuery.data, page, pageCount]);

  const handleExport = () => {
    exportToExcel(
      "employees-current-page",
      [
        { header: "Employee Number", value: (row) => row.employeeNumber },
        { header: "Employee", value: (row) => row.name },
        { header: "Email", value: (row) => row.email },
        { header: "Department", value: (row) => row.department },
        { header: "Work Location", value: (row) => row.workLocation },
        { header: "Job", value: (row) => row.jobTitle },
        { header: "Employee Type", value: (row) => row.employment },
        { header: "Status", value: (row) => row.status }
      ],
      filteredRows
    );
  };

  const firstShown = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const lastShown = pagination.total === 0
    ? 0
    : Math.min(firstShown + visibleRows.length - 1, pagination.total);
  const drilldownLabels: string[] = [];
  if (dashboardFilters.status) drilldownLabels.push(`Status: ${dashboardFilters.status}`);
  if (dashboardFilters.departmentId) {
    const departmentLabel = searchOptions?.departments?.find(
      (item) => item.value === dashboardFilters.departmentId
    )?.label;
    drilldownLabels.push(
      `Department: ${departmentLabel ?? (dashboardFilters.departmentId === "unassigned"
        ? "Unassigned"
        : `#${dashboardFilters.departmentId}`)}`
    );
  }
  if (dashboardFilters.locationId) {
    const locationLabel = workLocations.find((item) => item.id === dashboardFilters.locationId)?.label;
    drilldownLabels.push(`Work location: ${locationLabel ?? `#${dashboardFilters.locationId}`}`);
  }
  if (dashboardFilters.jobId) {
    const jobLabel = searchOptions?.jobs.find((option) => option.value === dashboardFilters.jobId)?.label
      ?? employeeRows.find((row) => row.jobId === dashboardFilters.jobId && row.hasResolvedJob)?.jobTitle;
    drilldownLabels.push(`Job: ${jobLabel ?? (dashboardFilters.jobId === "unassigned" ? "Unassigned" : `#${dashboardFilters.jobId}`)}`);
  }
  if (dashboardFilters.gender) drilldownLabels.push(`Gender: ${dashboardFilters.gender}`);
  if (dashboardFilters.nationality) drilldownLabels.push(`Nationality: ${dashboardFilters.nationality}`);
  if (dashboardFilters.placeOfBirth) drilldownLabels.push(`Place of birth: ${dashboardFilters.placeOfBirth}`);
  if (dashboardFilters.familyBookIssuer) drilldownLabels.push(`Family Book Issuer: ${dashboardFilters.familyBookIssuer}`);
  if (dashboardFilters.contractType) drilldownLabels.push(`Contract type: ${dashboardFilters.contractType.replace(/-/g, " ")}`);
  if (dashboardFilters.ageBand) drilldownLabels.push(`Age: ${dashboardFilters.ageBand}`);
  if (dashboardFilters.contractRisk) drilldownLabels.push(`Contract risk: ${dashboardFilters.contractRisk.replace(/-/g, " ")}`);
  if (dashboardFilters.seniorityMilestone) {
    const years = seniorityMilestoneYears(dashboardFilters.seniorityMilestone);
    drilldownLabels.push(years ? `${years}-year seniority milestone in the next 12 months` : `Seniority: ${dashboardFilters.seniorityMilestone}`);
  }
  if (dashboardFilters.missingField) drilldownLabels.push(`Data issue: ${getEmployeeDataIssueLabel(dashboardFilters.missingField)}`);
  if (dashboardFilters.search) drilldownLabels.push(`Search: “${dashboardFilters.search}”`);

  const optionLabel = (
    collection: "jobs" | "departments" | "workLocations",
    value: string | undefined
  ) => {
    if (!value) return "";
    if (value === "unassigned") return "Unassigned";
    return searchOptions?.[collection]?.find((option) => option.value === value)?.label ?? value;
  };
  const appliedFilterChips: Array<{ key: keyof EmployeeSearchFilters; label: string }> = [];
  if (appliedFilters?.search) appliedFilterChips.push({ key: "search", label: `Search: “${appliedFilters.search}”` });
  if (appliedFilters?.employeeNumber) appliedFilterChips.push({ key: "employeeNumber", label: `Employee number: ${appliedFilters.employeeNumber}` });
  if (appliedFilters?.status) {
    const statusLabel = appliedFilters.status === "employee"
      ? "All employees"
      : appliedFilters.status.replace(/-/g, " ");
    appliedFilterChips.push({ key: "status", label: `Status: ${statusLabel}` });
  }
  if (appliedFilters?.departmentId) {
    appliedFilterChips.push({
      key: "departmentId",
      label: `Department: ${optionLabel("departments", appliedFilters.departmentId)}`
    });
  }
  if (appliedFilters?.locationId) appliedFilterChips.push({ key: "locationId", label: `Work location: ${optionLabel("workLocations", appliedFilters.locationId)}` });
  if (appliedFilters?.jobId) appliedFilterChips.push({ key: "jobId", label: `Job: ${optionLabel("jobs", appliedFilters.jobId)}` });
  if (appliedFilters?.gender) appliedFilterChips.push({ key: "gender", label: `Gender: ${appliedFilters.gender}` });
  if (appliedFilters?.nationality) appliedFilterChips.push({ key: "nationality", label: `Nationality: ${appliedFilters.nationality}` });
  if (appliedFilters?.employeeType) appliedFilterChips.push({ key: "employeeType", label: `Employee type: ${appliedFilters.employeeType}` });
  if (appliedFilters?.contractType) appliedFilterChips.push({ key: "contractType", label: `Contract type: ${appliedFilters.contractType}` });
  if (appliedFilters?.placeOfBirth) appliedFilterChips.push({ key: "placeOfBirth", label: `Place of birth: ${appliedFilters.placeOfBirth}` });
  if (appliedFilters?.familyBookIssuer) appliedFilterChips.push({ key: "familyBookIssuer", label: `Family Book Issuer: ${appliedFilters.familyBookIssuer}` });
  if (appliedFilters?.ageBand) appliedFilterChips.push({ key: "ageBand", label: `Age band: ${appliedFilters.ageBand.replace(/-/g, " ")}` });
  if (appliedFilters?.ageMin !== undefined) appliedFilterChips.push({ key: "ageMin", label: `Minimum age: ${appliedFilters.ageMin}` });
  if (appliedFilters?.ageMax !== undefined) appliedFilterChips.push({ key: "ageMax", label: `Maximum age: ${appliedFilters.ageMax}` });
  if (appliedFilters?.contractRisk) appliedFilterChips.push({ key: "contractRisk", label: `Contract status: ${appliedFilters.contractRisk.replace(/-/g, " ")}` });
  if (appliedFilters?.seniorityMilestone) appliedFilterChips.push({ key: "seniorityMilestone", label: `Seniority: ${appliedFilters.seniorityMilestone} years` });
  if (appliedFilters?.missingField) appliedFilterChips.push({ key: "missingField", label: `Data issue: ${getEmployeeDataIssueLabel(appliedFilters.missingField)}` });
  if (appliedFilters?.contractStartFrom) appliedFilterChips.push({ key: "contractStartFrom", label: `Contract starts from: ${appliedFilters.contractStartFrom}` });
  if (appliedFilters?.contractStartTo) appliedFilterChips.push({ key: "contractStartTo", label: `Contract starts to: ${appliedFilters.contractStartTo}` });
  if (appliedFilters?.contractEndFrom) appliedFilterChips.push({ key: "contractEndFrom", label: `Contract ends from: ${appliedFilters.contractEndFrom}` });
  if (appliedFilters?.contractEndTo) appliedFilterChips.push({ key: "contractEndTo", label: `Contract ends to: ${appliedFilters.contractEndTo}` });

  const removeAppliedFilter = (key: keyof EmployeeSearchFilters) => {
    setAppliedFilters((current) => {
      if (!current) return null;
      const next = { ...current };
      delete next[key];
      return next;
    });
    clearDashboardQueryParams();
    setPage(1);
  };

  const applyEmployeeSearch = (filters: EmployeeSearchFilters) => {
    clearDashboardQueryParams();
    setAppliedFilters(filters);
    setPage(1);
    setSearchDialogOpen(false);
  };

  const submitQuickSearch = () => {
    const search = quickSearch.trim();
    if (!search) return;
    const isEmployeeNumber = /^\d+$/.test(search);

    clearDashboardQueryParams();
    setAppliedFilters((current) => {
      const next = { ...(current ?? {}) };
      delete next.search;
      delete next.employeeNumber;

      if (isEmployeeNumber) {
        next.employeeNumber = search;
      } else {
        next.search = search;
      }

      return next;
    });
    setPage(1);
  };

  const showAllEmployees = () => {
    clearDashboardQueryParams();
    setAppliedFilters({});
    setPage(1);
    setSearchDialogOpen(false);
  };

  const openDeleteDialog = (row: EmployeeDirectoryRow) => {
    if (row.kind !== "employee" || row.id <= 0) return;
    resetEmployeeDelete();
    setDeleteError(null);
    setDeleteTarget({ id: row.id, employeeNumber: row.employeeNumber, name: row.name });
  };

  const closeDeleteDialog = () => {
    if (employeeDeletePending) return;
    setDeleteTarget(null);
    setDeleteError(null);
    resetEmployeeDelete();
  };

  const confirmEmployeeDelete = async (employeeId: number) => {
    setDeleteError(null);

    try {
      const result = await deleteEmployee(employeeId);
      if (!result.success) {
        setDeleteError(result.errors?.join(". ") || result.message);
        return;
      }

      const deletedName = deleteTarget?.name ?? "Employee";
      const moveToPreviousPage = visibleRows.length === 1 && page > 1;
      setDeleteTarget(null);
      if (moveToPreviousPage) setPage((currentPage) => Math.max(1, currentPage - 1));
      enqueueSnackbar(`${deletedName} archived successfully`, { variant: "success" });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["employees"] }),
        queryClient.invalidateQueries({ queryKey: ["hr", "hr-dashboard"] })
      ]);
    } catch (error) {
      setDeleteError(getEmployeeDeleteErrorMessage(error));
    }
  };

  return (
    <Box sx={(theme) => ({ ...getHrThemeVars(theme), pb: 2.5, color: "var(--hr-text)" })}>
      <HrPageHeader
        title="Employee Directory"
        subtitle="Search employee records or use filters to narrow the directory."
        actions={
          <Stack
            direction="row"
            alignItems="center"
            justifyContent={{ xs: "flex-start", lg: "flex-end" }}
            flexWrap="wrap"
            useFlexGap
            gap={1.1}
            sx={{
              "& .MuiButton-root": {
                height: 48,
                px: 2.25,
                borderRadius: "8px",
                textTransform: "none",
                fontSize: 14,
                fontWeight: 650
              }
            }}
          >
            <Button
              variant="outlined"
              startIcon={<AddRoundedIcon />}
              onClick={() => setEmployeeForm({ mode: "create", employeeId: null })}
              sx={{
                color: "var(--hr-text)",
                borderColor: "var(--hr-border)",
                bgcolor: "var(--hr-surface)",
                boxShadow: "none",
                "&:hover": { borderColor: "var(--hr-accent-border)", bgcolor: "var(--hr-surface-hover)", boxShadow: "none" }
              }}
            >
              New Employee
            </Button>
            <Button
              variant="contained"
              startIcon={<AccountTreeRoundedIcon />}
              onClick={onShowHierarchy}
              sx={{
                color: "var(--hr-on-accent)",
                bgcolor: "var(--hr-primary-button)",
                boxShadow: "0 2px 6px rgba(11, 31, 58, 0.2)",
                "&:hover": { bgcolor: "var(--hr-primary-button-hover)", boxShadow: "0 3px 8px rgba(11, 31, 58, 0.25)" }
              }}
            >
              View Hierarchy
            </Button>
          </Stack>
        }
      />

      <Card
        component="form"
        variant="outlined"
        onSubmit={(event) => {
          event.preventDefault();
          submitQuickSearch();
        }}
        sx={{
          mb: 1.5,
          p: { xs: 1.25, sm: 1.5 },
          borderColor: "var(--hr-border)",
          borderRadius: "10px",
          bgcolor: "var(--hr-surface)",
          boxShadow: "var(--hr-shadow)"
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField
            fullWidth
            size="small"
            type="search"
            value={quickSearch}
            onChange={(event) => setQuickSearch(event.target.value)}
            label="Search employees"
            placeholder="Enter an employee name or employee number"
            inputProps={{ "aria-label": "Search employees by name or employee number" }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ color: "var(--hr-muted)", fontSize: 21 }} />
                </InputAdornment>
              )
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                minHeight: 46,
                borderRadius: "8px",
                bgcolor: "var(--hr-surface)"
              }
            }}
          />
          <Button
            type="submit"
            variant="contained"
            startIcon={<SearchRoundedIcon />}
            disabled={!quickSearch.trim()}
            sx={{
              minWidth: { xs: "100%", sm: 132 },
              minHeight: 46,
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: 800
            }}
          >
            Search
          </Button>
        </Stack>
      </Card>

      {appliedFilters === null ? (
        <Card
          variant="outlined"
          sx={{
            minHeight: { xs: 380, md: 470 },
            display: "grid",
            placeItems: "center",
            px: 2.5,
            py: 6,
            textAlign: "center",
            borderColor: "var(--hr-border)",
            borderRadius: "10px",
            bgcolor: "var(--hr-surface)",
            boxShadow: "var(--hr-shadow)"
          }}
        >
          <Stack alignItems="center" spacing={2} sx={{ maxWidth: 560 }}>
            <Box
              aria-hidden="true"
              sx={{
                width: 72,
                height: 72,
                display: "grid",
                placeItems: "center",
                borderRadius: "18px",
                color: "var(--hr-accent)",
                bgcolor: "var(--hr-selected)",
                border: "1px solid var(--hr-accent-border)",
                "& .MuiSvgIcon-root": { fontSize: 34 }
              }}
            >
              <SearchRoundedIcon />
            </Box>
            <Box>
              <Typography component="h2" sx={{ color: "var(--hr-text)", fontSize: { xs: 22, md: 26 }, fontWeight: 850 }}>
                Find an employee
              </Typography>
              <Typography sx={{ mt: 0.75, color: "var(--hr-muted)", fontSize: 14, lineHeight: 1.65 }}>
                Use the search bar above or open the filters to find the records you need. Employee data is not loaded until you start a search.
              </Typography>
            </Box>
            <Stack sx={{ width: { xs: "100%", sm: "auto" } }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<FilterAltRoundedIcon />}
                onClick={() => setSearchDialogOpen(true)}
                sx={{ minWidth: 190, textTransform: "none", fontWeight: 800 }}
              >
                Search by filters
              </Button>
            </Stack>
          </Stack>
        </Card>
      ) : (
        <>
      {loadError ? (
        <Alert
          severity="error"
          sx={{ mb: 1.5 }}
          action={<Button color="inherit" size="small" onClick={() => void employeesQuery.refetch()}>Retry</Button>}
        >
          {loadError}
        </Alert>
      ) : null}

      {hasDashboardDrilldown ? (
        <Alert
          severity="info"
          variant="outlined"
          sx={{ mb: 1.5, py: 0.25, alignItems: "center", "& .MuiAlert-message": { minWidth: 0 } }}
          action={(
            <Button color="inherit" size="small" onClick={clearDashboardDrilldown} sx={{ whiteSpace: "nowrap", textTransform: "none" }}>
              Clear
            </Button>
          )}
        >
          <Typography component="span" sx={{ fontSize: 12.5, fontWeight: 800 }}>Dashboard drill-down</Typography>
          <Typography component="span" sx={{ ml: 0.75, fontSize: 12.5 }}>
            {drilldownLabels.join(" / ")} / {employeesQuery.isPending ? "Loading matches..." : `${pagination.total.toLocaleString()} matching employees`}
          </Typography>
        </Alert>
      ) : null}

      <Card
        variant="outlined"
        sx={{
          borderColor: "var(--hr-border)",
          borderRadius: "10px",
          bgcolor: "var(--hr-surface)",
          boxShadow: "var(--hr-shadow)",
          overflow: "hidden"
        }}
      >
        <Box sx={{ px: 2.5, pt: 2.25, pb: appliedFilterChips.length > 0 ? 1.75 : 2.25 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", md: "center" }}
            justifyContent="space-between"
          >
            <Box aria-live="polite">
              <Typography component="h2" sx={{ color: "var(--hr-text)", fontSize: 18, fontWeight: 850 }}>
                {loadError
                  ? "Search could not be completed"
                  : employeesQuery.isPending
                  ? "Searching employees..."
                  : `${pagination.total.toLocaleString()} ${pagination.total === 1 ? "employee" : "employees"} found`}
              </Typography>
              <Typography sx={{ mt: 0.25, color: "var(--hr-muted)", fontSize: 12.5 }}>
                {loadError
                  ? "The selected filters are preserved so you can retry or edit the search."
                  : "Only the current page of records is loaded from the server."}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                variant="outlined"
                startIcon={<FilterAltRoundedIcon />}
                onClick={() => setSearchDialogOpen(true)}
                sx={{ height: 42, textTransform: "none", fontWeight: 750 }}
              >
                {countAppliedFilters(appliedFilters) > 0
                  ? `Edit filters (${countAppliedFilters(appliedFilters)})`
                  : "Add filters"}
              </Button>
              <IconButton
                aria-label="Export current employee page"
                title="Export current page"
                onClick={handleExport}
                disabled={visibleRows.length === 0}
                sx={{
                  width: 42,
                  height: 42,
                  border: "1px solid var(--hr-border)",
                  borderRadius: "8px",
                  color: "var(--hr-muted)",
                  bgcolor: "var(--hr-surface)",
                  "&:hover": { borderColor: "var(--hr-accent-border)", bgcolor: "var(--hr-surface-hover)" }
                }}
              >
                <FileDownloadRoundedIcon sx={{ fontSize: 20 }} />
              </IconButton>
              <Button
                color="inherit"
                onClick={clearDashboardDrilldown}
                sx={{ height: 42, color: "var(--hr-muted)", textTransform: "none", fontWeight: 700 }}
              >
                Clear results
              </Button>
            </Stack>
          </Stack>

          {appliedFilterChips.length > 0 ? (
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1.75 }} aria-label="Applied employee filters">
              {appliedFilterChips.map((filter) => (
                <Chip
                  key={filter.key}
                  label={filter.label}
                  size="small"
                  onDelete={() => removeAppliedFilter(filter.key)}
                  sx={{ borderRadius: "7px", bgcolor: "var(--hr-surface-soft)" }}
                />
              ))}
            </Stack>
          ) : null}
        </Box>

        <Box sx={{ overflowX: "auto", borderTop: "1px solid var(--hr-border)" }}>
          <Box sx={{ minWidth: 1320 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: tableColumns,
                minHeight: 46,
                alignItems: "center",
                px: 2.5,
                color: "var(--hr-row-text)",
                bgcolor: "var(--hr-surface-soft)",
                borderBottom: "1px solid var(--hr-border)"
              }}
            >
              {['Employee', 'Employee Number', 'Department', 'Work Location', 'Job', 'Employee Type', 'Status', 'Actions'].map((label) => (
                <Typography key={label} sx={{ fontSize: 13, fontWeight: 700 }}>{label}</Typography>
              ))}
            </Box>

            {employeesQuery.isPending ? (
              <Box sx={{ minHeight: 180, display: "grid", placeItems: "center" }}>
                <CircularProgress size={30} />
              </Box>
            ) : visibleRows.map((row) => (
              <Box
                key={row.id}
                onClick={() => {
                  if (row.status !== "Vacancy") onOpenProfile(row);
                }}
                sx={{
                  display: "grid",
                  gridTemplateColumns: tableColumns,
                  minHeight: 68,
                  alignItems: "center",
                  px: 2.5,
                  borderBottom: "1px solid var(--hr-divider-soft)",
                  bgcolor: "var(--hr-surface)",
                  transition: "background-color 140ms ease",
                  cursor: row.status === "Vacancy" ? "default" : "pointer",
                  "&:hover": {
                    bgcolor: row.status === "Vacancy"
                      ? "var(--hr-surface)"
                      : "var(--hr-surface-hover)"
                  }
                }}
              >
                <Stack direction="row" spacing={1.4} alignItems="center" minWidth={0}>
                  {row.status === "Vacancy" ? (
                    <Avatar sx={{ width: 44, height: 44, bgcolor: "var(--hr-surface-soft)", color: "var(--hr-muted)", border: "1px solid var(--hr-border)" }}>
                      <PersonOutlineRoundedIcon />
                    </Avatar>
                  ) : (
                    <Avatar sx={{ width: 44, height: 44, bgcolor: avatarColors[Math.abs(row.id) % avatarColors.length], fontSize: 14, fontWeight: 700 }}>
                      {initials(row.name)}
                    </Avatar>
                  )}
                  <Box minWidth={0}>
                    {row.status === "Vacancy" ? (
                      <Typography sx={{ color: "var(--hr-text)", fontWeight: 650, fontSize: 14 }}>
                        {row.name}
                      </Typography>
                    ) : (
                      <Button
                        variant="text"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenProfile(row);
                        }}
                        sx={{ p: 0, minWidth: 0, color: "var(--hr-text)", justifyContent: "flex-start", fontWeight: 650, fontSize: 14, textTransform: "none" }}
                      >
                        {row.name}
                      </Button>
                    )}
                    <Typography sx={{ display: "block", color: "var(--hr-muted)", fontSize: 12.5 }} noWrap>{row.email}</Typography>
                  </Box>
                </Stack>
                <Typography sx={{ fontSize: 13.5, color: row.employeeNumber === "—" ? "var(--hr-muted)" : "var(--hr-row-text)" }}>{row.employeeNumber}</Typography>
                <Box><Chip variant="outlined" size="small" label={row.department} sx={departmentChipSx(row.department)} /></Box>
                <Typography sx={{ fontSize: 13.5, color: "var(--hr-row-text)" }}>{row.workLocation}</Typography>
                <Typography sx={{ fontSize: 13.5, color: "var(--hr-row-text)" }}>{row.jobTitle}</Typography>
                <Typography sx={{ fontSize: 13.5, color: "var(--hr-row-text)" }}>{row.employment}</Typography>
                <Box>
                  <Chip
                    variant="outlined"
                    size="small"
                    icon={<Box component="span" sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "currentColor" }} />}
                    label={row.status}
                    sx={statusChipSx(row.status)}
                  />
                </Box>
                <Stack direction="row" spacing={0.25} alignItems="center">
                  <IconButton
                    size="small"
                    aria-label={`Edit ${row.name}`}
                    title={row.status === "Vacancy" ? "Vacancies cannot be edited as employees" : `Edit ${row.name}`}
                    disabled={row.status === "Vacancy" || row.id <= 0}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (row.status !== "Vacancy" && row.id > 0) {
                        setEmployeeForm({ mode: "edit", employeeId: row.id });
                      }
                    }}
                    sx={{ color: "var(--hr-row-text)" }}
                  >
                    <EditRoundedIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label={`Delete ${row.name}`}
                    title={row.kind === "employee" ? `Delete ${row.name}` : "Only employee records can be deleted"}
                    disabled={row.kind !== "employee" || row.id <= 0 || employeeDeletePending}
                    onClick={(event) => {
                      event.stopPropagation();
                      openDeleteDialog(row);
                    }}
                    sx={{
                      color: "#b42318",
                      "&:hover": { color: "#912018", bgcolor: "#fef3f2" }
                    }}
                  >
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Box>
            ))}

            {!employeesQuery.isPending && loadError ? (
              <Box sx={{ minHeight: 180, display: "grid", placeItems: "center", px: 2.5, py: 4, textAlign: "center" }}>
                <Stack alignItems="center" spacing={1.25}>
                  <Typography sx={{ color: "var(--hr-text)", fontSize: 16, fontWeight: 800 }}>
                    Employee results could not be loaded
                  </Typography>
                  <Typography sx={{ color: "var(--hr-muted)", fontSize: 13 }}>
                    Use Retry above, or edit the selected filters.
                  </Typography>
                </Stack>
              </Box>
            ) : null}

            {!employeesQuery.isPending && !loadError && visibleRows.length === 0 ? (
              <Box sx={{ minHeight: 220, display: "grid", placeItems: "center", px: 2.5, py: 4, textAlign: "center" }}>
                <Stack alignItems="center" spacing={1.25}>
                  <SearchRoundedIcon sx={{ color: "var(--hr-muted)", fontSize: 32 }} />
                  <Box>
                    <Typography sx={{ color: "var(--hr-text)", fontSize: 16, fontWeight: 800 }}>No employees found</Typography>
                    <Typography sx={{ mt: 0.35, color: "var(--hr-muted)", fontSize: 13 }}>
                      Try changing or removing one of the selected filters.
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<FilterAltRoundedIcon />} onClick={() => setSearchDialogOpen(true)} sx={{ textTransform: "none" }}>
                      Edit search
                    </Button>
                    <Button color="inherit" onClick={clearDashboardDrilldown} sx={{ color: "var(--hr-muted)", textTransform: "none" }}>
                      Clear results
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            ) : null}
          </Box>
        </Box>

        {!loadError ? (
        <Box
          sx={{
            minHeight: 64,
            px: 2.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
            bgcolor: "var(--hr-surface)"
          }}
        >
          <Typography sx={{ color: "var(--hr-muted)", fontSize: 13.5 }}>
            Showing {firstShown}-{lastShown} of {pagination.total.toLocaleString()} employees
          </Typography>
          <Stack direction="row" spacing={2.5} alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography sx={{ color: "var(--hr-muted)", fontSize: 13.5 }}>Rows per page</Typography>
              <Select
                size="small"
                value={pageSize}
                onChange={(event) => {
                  setPage(1);
                  setPageSize(Number(event.target.value));
                }}
                inputProps={{ "aria-label": "Rows per page" }}
                sx={{ minWidth: 72, height: 36, borderRadius: "8px", fontSize: 13.5 }}
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </Select>
            </Stack>
            <Pagination
              count={pageCount}
              page={Math.min(page, pageCount)}
              onChange={(_event, value) => setPage(value)}
              disabled={employeesQuery.isPending || pagination.total === 0}
              size="small"
              shape="rounded"
              siblingCount={0}
              boundaryCount={1}
            />
          </Stack>
        </Box>
        ) : null}
      </Card>
        </>
      )}
      <EmployeeDeleteDialog
        open={deleteTarget !== null}
        employee={deleteTarget}
        pending={employeeDeletePending}
        error={deleteError}
        onClose={closeDeleteDialog}
        onConfirm={confirmEmployeeDelete}
      />
      <EmployeeSearchDialog
        open={searchDialogOpen}
        initialFilters={appliedFilters ?? EMPTY_EMPLOYEE_SEARCH_FILTERS}
        options={searchOptions}
        optionsLoading={searchOptionsQuery.isPending}
        optionsError={searchOptionsError}
        onClose={() => setSearchDialogOpen(false)}
        onApply={applyEmployeeSearch}
        onShowAll={showAllEmployees}
      />
      <EmployeeFormDrawer
        open={employeeForm !== null}
        mode={employeeForm?.mode ?? "create"}
        employeeId={employeeForm?.employeeId}
        departments={employeeFormDepartments}
        departmentsLoading={departmentsQuery.isFetching}
        departmentsError={employeeFormDepartmentsError}
        locations={employeeFormLocations}
        onClose={() => setEmployeeForm(null)}
        onSaved={(employee, mode) => {
          if (mode === "create") {
            setAppliedFilters({ search: toText(employee.Ref_Employee) });
            setPage(1);
            setSearchDialogOpen(false);
          }
          enqueueSnackbar(
            mode === "create" ? "Employee created successfully" : "Employee updated successfully",
            { variant: "success" }
          );
        }}
      />
    </Box>
  );
};
