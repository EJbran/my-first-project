import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import BeachAccessOutlinedIcon from "@mui/icons-material/BeachAccessOutlined";
import BusinessCenterOutlinedIcon from "@mui/icons-material/BusinessCenterOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import WorkOutlineRoundedIcon from "@mui/icons-material/WorkOutlineRounded";
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Chip,
  IconButton,
  LinearProgress,
  Stack,
  Tab,
  Tabs,
  Typography
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import type { ReactElement, ReactNode } from "react";
import { useMemo, useState } from "react";
import { useSnackbar } from "notistack";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { departmentsApi } from "../../../api/departments.api";
import { employeesApi } from "../../../api/employees.api";
import { locationsApi } from "../../../api/locations.api";
import type { Department } from "../../../types/department.types";
import type { EmployeeDatabaseValue, EmployeeRecord } from "../../../types/employee.types";
import type { Location } from "../../../types/location.types";
import {
  EmployeeFormDrawer,
  type EmployeeDepartmentOption
} from "./EmployeeFormDrawer";
import {
  EmployeeCurrentPosition,
  type EmployeeLinkedJobSummary
} from "./EmployeeCurrentPosition";
import { EmployeeOrganizationLocation } from "./EmployeeOrganizationLocation";
import { EmployeeSeniorityReport } from "./EmployeeSeniorityReport";
import { EmployeeVacationRecords } from "./EmployeeVacationRecords";
import { getHrThemeVars } from "../jobs/Theme";

type EmployeeRouteState = {
  employee?: {
    id?: number | string;
    employeeNumber?: string;
    name?: string;
    department?: string;
    workLocation?: string;
    jobTitle?: string;
    status?: string;
  };
};

type ProfileSection = "overview" | "administrative" | "attendance" | "leaves" | "job" | "organization" | "seniority";

type DatabaseField = {
  key: string;
  label: string;
  value?: string;
  accent?: boolean;
};

type FieldCardProps = {
  title: string;
  description?: string;
  icon: ReactNode;
  fields: DatabaseField[];
};

type OverviewFieldCardProps = {
  title: string;
  icon: ReactNode;
  fields: DatabaseField[];
  columns: 2 | 3 | 4;
  minimumHeight: number;
  missingAsChip?: boolean;
  onEdit: () => void;
};

const navy = "var(--hr-text)";
const blue = "var(--hr-accent)";
const muted = "var(--hr-muted)";
const border = "var(--hr-border)";
const emptyValue = "—";

const panelSx = {
  border: `1px solid ${border}`,
  borderRadius: 2,
  bgcolor: "var(--hr-surface)",
  boxShadow: "var(--hr-shadow)"
};

const iconButtonSx = {
  width: 30,
  height: 30,
  border: `1px solid ${border}`,
  borderRadius: 1.2,
  color: blue,
  bgcolor: "var(--hr-surface)"
};

const field = (key: string, label: string, value?: string, accent = false): DatabaseField => ({
  key,
  label,
  value,
  accent
});

const normalizeDatabaseKey = (key: string): string => key.trim().toLowerCase();

const parsePositiveId = (value: string | undefined): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const formatDatabaseValue = (value: EmployeeDatabaseValue | undefined): string | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "boolean") return value ? "Yes" : "No";

  const text = String(value).trim();
  return text || undefined;
};

const readEmployeeValue = (record: EmployeeRecord | undefined, key: string): string | undefined => {
  if (!record) return undefined;
  const normalizedKey = normalizeDatabaseKey(key);
  const entry = Object.entries(record).find(([recordKey]) => normalizeDatabaseKey(recordKey) === normalizedKey);
  return formatDatabaseValue(entry?.[1]);
};

const formatDepartmentLabel = (name?: string, id?: string): string | undefined => {
  if (name && id) return `${name} · ID ${id}`;
  return name ?? (id ? `Department #${id}` : undefined);
};

const formatEmploymentState = (value: EmployeeDatabaseValue | undefined): string | undefined => {
  if (value === true || value === 1) return "Active";
  if (value === false || value === 0) return "Archived";

  const text = formatDatabaseValue(value);
  if (!text) return undefined;
  if (["1", "true"].includes(text.toLowerCase())) return "Active";
  if (["0", "false"].includes(text.toLowerCase())) return "Archived";
  return text;
};

const formatEmployeeCode = (value?: string): string => {
  const normalized = value?.trim();
  if (!normalized) return emptyValue;
  return normalized.toUpperCase().startsWith("EMP-")
    ? normalized.toUpperCase()
    : `EMP-${normalized}`;
};

const formatProfileDate = (value?: string): string => {
  const parsed = dayjs(value);
  return value && parsed.isValid() ? parsed.format("DD MMM YYYY") : value || emptyValue;
};

const OVERVIEW_DATE_FIELDS = new Set([
  "dateofbirth",
  "passportexpirydate",
  "datevisa_end"
]);

const OVERVIEW_BOOLEAN_FIELDS = new Set([
  "is_foreinght",
  "is_drivinglicense"
]);

const OVERVIEW_VALUE_TRANSLATIONS: Record<string, Record<string, string>> = {
  marital_status: {
    "أعزب": "Single",
    "عزباء": "Single",
    "متزوج": "Married",
    "متزوجة": "Married",
    "متزوج و يعول": "Married"
  },
  nationality: {
    "ليبي": "Libyan",
    "ليبية": "Libyan"
  },
  gender: {
    "ذكر": "Male",
    "أنثى": "Female"
  },
  passport_issuer: {
    "طرابلس": "Tripoli"
  }
};

const formatOverviewFieldValue = (item: DatabaseField): string => {
  const rawValue = item.value?.trim();
  if (!rawValue) return emptyValue;

  const normalizedKey = normalizeDatabaseKey(item.key);
  const translatedValue = OVERVIEW_VALUE_TRANSLATIONS[normalizedKey]?.[rawValue];
  if (translatedValue) return translatedValue;
  if (OVERVIEW_DATE_FIELDS.has(normalizedKey)) return formatProfileDate(rawValue);

  if (OVERVIEW_BOOLEAN_FIELDS.has(normalizedKey)) {
    const normalizedValue = rawValue.toLowerCase();
    if (["1", "true", "yes", "y"].includes(normalizedValue)) return "Yes";
    if (["0", "false", "no", "n"].includes(normalizedValue)) return "No";
  }

  return rawValue;
};

const containsArabic = (value: string): boolean => /[\u0600-\u06ff]/u.test(value);

const formatProfileDisplayName = (value: string): string => {
  if (containsArabic(value) || /[a-z]/.test(value)) return value;

  return value
    .toLocaleLowerCase()
    .replace(/(^|[\s-])([a-z])/g, (_match, separator: string, letter: string) =>
      `${separator}${letter.toLocaleUpperCase()}`
    );
};

const formatCompactProfileLabel = (value?: string): string | undefined => value
  ?.replace(/\s+Department$/i, "")
  .replace(/\s+and\s+/gi, " & ")
  .trim();

const toLocationOption = (location: Location) => {
  const id = String(location.ID_Location);
  const englishName = location.LocationName_en?.trim() ?? "";
  const arabicName = location.LocationName_ar?.trim() ?? "";
  const label = englishName && arabicName && englishName !== arabicName
    ? `${englishName} - ${arabicName}`
    : englishName || arabicName || `Location #${id}`;

  return { id, label };
};

const toDepartmentOption = (department: Department): EmployeeDepartmentOption => {
  const id = String(department.Id);
  const englishName = department.DepartmentName_English?.trim() ?? "";
  const arabicName = department.DepartmentName_Arabic?.trim() ?? "";
  const type = department.DepartmentType?.trim() ?? "";

  return {
    id,
    englishName,
    arabicName,
    type,
    label: [englishName, arabicName, type].filter(Boolean).join(" · ")
      || `Department #${id}`
  };
};

const FieldRow = ({ field: item }: { field: DatabaseField }) => {
  const value = item.value?.trim() || emptyValue;

  return (
    <Box
      data-field={item.key}
      sx={{
        display: "grid",
        gridTemplateColumns: "minmax(145px, 0.9fr) minmax(0, 1.1fr)",
        gap: 1.5,
        py: 0.9,
        borderBottom: "1px solid var(--hr-divider-soft)",
        "&:last-child": { borderBottom: 0 }
      }}
    >
      <Typography title={item.key} sx={{ color: "var(--hr-strong-muted)", fontSize: 11.5, fontWeight: 650 }}>
        {item.label}
      </Typography>
      <Typography
        noWrap
        title={value}
        sx={{
          color: item.accent ? blue : value === emptyValue ? muted : navy,
          fontSize: 11.5,
          fontWeight: item.accent ? 800 : 650
        }}
      >
        {value}
      </Typography>
    </Box>
  );
};

const FieldCard = ({ title, description, icon, fields }: FieldCardProps) => (
  <Card sx={{ ...panelSx, p: { xs: 1.6, md: 2 }, height: "100%" }}>
    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={1.15} gap={1.5}>
      <Stack direction="row" alignItems="flex-start" spacing={1} minWidth={0}>
        <Box sx={{ color: navy, display: "grid", placeItems: "center", mt: 0.1 }}>{icon}</Box>
        <Box minWidth={0}>
          <Typography sx={{ color: navy, fontSize: 13.5, fontWeight: 800 }}>{title}</Typography>
          {description ? (
            <Typography sx={{ color: muted, fontSize: 10.5, mt: 0.3 }}>{description}</Typography>
          ) : null}
        </Box>
      </Stack>
      <IconButton size="small" aria-label={`Edit ${title}`} sx={iconButtonSx}>
        <EditRoundedIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Stack>
    {fields.map((item) => (
      <FieldRow key={item.key} field={item} />
    ))}
  </Card>
);

const OverviewFieldCell = ({
  item,
  index,
  columns,
  missingAsChip
}: {
  item: DatabaseField;
  index: number;
  columns: 2 | 3 | 4;
  missingAsChip: boolean;
}) => {
  const value = formatOverviewFieldValue(item);
  const normalizedRawValue = item.value?.trim().toLocaleLowerCase().replace(/\s+/g, "");
  const explicitlyUnavailable = missingAsChip && Boolean(normalizedRawValue) && [
    "لايوجد",
    "none",
    "n/a",
    "notavailable"
  ].includes(normalizedRawValue as string);
  const missing = value === emptyValue || explicitlyUnavailable;
  const isArabic = !missing && containsArabic(value);

  return (
    <Box
      data-field={item.key}
      sx={{
        minWidth: 0,
        minHeight: { xs: 64, md: 61 },
        px: { xs: 1.6, md: 1.9 },
        py: { xs: 1.15, md: 1.25 },
        borderTop: {
          xs: index > 0 ? "1px solid var(--hr-divider-soft)" : 0,
          sm: index >= columns ? "1px solid var(--hr-divider-soft)" : 0
        },
        borderLeft: {
          xs: 0,
          sm: index % columns === 0 ? 0 : "1px solid var(--hr-divider-soft)"
        }
      }}
    >
      <Typography
        title={item.key}
        sx={{
          color: "var(--hr-strong-muted)",
          fontSize: 10.25,
          fontWeight: 550,
          lineHeight: 1.35
        }}
      >
        {item.label}
      </Typography>
      {missing && missingAsChip ? (
        <Chip
          label="Not available"
          size="small"
          variant="outlined"
          sx={{
            height: 22,
            mt: 0.7,
            borderColor: "#f0b53a",
            borderRadius: "11px",
            color: "#bd6b00",
            bgcolor: "#fff8e7",
            fontSize: 10,
            fontWeight: 700,
            "& .MuiChip-label": { px: 1 }
          }}
        />
      ) : (
        <Typography
          title={missing ? undefined : value}
          dir={isArabic ? "rtl" : "ltr"}
          sx={{
            mt: 0.55,
            color: missing ? muted : navy,
            fontSize: 12.35,
            fontWeight: 600,
            lineHeight: 1.42,
            overflowWrap: "anywhere",
            textAlign: isArabic ? "left" : "left"
          }}
        >
          {value}
        </Typography>
      )}
    </Box>
  );
};

const OverviewFieldCard = ({
  title,
  icon,
  fields,
  columns,
  minimumHeight,
  missingAsChip = false,
  onEdit
}: OverviewFieldCardProps) => (
  <Card
    sx={{
      ...panelSx,
      display: "flex",
      flexDirection: "column",
      minHeight: { xs: "auto", lg: minimumHeight },
      overflow: "hidden",
      borderRadius: "10px",
      boxShadow: "0 2px 8px rgba(10, 36, 90, 0.05)"
    }}
  >
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      gap={1.5}
      sx={{ minHeight: 57, px: { xs: 1.5, md: 1.7 } }}
    >
      <Stack direction="row" alignItems="center" spacing={1.15} minWidth={0}>
        <Box
          sx={{
            width: 35,
            height: 35,
            flex: "0 0 auto",
            display: "grid",
            placeItems: "center",
            border: "1px solid var(--hr-accent-border)",
            borderRadius: "50%",
            color: blue,
            bgcolor: "var(--hr-icon-bg)",
            "& .MuiSvgIcon-root": { fontSize: 21 }
          }}
        >
          {icon}
        </Box>
        <Typography
          noWrap
          title={title}
          sx={{ color: navy, fontSize: { xs: 15.5, md: 16.75 }, fontWeight: 700, lineHeight: 1.2 }}
        >
          {title}
        </Typography>
      </Stack>
      <IconButton
        size="small"
        aria-label={`Edit ${title}`}
        onClick={onEdit}
        sx={{ ...iconButtonSx, width: 30, height: 30, flex: "0 0 auto", borderRadius: "7px" }}
      >
        <EditRoundedIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Stack>
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: `repeat(${columns}, minmax(0, 1fr))` },
        flex: 1,
        borderTop: `1px solid ${border}`,
        alignContent: "stretch"
      }}
    >
      {fields.map((item, index) => (
        <OverviewFieldCell
          key={item.key}
          item={item}
          index={index}
          columns={columns}
          missingAsChip={missingAsChip}
        />
      ))}
    </Box>
  </Card>
);

const SchemaTable = ({
  title,
  source,
  description,
  icon,
  columns,
  footerText = "Record values will populate when the database connection is added."
}: {
  title: string;
  source: string;
  description: string;
  icon: ReactNode;
  columns: DatabaseField[];
  footerText?: string;
}) => (
  <Card sx={{ ...panelSx, p: { xs: 1.6, md: 2 } }}>
    <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" gap={1} mb={1.4}>
      <Stack direction="row" alignItems="flex-start" spacing={1}>
        <Box sx={{ color: navy, display: "grid", placeItems: "center", mt: 0.1 }}>{icon}</Box>
        <Box>
          <Typography sx={{ color: navy, fontSize: 13.5, fontWeight: 800 }}>{title}</Typography>
          <Typography sx={{ color: muted, fontSize: 10.5, mt: 0.3 }}>{description}</Typography>
        </Box>
      </Stack>
      <Chip
        label={source}
        size="small"
        variant="outlined"
        sx={{ height: 25, color: blue, borderColor: "var(--hr-accent-border)", fontSize: 10, fontWeight: 750 }}
      />
    </Stack>

    <Box sx={{ overflowX: "auto", border: `1px solid ${border}`, borderRadius: 1.4 }}>
      <Box sx={{ minWidth: Math.max(680, columns.length * 155) }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns.length}, minmax(155px, 1fr))`,
            bgcolor: "var(--hr-surface-soft)",
            borderBottom: `1px solid ${border}`
          }}
        >
          {columns.map((column) => (
            <Box key={column.key} data-field={column.key} sx={{ px: 1.35, py: 1.05, borderRight: "1px solid var(--hr-divider-soft)", "&:last-child": { borderRight: 0 } }}>
              <Typography sx={{ color: "var(--hr-strong-muted)", fontSize: 10.5, fontWeight: 800 }}>
                {column.label}
              </Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: `repeat(${columns.length}, minmax(155px, 1fr))` }}>
          {columns.map((column) => (
            <Typography key={column.key} sx={{ px: 1.35, py: 1.15, color: muted, fontSize: 11 }}>
              {column.value?.trim() || emptyValue}
            </Typography>
          ))}
        </Box>
      </Box>
    </Box>
    <Typography sx={{ color: muted, fontSize: 10.5, mt: 1 }}>{footerText}</Typography>
  </Card>
);

const ProfileFact = ({
  icon,
  label,
  value,
  divider = false
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  divider?: boolean;
}) => (
  <Stack
    direction="row"
    alignItems="center"
    spacing={1}
    sx={{
      minWidth: 0,
      minHeight: { xs: 64, md: 62 },
      px: { xs: 0, md: 0.55, xl: 0.8 },
      py: 1.1,
      borderBottom: divider ? "1px solid var(--hr-divider-soft)" : 0
    }}
  >
    <Box
      sx={{
        width: 31,
        flex: "0 0 auto",
        color: navy,
        display: "grid",
        placeItems: "center",
        "& .MuiSvgIcon-root": { fontSize: 27 }
      }}
    >
      {icon}
    </Box>
    <Box minWidth={0}>
      <Typography sx={{ color: muted, fontSize: 10.25, lineHeight: 1.2 }}>{label}</Typography>
      <Typography
        noWrap
        title={value || emptyValue}
        sx={{
          color: value ? navy : muted,
          fontSize: 11.4,
          fontWeight: 750,
          lineHeight: 1.35,
          mt: 0.45
        }}
      >
        {value || emptyValue}
      </Typography>
    </Box>
  </Stack>
);

const tabs: Array<{ value: ProfileSection; label: string; icon: ReactElement }> = [
  { value: "overview", label: "Overview", icon: <DashboardRoundedIcon /> },
  { value: "administrative", label: "Administrative", icon: <BusinessCenterOutlinedIcon /> },
  { value: "attendance", label: "Attendance", icon: <CalendarMonthOutlinedIcon /> },
  { value: "leaves", label: "Leaves", icon: <BeachAccessOutlinedIcon /> },
  { value: "job", label: "Job", icon: <WorkOutlineRoundedIcon /> },
  { value: "organization", label: "Organization & Location", icon: <AccountTreeOutlinedIcon /> },
  { value: "seniority", label: "Seniority", icon: <AssessmentOutlinedIcon /> }
];

const timeSheetColumns = [
  field("Id", "Record ID"),
  field("ID_Employee", "Employee ID"),
  field("J_1 TO  J_31", "Day Codes (J1–J31)"),
  field("DATE_JS", "Timesheet Date"),
  field("E1 To E31", "Entry Times (E1–E31)"),
  field("S1 To S31", "Exit Times (S1–S31)"),
  field("Job_Name", "Job Name"),
  field("AFE1 To AFE31", "Projects / Accomplishments (AFE1–AFE31)"),
  field("IS_Approved", "Approved"),
  field("ID_Approved", "Approved By"),
  field("Notes", "Notes")
];

const timeSheetCodeColumns = [
  field("Id", "Code ID"),
  field("Code_Description", "Code Description"),
  field("Code", "Code")
];

export default function EmployeeProfilePage() {
  const { employeeId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [activeSection, setActiveSection] = useState<ProfileSection>("overview");
  const [editEmployeeOpen, setEditEmployeeOpen] = useState(false);
  const routeState = (location.state as EmployeeRouteState | null)?.employee;

  const profileQuery = useQuery({
    queryKey: ["employees", employeeId],
    queryFn: () => employeesApi.getById(employeeId as string),
    enabled: Boolean(employeeId),
    staleTime: 60_000
  });

  const locationsQuery = useQuery({
    queryKey: ["locations", "employee-directory"],
    queryFn: () => locationsApi.list(),
    enabled: editEmployeeOpen,
    staleTime: 5 * 60_000
  });

  const departmentsQuery = useQuery({
    queryKey: ["departments", "employee-form-options"],
    queryFn: () => departmentsApi.list(),
    enabled: editEmployeeOpen || activeSection === "organization",
    staleTime: 5 * 60_000
  });

  const employeeRecord = profileQuery.data?.success ? profileQuery.data.data : undefined;
  const loadError = profileQuery.data && !profileQuery.data.success
    ? profileQuery.data.message
    : profileQuery.error instanceof Error
      ? profileQuery.error.message
      : null;

  const recordLookup = useMemo(
    () => new Map(
      Object.entries(employeeRecord ?? {}).map(([key, value]) => [normalizeDatabaseKey(key), value])
    ),
    [employeeRecord]
  );

  const hydrateFields = (fields: DatabaseField[]): DatabaseField[] => fields.map((item) => {
    const normalizedKey = normalizeDatabaseKey(item.key);
    if (!recordLookup.has(normalizedKey)) return item;
    return { ...item, value: formatDatabaseValue(recordLookup.get(normalizedKey)) ?? item.value };
  });

  const employee = useMemo(
    () => {
      const jobName = readEmployeeValue(employeeRecord, "ResolvedJobName")
        ?? readEmployeeValue(employeeRecord, "Job_Name")
        ?? routeState?.jobTitle;
      const assignedUnitName = readEmployeeValue(employeeRecord, "DepartmentName_English")
        ?? readEmployeeValue(employeeRecord, "DepartmentName_Arabic")
        ?? routeState?.department;
      const assignedUnitId = readEmployeeValue(employeeRecord, "Department_Id")
        ?? readEmployeeValue(employeeRecord, "ResolvedDepartmentId");
      const assignedUnitType = readEmployeeValue(employeeRecord, "DepartmentType");
      const parentDepartmentName = readEmployeeValue(employeeRecord, "ParentDepartmentName_English")
        ?? readEmployeeValue(employeeRecord, "ParentDepartmentName_Arabic");
      const parentDepartmentId = readEmployeeValue(employeeRecord, "ParentDepartmentId");
      const hasParentDepartment = Boolean(parentDepartmentName || parentDepartmentId);
      const departmentName = parentDepartmentName ?? assignedUnitName;
      const departmentId = parentDepartmentId ?? assignedUnitId;
      const isSameDepartment = parentDepartmentId && assignedUnitId
        ? parentDepartmentId === assignedUnitId
        : parentDepartmentName && assignedUnitName
          ? parentDepartmentName.trim().toLocaleLowerCase() === assignedUnitName.trim().toLocaleLowerCase()
          : false;
      const assignedUnit = hasParentDepartment && !isSameDepartment
        ? formatDepartmentLabel(assignedUnitName, assignedUnitId)
        : undefined;

      return {
        id: readEmployeeValue(employeeRecord, "ID_Employee") ?? (routeState?.id ? String(routeState.id) : employeeId),
        employeeNumber: readEmployeeValue(employeeRecord, "Ref_Employee") ?? routeState?.employeeNumber,
        name: readEmployeeValue(employeeRecord, "EmployeeName_En") ?? readEmployeeValue(employeeRecord, "EmployeeName") ?? routeState?.name,
        workLocation: readEmployeeValue(employeeRecord, "ResolvedLocationName_en")
          ?? readEmployeeValue(employeeRecord, "ResolvedLocationName_ar")
          ?? readEmployeeValue(employeeRecord, "LocationName_en")
          ?? readEmployeeValue(employeeRecord, "LocationName_ar")
          ?? readEmployeeValue(employeeRecord, "Location_Id")
          ?? routeState?.workLocation,
        departmentName,
        department: formatDepartmentLabel(departmentName, departmentId),
        assignedUnit,
        assignedUnitLabel: assignedUnit ? assignedUnitType ?? "Assigned unit" : undefined,
        jobName,
        employeeType: readEmployeeValue(employeeRecord, "Type_Employee"),
        contractType: readEmployeeValue(employeeRecord, "Contract_Type"),
        status: formatEmploymentState(employeeRecord?.State) ?? routeState?.status,
        email: readEmployeeValue(employeeRecord, "Email"),
        phone: readEmployeeValue(employeeRecord, "Phone"),
        financeNumber: readEmployeeValue(employeeRecord, "Finance_Num"),
        contractStart: readEmployeeValue(employeeRecord, "Start_of_Contract"),
        profileImageUrl: readEmployeeValue(employeeRecord, "ProfileImageUrl")
          ?? readEmployeeValue(employeeRecord, "PhotoUrl")
      };
    },
    [employeeId, employeeRecord, routeState]
  );

  const locationOptions = useMemo(() => {
    const options = locationsQuery.data?.success
      ? locationsQuery.data.data.map(toLocationOption)
      : [];
    const knownIds = new Set(options.map((option) => option.id));
    const currentLocationId = readEmployeeValue(employeeRecord, "Location_Id")
      ?? readEmployeeValue(employeeRecord, "ResolvedLocationId");

    if (currentLocationId && !knownIds.has(currentLocationId)) {
      const currentLocationName = readEmployeeValue(employeeRecord, "ResolvedLocationName_en")
        ?? readEmployeeValue(employeeRecord, "ResolvedLocationName_ar")
        ?? `Location #${currentLocationId}`;
      options.push({ id: currentLocationId, label: currentLocationName });
    }

    return options;
  }, [employeeRecord, locationsQuery.data]);

  const assignedDepartmentId = parsePositiveId(
    readEmployeeValue(employeeRecord, "ResolvedDepartmentId")
  ) ?? parsePositiveId(
    readEmployeeValue(employeeRecord, "Department_Id")
  );

  const departmentOptions = useMemo(() => {
    const options = departmentsQuery.data?.success
      ? departmentsQuery.data.data.map(toDepartmentOption)
      : [];
    const knownIds = new Set(options.map((option) => option.id));
    const currentDepartmentId = assignedDepartmentId
      ? String(assignedDepartmentId)
      : undefined;

    if (currentDepartmentId && !knownIds.has(currentDepartmentId)) {
      const englishName = readEmployeeValue(employeeRecord, "DepartmentName_English") ?? "";
      const arabicName = readEmployeeValue(employeeRecord, "DepartmentName_Arabic") ?? "";
      const type = readEmployeeValue(employeeRecord, "DepartmentType") ?? "";
      options.push({
        id: currentDepartmentId,
        englishName,
        arabicName,
        type,
        label: [englishName, arabicName, type].filter(Boolean).join(" · ")
          || `Department #${currentDepartmentId}`
      });
    }

    return options;
  }, [assignedDepartmentId, departmentsQuery.data, employeeRecord]);
  const departmentsError = departmentsQuery.data && !departmentsQuery.data.success
    ? departmentsQuery.data.message
    : departmentsQuery.error instanceof Error
      ? departmentsQuery.error.message
      : null;

  const organizationFallbackDepartments = useMemo(() => {
    const recordedParentId = parsePositiveId(readEmployeeValue(employeeRecord, "DepartmentAttachedNumber"));
    const fallback: Department[] = [];

    if (assignedDepartmentId) {
      fallback.push({
        Id: assignedDepartmentId,
        DepartmentName_English: readEmployeeValue(employeeRecord, "DepartmentName_English") ?? "",
        DepartmentName_Arabic: readEmployeeValue(employeeRecord, "DepartmentName_Arabic") ?? "",
        DepartmentType: readEmployeeValue(employeeRecord, "DepartmentType") ?? null,
        AttachedNumber: recordedParentId,
        DepartmentAddress: readEmployeeValue(employeeRecord, "DepartmentAddress") ?? "",
        DepartmentPhone: readEmployeeValue(employeeRecord, "DepartmentPhone") ?? "",
        DepartmentExtenstion: readEmployeeValue(employeeRecord, "DepartmentExtenstion") ?? ""
      });
    }

    return fallback;
  }, [assignedDepartmentId, employeeRecord]);

  const numericEmployeeId = Number(employeeId);
  const canEditEmployee = Number.isSafeInteger(numericEmployeeId) && numericEmployeeId > 0;

  const displayName = employee.name || "Employee Record";
  const heroDisplayName = formatProfileDisplayName(displayName);
  const heroJobName = formatCompactProfileLabel(employee.jobName);
  const heroDepartmentName = formatCompactProfileLabel(employee.departmentName || employee.department);
  const initials = employee.name
    ? employee.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : "ER";
  const employeeCode = formatEmployeeCode(employee.employeeNumber);
  const profileCompletenessValues = [
    employee.name,
    employee.employeeNumber,
    employee.jobName,
    employee.departmentName,
    employee.workLocation,
    employee.email,
    employee.phone,
    employee.contractStart,
    readEmployeeValue(employeeRecord, "DateOFBirth"),
    readEmployeeValue(employeeRecord, "Nationality"),
    readEmployeeValue(employeeRecord, "Gender"),
    employee.profileImageUrl
  ];
  const completedProfileFields = profileCompletenessValues.filter((value) => Boolean(value?.trim())).length;
  const profileCompleteness = Math.round((completedProfileFields / profileCompletenessValues.length) * 100);
  const profileCompletenessMessage = profileCompleteness === 100
    ? "This employee profile is complete."
    : profileCompleteness >= 90
      ? "Great job! Only a few details left to complete."
      : profileCompleteness >= 70
        ? "A few important profile details still need attention."
        : "Complete the missing details to improve this profile.";
  const linkedJobSummary: EmployeeLinkedJobSummary = {
    family: readEmployeeValue(employeeRecord, "Job_Family"),
    careerLevel: readEmployeeValue(employeeRecord, "Career_Level"),
    criticality: readEmployeeValue(employeeRecord, "Role_Criticality"),
    purpose: readEmployeeValue(employeeRecord, "Role_Purpose"),
    accountabilities: readEmployeeValue(employeeRecord, "Key_Accountabilities")
  };

  const handleExportProfile = () => {
    const previousTitle = document.title;
    const fileIdentity = employee.employeeNumber || employee.id || "employee";
    document.title = `Employee_Profile_${String(fileIdentity).replace(/[^a-z0-9_-]+/gi, "_")}`;
    window.print();
    document.title = previousTitle;
  };

  const basicFields = [
    field("ID_Employee", "Employee ID", employee.id),
    field("Ref_Employee", "Employee Number", employee.employeeNumber, true),
    field("EmployeeName", "Employee Name (Arabic)"),
    field("EmployeeName_En", "Employee Name (English)", employee.name),
    field("Address", "Current Residential Address"),
    field("Phone", "Phone Number"),
    field("Email", "Email Address"),
    field("Notes", "Notes")
  ];

  const personalFields = [
    field("Marital_Status", "Marital Status"),
    field("Nationality", "Nationality"),
    field("DateOFBirth", "Date of Birth"),
    field("MotherName", "Mother's Name"),
    field("PlaceOFBirth", "Place of Birth"),
    field("Gender", "Gender"),
    field("Blood_type", "Blood Type"),
    field("Children_Number", "Number of Children"),
    field("IS_FOREINGHT", "Foreign Employee")
  ];

  const civilIdentityFields = [
    field("NationalNumber", "National Number", undefined, true),
    field("Registration_Num", "Registration Number"),
    field("FamilyBook_No", "Family Book Number"),
    field("FamilyBook_Issuer", "Family Book Issuer"),
    field("FamilyPage_Num", "Family Record Number"),
    field("FamilyPageBook_Num", "Family Book Page Number"),
    field("IdentityCard_Num", "Identity Card Number"),
    field("IdentityCard_Issuer", "Identity Card Issuer")
  ];

  const drivingLicenseNumber = readEmployeeValue(employeeRecord, "DrivingLicense_Num");
  const drivingLicenseStatus = readEmployeeValue(employeeRecord, "IS_DrivingLicense")
    ?? (drivingLicenseNumber?.replace(/\s+/g, "") === "لايوجد" ? "No" : undefined);

  const travelAndLicenseFields = [
    field("Passport_Num", "Passport Number"),
    field("Passport_Issuer", "Passport Issuer"),
    field("PassportExpiryDate", "Passport Expiry Date"),
    field("DateVisa_End", "Residence Permit Expiry Date"),
    field("IS_DrivingLicense", "Has Driving License", drivingLicenseStatus),
    field("DrivingLicense_Num", "Driving License Number")
  ];

  const employmentFields = [
    field("Start_of_Contract", "Contract Start Date"),
    field("End_of_contrat", "Contract End Date"),
    field("Contract_Type", "Contract Type"),
    field("Period_Contract", "Contract Duration"),
    field("Type_Employee", "Employee Type"),
    field("State", "Employment State", employee.status),
    field("Location_Id", "Work Location ID"),
    field("WorkSystem", "Work System"),
    field("WorkSystem_Description", "Work and Employment System"),
    field("Time_Start", "Work Start Time"),
    field("Time_End", "Work End Time")
  ];

  const jobAssignmentFields = [
    field("ResolvedJobName", "Current Job Name", employee.jobName),
    field("ResolvedJobName_AR", "Current Job Name (Arabic)"),
    field("CurrentPositionNumber", "Position Number"),
    field("CurrentPositionType", "Position Type"),
    field("CurrentPositionLevel", "Position Level"),
    field("CurrentPositionDegree", "Position Degree"),
    field("CurrentLineLevelName_EN", "Line Level (English)"),
    field("CurrentLineLevelName_AR", "Line Level (Arabic)"),
    field("Degree_Employee", "Employee Grade"),
    field("IS_OK_POUR_MALAK", "Show in Staffing Structure")
  ];

  const decisionFields = [
    field("AppointmentDecision_Number", "Appointment Decision Number"),
    field("AppointmentDecision_Date", "Appointment Decision Date"),
    field("AppointmentDecision_Issuer", "Appointment Decision Issuer"),
    field("CompanyDecision_Number", "Company Decision Number"),
    field("CompanyDecision_Date", "Company Decision Date"),
    field("AppointmentType", "Appointment Decision Type"),
    field("Type_END_CONTRACT", "End-of-Contract Procedure Type")
  ];

  const financeFields = [
    field("ResolvedBankBranch", "Bank Name"),
    field("Finance_Num", "Financial Number"),
    field("INAS_Type", "Social Insurance Type"),
    field("INAS_Number", "Social Insurance Number"),
    field("BankAccount_Number", "Bank Account Number"),
    field("Base_Salary", "Basic Salary"),
    field("FieldAllowance", "Field Allowance")
  ];

  const qualificationFields = [
    field("EducationalQualification_AsHiring", "Qualification at Appointment"),
    field("AcademicQualification_AsTime", "Current Academic Qualification"),
    field("GraduationDate", "Graduation Date"),
    field("Specialization", "Specialization"),
    field("CurrentQualification_Date", "Current Qualification Date")
  ];

  const serviceFields = [
    field("VacationTransfer_Date", "Vacation Balance Transfer Date"),
    field("Vacation_balance", "Transferred Vacation Balance"),
    field("Year_suppliment_Day", "Added Service Days"),
    field("DateYear_Suppliment", "Service Inclusion Date"),
    field("YearSuppliment_YEAR", "Added Service Years"),
    field("YearSuppliment_MONTH", "Added Service Months"),
    field("PracticeLicense_Start", "Professional Practice Start"),
    field("PracticeLicense_End", "Professional Practice End")
  ];

  const controlFields = [
    field("ZONNE", "Foreign Employee Zone"),
    field("IS_EMPRENTED", "Fingerprint Attendance Required"),
    field("TYPE_TRAVAIL_WARDIA", "Work Shift"),
    field("Stop_takrim", "Stop Honorarium"),
    field("Notes_Stop_takrim", "Honorarium Stop Reason"),
    field("Percent_takrim", "Honorarium Payment Percentage"),
    field("Date_urgent_takrim", "Honorarium Payment Date")
  ];

  const historyFields = [
    field("OLD_EMP_NUM2", "Previous Employee Number 2"),
    field("OLD_EMP_NUM3", "Previous Employee Number 3"),
    field("OLD_EMP_NUM4", "Previous Employee Number 4"),
    field("OLD_EMP_NUM5", "Previous Employee Number 5"),
    field("OLD_JobId3", "Previous Job 1"),
    field("OLD_JobDEGREE_3", "Previous Job 1 Grade"),
    field("OLD_JobNum3", "Previous Job 1 Number"),
    field("OLD_JobId4", "Previous Job 2"),
    field("OLD_JobDEGREE_4", "Previous Job 2 Grade"),
    field("OLD_JobNum4", "Previous Job 2 Number"),
    field("OLD_JobId5", "Previous Job 3"),
    field("OLD_JobDEGREE_5", "Previous Job 3 Grade"),
    field("OLD_JobNum5", "Previous Job 3 Number"),
    field("Tadawul_No", "Circulation Number")
  ];

  const healthAndEquipmentFields = [
    field("MedicalSymptoms", "Medical Conditions / Symptoms"),
    field("SuitNumber", "Uniform Number"),
    field("ShoesNumber", "Shoe Size"),
    field("Comment_one", "Employee-Specific Comment")
  ];

  return (
    <Box
      sx={(theme) => ({
        ...getHrThemeVars(theme),
        color: navy,
        pb: 0,
        pl: { xs: 0, md: 1 },
        pr: 0
      })}
    >
      {profileQuery.isPending ? <LinearProgress sx={{ mb: 0.75, borderRadius: 1 }} /> : null}
      {loadError ? (
        <Alert
          severity="error"
          sx={{ mb: 1.5 }}
          action={<Button color="inherit" size="small" onClick={() => void profileQuery.refetch()}>Retry</Button>}
        >
          {loadError}
        </Alert>
      ) : null}

      <Box
        component="header"
        data-testid="employee-profile-page-header"
        sx={{
          display: "flex",
          alignItems: { xs: "stretch", sm: "flex-end" },
          justifyContent: "space-between",
          flexDirection: { xs: "column", sm: "row" },
          gap: 1.5,
          pt: { xs: 0.8, md: 2.55 },
          mb: { xs: 1.65, md: 2.9 }
        }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} mb={{ xs: 1.35, md: 2.1 }}>
            <Button
              variant="text"
              size="small"
              onClick={() => navigate("/human-resources/employees/employees-list")}
              sx={{
                minWidth: 0,
                p: 0,
                color: blue,
                fontSize: 11.5,
                fontWeight: 800,
                textTransform: "none",
                "&:hover": { bgcolor: "transparent", textDecoration: "underline" }
              }}
            >
              Employees
            </Button>
            <Typography aria-hidden sx={{ color: "var(--hr-soft-muted)", fontSize: 12 }}>/</Typography>
            <Typography sx={{ color: muted, fontSize: 11.5, fontWeight: 650 }}>Employee Profile</Typography>
          </Stack>
          <Typography
            component="h1"
            sx={{ color: navy, fontSize: { xs: 25, md: 28 }, fontWeight: 700, lineHeight: 1.1 }}
          >
            Employee Profile
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            alignSelf: { xs: "stretch", sm: "flex-end" },
            transform: { sm: "translateY(9px)" }
          }}
        >
          <Button
            variant="outlined"
            startIcon={<FileUploadOutlinedIcon />}
            onClick={handleExportProfile}
            sx={{
              minWidth: { xs: 0, sm: 138 },
              minHeight: 43,
              flex: { xs: 1, sm: "0 0 auto" },
              borderColor: "var(--hr-accent-border)",
              borderRadius: "7px",
              color: navy,
              bgcolor: "var(--hr-surface)",
              fontSize: 12.25,
              fontWeight: 750,
              textTransform: "none",
              "& .MuiSvgIcon-root": { fontSize: 20 }
            }}
          >
            Export Profile
          </Button>
          <Button
            variant="contained"
            startIcon={<EditRoundedIcon />}
            onClick={() => setEditEmployeeOpen(true)}
            disabled={!canEditEmployee}
            sx={{
              minWidth: { xs: 0, sm: 162 },
              minHeight: 43,
              flex: { xs: 1, sm: "0 0 auto" },
              borderRadius: "7px",
              color: "var(--hr-on-accent)",
              bgcolor: blue,
              boxShadow: "0 5px 12px rgba(11, 75, 234, 0.16)",
              fontSize: 12.25,
              fontWeight: 750,
              textTransform: "none",
              "& .MuiSvgIcon-root": { fontSize: 20 },
              "&:hover": { bgcolor: "var(--hr-accent-hover)" }
            }}
          >
            Edit Employee
          </Button>
        </Stack>
      </Box>

      <Card
        data-testid="employee-profile-hero"
        sx={{
          ...panelSx,
          overflow: "hidden",
          minHeight: { lg: 175 },
          mb: 1.7,
          borderRadius: "10px",
          boxShadow: "0 3px 10px rgba(10, 36, 90, 0.05)"
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(0, 1fr) minmax(0, 1fr)",
              lg: "minmax(430px, 1.39fr) minmax(390px, 1fr) minmax(198px, 0.48fr)"
            },
            alignItems: "center",
            minHeight: { lg: 173 },
            columnGap: { md: 1, lg: 2 },
            px: { xs: 1.8, md: 3.25 },
            py: { xs: 1.8, lg: 1.55 }
          }}
        >
          <Stack direction="row" alignItems="center" spacing={{ xs: 1.7, md: 2.4 }} minWidth={0}>
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              badgeContent={
                <Box
                  sx={{
                    width: 17,
                    height: 17,
                    borderRadius: "50%",
                    bgcolor: employee.status === "Active" ? "#1fbd67" : "var(--hr-soft-muted)",
                    border: "2px solid var(--hr-surface)"
                  }}
                />
              }
            >
              <Avatar
                src={employee.profileImageUrl}
                alt={heroDisplayName}
                sx={{
                  width: { xs: 86, sm: 104, lg: 116 },
                  height: { xs: 86, sm: 104, lg: 116 },
                  border: `1px solid ${border}`,
                  bgcolor: "var(--hr-icon-bg)",
                  color: "#0b2b7f",
                  fontSize: { xs: 29, sm: 37, lg: 42 },
                  fontWeight: 800
                }}
              >
                {initials}
              </Avatar>
            </Badge>
            <Box minWidth={0}>
              <Typography
                title={heroDisplayName}
                sx={{
                  maxWidth: 460,
                  color: navy,
                  fontSize: { xs: 20, sm: 23, lg: 27 },
                  fontWeight: 700,
                  lineHeight: 1.12,
                  overflowWrap: "anywhere"
                }}
              >
                {heroDisplayName}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1} mt={1} minWidth={0} flexWrap="wrap" useFlexGap>
                <Typography
                  title={heroJobName || emptyValue}
                  sx={{ minWidth: 0, color: "var(--hr-strong-muted)", fontSize: 13.25, fontWeight: 650 }}
                >
                  {heroJobName || emptyValue}
                </Typography>
                {employee.status ? (
                  <Chip
                    label={employee.status}
                    size="small"
                    variant="outlined"
                    sx={{
                      height: 25,
                      color: "var(--hr-success-text)",
                      borderColor: "#b8e9cc",
                      bgcolor: "var(--hr-success-bg)",
                      fontSize: 10.5,
                      fontWeight: 650,
                      "& .MuiChip-label": { px: 1.1 }
                    }}
                  />
                ) : null}
              </Stack>
              <Typography sx={{ mt: 1, color: "var(--hr-strong-muted)", fontSize: 13.25, fontWeight: 650 }}>
                {employeeCode}
              </Typography>
            </Box>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1.25fr) minmax(0, 0.75fr)" },
              alignItems: "stretch",
              minWidth: 0,
              mt: { xs: 1.8, md: 0 }
            }}
          >
            <ProfileFact
              icon={<ApartmentOutlinedIcon />}
              label="Department"
              value={heroDepartmentName}
              divider
            />
            <ProfileFact
              icon={<LocationOnOutlinedIcon />}
              label="Location"
              value={employee.workLocation}
              divider
            />
            <ProfileFact
              icon={<EmailOutlinedIcon />}
              label="Work Email"
              value={employee.email}
            />
            <ProfileFact
              icon={<CalendarMonthOutlinedIcon />}
              label="Joined"
              value={formatProfileDate(employee.contractStart)}
            />
          </Box>

          <Box
            sx={{
              gridColumn: { xs: "auto", md: "1 / -1", lg: "auto" },
              minWidth: 0,
              alignSelf: "stretch",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              mt: { xs: 1.5, lg: 0 },
              pt: { xs: 1.6, md: 1.6, lg: 0 },
              pl: { xs: 0, lg: 4.7 },
              borderTop: { xs: `1px solid ${border}`, lg: 0 },
              borderLeft: { xs: 0, lg: `1px solid ${border}` }
            }}
          >
            <Typography sx={{ color: "var(--hr-strong-muted)", fontSize: 12.25, fontWeight: 650 }}>
              Profile completeness
            </Typography>
            <Typography sx={{ mt: 0.25, color: blue, fontSize: 27, fontWeight: 750, lineHeight: 1.2 }}>
              {profileCompleteness}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={profileCompleteness}
              aria-label={`Profile completeness ${profileCompleteness}%`}
              sx={{
                width: "100%",
                maxWidth: 156,
                height: 9,
                mt: 1.35,
                borderRadius: 999,
                bgcolor: "var(--hr-surface-soft)",
                "& .MuiLinearProgress-bar": { borderRadius: 999, bgcolor: blue }
              }}
            />
            <Typography
              sx={{
                maxWidth: 156,
                mt: 1.45,
                color: "var(--hr-strong-muted)",
                fontSize: 10.5,
                lineHeight: 1.45
              }}
            >
              {profileCompletenessMessage}
            </Typography>
          </Box>
        </Box>
      </Card>

      <Card
        data-testid="employee-profile-tabs"
        sx={{
          ...panelSx,
          width: "100%",
          mb: 1.7,
          overflow: "hidden",
          borderRadius: "9px",
          boxShadow: "0 3px 10px rgba(10, 36, 90, 0.05)"
        }}
      >
        <Tabs
          value={activeSection}
          onChange={(_event, value: ProfileSection) => setActiveSection(value)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Employee profile navigation"
          sx={{
            minHeight: 51,
            px: { xs: 0.4, md: 1 },
            "& .MuiTabs-indicator": { display: "none" },
            "& .MuiTabs-flexContainer": { minWidth: "100%" },
            "& .MuiTabScrollButton-root": { width: 30 },
            "& .MuiTab-root": {
              flex: "1 0 auto",
              minHeight: 51,
              minWidth: 112,
              px: 1.3,
              borderRadius: 0,
              color: "var(--hr-strong-muted)",
              fontSize: 11.5,
              fontWeight: 700,
              textTransform: "none",
              transition: "color 140ms ease",
              "& .MuiTab-iconWrapper": { mr: 1, "& .MuiSvgIcon-root": { fontSize: 21 } },
              "&.Mui-selected": {
                position: "relative",
                color: blue,
                "&::after": {
                  position: "absolute",
                  bottom: 0,
                  left: "50%",
                  width: 112,
                  height: 3,
                  borderRadius: "3px 3px 0 0",
                  bgcolor: blue,
                  content: "\"\"",
                  transform: "translateX(-50%)"
                }
              }
            }
          }}
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              icon={tab.icon}
              iconPosition="start"
              sx={{
                minWidth: tab.value === "administrative"
                  ? 144
                  : tab.value === "organization"
                    ? 190
                    : tab.value === "seniority"
                      ? 126
                      : 112
              }}
            />
          ))}
        </Tabs>
      </Card>

      {activeSection === "organization" ? (
        <Box
          data-testid="organization-section-heading"
          sx={{
            display: "flex",
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            flexDirection: { xs: "column", sm: "row" },
            gap: 1.2,
            px: { xs: 0.4, md: 1.1 },
            mb: 1
          }}
        >
          <Box>
            <Typography sx={{ color: blue, fontSize: 8, fontWeight: 850, letterSpacing: 0.22 }}>
              EMPLOYEE ORGANIZATION
            </Typography>
            <Typography sx={{ color: navy, fontSize: { xs: 20, md: 23 }, fontWeight: 850, lineHeight: 1.15, mt: 0.25 }}>
              Organization &amp; Location
            </Typography>
            <Typography sx={{ color: muted, fontSize: 9.5, mt: 0.45 }}>
              A clear view of the employee&apos;s reporting path, assigned unit, and primary workplace.
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.8}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<HistoryRoundedIcon />}
              onClick={() => enqueueSnackbar("Organization history is not connected yet.", { variant: "info" })}
              sx={{
                minHeight: 30,
                px: 1.2,
                borderColor: border,
                borderRadius: "6px",
                color: navy,
                fontSize: 8.75,
                fontWeight: 750,
                textTransform: "none",
                "& .MuiSvgIcon-root": { fontSize: 15 }
              }}
            >
              View History
            </Button>
            <IconButton
              size="small"
              aria-label="More organization actions"
              onClick={() => enqueueSnackbar("No additional organization actions are available.", { variant: "info" })}
              sx={{ width: 31, height: 30, border: `1px solid ${border}`, borderRadius: "6px", color: navy }}
            >
              <MoreVertRoundedIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Stack>
        </Box>
      ) : null}

      {activeSection === "overview" ? (
        <Box
          data-testid="employee-profile-overview"
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" },
            columnGap: 2.75,
            rowGap: 1.55,
            alignItems: "stretch"
          }}
        >
          <OverviewFieldCard
            title="Employment & Contact"
            icon={<PersonOutlineRoundedIcon />}
            fields={hydrateFields(basicFields)}
            columns={2}
            minimumHeight={312}
            onEdit={() => setEditEmployeeOpen(true)}
          />
          <OverviewFieldCard
            title="Personal Details"
            icon={<PersonOutlineRoundedIcon />}
            fields={hydrateFields(personalFields)}
            columns={3}
            minimumHeight={312}
            onEdit={() => setEditEmployeeOpen(true)}
          />
          <OverviewFieldCard
            title="National & Civil Identification"
            icon={<BadgeOutlinedIcon />}
            fields={hydrateFields(civilIdentityFields)}
            columns={4}
            minimumHeight={211}
            onEdit={() => setEditEmployeeOpen(true)}
          />
          <OverviewFieldCard
            title="Travel & Licenses"
            icon={<FactCheckOutlinedIcon />}
            fields={hydrateFields(travelAndLicenseFields)}
            columns={3}
            minimumHeight={211}
            missingAsChip
            onEdit={() => setEditEmployeeOpen(true)}
          />
        </Box>
      ) : activeSection === "administrative" ? (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "repeat(2, minmax(0, 1fr))" }, gap: 1.35, alignItems: "stretch" }}>
          <FieldCard title="Employment & Contract" icon={<BusinessCenterOutlinedIcon />} fields={hydrateFields(employmentFields)} />
          <FieldCard title="Position & Job Classification" icon={<WorkOutlineRoundedIcon />} fields={hydrateFields(jobAssignmentFields)} />
          <FieldCard title="Appointment & Company Decisions" icon={<FactCheckOutlinedIcon />} fields={hydrateFields(decisionFields)} />
          <FieldCard title="Finance & Social Insurance" icon={<PaymentsOutlinedIcon />} fields={hydrateFields(financeFields)} />
          <FieldCard title="Qualifications" icon={<BadgeOutlinedIcon />} fields={hydrateFields(qualificationFields)} />
          <FieldCard title="Leave Balance & Service" icon={<CalendarMonthOutlinedIcon />} fields={hydrateFields(serviceFields)} />
          <FieldCard title="Workforce Controls & Honorarium" icon={<ScheduleRoundedIcon />} fields={hydrateFields(controlFields)} />
          <FieldCard title="Previous Employee & Job Records" icon={<WorkOutlineRoundedIcon />} fields={hydrateFields(historyFields)} />
          <FieldCard title="Health, Equipment & Comments" icon={<PersonOutlineRoundedIcon />} fields={hydrateFields(healthAndEquipmentFields)} />
        </Box>
      ) : activeSection === "attendance" ? (
        <Stack spacing={1.35}>
          <SchemaTable title="Employee Timesheets" source="TimeSheet" description="Monthly day codes, entry and exit times, work details, and approval fields." icon={<CalendarMonthOutlinedIcon />} columns={timeSheetColumns} />
          <SchemaTable title="Timesheet Codes" source="TimeSheetCode" description="Reference codes used by employee attendance and vacation records." icon={<ScheduleRoundedIcon />} columns={timeSheetCodeColumns} />
        </Stack>
      ) : activeSection === "leaves" ? (
        canEditEmployee ? (
          <EmployeeVacationRecords
            key={numericEmployeeId}
            employeeId={numericEmployeeId}
            enabled={activeSection === "leaves"}
          />
        ) : (
          <Alert severity="warning">A valid employee ID is required to load vacation records.</Alert>
        )
      ) : activeSection === "job" ? (
        canEditEmployee ? (
          <EmployeeCurrentPosition
            employeeId={numericEmployeeId}
            employeeName={displayName}
            department={heroDepartmentName || employee.departmentName || employee.department}
            location={employee.workLocation}
            linkedJob={linkedJobSummary}
          />
        ) : (
          <Alert severity="warning">A valid employee ID is required to load the current position.</Alert>
        )
      ) : activeSection === "organization" ? (
        <EmployeeOrganizationLocation
          employee={{
            id: employee.id,
            employeeNumber: employee.employeeNumber,
            name: displayName,
            initials,
            profileImageUrl: readEmployeeValue(employeeRecord, "ProfileImageUrl")
              ?? readEmployeeValue(employeeRecord, "PhotoUrl"),
            jobName: employee.jobName,
            lineLevel: readEmployeeValue(employeeRecord, "CurrentLineLevelName_EN")
              ?? readEmployeeValue(employeeRecord, "CurrentLineLevelName_AR"),
            positionNumber: readEmployeeValue(employeeRecord, "CurrentPositionNumber"),
            positionType: readEmployeeValue(employeeRecord, "CurrentPositionType"),
            positionLevel: readEmployeeValue(employeeRecord, "CurrentPositionLevel"),
            positionDegree: readEmployeeValue(employeeRecord, "CurrentPositionDegree"),
            contractStart: employee.contractStart,
            assignedDepartmentId: assignedDepartmentId
              ? String(assignedDepartmentId)
              : undefined,
            locationId: readEmployeeValue(employeeRecord, "ResolvedLocationId")
              ?? readEmployeeValue(employeeRecord, "Location_Id"),
            locationNameEnglish: readEmployeeValue(employeeRecord, "ResolvedLocationName_en")
              ?? readEmployeeValue(employeeRecord, "LocationName_en"),
            locationNameArabic: readEmployeeValue(employeeRecord, "ResolvedLocationName_ar")
              ?? readEmployeeValue(employeeRecord, "LocationName_ar"),
            locationCode: readEmployeeValue(employeeRecord, "ResolvedLocationCode"),
            locationMapAvailable: readEmployeeValue(employeeRecord, "ResolvedLocationInMap") === "Available",
            workSystem: readEmployeeValue(employeeRecord, "WorkSystem"),
            workSystemDescription: readEmployeeValue(employeeRecord, "WorkSystem_Description"),
            workStart: readEmployeeValue(employeeRecord, "Time_Start"),
            workEnd: readEmployeeValue(employeeRecord, "Time_End")
          }}
          departments={departmentsQuery.data?.success ? departmentsQuery.data.data : []}
          fallbackDepartments={organizationFallbackDepartments}
          loading={departmentsQuery.isFetching}
          error={departmentsError}
        />
      ) : activeSection === "seniority" ? (
        <EmployeeSeniorityReport employee={employee} />
      ) : null}
      <Box
        component="footer"
        sx={{
          mt: 4,
          minHeight: 56,
          ml: { xs: -2, md: -4 },
          mr: { xs: -2, md: -3 },
          px: 2,
          display: "grid",
          placeItems: "center",
          borderTop: `1px solid ${border}`,
          bgcolor: "var(--hr-surface)"
        }}
      >
        <Typography sx={{ color: "var(--hr-strong-muted)", fontSize: 11.5, textAlign: "center" }}>
          © 2026 Harouge Oil Operations. All rights reserved.
        </Typography>
      </Box>
      <EmployeeFormDrawer
        open={editEmployeeOpen}
        mode="edit"
        employeeId={canEditEmployee ? numericEmployeeId : null}
        departments={departmentOptions}
        departmentsLoading={departmentsQuery.isFetching}
        departmentsError={departmentsError}
        locations={locationOptions}
        onClose={() => setEditEmployeeOpen(false)}
        onSaved={() => {
          enqueueSnackbar("Employee updated successfully", { variant: "success" });
        }}
      />
    </Box>
  );
}
