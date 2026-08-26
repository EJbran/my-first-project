import AddRoundedIcon from "@mui/icons-material/AddRounded";
import BusinessCenterRoundedIcon from "@mui/icons-material/BusinessCenterRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import Diversity3RoundedIcon from "@mui/icons-material/Diversity3Rounded";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import ViewColumnOutlinedIcon from "@mui/icons-material/ViewColumnOutlined";
import ViewListRoundedIcon from "@mui/icons-material/ViewListRounded";
import {
  Alert,
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
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import { jobsApi } from "../../../api/jobs.api";
import type { JobCatalogSummary, JobListParams, JobRecord, JobSummary } from "../../../types/job.types";
import { exportToExcel } from "../../../utils/exportExcel";
import { getHrThemeVars } from "./Theme";

const JobFormDialog = lazy(() => import("./JobFormDialog"));

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_VISIBLE_COLUMNS = ["jobFamily", "careerLevel", "jobType", "criticality", "status"] as const;
type OptionalColumn = (typeof DEFAULT_VISIBLE_COLUMNS)[number];
type JobSortKey = NonNullable<JobListParams["sortBy"]>;
type SortDirection = NonNullable<JobListParams["sortDirection"]>;

const EMPTY_SUMMARY: JobCatalogSummary = {
  totalJobs: 0,
  jobFamilies: 0,
  criticalRoles: 0,
  underReview: 0
};

const jobCode = (jobId: number): string => `JOB-${String(jobId).padStart(6, "0")}`;

const numberParam = (value: string | null, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const criticalityStyle = (criticality: string) => {
  const value = criticality.trim().toLowerCase();
  if (value.includes("review")) return { color: "#6b21a8", borderColor: "#dfb9f4", bgcolor: "#fbf3ff" };
  if (value.includes("safety")) return { color: "#d92d20", borderColor: "#ffc5c0", bgcolor: "#fff3f2" };
  if (value.includes("business")) return { color: "#a15c00", borderColor: "#f4d39b", bgcolor: "#fff8e9" };
  if (value.includes("support")) return { color: "#0b55d4", borderColor: "#b9d1ff", bgcolor: "#eff5ff" };
  if (value.includes("critical")) return { color: "#087a43", borderColor: "#b6e5c8", bgcolor: "#eefaf2" };
  return { color: "var(--hr-strong-muted)", borderColor: "var(--hr-border)", bgcolor: "var(--hr-surface-soft)" };
};

const profileStatus = (job: JobSummary): { label: string; color: string } =>
  job.Role_Criticality.toLowerCase().includes("review required")
    ? { label: "Under review", color: "#7e22ce" }
    : { label: "Catalogued", color: "#29952e" };

const SummaryStat = ({
  icon: Icon,
  value,
  label,
  tone,
  loading
}: {
  icon: SvgIconComponent;
  value: number;
  label: string;
  tone: "blue" | "green" | "amber" | "purple";
  loading: boolean;
}) => {
  const palette = {
    blue: { color: "#155eef", bg: "#eef4ff", border: "#c9d9ff" },
    green: { color: "#08a75a", bg: "#ecfaf3", border: "#c8eedb" },
    amber: { color: "#f3a11b", bg: "#fff7e9", border: "#f8deb2" },
    purple: { color: "#8b3be3", bg: "#f8efff", border: "#e5cdfa" }
  }[tone];

  return (
    <Stack direction="row" alignItems="center" justifyContent="center" spacing={1.5} sx={{ minWidth: 0, py: 0.25 }}>
      <Box sx={{ width: 46, height: 46, flex: "0 0 auto", display: "grid", placeItems: "center", borderRadius: "50%", color: palette.color, bgcolor: palette.bg, border: `1px solid ${palette.border}` }}>
        <Icon sx={{ fontSize: 24 }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        {loading ? <Skeleton width={72} height={31} /> : (
          <Typography sx={{ color: "var(--hr-text)", fontSize: { xs: 22, lg: 26 }, fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.03em" }}>
            {value.toLocaleString()}
          </Typography>
        )}
        <Typography sx={{ mt: 0.35, color: "var(--hr-muted)", fontSize: 11.5, fontWeight: 650 }}>{label}</Typography>
      </Box>
    </Stack>
  );
};

const columnDefinitions: Array<{ key: OptionalColumn; label: string; sortKey?: JobSortKey }> = [
  { key: "jobFamily", label: "Job Family", sortKey: "jobFamily" },
  { key: "careerLevel", label: "Career Level", sortKey: "careerLevel" },
  { key: "jobType", label: "Job Type", sortKey: "jobType" },
  { key: "criticality", label: "Criticality", sortKey: "criticality" },
  { key: "status", label: "Profile Status" }
];

export default function JobCatalogPage() {
  const navigate = useNavigate();
  const [urlParams, setUrlParams] = useSearchParams();
  const [page, setPage] = useState(() => numberParam(urlParams.get("page"), 1));
  const [pageSize, setPageSize] = useState(() => PAGE_SIZE_OPTIONS.includes(numberParam(urlParams.get("pageSize"), 10)) ? numberParam(urlParams.get("pageSize"), 10) : 10);
  const [searchDraft, setSearchDraft] = useState(() => urlParams.get("search") ?? "");
  const [search, setSearch] = useState(() => urlParams.get("search") ?? "");
  const [jobFamily, setJobFamily] = useState(() => urlParams.get("jobFamily") ?? "");
  const [careerLevel, setCareerLevel] = useState(() => urlParams.get("careerLevel") ?? "");
  const [jobType, setJobType] = useState(() => urlParams.get("jobType") ?? "");
  const [roleCriticality, setRoleCriticality] = useState(() => urlParams.get("roleCriticality") ?? "");
  const [sortBy, setSortBy] = useState<JobSortKey>(() => (urlParams.get("sortBy") as JobSortKey | null) ?? "jobId");
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => urlParams.get("sortDirection") === "desc" ? "desc" : "asc");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "grid">(() => urlParams.get("view") === "grid" ? "grid" : "list");
  const [visibleColumns, setVisibleColumns] = useState<Set<OptionalColumn>>(() => new Set(DEFAULT_VISIBLE_COLUMNS));
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [columnsAnchor, setColumnsAnchor] = useState<HTMLElement | null>(null);
  const [rowMenu, setRowMenu] = useState<{ anchor: HTMLElement; job: JobSummary } | null>(null);
  const [toast, setToast] = useState("");
  const [loadedAt, setLoadedAt] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (page > 1) next.set("page", String(page));
    if (pageSize !== 10) next.set("pageSize", String(pageSize));
    if (search) next.set("search", search);
    if (jobFamily) next.set("jobFamily", jobFamily);
    if (careerLevel) next.set("careerLevel", careerLevel);
    if (jobType) next.set("jobType", jobType);
    if (roleCriticality) next.set("roleCriticality", roleCriticality);
    if (sortBy !== "jobId") next.set("sortBy", sortBy);
    if (sortDirection !== "asc") next.set("sortDirection", sortDirection);
    if (viewMode !== "list") next.set("view", viewMode);
    setUrlParams(next, { replace: true });
  }, [careerLevel, jobFamily, jobType, page, pageSize, roleCriticality, search, setUrlParams, sortBy, sortDirection, viewMode]);

  const listParams: JobListParams = {
    page,
    pageSize,
    search: search || undefined,
    jobFamily: jobFamily || undefined,
    careerLevel: careerLevel || undefined,
    jobType: jobType || undefined,
    roleCriticality: roleCriticality || undefined,
    sortBy,
    sortDirection
  };

  const listQuery = useQuery({
    queryKey: ["hr", "jobs", "list", listParams],
    queryFn: () => jobsApi.list(listParams),
    placeholderData: (previous) => previous,
    staleTime: 30_000
  });

  const optionsQuery = useQuery({
    queryKey: ["hr", "jobs", "options", "filters"],
    queryFn: () => jobsApi.options({ limit: 1 }),
    staleTime: 5 * 60_000
  });

  useEffect(() => {
    if (listQuery.dataUpdatedAt > 0) setLoadedAt(new Date(listQuery.dataUpdatedAt));
  }, [listQuery.dataUpdatedAt]);

  const result = listQuery.data;
  const rows = result?.success ? result.data : [];
  const pagination = result?.success ? result.pagination : { page, pageSize, total: 0, totalPages: 0 };
  const summary = result?.success ? result.summary : EMPTY_SUMMARY;
  const options = optionsQuery.data?.success ? optionsQuery.data.data : null;
  const errorMessage = result && !result.success
    ? result.errors?.join(". ") || result.message
    : listQuery.isError
      ? "The job catalog could not be loaded."
      : null;
  const activeFilterCount = [jobFamily, careerLevel, jobType, roleCriticality].filter(Boolean).length;
  const filtersActive = Boolean(searchDraft || activeFilterCount);
  const allPageSelected = rows.length > 0 && rows.every((job) => selectedIds.has(job.Job_ID));
  const somePageSelected = rows.some((job) => selectedIds.has(job.Job_ID));

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, pageSize, search, jobFamily, careerLevel, jobType, roleCriticality]);

  const resetFilters = () => {
    setSearchDraft("");
    setSearch("");
    setJobFamily("");
    setCareerLevel("");
    setJobType("");
    setRoleCriticality("");
    setPage(1);
  };

  const selectJob = (job: JobSummary) => navigate(`/human-resources/jobs/catalog/${job.Job_ID}`);
  const onCreated = (job: JobRecord) => {
    setPage(1);
    navigate(`/human-resources/jobs/catalog/${job.Job_ID}`);
  };

  const rangeLabel = useMemo(() => {
    if (pagination.total === 0) return "No jobs";
    const first = (pagination.page - 1) * pagination.pageSize + 1;
    const last = Math.min(pagination.page * pagination.pageSize, pagination.total);
    return `Showing ${first}–${last} of ${pagination.total.toLocaleString()} jobs`;
  }, [pagination.page, pagination.pageSize, pagination.total]);

  const loadedLabel = useMemo(() => {
    const day = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(loadedAt);
    const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(loadedAt);
    return `Loaded ${day}  •  ${time}`;
  }, [loadedAt]);

  const toggleSort = (nextSort: JobSortKey) => {
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
      if (allPageSelected) rows.forEach((job) => next.delete(job.Job_ID));
      else rows.forEach((job) => next.add(job.Job_ID));
      return next;
    });
  };

  const toggleRowSelection = (jobId: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const exportCurrentPage = () => {
    exportToExcel(
      `job-catalog-page-${pagination.page}.csv`,
      [
        { header: "Job ID", value: (job: JobSummary) => jobCode(job.Job_ID) },
        { header: "English Job Title", value: (job: JobSummary) => job.Job_Name_EN },
        { header: "Arabic Job Title", value: (job: JobSummary) => job.Job_Name_AR },
        { header: "Job Family", value: (job: JobSummary) => job.Job_Family },
        { header: "Career Level", value: (job: JobSummary) => job.Career_Level },
        { header: "Job Type", value: (job: JobSummary) => job.Job_Type },
        { header: "Role Criticality", value: (job: JobSummary) => job.Role_Criticality },
        { header: "Total Positions", value: (job: JobSummary) => job.TotalPositions ?? 0 },
        { header: "Occupied Positions", value: (job: JobSummary) => job.OccupiedPositions ?? 0 },
        { header: "Vacant Positions", value: (job: JobSummary) => job.VacantPositions ?? 0 }
      ],
      rows
    );
    setToast(`Exported ${rows.length} jobs from this page.`);
  };

  const copyJobCode = async (job: JobSummary) => {
    await navigator.clipboard.writeText(jobCode(job.Job_ID));
    setToast(`${jobCode(job.Job_ID)} copied.`);
    setRowMenu(null);
  };

  const filterControls: Array<[string, string, (value: string) => void, string[]]> = [
    ["Job Family", jobFamily, setJobFamily, options?.jobFamilies ?? []],
    ["Career Level", careerLevel, setCareerLevel, options?.careerLevels ?? []],
    ["Job Type", jobType, setJobType, options?.jobTypes ?? []],
    ["Role Criticality", roleCriticality, setRoleCriticality, options?.roleCriticalities ?? []]
  ];

  const activeFilterChips = [
    jobFamily ? { label: `Job Family: ${jobFamily}`, clear: () => setJobFamily("") } : null,
    careerLevel ? { label: `Career Level: ${careerLevel}`, clear: () => setCareerLevel("") } : null,
    jobType ? { label: `Job Type: ${jobType}`, clear: () => setJobType("") } : null,
    roleCriticality ? { label: `Criticality: ${roleCriticality}`, clear: () => setRoleCriticality("") } : null
  ].filter((chip): chip is { label: string; clear: () => void } => chip !== null);

  const visibleColumnCount = 4 + columnDefinitions.filter((column) => visibleColumns.has(column.key)).length;

  return (
    <Box sx={(theme) => ({ ...getHrThemeVars(theme), color: "var(--hr-text)", pb: 3 })}>
      <Box component="header" sx={{ pt: { xs: 1.25, md: 2.1 }, pb: 1.7 }}>
        <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", lg: "flex-start" }} gap={2}>
          <Box>
            <Breadcrumbs separator="/" aria-label="Breadcrumb" sx={{ mb: 0.75, "& .MuiBreadcrumbs-separator": { color: "var(--hr-muted)", mx: 0.9 } }}>
              <Link component={RouterLink} to="/human-resources/hr-dashboard" underline="hover" sx={{ color: "var(--hr-accent)", fontSize: 11.5, fontWeight: 700 }}>HR</Link>
              <Typography sx={{ color: "var(--hr-muted)", fontSize: 11.5 }}>Workforce Structure</Typography>
            </Breadcrumbs>
            <Typography component="h1" sx={{ color: "var(--hr-text)", fontSize: { xs: 28, md: 32 }, lineHeight: 1.05, fontWeight: 900, letterSpacing: "-0.035em" }}>Job Catalog</Typography>
            <Typography sx={{ mt: 0.75, color: "var(--hr-muted)", fontSize: 12.25 }}>Manage all organizational jobs and their complete role profiles in one centralized catalog.</Typography>
          </Box>
          <Stack direction="row" flexWrap="wrap" useFlexGap alignItems="center" justifyContent={{ xs: "flex-start", lg: "flex-end" }} gap={1.1} sx={{ pt: { lg: 2.2 } }}>
            <Typography sx={{ color: "var(--hr-muted)", fontSize: 10.75, fontWeight: 650 }}>{loadedLabel}</Typography>
            <Tooltip title="Refresh catalog data">
              <IconButton size="small" onClick={() => void Promise.all([listQuery.refetch(), optionsQuery.refetch()])} aria-label="Refresh job catalog" sx={{ color: "var(--hr-strong-muted)" }}>
                <RefreshRoundedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Button variant="outlined" startIcon={<FileUploadOutlinedIcon />} onClick={exportCurrentPage} disabled={rows.length === 0} sx={{ height: 42, px: 2, borderColor: "var(--hr-accent-border)", color: "var(--hr-text)", fontSize: 11.5, fontWeight: 800, textTransform: "none" }}>Export</Button>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setFormOpen(true)} sx={{ height: 42, px: 2.2, bgcolor: "var(--hr-primary-button)", color: "var(--hr-on-accent)", fontSize: 11.5, fontWeight: 800, textTransform: "none", boxShadow: "0 7px 16px rgba(8, 31, 73, 0.18)", "&:hover": { bgcolor: "var(--hr-primary-button-hover)" } }}>Add Job</Button>
          </Stack>
        </Stack>
      </Box>

      <Card variant="outlined" sx={{ mb: 1.5, px: { xs: 1.5, md: 2.5 }, py: 1.65, borderColor: "var(--hr-border)", borderRadius: "12px", bgcolor: "var(--hr-surface)", boxShadow: "none" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", lg: "repeat(4, 1fr)" } }}>
          {[
            { icon: BusinessCenterRoundedIcon, value: summary.totalJobs, label: "Total Jobs", tone: "blue" as const },
            { icon: Diversity3RoundedIcon, value: summary.jobFamilies, label: "Job Families", tone: "green" as const },
            { icon: ShieldOutlinedIcon, value: summary.criticalRoles, label: "Critical Roles", tone: "amber" as const },
            { icon: FactCheckOutlinedIcon, value: summary.underReview, label: "Under Review", tone: "purple" as const }
          ].map((stat, index) => (
            <Box key={stat.label} sx={{ minWidth: 0, borderLeft: { xs: index % 2 === 1 ? "1px solid var(--hr-border)" : 0, lg: index > 0 ? "1px solid var(--hr-border)" : 0 }, borderTop: { xs: index > 1 ? "1px solid var(--hr-border)" : 0, lg: 0 }, py: { xs: 1.1, lg: 0.15 } }}>
              <SummaryStat {...stat} loading={listQuery.isLoading} />
            </Box>
          ))}
        </Box>
      </Card>

      <Card variant="outlined" sx={{ overflow: "hidden", borderColor: "var(--hr-border)", borderRadius: "12px", bgcolor: "var(--hr-surface)", boxShadow: "var(--hr-shadow)" }}>
        <Box sx={{ px: { xs: 1.25, md: 2 }, pt: 1.6, pb: 1.35 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1.2}>
            <TextField
              size="small"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search job ID, English or Arabic name"
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ color: "var(--hr-muted)", fontSize: 20 }} /></InputAdornment> } }}
              sx={{ width: { xs: "100%", md: 565 }, "& .MuiInputBase-root": { height: 42, borderRadius: "8px", fontSize: 11.75 } }}
            />
            <Stack direction="row" flexWrap="wrap" useFlexGap gap={1}>
              <Badge badgeContent={activeFilterCount} color="primary" invisible={activeFilterCount === 0} sx={{ "& .MuiBadge-badge": { top: 7, right: 8, minWidth: 18, height: 18, fontSize: 9, fontWeight: 900 } }}>
                <Button variant="outlined" startIcon={<FilterAltOutlinedIcon />} onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} sx={{ height: 42, minWidth: 112, borderColor: "var(--hr-border)", color: "var(--hr-text)", fontSize: 11.5, fontWeight: 800, textTransform: "none" }}>Filters</Button>
              </Badge>
              <Box sx={{ display: "flex", p: 0.35, border: "1px solid var(--hr-border)", borderRadius: "8px" }}>
                <Tooltip title="List view"><IconButton size="small" onClick={() => setViewMode("list")} aria-pressed={viewMode === "list"} sx={{ width: 35, height: 34, borderRadius: "6px", color: viewMode === "list" ? "var(--hr-text)" : "var(--hr-muted)", bgcolor: viewMode === "list" ? "var(--hr-surface-soft)" : "transparent", boxShadow: viewMode === "list" ? "0 2px 7px rgba(24, 48, 83, 0.12)" : "none" }}><ViewListRoundedIcon fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Grid view"><IconButton size="small" onClick={() => setViewMode("grid")} aria-pressed={viewMode === "grid"} sx={{ width: 35, height: 34, borderRadius: "6px", color: viewMode === "grid" ? "var(--hr-text)" : "var(--hr-muted)", bgcolor: viewMode === "grid" ? "var(--hr-surface-soft)" : "transparent", boxShadow: viewMode === "grid" ? "0 2px 7px rgba(24, 48, 83, 0.12)" : "none" }}><GridViewRoundedIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
              </Box>
              <Button variant="outlined" startIcon={<ViewColumnOutlinedIcon />} endIcon={<KeyboardArrowDownRoundedIcon sx={{ fontSize: 18 }} />} onClick={(event) => setColumnsAnchor(event.currentTarget)} sx={{ height: 42, minWidth: 132, borderColor: "var(--hr-border)", color: "var(--hr-text)", fontSize: 11.5, fontWeight: 800, textTransform: "none" }}>Columns</Button>
            </Stack>
          </Stack>

          {filtersOpen ? (
            <Box component="section" aria-label="Job catalog filters" sx={{ mt: 1.35, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr)) auto" }, gap: 1.15 }}>
              {filterControls.map(([label, value, setter, values]) => (
                <TextField key={label} select size="small" label={label} value={value} onChange={(event) => { setter(event.target.value); setPage(1); }} sx={{ "& .MuiInputBase-root": { height: 44, borderRadius: "8px", fontSize: 11.5 }, "& .MuiInputLabel-root": { fontSize: 11.25 } }}>
                  <MenuItem value="">All</MenuItem>
                  {values.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                </TextField>
              ))}
              <Button startIcon={<RefreshRoundedIcon />} onClick={resetFilters} disabled={!filtersActive} sx={{ height: 44, px: 1.5, color: "var(--hr-accent)", fontSize: 10.75, fontWeight: 850, textTransform: "none", whiteSpace: "nowrap" }}>Clear all</Button>
            </Box>
          ) : null}

          <Stack direction="row" alignItems="center" flexWrap="wrap" useFlexGap gap={0.85} sx={{ mt: 1.35, minHeight: 27 }}>
            <Typography sx={{ mr: 1, color: "var(--hr-accent)", fontSize: 11.5, fontWeight: 900 }}>{pagination.total.toLocaleString()} jobs</Typography>
            {activeFilterChips.map((chip) => <Chip key={chip.label} label={chip.label} onDelete={() => { chip.clear(); setPage(1); }} size="small" variant="outlined" sx={{ height: 26, borderColor: "var(--hr-border)", bgcolor: "var(--hr-surface-soft)", color: "var(--hr-strong-muted)", fontSize: 9.5, fontWeight: 750 }} />)}
            {selectedIds.size > 0 ? <Chip label={`${selectedIds.size} selected`} onDelete={() => setSelectedIds(new Set())} size="small" sx={{ height: 26, ml: "auto", color: "var(--hr-accent)", bgcolor: "var(--hr-selected)", fontSize: 9.75, fontWeight: 850 }} /> : null}
          </Stack>
        </Box>

        {errorMessage ? <Alert severity="error" sx={{ mx: 2, mb: 1.5 }}>{errorMessage}</Alert> : null}

        {viewMode === "list" ? (
          <TableContainer sx={{ minHeight: 405, maxHeight: "calc(100vh - 410px)", borderTop: "1px solid var(--hr-border)" }}>
            <Table stickyHeader size="small" aria-label="Job catalog">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={{ bgcolor: "var(--hr-surface-soft)", borderColor: "var(--hr-border)" }}><Checkbox size="small" checked={allPageSelected} indeterminate={!allPageSelected && somePageSelected} onChange={togglePageSelection} inputProps={{ "aria-label": "Select all jobs on this page" }} /></TableCell>
                  <TableCell sx={{ minWidth: 145, bgcolor: "var(--hr-surface-soft)", borderColor: "var(--hr-border)" }}><TableSortLabel active={sortBy === "jobId"} direction={sortBy === "jobId" ? sortDirection : "asc"} onClick={() => toggleSort("jobId")} sx={{ color: "var(--hr-text) !important", fontSize: 10.25, fontWeight: 900 }}>Job ID</TableSortLabel></TableCell>
                  <TableCell sx={{ minWidth: 275, bgcolor: "var(--hr-surface-soft)", borderColor: "var(--hr-border)" }}><TableSortLabel active={sortBy === "jobTitle"} direction={sortBy === "jobTitle" ? sortDirection : "asc"} onClick={() => toggleSort("jobTitle")} sx={{ color: "var(--hr-text) !important", fontSize: 10.25, fontWeight: 900 }}>Job Title</TableSortLabel></TableCell>
                  {columnDefinitions.map((column) => visibleColumns.has(column.key) ? (
                    <TableCell key={column.key} sx={{ minWidth: column.key === "jobType" ? 225 : 155, bgcolor: "var(--hr-surface-soft)", borderColor: "var(--hr-border)", color: "var(--hr-text)", fontSize: 10.25, fontWeight: 900, whiteSpace: "nowrap" }}>
                      {column.sortKey ? <TableSortLabel active={sortBy === column.sortKey} direction={sortBy === column.sortKey ? sortDirection : "asc"} onClick={() => toggleSort(column.sortKey as JobSortKey)} sx={{ color: "var(--hr-text) !important", fontSize: 10.25, fontWeight: 900 }}>{column.label}</TableSortLabel> : column.label}
                    </TableCell>
                  ) : null)}
                  <TableCell align="center" sx={{ width: 70, bgcolor: "var(--hr-surface-soft)", borderColor: "var(--hr-border)", color: "var(--hr-text)", fontSize: 10.25, fontWeight: 900 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {listQuery.isLoading ? (
                  <TableRow><TableCell colSpan={visibleColumnCount} sx={{ height: 280, border: 0 }}><Box sx={{ display: "grid", placeItems: "center" }}><CircularProgress size={28} /></Box></TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={visibleColumnCount} sx={{ height: 280, border: 0, textAlign: "center" }}><Typography sx={{ color: "var(--hr-muted)", fontSize: 12 }}>No jobs match these filters.</Typography></TableCell></TableRow>
                ) : rows.map((job) => {
                  const status = profileStatus(job);
                  const selected = selectedIds.has(job.Job_ID);
                  return (
                    <TableRow key={job.Job_ID} hover selected={selected} sx={{ cursor: "pointer", "&.Mui-selected, &.Mui-selected:hover": { bgcolor: "var(--hr-selected)" } }} onClick={() => selectJob(job)}>
                      <TableCell padding="checkbox" sx={{ borderColor: "var(--hr-divider-soft)" }} onClick={(event) => event.stopPropagation()}><Checkbox size="small" checked={selected} onChange={() => toggleRowSelection(job.Job_ID)} inputProps={{ "aria-label": `Select ${job.Job_Name_EN}` }} /></TableCell>
                      <TableCell sx={{ py: 0.8, borderColor: "var(--hr-divider-soft)", whiteSpace: "nowrap" }}><Link component={RouterLink} to={`/human-resources/jobs/catalog/${job.Job_ID}`} onClick={(event) => event.stopPropagation()} underline="hover" sx={{ color: "var(--hr-accent)", fontSize: 10.75, fontWeight: 850 }}>{jobCode(job.Job_ID)}</Link></TableCell>
                      <TableCell sx={{ py: 0.65, borderColor: "var(--hr-divider-soft)" }}><Link component={RouterLink} to={`/human-resources/jobs/catalog/${job.Job_ID}`} onClick={(event) => event.stopPropagation()} underline="none" sx={{ display: "block", color: "var(--hr-row-text)", fontSize: 10.75, fontWeight: 850, lineHeight: 1.35, "&:hover": { color: "var(--hr-accent)" } }}>{job.Job_Name_EN}</Link><Typography lang="ar" dir="rtl" sx={{ mt: 0.15, color: "var(--hr-muted)", fontSize: 10, lineHeight: 1.3, textAlign: "left" }}>{job.Job_Name_AR}</Typography></TableCell>
                      {visibleColumns.has("jobFamily") ? <TableCell sx={{ py: 0.8, color: "var(--hr-row-text)", borderColor: "var(--hr-divider-soft)", fontSize: 10.5 }}>{job.Job_Family}</TableCell> : null}
                      {visibleColumns.has("careerLevel") ? <TableCell sx={{ py: 0.8, color: "var(--hr-row-text)", borderColor: "var(--hr-divider-soft)", fontSize: 10.5 }}>{job.Career_Level}</TableCell> : null}
                      {visibleColumns.has("jobType") ? <TableCell sx={{ py: 0.8, color: "var(--hr-row-text)", borderColor: "var(--hr-divider-soft)", fontSize: 10.5, lineHeight: 1.35 }}>{job.Job_Type}</TableCell> : null}
                      {visibleColumns.has("criticality") ? <TableCell sx={{ py: 0.7, borderColor: "var(--hr-divider-soft)" }}><Chip size="small" label={job.Role_Criticality} variant="outlined" sx={{ height: 23, ...criticalityStyle(job.Role_Criticality), fontSize: 9.25, fontWeight: 850 }} /></TableCell> : null}
                      {visibleColumns.has("status") ? <TableCell sx={{ py: 0.8, borderColor: "var(--hr-divider-soft)" }}><Stack direction="row" alignItems="center" spacing={0.8}><Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: status.color }} /><Typography sx={{ color: "var(--hr-row-text)", fontSize: 10.5, whiteSpace: "nowrap" }}>{status.label}</Typography></Stack></TableCell> : null}
                      <TableCell align="center" sx={{ py: 0.35, borderColor: "var(--hr-divider-soft)" }} onClick={(event) => event.stopPropagation()}><IconButton size="small" aria-label={`Actions for ${job.Job_Name_EN}`} onClick={(event) => setRowMenu({ anchor: event.currentTarget, job })}><MoreVertRoundedIcon sx={{ color: "var(--hr-strong-muted)", fontSize: 18 }} /></IconButton></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ minHeight: 405, p: 1.6, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" }, alignContent: "start", gap: 1.25, borderTop: "1px solid var(--hr-border)" }}>
            {listQuery.isLoading ? <Box sx={{ gridColumn: "1 / -1", minHeight: 280, display: "grid", placeItems: "center" }}><CircularProgress size={28} /></Box> : rows.map((job) => {
              const status = profileStatus(job);
              return (
                <Card key={job.Job_ID} component={RouterLink} to={`/human-resources/jobs/catalog/${job.Job_ID}`} variant="outlined" sx={{ p: 1.6, color: "inherit", textDecoration: "none", borderColor: "var(--hr-border)", borderRadius: "10px", boxShadow: "none", transition: "border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease", "&:hover": { borderColor: "var(--hr-accent-border)", boxShadow: "0 8px 20px rgba(23, 61, 116, 0.10)", transform: "translateY(-1px)" } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                    <Typography sx={{ color: "var(--hr-accent)", fontSize: 10.5, fontWeight: 850 }}>{jobCode(job.Job_ID)}</Typography>
                    <Stack direction="row" alignItems="center" spacing={0.65}><Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: status.color }} /><Typography sx={{ color: "var(--hr-muted)", fontSize: 9.5 }}>{status.label}</Typography></Stack>
                  </Stack>
                  <Typography sx={{ mt: 0.9, color: "var(--hr-text)", fontSize: 13.25, fontWeight: 900, lineHeight: 1.3 }}>{job.Job_Name_EN}</Typography>
                  <Typography lang="ar" dir="rtl" sx={{ mt: 0.25, color: "var(--hr-muted)", fontSize: 11, textAlign: "left" }}>{job.Job_Name_AR}</Typography>
                  <Divider sx={{ my: 1.25, borderColor: "var(--hr-divider-soft)" }} />
                  <Typography sx={{ color: "var(--hr-strong-muted)", fontSize: 10.25 }}>{job.Job_Family}</Typography>
                  <Stack direction="row" flexWrap="wrap" useFlexGap gap={0.7} sx={{ mt: 1.15 }}><Chip size="small" label={job.Career_Level} variant="outlined" sx={{ height: 22, borderColor: "var(--hr-border)", fontSize: 9 }} /><Chip size="small" label={job.Role_Criticality} variant="outlined" sx={{ height: 22, ...criticalityStyle(job.Role_Criticality), fontSize: 9, fontWeight: 800 }} /></Stack>
                </Card>
              );
            })}
          </Box>
        )}

        <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" sx={{ pl: { xs: 1.5, md: 2 }, borderTop: "1px solid var(--hr-border)" }}>
          <Typography sx={{ color: "var(--hr-strong-muted)", fontSize: 10.25, fontWeight: 750 }}>{rangeLabel}</Typography>
          <TablePagination component="div" count={pagination.total} page={Math.max(0, page - 1)} onPageChange={(_event, nextPage) => setPage(nextPage + 1)} rowsPerPage={pageSize} onRowsPerPageChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} rowsPerPageOptions={PAGE_SIZE_OPTIONS} labelRowsPerPage="Rows per page:" sx={{ color: "var(--hr-strong-muted)", "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { fontSize: 10.25, fontWeight: 650 } }} />
        </Stack>
      </Card>

      <Menu anchorEl={columnsAnchor} open={Boolean(columnsAnchor)} onClose={() => setColumnsAnchor(null)} slotProps={{ paper: { sx: { mt: 0.5, minWidth: 210, border: "1px solid var(--hr-border)", borderRadius: "10px", boxShadow: "var(--hr-shadow)" } } }}>
        <Typography sx={{ px: 1.6, pt: 1, pb: 0.5, color: "var(--hr-muted)", fontSize: 9.5, fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.06em" }}>Visible columns</Typography>
        {columnDefinitions.map((column) => <MenuItem key={column.key} dense disableRipple onClick={(event) => event.stopPropagation()}><FormControlLabel control={<Checkbox size="small" checked={visibleColumns.has(column.key)} onChange={() => setVisibleColumns((current) => { const next = new Set(current); if (next.has(column.key)) next.delete(column.key); else next.add(column.key); return next; })} />} label={column.label} sx={{ m: 0, width: "100%", "& .MuiFormControlLabel-label": { color: "var(--hr-row-text)", fontSize: 11.5 } }} /></MenuItem>)}
      </Menu>

      <Menu anchorEl={rowMenu?.anchor ?? null} open={Boolean(rowMenu)} onClose={() => setRowMenu(null)} slotProps={{ paper: { sx: { minWidth: 185, border: "1px solid var(--hr-border)", borderRadius: "10px", boxShadow: "var(--hr-shadow)" } } }}>
        <MenuItem onClick={() => rowMenu && selectJob(rowMenu.job)}><ListItemIcon><OpenInNewRoundedIcon fontSize="small" /></ListItemIcon><ListItemText primary="Open job profile" primaryTypographyProps={{ fontSize: 11.5, fontWeight: 700 }} /></MenuItem>
        <MenuItem onClick={() => rowMenu && void copyJobCode(rowMenu.job)}><ListItemIcon><ContentCopyRoundedIcon fontSize="small" /></ListItemIcon><ListItemText primary="Copy Job ID" primaryTypographyProps={{ fontSize: 11.5, fontWeight: 700 }} /></MenuItem>
      </Menu>

      <Snackbar open={Boolean(toast)} autoHideDuration={2600} onClose={() => setToast("")} message={toast} />

      {formOpen ? <Suspense fallback={null}><JobFormDialog open={formOpen} onClose={() => setFormOpen(false)} onCreated={onCreated} /></Suspense> : null}
    </Box>
  );
}
