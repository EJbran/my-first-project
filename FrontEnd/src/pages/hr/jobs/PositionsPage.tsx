import AddRoundedIcon from "@mui/icons-material/AddRounded";
import BusinessCenterRoundedIcon from "@mui/icons-material/BusinessCenterRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import Groups2RoundedIcon from "@mui/icons-material/Groups2Rounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import ViewColumnOutlinedIcon from "@mui/icons-material/ViewColumnOutlined";
import ViewListRoundedIcon from "@mui/icons-material/ViewListRounded";
import {
  Alert,
  Autocomplete,
  Avatar,
  Badge,
  Box,
  Breadcrumbs,
  Button,
  Card,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  LinearProgress,
  Link,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Skeleton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { jobsApi } from "../../../api/jobs.api";
import { positionsApi } from "../../../api/positions.api";
import type { JobOption } from "../../../types/job.types";
import type { PositionListParams, PositionListSummary, PositionRecord } from "../../../types/position.types";
import { exportToExcel } from "../../../utils/exportExcel";
import { getHrThemeVars } from "./Theme";

const PositionDetailsPanel = lazy(() => import("./PositionDetailsPanel").then((module) => ({ default: module.PositionDetailsPanel })));
const PositionFormDialog = lazy(() => import("./PositionFormDialog"));

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_VISIBLE_COLUMNS = ["job", "details", "employee", "occupancy", "dataStatus"] as const;
type OptionalColumn = (typeof DEFAULT_VISIBLE_COLUMNS)[number];
type PositionSortKey = "positionId" | "positionNumber" | "job" | "positionType" | "positionLevel" | "employee" | "occupancy" | "dataStatus";
type SortDirection = "asc" | "desc";

const EMPTY_SUMMARY: PositionListSummary = { total: 0, occupied: 0, vacant: 0, missingJob: 0 };
const EM_DASH = "\u2014";

const positionCode = (positionId: number): string => `POS-${String(positionId).padStart(6, "0")}`;
const jobCode = (jobId: number): string => `JOB-${String(jobId).padStart(6, "0")}`;
const employeeCode = (employeeNumber: string | null | undefined): string => {
  const value = employeeNumber?.trim() ?? "";
  if (!value) return EM_DASH;
  if (/^EMP-/i.test(value)) return value;
  return /^\d+$/.test(value) ? `EMP-${value.padStart(6, "0")}` : `EMP-${value}`;
};
const displayValue = (value: unknown): string => value === null || value === undefined || String(value).trim() === "" ? EM_DASH : String(value);
const jobLabel = (job: JobOption): string => `${job.Job_Name_EN} \u00b7 ${jobCode(job.JobId)}`;

const numberParam = (value: string | null, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const sortParam = (value: string | null): PositionSortKey => {
  const allowed = new Set<PositionSortKey>(["positionId", "positionNumber", "job", "positionType", "positionLevel", "employee", "occupancy", "dataStatus"]);
  return value && allowed.has(value as PositionSortKey) ? value as PositionSortKey : "positionId";
};

const employeeInitials = (position: PositionRecord): string => {
  const source = position.EmployeeName_EN?.trim() || position.EmployeeName_AR?.trim() || "";
  if (!source) return "?";
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ""}${words[words.length - 1][0] ?? ""}`.toUpperCase();
};

const avatarTone = (positionId: number) => {
  const tones = [
    { color: "#155eef", bg: "#eaf1ff", border: "#cbdcff" },
    { color: "#7e22ce", bg: "#f6edff", border: "#e5d2fa" },
    { color: "#087a43", bg: "#eaf8f0", border: "#c8ebd8" },
    { color: "#b54708", bg: "#fff4e8", border: "#f6d8b4" }
  ];
  return tones[positionId % tones.length];
};

const SummaryMetric = ({
  icon: Icon,
  value,
  label,
  tone,
  note,
  loading
}: {
  icon: SvgIconComponent;
  value: number;
  label: string;
  tone: "blue" | "green" | "amber";
  note?: string;
  loading: boolean;
}) => {
  const palette = {
    blue: { color: "#155eef", bg: "#eef4ff", border: "#c9d9ff" },
    green: { color: "#08a75a", bg: "#ecfaf3", border: "#c8eedb" },
    amber: { color: "#f3a11b", bg: "#fff7e9", border: "#f8deb2" }
  }[tone];

  return (
    <Stack direction="row" alignItems="center" justifyContent="center" spacing={1.35} sx={{ minWidth: 0, py: 0.2 }}>
      <Box sx={{ width: 46, height: 46, flex: "0 0 auto", display: "grid", placeItems: "center", borderRadius: "50%", color: palette.color, bgcolor: palette.bg, border: `1px solid ${palette.border}` }}>
        <Icon sx={{ fontSize: 23 }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        {loading ? <Skeleton width={68} height={29} /> : <Typography sx={{ color: "var(--hr-text)", fontSize: { xs: 21, xl: 24 }, fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.03em" }}>{value.toLocaleString()}</Typography>}
        <Typography sx={{ mt: 0.3, color: "var(--hr-muted)", fontSize: 11, fontWeight: 650, lineHeight: 1.15 }}>{label}</Typography>
        {note ? <Typography sx={{ mt: 0.1, color: "#e08000", fontSize: 9.25, fontWeight: 800, lineHeight: 1.1 }}>{note}</Typography> : null}
      </Box>
    </Stack>
  );
};

const columnDefinitions: Array<{ key: OptionalColumn; label: string; sortKey: PositionSortKey; minWidth: number }> = [
  { key: "job", label: "Job", sortKey: "job", minWidth: 285 },
  { key: "details", label: "Position Details", sortKey: "positionType", minWidth: 230 },
  { key: "employee", label: "Assigned Employee", sortKey: "employee", minWidth: 310 },
  { key: "occupancy", label: "Occupancy", sortKey: "occupancy", minWidth: 145 },
  { key: "dataStatus", label: "Data Status", sortKey: "dataStatus", minWidth: 145 }
];

export default function PositionsPage() {
  const navigate = useNavigate();
  const { positionId: positionIdParam } = useParams<{ positionId?: string }>();
  const [urlParams, setUrlParams] = useSearchParams();
  const selectedPositionId = positionIdParam && /^[1-9]\d*$/.test(positionIdParam) ? Number(positionIdParam) : null;
  const queryClient = useQueryClient();
  const [page, setPage] = useState(() => numberParam(urlParams.get("page"), 1));
  const [pageSize, setPageSize] = useState(() => PAGE_SIZE_OPTIONS.includes(numberParam(urlParams.get("pageSize"), 10)) ? numberParam(urlParams.get("pageSize"), 10) : 10);
  const [searchDraft, setSearchDraft] = useState(() => urlParams.get("search") ?? "");
  const [search, setSearch] = useState(() => urlParams.get("search") ?? "");
  const [occupancy, setOccupancy] = useState<"" | "occupied" | "vacant">(() => urlParams.get("occupancy") === "occupied" || urlParams.get("occupancy") === "vacant" ? urlParams.get("occupancy") as "occupied" | "vacant" : "");
  const [positionType, setPositionType] = useState(() => urlParams.get("positionType") ?? "");
  const [status, setStatus] = useState(() => urlParams.get("status") ?? "");
  const [selectedJob, setSelectedJob] = useState<JobOption | null>(null);
  const [jobInput, setJobInput] = useState("");
  const [jobSearch, setJobSearch] = useState("");
  const [jobPickerOpen, setJobPickerOpen] = useState(false);
  const [sortBy, setSortBy] = useState<PositionSortKey>(() => sortParam(urlParams.get("sortBy")));
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => urlParams.get("sortDirection") === "desc" ? "desc" : "asc");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "grid">(() => urlParams.get("view") === "grid" ? "grid" : "list");
  const [visibleColumns, setVisibleColumns] = useState<Set<OptionalColumn>>(() => new Set(DEFAULT_VISIBLE_COLUMNS));
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<PositionRecord | null>(null);
  const [columnsAnchor, setColumnsAnchor] = useState<HTMLElement | null>(null);
  const [rowMenu, setRowMenu] = useState<{ anchor: HTMLElement; position: PositionRecord } | null>(null);
  const [toast, setToast] = useState("");
  const [loadedAt, setLoadedAt] = useState(() => new Date());
  const deleteMutation = useMutation({
    mutationFn: (positionId: number) => positionsApi.remove(positionId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["hr", "positions", "list"] }),
        queryClient.invalidateQueries({ queryKey: ["hr", "positions", "options"] }),
        queryClient.invalidateQueries({ queryKey: ["hr", "hr-dashboard"] })
      ]);
    }
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  useEffect(() => {
    const timer = window.setTimeout(() => setJobSearch(jobInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [jobInput]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (page > 1) next.set("page", String(page));
    if (pageSize !== 10) next.set("pageSize", String(pageSize));
    if (search) next.set("search", search);
    if (occupancy) next.set("occupancy", occupancy);
    if (positionType) next.set("positionType", positionType);
    if (status) next.set("status", status);
    if (sortBy !== "positionId") next.set("sortBy", sortBy);
    if (sortDirection !== "asc") next.set("sortDirection", sortDirection);
    if (viewMode !== "list") next.set("view", viewMode);
    setUrlParams(next, { replace: true });
  }, [occupancy, page, pageSize, positionType, search, setUrlParams, sortBy, sortDirection, status, viewMode]);

  const listParams: PositionListParams & { sortBy: PositionSortKey; sortDirection: SortDirection } = {
    page,
    pageSize,
    search: search || undefined,
    occupancy: occupancy || undefined,
    positionType: positionType || undefined,
    jobId: selectedJob?.JobId,
    status: status || undefined,
    sortBy,
    sortDirection
  };

  const listQuery = useQuery({
    queryKey: ["hr", "positions", "list", listParams],
    queryFn: () => positionsApi.list(listParams),
    placeholderData: (previous) => previous,
    staleTime: 20_000
  });

  const positionOptionsQuery = useQuery({
    queryKey: ["hr", "positions", "options", "filters"],
    queryFn: positionsApi.options,
    staleTime: 5 * 60_000
  });

  const jobOptionsQuery = useQuery({
    queryKey: ["hr", "jobs", "options", "position-filter", jobSearch],
    queryFn: () => jobsApi.options({ search: jobSearch || undefined, limit: 30 }),
    enabled: jobPickerOpen,
    staleTime: 60_000
  });

  useEffect(() => {
    if (listQuery.dataUpdatedAt > 0) setLoadedAt(new Date(listQuery.dataUpdatedAt));
  }, [listQuery.dataUpdatedAt]);

  const result = listQuery.data;
  const rows = result?.success ? result.data : [];
  const pagination = result?.success ? result.pagination : { page, pageSize, total: 0, totalPages: 0 };
  const summary = result?.success ? result.summary ?? EMPTY_SUMMARY : EMPTY_SUMMARY;
  const positionOptions = positionOptionsQuery.data?.success ? positionOptionsQuery.data.data : null;
  const jobOptions = jobOptionsQuery.data?.success ? jobOptionsQuery.data.data.jobs : [];
  const errorMessage = result && !result.success
    ? result.errors?.join(". ") || result.message
    : listQuery.isError
      ? "The position register could not be loaded."
      : null;
  const activeFilterCount = [occupancy, positionType, selectedJob, status].filter(Boolean).length;
  const filtersActive = Boolean(searchDraft || activeFilterCount);
  const allPageSelected = rows.length > 0 && rows.every((position) => selectedIds.has(position.PositionId));
  const somePageSelected = rows.some((position) => selectedIds.has(position.PositionId));
  const occupancyRate = summary.total > 0 ? (summary.occupied / summary.total) * 100 : 0;

  useEffect(() => {
    setSelectedIds(new Set());
  }, [occupancy, page, pageSize, positionType, search, selectedJob, status]);

  const resetFilters = () => {
    setSearchDraft("");
    setSearch("");
    setOccupancy("");
    setPositionType("");
    setStatus("");
    setSelectedJob(null);
    setJobInput("");
    setPage(1);
  };

  const selectPosition = (position: PositionRecord) => navigate(`/human-resources/jobs/positions/${position.PositionId}`);
  const closeDetails = () => navigate("/human-resources/jobs/positions");
  const onCreated = (position: PositionRecord) => {
    setPage(1);
    navigate(`/human-resources/jobs/positions/${position.PositionId}`);
  };

  const onSaved = (position: PositionRecord) => {
    setFormOpen(false);
    setEditingPosition(null);
    navigate(`/human-resources/jobs/positions/${position.PositionId}`);
  };

  const editPosition = (position: PositionRecord) => {
    setEditingPosition(position);
    setFormOpen(true);
    setRowMenu(null);
  };

  const deletePosition = (position: PositionRecord) => {
    if (position.EmployeeId) {
      setToast("Occupied positions cannot be deleted.");
      setRowMenu(null);
      return;
    }
    if (!window.confirm(`Delete ${positionCode(position.PositionId)}? This action cannot be undone.`)) return;
    void deleteMutation.mutateAsync(position.PositionId).then((result) => {
      if (!result.success) {
        setToast(result.errors?.join(". ") || result.message);
        return;
      }
      setToast(result.message || "Position deleted successfully.");
      if (selectedPositionId === position.PositionId) closeDetails();
    }).catch(() => setToast("The position could not be deleted."));
    setRowMenu(null);
  };

  const rangeLabel = useMemo(() => {
    if (pagination.total === 0) return "No positions";
    const first = (pagination.page - 1) * pagination.pageSize + 1;
    const last = Math.min(pagination.page * pagination.pageSize, pagination.total);
    return `Showing ${first}\u2013${last} of ${pagination.total.toLocaleString()} positions`;
  }, [pagination.page, pagination.pageSize, pagination.total]);

  const loadedLabel = useMemo(() => {
    const day = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(loadedAt);
    const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(loadedAt);
    return `Loaded ${day}  \u2022  ${time}`;
  }, [loadedAt]);

  const toggleSort = (nextSort: PositionSortKey) => {
    if (sortBy === nextSort) setSortDirection((current) => current === "asc" ? "desc" : "asc");
    else {
      setSortBy(nextSort);
      setSortDirection("asc");
    }
    setPage(1);
  };

  const togglePageSelection = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allPageSelected) rows.forEach((position) => next.delete(position.PositionId));
      else rows.forEach((position) => next.add(position.PositionId));
      return next;
    });
  };

  const toggleRowSelection = (positionId: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(positionId)) next.delete(positionId);
      else next.add(positionId);
      return next;
    });
  };

  const exportCurrentPage = () => {
    const exportRows = selectedIds.size > 0 ? rows.filter((position) => selectedIds.has(position.PositionId)) : rows;
    exportToExcel(
      `positions-page-${pagination.page}.csv`,
      [
        { header: "Position ID", value: (position: PositionRecord) => positionCode(position.PositionId) },
        { header: "Position Number", value: (position: PositionRecord) => position.Position_Number ?? "" },
        { header: "Job ID", value: (position: PositionRecord) => position.JobId ? jobCode(position.JobId) : "" },
        { header: "English Job Name", value: (position: PositionRecord) => position.Job_Name_EN ?? "" },
        { header: "Arabic Job Name", value: (position: PositionRecord) => position.Job_Name_AR ?? "" },
        { header: "Position Type", value: (position: PositionRecord) => position.Position_Type ?? "" },
        { header: "Position Level", value: (position: PositionRecord) => position.PositionLevel ?? "" },
        { header: "Position Degree", value: (position: PositionRecord) => position.Position_Degree ?? "" },
        { header: "Line Level (English)", value: (position: PositionRecord) => position.LineLevelName_EN ?? "" },
        { header: "Line Level (Arabic)", value: (position: PositionRecord) => position.LineLevelName_AR ?? "" },
        { header: "Employee Number", value: (position: PositionRecord) => position.EmployeeNumber ?? "" },
        { header: "English Employee Name", value: (position: PositionRecord) => position.EmployeeName_EN ?? "" },
        { header: "Arabic Employee Name", value: (position: PositionRecord) => position.EmployeeName_AR ?? "" },
        { header: "Occupancy", value: (position: PositionRecord) => position.EmployeeId ? "Occupied" : "Vacant" },
        { header: "Data Status", value: (position: PositionRecord) => position.JobId ? "Complete" : "Missing Job" },
        { header: "Status", value: (position: PositionRecord) => position.Status ?? "" }
      ],
      exportRows
    );
    setToast(`Exported ${exportRows.length} position${exportRows.length === 1 ? "" : "s"}.`);
  };

  const copyPositionCode = async (position: PositionRecord) => {
    await navigator.clipboard.writeText(positionCode(position.PositionId));
    setToast(`${positionCode(position.PositionId)} copied.`);
    setRowMenu(null);
  };

  const activeFilterChips = [
    occupancy ? { label: `Occupancy: ${occupancy === "occupied" ? "Occupied" : "Vacant"}`, clear: () => setOccupancy("") } : null,
    positionType ? { label: `Position Type: ${positionType}`, clear: () => setPositionType("") } : null,
    selectedJob ? { label: `Job: ${selectedJob.Job_Name_EN}`, clear: () => { setSelectedJob(null); setJobInput(""); } } : null,
    status ? { label: `Status: ${status}`, clear: () => setStatus("") } : null
  ].filter((chip): chip is { label: string; clear: () => void } => chip !== null);

  const visibleColumnCount = 3 + columnDefinitions.filter((column) => visibleColumns.has(column.key)).length;

  return (
    <Box sx={(theme) => ({ ...getHrThemeVars(theme), color: "var(--hr-text)", px: { xs: 0, md: 4 }, pb: 3 })}>
      <Box component="header" sx={{ pt: { xs: 1.25, md: 2.1 }, pb: { xs: 1.7, md: 3.1 } }}>
        <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", lg: "flex-start" }} gap={2}>
          <Box>
            <Breadcrumbs separator="/" aria-label="Breadcrumb" sx={{ mb: 0.75, "& .MuiBreadcrumbs-separator": { color: "var(--hr-muted)", mx: 0.9 } }}>
              <Link component={RouterLink} to="/human-resources/hr-dashboard" underline="hover" sx={{ color: "var(--hr-accent)", fontSize: 11.5, fontWeight: 700 }}>HR</Link>
              <Typography sx={{ color: "var(--hr-muted)", fontSize: 11.5 }}>Workforce Structure</Typography>
            </Breadcrumbs>
            <Typography component="h1" sx={{ color: "var(--hr-text)", fontSize: { xs: 28, md: 32 }, lineHeight: 1.05, fontWeight: 900, letterSpacing: "-0.035em" }}>Positions</Typography>
            <Typography sx={{ mt: 0.75, color: "var(--hr-muted)", fontSize: 12.25 }}>Manage approved positions, linked jobs and workforce occupancy from one official register.</Typography>
          </Box>
          <Stack direction="row" flexWrap="wrap" useFlexGap alignItems="center" justifyContent={{ xs: "flex-start", lg: "flex-end" }} gap={1.1} sx={{ pt: { lg: 2.2 } }}>
            <Typography sx={{ color: "var(--hr-muted)", fontSize: 10.75, fontWeight: 650 }}>{loadedLabel}</Typography>
            <Tooltip title="Refresh position data"><IconButton size="small" onClick={() => void Promise.all([listQuery.refetch(), positionOptionsQuery.refetch()])} aria-label="Refresh positions" sx={{ color: "var(--hr-strong-muted)" }}><RefreshRoundedIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
            <Button variant="outlined" startIcon={<FileUploadOutlinedIcon />} onClick={exportCurrentPage} disabled={rows.length === 0 || listQuery.isFetching} sx={{ height: 42, px: 2, borderColor: "var(--hr-accent-border)", color: "var(--hr-text)", fontSize: 11.5, fontWeight: 800, textTransform: "none" }}>Export</Button>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setFormOpen(true)} sx={{ height: 42, px: 2.2, bgcolor: "var(--hr-primary-button)", color: "var(--hr-on-accent)", fontSize: 11.5, fontWeight: 800, textTransform: "none", boxShadow: "0 7px 16px rgba(8, 31, 73, 0.18)", "&:hover": { bgcolor: "var(--hr-primary-button-hover)" } }}>Add Position</Button>
          </Stack>
        </Stack>
      </Box>

      <Card variant="outlined" sx={{ mb: 1.5, px: { xs: 1.25, md: 2.2 }, py: 1.65, borderColor: "var(--hr-border)", borderRadius: "12px", bgcolor: "var(--hr-surface)", boxShadow: "none" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr)) minmax(310px, 1.75fr)" } }}>
          {[
            { icon: BusinessCenterRoundedIcon, value: summary.total, label: "Total Positions", tone: "blue" as const },
            { icon: Groups2RoundedIcon, value: summary.occupied, label: "Occupied", tone: "green" as const },
            { icon: Groups2RoundedIcon, value: summary.vacant, label: "Vacant", tone: "blue" as const },
            { icon: ShieldOutlinedIcon, value: summary.missingJob, label: "Missing Job", note: "Needs attention", tone: "amber" as const }
          ].map((stat, index) => <Box key={stat.label} sx={{ minWidth: 0, borderLeft: { xs: index % 2 === 1 ? "1px solid var(--hr-border)" : 0, lg: index > 0 ? "1px solid var(--hr-border)" : 0 }, borderTop: { xs: index > 1 ? "1px solid var(--hr-border)" : 0, lg: 0 }, py: { xs: 1.05, lg: 0.15 } }}><SummaryMetric {...stat} loading={listQuery.isLoading} /></Box>)}
          <Stack justifyContent="center" sx={{ gridColumn: { xs: "1 / -1", lg: "auto" }, mt: { xs: 1, lg: 0 }, pt: { xs: 1.2, lg: 0 }, pl: { lg: 3.2 }, borderTop: { xs: "1px solid var(--hr-border)", lg: 0 }, borderLeft: { lg: "1px solid var(--hr-border)" } }}>
            <Stack direction="row" alignItems="baseline" spacing={0.75}><Typography sx={{ color: "var(--hr-text)", fontSize: 15.5, fontWeight: 900 }}>{occupancyRate.toFixed(1)}% occupancy</Typography><Typography sx={{ color: "var(--hr-muted)", fontSize: 9.5 }}>of approved positions</Typography></Stack>
            <LinearProgress variant="determinate" value={occupancyRate} sx={{ mt: 1.15, height: 10, borderRadius: 10, bgcolor: "#e9edf4", "& .MuiLinearProgress-bar": { borderRadius: 10, bgcolor: "#42b96f" } }} />
          </Stack>
        </Box>
      </Card>

      <Card variant="outlined" sx={{ overflow: "hidden", borderColor: "var(--hr-border)", borderRadius: "12px", bgcolor: "var(--hr-surface)", boxShadow: "var(--hr-shadow)" }}>
        <Box sx={{ px: { xs: 1.25, md: 2 }, pt: 1.55, pb: 1.15 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1.2}>
            <TextField size="small" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Search position ID, number, job or employee" slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ color: "var(--hr-muted)", fontSize: 20 }} /></InputAdornment> } }} sx={{ width: { xs: "100%", md: 455 }, "& .MuiInputBase-root": { height: 42, borderRadius: "8px", fontSize: 11.75 } }} />
            <Stack direction="row" flexWrap="wrap" useFlexGap gap={1}>
              <Badge badgeContent={activeFilterCount} color="primary" invisible={activeFilterCount === 0} sx={{ "& .MuiBadge-badge": { top: 7, right: 8, minWidth: 18, height: 18, fontSize: 9, fontWeight: 900 } }}><Button variant="outlined" startIcon={<FilterAltOutlinedIcon />} onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} sx={{ height: 42, minWidth: 112, borderColor: "var(--hr-border)", color: "var(--hr-text)", fontSize: 11.5, fontWeight: 800, textTransform: "none" }}>Filters</Button></Badge>
              <Box sx={{ display: "flex", p: 0.35, border: "1px solid var(--hr-border)", borderRadius: "8px" }}>
                <Tooltip title="List view"><IconButton size="small" onClick={() => setViewMode("list")} aria-pressed={viewMode === "list"} sx={{ width: 35, height: 34, borderRadius: "6px", color: viewMode === "list" ? "var(--hr-text)" : "var(--hr-muted)", bgcolor: viewMode === "list" ? "var(--hr-surface-soft)" : "transparent", boxShadow: viewMode === "list" ? "0 2px 7px rgba(24, 48, 83, 0.12)" : "none" }}><ViewListRoundedIcon fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Grid view"><IconButton size="small" onClick={() => setViewMode("grid")} aria-pressed={viewMode === "grid"} sx={{ width: 35, height: 34, borderRadius: "6px", color: viewMode === "grid" ? "var(--hr-text)" : "var(--hr-muted)", bgcolor: viewMode === "grid" ? "var(--hr-surface-soft)" : "transparent", boxShadow: viewMode === "grid" ? "0 2px 7px rgba(24, 48, 83, 0.12)" : "none" }}><GridViewRoundedIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
              </Box>
              <Button variant="outlined" startIcon={<ViewColumnOutlinedIcon />} endIcon={<KeyboardArrowDownRoundedIcon sx={{ fontSize: 18 }} />} onClick={(event) => setColumnsAnchor(event.currentTarget)} sx={{ height: 42, minWidth: 132, borderColor: "var(--hr-border)", color: "var(--hr-text)", fontSize: 11.5, fontWeight: 800, textTransform: "none" }}>Columns</Button>
            </Stack>
          </Stack>

          {filtersOpen ? <Box component="section" aria-label="Position filters" sx={{ mt: { xs: 1.25, md: 2 }, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr)) auto" }, gap: 1.15 }}>
            <TextField select size="small" label="Occupancy" value={occupancy} onChange={(event) => { setOccupancy(event.target.value as typeof occupancy); setPage(1); }} sx={{ "& .MuiInputBase-root": { height: 44, borderRadius: "8px", fontSize: 11.5 }, "& .MuiInputLabel-root": { fontSize: 11.25 } }}><MenuItem value="">All</MenuItem><MenuItem value="occupied">Occupied</MenuItem><MenuItem value="vacant">Vacant</MenuItem></TextField>
            <TextField select size="small" label="Position Type" value={positionType} onChange={(event) => { setPositionType(event.target.value); setPage(1); }} sx={{ "& .MuiInputBase-root": { height: 44, borderRadius: "8px", fontSize: 11.5 }, "& .MuiInputLabel-root": { fontSize: 11.25 } }}><MenuItem value="">All</MenuItem>{(positionOptions?.positionTypes ?? []).map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}</TextField>
            <Autocomplete open={jobPickerOpen} onOpen={() => setJobPickerOpen(true)} onClose={() => setJobPickerOpen(false)} options={jobOptions} value={selectedJob} inputValue={jobInput} loading={jobOptionsQuery.isFetching} getOptionLabel={jobLabel} isOptionEqualToValue={(option, value) => option.JobId === value.JobId} onChange={(_event, value) => { setSelectedJob(value); setJobInput(value ? jobLabel(value) : ""); setPage(1); }} onInputChange={(_event, value, reason) => { if (reason !== "reset") setJobInput(value); }} renderInput={(params) => <TextField {...params} label="Job" size="small" placeholder="All jobs" sx={{ "& .MuiInputBase-root": { minHeight: 44, borderRadius: "8px", fontSize: 11.5 }, "& .MuiInputLabel-root": { fontSize: 11.25 } }} />} />
            <TextField select size="small" label="Status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} sx={{ "& .MuiInputBase-root": { height: 44, borderRadius: "8px", fontSize: 11.5 }, "& .MuiInputLabel-root": { fontSize: 11.25 } }}><MenuItem value="">All</MenuItem>{(positionOptions?.statuses ?? []).map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}</TextField>
            <Button startIcon={<RefreshRoundedIcon />} onClick={resetFilters} disabled={!filtersActive} sx={{ height: 44, px: 1.5, color: "var(--hr-accent)", fontSize: 10.75, fontWeight: 850, textTransform: "none", whiteSpace: "nowrap" }}>Clear all</Button>
          </Box> : null}

          <Stack direction="row" alignItems="center" flexWrap="wrap" useFlexGap gap={0.85} sx={{ mt: 1.2, minHeight: 27 }}>
            <Typography sx={{ mr: 1, color: "var(--hr-accent)", fontSize: 11.5, fontWeight: 900 }}>{pagination.total.toLocaleString()} positions</Typography>
            {activeFilterChips.map((chip) => <Chip key={chip.label} label={chip.label} onDelete={() => { chip.clear(); setPage(1); }} size="small" variant="outlined" sx={{ height: 26, borderColor: "var(--hr-border)", bgcolor: "var(--hr-surface-soft)", color: "var(--hr-strong-muted)", fontSize: 9.5, fontWeight: 750 }} />)}
            {selectedIds.size > 0 ? <Chip label={`${selectedIds.size} selected`} onDelete={() => setSelectedIds(new Set())} size="small" sx={{ height: 26, ml: "auto", color: "var(--hr-accent)", bgcolor: "var(--hr-selected)", fontSize: 9.75, fontWeight: 850 }} /> : null}
          </Stack>
        </Box>

        {errorMessage ? <Alert severity="error" sx={{ mx: 2, mb: 1.5 }}>{errorMessage}</Alert> : null}

        {viewMode === "list" ? <TableContainer sx={{ minHeight: 405, maxHeight: "calc(100vh - 425px)", borderTop: "1px solid var(--hr-border)" }}>
          <Table stickyHeader size="small" aria-label="Position register" sx={{ minWidth: 1290 }}>
            <TableHead><TableRow>
              <TableCell padding="checkbox" sx={{ bgcolor: "var(--hr-surface-soft)", borderColor: "var(--hr-border)" }}><Checkbox size="small" checked={allPageSelected} indeterminate={!allPageSelected && somePageSelected} disabled={listQuery.isFetching} onChange={togglePageSelection} inputProps={{ "aria-label": "Select all positions on this page" }} /></TableCell>
              <TableCell sx={{ minWidth: 175, bgcolor: "var(--hr-surface-soft)", borderColor: "var(--hr-border)" }}><TableSortLabel active={sortBy === "positionId"} direction={sortBy === "positionId" ? sortDirection : "asc"} onClick={() => toggleSort("positionId")} sx={{ color: "var(--hr-text) !important", fontSize: 10.25, fontWeight: 900 }}>Position</TableSortLabel></TableCell>
              {columnDefinitions.map((column) => visibleColumns.has(column.key) ? <TableCell key={column.key} sx={{ minWidth: column.minWidth, bgcolor: "var(--hr-surface-soft)", borderColor: "var(--hr-border)" }}><TableSortLabel active={sortBy === column.sortKey} direction={sortBy === column.sortKey ? sortDirection : "asc"} onClick={() => toggleSort(column.sortKey)} sx={{ color: "var(--hr-text) !important", fontSize: 10.25, fontWeight: 900 }}>{column.label}</TableSortLabel></TableCell> : null)}
              <TableCell align="center" sx={{ width: 80, bgcolor: "var(--hr-surface-soft)", borderColor: "var(--hr-border)", color: "var(--hr-text)", fontSize: 10.25, fontWeight: 900 }}>Actions</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {listQuery.isLoading ? <TableRow><TableCell colSpan={visibleColumnCount} sx={{ height: 280, border: 0 }}><Box sx={{ display: "grid", placeItems: "center" }}><CircularProgress size={28} /></Box></TableCell></TableRow> : rows.length === 0 ? <TableRow><TableCell colSpan={visibleColumnCount} sx={{ height: 280, border: 0, textAlign: "center" }}><Typography sx={{ color: "var(--hr-muted)", fontSize: 12 }}>No positions match these filters.</Typography></TableCell></TableRow> : rows.map((position) => {
                const selected = selectedIds.has(position.PositionId);
                const employeeName = position.EmployeeName_EN?.trim() || position.EmployeeName_AR?.trim() || null;
                const missingJob = position.JobId === null;
                const tone = avatarTone(position.PositionId);
                const levelAndDegree = [
                  displayValue(position.PositionLevel),
                  position.Position_Degree !== null && position.Position_Degree !== undefined && String(position.Position_Degree).trim() !== ""
                    ? `Grade: ${position.Position_Degree}`
                    : null
                ].filter(Boolean).join(" \u00b7 ");
                return <TableRow key={position.PositionId} hover selected={selected || selectedPositionId === position.PositionId} tabIndex={0} onClick={() => selectPosition(position)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectPosition(position); } }} sx={{ cursor: "pointer", bgcolor: missingJob ? "#fffaf1" : undefined, "&.Mui-selected, &.Mui-selected:hover": { bgcolor: "var(--hr-selected)" }, "&:hover": { bgcolor: missingJob ? "#fff7e8 !important" : undefined } }}>
                  <TableCell padding="checkbox" sx={{ borderColor: "var(--hr-divider-soft)" }} onClick={(event) => event.stopPropagation()}><Checkbox size="small" checked={selected} disabled={listQuery.isFetching} onChange={() => toggleRowSelection(position.PositionId)} inputProps={{ "aria-label": `Select ${positionCode(position.PositionId)}` }} /></TableCell>
                  <TableCell sx={{ py: 0.9, borderColor: "var(--hr-divider-soft)" }}><Link component={RouterLink} to={`/human-resources/jobs/positions/${position.PositionId}`} onClick={(event) => event.stopPropagation()} underline="hover" sx={{ color: "var(--hr-accent)", fontSize: 10.75, fontWeight: 850, whiteSpace: "nowrap" }}>{positionCode(position.PositionId)}</Link><Typography sx={{ mt: 0.15, color: "var(--hr-row-text)", fontSize: 9.75, lineHeight: 1.25 }}>{displayValue(position.Position_Number)}</Typography></TableCell>
                  {visibleColumns.has("job") ? <TableCell sx={{ py: 0.85, borderColor: "var(--hr-divider-soft)" }}>{position.JobId ? <><Link component={RouterLink} to={`/human-resources/jobs/catalog/${position.JobId}`} onClick={(event) => event.stopPropagation()} underline="none" sx={{ display: "block", color: "var(--hr-row-text)", fontSize: 10.65, fontWeight: 850, lineHeight: 1.3, "&:hover": { color: "var(--hr-accent)" } }}>{displayValue(position.Job_Name_EN)}</Link>{position.Job_Name_AR ? <Typography lang="ar" dir="rtl" sx={{ mt: 0.1, color: "var(--hr-muted)", fontSize: 9.6, lineHeight: 1.25, textAlign: "left" }}>{position.Job_Name_AR}</Typography> : null}</> : <><Typography sx={{ color: "var(--hr-muted)", fontSize: 10.5, fontWeight: 750 }}>{EM_DASH}</Typography><Typography sx={{ mt: 0.1, color: "#d87500", fontSize: 9.75, fontWeight: 850 }}>Job not linked</Typography></>}</TableCell> : null}
                  {visibleColumns.has("details") ? <TableCell sx={{ py: 0.8, borderColor: "var(--hr-divider-soft)" }}><Typography sx={{ color: "var(--hr-row-text)", fontSize: 9.85, lineHeight: 1.35 }}><Box component="span" sx={{ color: "var(--hr-muted)", fontWeight: 700 }}>Type: </Box>{displayValue(position.Position_Type)}</Typography><Typography sx={{ mt: 0.1, color: "var(--hr-row-text)", fontSize: 9.85, lineHeight: 1.35 }}><Box component="span" sx={{ color: "var(--hr-muted)", fontWeight: 700 }}>Level: </Box>{levelAndDegree}</Typography><Typography sx={{ mt: 0.1, color: "var(--hr-row-text)", fontSize: 9.85, lineHeight: 1.35 }}><Box component="span" sx={{ color: "var(--hr-muted)", fontWeight: 700 }}>Line level: </Box>{displayValue(position.LineLevelName_EN)}{position.LineLevelName_AR ? <Box component="span" lang="ar" dir="rtl" sx={{ ml: 0.45, color: "var(--hr-muted)" }}>· {position.LineLevelName_AR}</Box> : null}</Typography></TableCell> : null}
                  {visibleColumns.has("employee") ? <TableCell sx={{ py: 0.7, borderColor: "var(--hr-divider-soft)" }}><Stack direction="row" alignItems="center" spacing={1}>{position.EmployeeId ? <Avatar sx={{ width: 34, height: 34, color: tone.color, bgcolor: tone.bg, border: `1px solid ${tone.border}`, fontSize: 9.5, fontWeight: 900 }}>{employeeInitials(position)}</Avatar> : <Avatar sx={{ width: 34, height: 34, color: "#6f7e98", bgcolor: "#eef1f6", border: "1px solid #dfe5ee" }}><Groups2RoundedIcon sx={{ fontSize: 18 }} /></Avatar>}<Box sx={{ minWidth: 0 }}>{position.EmployeeId ? <Link component={RouterLink} to={`/human-resources/employees/employee-profile/${position.EmployeeId}`} onClick={(event) => event.stopPropagation()} underline="hover" sx={{ display: "block", maxWidth: 245, overflow: "hidden", textOverflow: "ellipsis", color: "var(--hr-accent)", fontSize: 10.35, fontWeight: 850, lineHeight: 1.3, whiteSpace: "nowrap" }}>{employeeName ?? `Employee ${position.EmployeeId}`}</Link> : <Typography sx={{ color: "var(--hr-muted)", fontSize: 10.25 }}>No employee assigned</Typography>}<Typography sx={{ mt: 0.1, color: "var(--hr-muted)", fontSize: 9.5, lineHeight: 1.2 }}>{position.EmployeeNumber ? employeeCode(position.EmployeeNumber) : position.EmployeeId ? `Employee ID ${position.EmployeeId}` : EM_DASH}</Typography></Box></Stack></TableCell> : null}
                  {visibleColumns.has("occupancy") ? <TableCell sx={{ py: 0.95, borderColor: "var(--hr-divider-soft)" }}><Chip size="small" label={position.EmployeeId ? "Occupied" : "Vacant"} sx={{ minWidth: 70, height: 22, color: position.EmployeeId ? "var(--hr-success-text)" : "var(--hr-accent)", bgcolor: position.EmployeeId ? "var(--hr-success-bg)" : "var(--hr-selected)", fontSize: 9.25, fontWeight: 850 }} /></TableCell> : null}
                  {visibleColumns.has("dataStatus") ? <TableCell sx={{ py: 0.95, borderColor: "var(--hr-divider-soft)" }}><Chip size="small" label={missingJob ? "Missing Job" : "Complete"} sx={{ minWidth: 72, height: 22, color: missingJob ? "#c66b00" : "var(--hr-success-text)", bgcolor: missingJob ? "#fff0d5" : "var(--hr-success-bg)", fontSize: 9.25, fontWeight: 850 }} /></TableCell> : null}
                  <TableCell align="center" sx={{ py: 0.6, borderColor: "var(--hr-divider-soft)" }} onClick={(event) => event.stopPropagation()}><IconButton size="small" aria-label={`Actions for ${positionCode(position.PositionId)}`} onClick={(event) => setRowMenu({ anchor: event.currentTarget, position })}><MoreVertRoundedIcon sx={{ color: "var(--hr-strong-muted)", fontSize: 18 }} /></IconButton></TableCell>
                </TableRow>;
              })}
            </TableBody>
          </Table>
        </TableContainer> : <Box sx={{ minHeight: 405, p: 1.6, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" }, alignContent: "start", gap: 1.25, borderTop: "1px solid var(--hr-border)" }}>
          {listQuery.isLoading ? <Box sx={{ gridColumn: "1 / -1", minHeight: 280, display: "grid", placeItems: "center" }}><CircularProgress size={28} /></Box> : rows.map((position) => {
            const employeeName = position.EmployeeName_EN?.trim() || position.EmployeeName_AR?.trim() || null;
            const tone = avatarTone(position.PositionId);
            return <Card key={position.PositionId} variant="outlined" tabIndex={0} onClick={() => selectPosition(position)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectPosition(position); } }} sx={{ p: 1.5, cursor: "pointer", borderColor: position.JobId ? "var(--hr-border)" : "#f1c778", borderRadius: "10px", boxShadow: "none", bgcolor: position.JobId ? "var(--hr-surface)" : "#fffaf1", transition: "border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease", "&:hover": { borderColor: position.JobId ? "var(--hr-accent-border)" : "#e6a83f", boxShadow: "0 8px 20px rgba(23, 61, 116, 0.10)", transform: "translateY(-1px)" } }}>
              <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}><Box><Typography sx={{ color: "var(--hr-accent)", fontSize: 10.5, fontWeight: 850 }}>{positionCode(position.PositionId)}</Typography><Typography sx={{ color: "var(--hr-muted)", fontSize: 9.5 }}>{displayValue(position.Position_Number)}</Typography></Box><Checkbox size="small" checked={selectedIds.has(position.PositionId)} disabled={listQuery.isFetching} onClick={(event) => event.stopPropagation()} onChange={() => toggleRowSelection(position.PositionId)} inputProps={{ "aria-label": `Select ${positionCode(position.PositionId)}` }} /></Stack>
              <Typography sx={{ mt: 0.8, color: position.JobId ? "var(--hr-text)" : "#c66b00", fontSize: 13, fontWeight: 900, lineHeight: 1.3 }}>{position.Job_Name_EN || "Job not linked"}</Typography>
              {position.Job_Name_AR ? <Typography lang="ar" dir="rtl" sx={{ mt: 0.2, color: "var(--hr-muted)", fontSize: 10.5, textAlign: "left" }}>{position.Job_Name_AR}</Typography> : null}
              <Divider sx={{ my: 1.15, borderColor: "var(--hr-divider-soft)" }} />
              <Stack direction="row" alignItems="center" spacing={1}>{position.EmployeeId ? <Avatar sx={{ width: 34, height: 34, color: tone.color, bgcolor: tone.bg, border: `1px solid ${tone.border}`, fontSize: 9.5, fontWeight: 900 }}>{employeeInitials(position)}</Avatar> : <Avatar sx={{ width: 34, height: 34, color: "#6f7e98", bgcolor: "#eef1f6" }}><Groups2RoundedIcon sx={{ fontSize: 18 }} /></Avatar>}<Box><Typography sx={{ color: position.EmployeeId ? "var(--hr-row-text)" : "var(--hr-muted)", fontSize: 10.5, fontWeight: 750 }}>{employeeName || "No employee assigned"}</Typography><Typography sx={{ color: "var(--hr-muted)", fontSize: 9.25 }}>{employeeCode(position.EmployeeNumber)}</Typography></Box></Stack>
              <Stack direction="row" flexWrap="wrap" useFlexGap gap={0.65} sx={{ mt: 1.2 }}><Chip size="small" label={displayValue(position.Position_Type)} variant="outlined" sx={{ height: 22, borderColor: "var(--hr-border)", fontSize: 9 }} /><Chip size="small" label={position.EmployeeId ? "Occupied" : "Vacant"} sx={{ height: 22, color: position.EmployeeId ? "var(--hr-success-text)" : "var(--hr-accent)", bgcolor: position.EmployeeId ? "var(--hr-success-bg)" : "var(--hr-selected)", fontSize: 9, fontWeight: 800 }} />{position.LineLevelName_EN ? <Chip size="small" label={position.LineLevelName_EN} variant="outlined" sx={{ height: 22, color: "var(--hr-accent)", borderColor: "var(--hr-accent-border)", fontSize: 9, fontWeight: 750 }} /> : null}</Stack>
            </Card>;
          })}
        </Box>}

        <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" sx={{ minHeight: { md: 52 }, pl: { xs: 1.5, md: 2 }, borderTop: "1px solid var(--hr-border)" }}><Typography sx={{ color: "var(--hr-strong-muted)", fontSize: 10.25, fontWeight: 750 }}>{rangeLabel}</Typography><TablePagination component="div" count={pagination.total} page={Math.max(0, page - 1)} onPageChange={(_event, nextPage) => setPage(nextPage + 1)} rowsPerPage={pageSize} onRowsPerPageChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} rowsPerPageOptions={PAGE_SIZE_OPTIONS} labelRowsPerPage="Rows per page:" sx={{ color: "var(--hr-strong-muted)", "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { fontSize: 10.25, fontWeight: 650 } }} /></Stack>
      </Card>

      <Menu anchorEl={columnsAnchor} open={Boolean(columnsAnchor)} onClose={() => setColumnsAnchor(null)} slotProps={{ paper: { sx: { mt: 0.5, minWidth: 210, border: "1px solid var(--hr-border)", borderRadius: "10px", boxShadow: "var(--hr-shadow)" } } }}><Typography sx={{ px: 1.6, pt: 1, pb: 0.5, color: "var(--hr-muted)", fontSize: 9.5, fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.06em" }}>Visible columns</Typography>{columnDefinitions.map((column) => <MenuItem key={column.key} dense disableRipple onClick={(event) => event.stopPropagation()}><FormControlLabel control={<Checkbox size="small" checked={visibleColumns.has(column.key)} onChange={() => setVisibleColumns((current) => { const next = new Set(current); if (next.has(column.key)) next.delete(column.key); else next.add(column.key); return next; })} />} label={column.label} sx={{ m: 0, width: "100%", "& .MuiFormControlLabel-label": { color: "var(--hr-row-text)", fontSize: 11.5 } }} /></MenuItem>)}</Menu>

      <Menu anchorEl={rowMenu?.anchor ?? null} open={Boolean(rowMenu)} onClose={() => setRowMenu(null)} slotProps={{ paper: { sx: { minWidth: 210, border: "1px solid var(--hr-border)", borderRadius: "10px", boxShadow: "var(--hr-shadow)" } } }}>
        <MenuItem onClick={() => rowMenu && selectPosition(rowMenu.position)}><ListItemIcon><OpenInNewRoundedIcon fontSize="small" /></ListItemIcon><ListItemText primary="Open position details" primaryTypographyProps={{ fontSize: 11.5, fontWeight: 700 }} /></MenuItem>
        <MenuItem onClick={() => rowMenu && editPosition(rowMenu.position)}><ListItemIcon><EditOutlinedIcon fontSize="small" /></ListItemIcon><ListItemText primary="Edit position" primaryTypographyProps={{ fontSize: 11.5, fontWeight: 700 }} /></MenuItem>
        {rowMenu?.position.JobId ? <MenuItem component={RouterLink} to={`/human-resources/jobs/catalog/${rowMenu.position.JobId}`} onClick={() => setRowMenu(null)}><ListItemIcon><BusinessCenterRoundedIcon fontSize="small" /></ListItemIcon><ListItemText primary="Open job profile" primaryTypographyProps={{ fontSize: 11.5, fontWeight: 700 }} /></MenuItem> : null}
        {rowMenu?.position.EmployeeId ? <MenuItem component={RouterLink} to={`/human-resources/employees/employee-profile/${rowMenu.position.EmployeeId}`} onClick={() => setRowMenu(null)}><ListItemIcon><PersonOutlineRoundedIcon fontSize="small" /></ListItemIcon><ListItemText primary="Open employee profile" primaryTypographyProps={{ fontSize: 11.5, fontWeight: 700 }} /></MenuItem> : null}
        <MenuItem onClick={() => rowMenu && void copyPositionCode(rowMenu.position)}><ListItemIcon><ContentCopyRoundedIcon fontSize="small" /></ListItemIcon><ListItemText primary="Copy Position ID" primaryTypographyProps={{ fontSize: 11.5, fontWeight: 700 }} /></MenuItem>
        <MenuItem disabled={deleteMutation.isPending} onClick={() => rowMenu && deletePosition(rowMenu.position)}><ListItemIcon><DeleteOutlineRoundedIcon fontSize="small" /></ListItemIcon><ListItemText primary="Delete position" primaryTypographyProps={{ fontSize: 11.5, fontWeight: 700 }} /></MenuItem>
      </Menu>

      <Snackbar open={Boolean(toast)} autoHideDuration={2600} onClose={() => setToast("")} message={toast} />

      {selectedPositionId ? <Suspense fallback={<Box sx={{ minHeight: 140, display: "grid", placeItems: "center" }}><CircularProgress size={24} /></Box>}><PositionDetailsPanel positionId={selectedPositionId} onClose={closeDetails} /></Suspense> : null}
      {formOpen ? <Suspense fallback={null}><PositionFormDialog open={formOpen} position={editingPosition} onClose={() => { setFormOpen(false); setEditingPosition(null); }} onSaved={editingPosition ? onSaved : onCreated} /></Suspense> : null}
    </Box>
  );
}
