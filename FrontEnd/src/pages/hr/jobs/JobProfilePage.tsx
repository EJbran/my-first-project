import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import BusinessCenterOutlinedIcon from "@mui/icons-material/BusinessCenterOutlined";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import GppGoodOutlinedIcon from "@mui/icons-material/GppGoodOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import PsychologyOutlinedIcon from "@mui/icons-material/PsychologyOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import WorkOutlineRoundedIcon from "@mui/icons-material/WorkOutlineRounded";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Card,
  Chip,
  CircularProgress,
  Collapse,
  Link,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  Tooltip,
  Typography
} from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { jobsApi } from "../../../api/jobs.api";
import { positionsApi } from "../../../api/positions.api";
import type { JobProfileFields, JobRecord } from "../../../types/job.types";
import type { PositionRecord } from "../../../types/position.types";
import { exportToExcel } from "../../../utils/exportExcel";
import { getHrThemeVars } from "./Theme";

type JobField = keyof JobProfileFields;
type ProfileTab = "overview" | "responsibilities" | "requirements" | "competencies" | "positions" | "history";

const PROFILE_TABS: Array<{ id: ProfileTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "responsibilities", label: "Responsibilities" },
  { id: "requirements", label: "Requirements" },
  { id: "competencies", label: "Competencies" },
  { id: "positions", label: "Positions" },
  { id: "history", label: "History" }
];

const EXPORT_FIELDS: Array<[JobField, string]> = [
  ["Job_ID", "Job ID"],
  ["Job_Name_EN", "English Job Title"],
  ["Job_Name_AR", "Arabic Job Title"],
  ["Job_Family", "Job Family"],
  ["Career_Level", "Career Level"],
  ["Role_Criticality", "Role Criticality"],
  ["Job_Type", "Job Type"],
  ["Role_Purpose", "Role Purpose"],
  ["Key_Accountabilities", "Key Accountabilities"],
  ["Typical_Deliverables", "Typical Deliverables"],
  ["Decision_Authority", "Decision Authority"],
  ["Supervisory_Scope", "Supervisory Scope"],
  ["Key_Interfaces", "Key Interfaces"],
  ["Minimum_Education_Benchmark", "Minimum Education Benchmark"],
  ["Preferred_Qualifications", "Preferred Qualifications"],
  ["Minimum_Experience_Benchmark", "Minimum Experience Benchmark"],
  ["Technical_Competencies", "Technical Competencies"],
  ["Behavioral_Competencies", "Behavioral Competencies"],
  ["HSE_Process_Safety_Accountabilities", "HSE and Process Safety Accountabilities"],
  ["Mandatory_Training_Licences_Benchmark", "Mandatory Training and Licences"],
  ["Applicable_Standards_Procedures", "Applicable Standards and Procedures"],
  ["Work_Environment_and_Schedule", "Work Environment and Schedule"],
  ["Physical_Medical_Fitness", "Physical and Medical Fitness"],
  ["Competency_Assurance_Method", "Competency Assurance Method"],
  ["KPI_Benchmark", "KPI Benchmark"],
  ["Required_Languages", "Required Languages"],
  ["Language_Level_CEFR", "Language Level CEFR"],
  ["Profile_Validation_Owner", "Profile Validation Owner"]
];

const jobCode = (jobId: number): string => `JOB-${String(jobId).padStart(6, "0")}`;
const positionCode = (positionId: number): string => `POS-${String(positionId).padStart(6, "0")}`;
const displayValue = (value: unknown): string => value === null || value === undefined || String(value).trim() === "" ? "—" : String(value).trim();

const splitStructuredText = (value: string): string[] => {
  const clean = value.replace(/\r/g, "").trim();
  if (!clean) return [];
  const lineItems = clean.split(/\n+/).map((item) => item.trim()).filter(Boolean);
  const candidates = lineItems.length > 1
    ? lineItems
    : clean.split(/(?=\s(?:\d{1,2}[.)]|[-•])\s+)/).map((item) => item.trim()).filter(Boolean);
  return candidates.map((item) => item.replace(/^\s*(?:\d{1,2}[.)]|[-•])\s*/, "").trim()).filter(Boolean);
};

const displayDate = (value: string | null): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};

const SectionHeading = ({ icon: Icon, title, subtitle }: { icon: SvgIconComponent; title: string; subtitle?: string }) => (
  <Stack direction="row" spacing={1.1} alignItems="center">
    <Box sx={{ width: 36, height: 36, flex: "0 0 auto", display: "grid", placeItems: "center", borderRadius: "10px", color: "var(--hr-accent)", bgcolor: "var(--hr-selected)" }}>
      <Icon sx={{ fontSize: 20 }} />
    </Box>
    <Box>
      <Typography component="h2" sx={{ color: "var(--hr-text)", fontSize: 14.25, fontWeight: 900, lineHeight: 1.2 }}>{title}</Typography>
      {subtitle ? <Typography sx={{ mt: 0.15, color: "var(--hr-muted)", fontSize: 9.75 }}>{subtitle}</Typography> : null}
    </Box>
  </Stack>
);

const ProfileCard = ({ children, sx }: { children: ReactNode; sx?: object }) => (
  <Card variant="outlined" sx={{ borderColor: "var(--hr-border)", borderRadius: "12px", bgcolor: "var(--hr-surface)", boxShadow: "0 5px 18px rgba(23, 50, 92, 0.045)", ...sx }}>
    {children}
  </Card>
);

const DetailRow = ({ label, value }: { label: string; value: unknown }) => (
  <Stack component="div" direction={{ xs: "column", sm: "row" }} gap={{ xs: 0.35, sm: 1.5 }} sx={{ py: 0.9, borderBottom: "1px solid var(--hr-divider-soft)", "&:last-of-type": { borderBottom: 0 } }}>
    <Typography component="dt" sx={{ width: { sm: 145 }, flex: "0 0 auto", color: "var(--hr-strong-muted)", fontSize: 10.5, fontWeight: 800 }}>{label}</Typography>
    <Typography component="dd" sx={{ m: 0, minWidth: 0, color: "var(--hr-row-text)", fontSize: 10.75, lineHeight: 1.55, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{displayValue(value)}</Typography>
  </Stack>
);

const FieldPanel = ({ title, value, icon: Icon }: { title: string; value: unknown; icon?: SvgIconComponent }) => (
  <ProfileCard sx={{ height: "100%", p: { xs: 1.7, md: 2 } }}>
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.1 }}>
      {Icon ? <Box sx={{ width: 31, height: 31, display: "grid", placeItems: "center", borderRadius: "8px", color: "var(--hr-accent)", bgcolor: "var(--hr-selected)" }}><Icon sx={{ fontSize: 18 }} /></Box> : null}
      <Typography component="h3" sx={{ color: "var(--hr-text)", fontSize: 12.25, fontWeight: 900 }}>{title}</Typography>
    </Stack>
    <Typography sx={{ color: "var(--hr-row-text)", fontSize: 11.25, lineHeight: 1.7, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{displayValue(value)}</Typography>
  </ProfileCard>
);

const AccountabilityList = ({ value }: { value: string }) => {
  const items = useMemo(() => splitStructuredText(value), [value]);
  const [expanded, setExpanded] = useState<number | null>(null);

  if (items.length === 0) return <Typography sx={{ p: 2, color: "var(--hr-muted)", fontSize: 11 }}>No accountabilities recorded.</Typography>;

  return (
    <Box sx={{ px: 1.2, pb: 0.6 }}>
      {items.map((item, index) => {
        const semicolon = item.indexOf(";");
        const summary = semicolon > 0 ? item.slice(0, semicolon).trim() : item;
        const detail = semicolon > 0 ? item.slice(semicolon + 1).trim() : "";
        const isExpanded = expanded === index;
        return (
          <Box key={`${index}-${item.slice(0, 24)}`} sx={{ borderBottom: "1px solid var(--hr-divider-soft)", "&:last-child": { borderBottom: 0 } }}>
            <Box component={detail ? "button" : "div"} type={detail ? "button" : undefined} onClick={detail ? () => setExpanded((current) => current === index ? null : index) : undefined} sx={{ width: "100%", px: 0.8, py: 0.72, display: "grid", gridTemplateColumns: "42px minmax(0, 1fr) 26px", alignItems: "center", gap: 0.8, border: 0, bgcolor: "transparent", color: "inherit", font: "inherit", textAlign: "left", cursor: detail ? "pointer" : "default", "&:hover": detail ? { bgcolor: "var(--hr-surface-hover)" } : undefined, "&:focus-visible": { outline: "2px solid var(--hr-accent)", outlineOffset: -2 } }}>
              <Box sx={{ height: 28, display: "grid", placeItems: "center", borderRadius: "8px", color: "var(--hr-accent)", bgcolor: "var(--hr-selected)", fontSize: 11, fontWeight: 900 }}>{String(index + 1).padStart(2, "0")}</Box>
              <Typography sx={{ color: "var(--hr-row-text)", fontSize: 11.1, lineHeight: 1.45 }}>{summary}</Typography>
              {detail ? <KeyboardArrowDownRoundedIcon sx={{ color: "var(--hr-accent)", fontSize: 20, transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 160ms ease" }} /> : <Box />}
            </Box>
            {detail ? <Collapse in={isExpanded}><Typography sx={{ ml: 6.4, mr: 3.8, pb: 1.1, color: "var(--hr-muted)", fontSize: 10.5, lineHeight: 1.55 }}>{detail}</Typography></Collapse> : null}
          </Box>
        );
      })}
    </Box>
  );
};

const TabPanel = ({ id, active, children }: { id: ProfileTab; active: boolean; children: ReactNode }) => (
  <Box role="tabpanel" id={`job-tabpanel-${id}`} aria-labelledby={`job-tab-${id}`} hidden={!active} sx={{ pt: 1.35 }}>
    {active ? children : null}
  </Box>
);

const PositionAllocation = ({ job, onOpen }: { job: JobRecord; onOpen: () => void }) => (
  <ProfileCard sx={{ mt: 1.35, p: { xs: 1.6, md: 2 } }}>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} gap={1.5}>
      <SectionHeading icon={GroupsOutlinedIcon} title={`Position Allocation (${job.TotalPositions ?? 0})`} subtitle="Current organizational positions linked to this job." />
      <Button variant="outlined" onClick={onOpen} sx={{ height: 36, borderColor: "var(--hr-accent-border)", color: "var(--hr-accent)", fontSize: 10.5, fontWeight: 850, textTransform: "none" }}>View all positions</Button>
    </Stack>
    <Box sx={{ mt: 1.5, display: "grid", gridTemplateColumns: { xs: "repeat(3, 1fr)", md: "repeat(3, minmax(140px, 210px))" }, gap: 1 }}>
      {[
        ["Total", job.TotalPositions ?? 0, "var(--hr-text)"],
        ["Occupied", job.OccupiedPositions ?? 0, "var(--hr-success-text)"],
        ["Vacant", job.VacantPositions ?? 0, "var(--hr-accent)"]
      ].map(([label, value, color]) => <Box key={String(label)} sx={{ p: 1.2, borderRadius: "9px", bgcolor: "var(--hr-surface-soft)" }}><Typography sx={{ color: "var(--hr-muted)", fontSize: 9.5, fontWeight: 750 }}>{label}</Typography><Typography sx={{ mt: 0.35, color: String(color), fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{Number(value).toLocaleString()}</Typography></Box>)}
    </Box>
  </ProfileCard>
);

const OverviewTab = ({ job, openPositions }: { job: JobRecord; openPositions: () => void }) => (
  <>
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "minmax(340px, 0.78fr) minmax(540px, 1.3fr)" }, gap: 1.35 }}>
      <Stack spacing={1.35}>
        <ProfileCard sx={{ p: { xs: 1.7, md: 2 } }}>
          <SectionHeading icon={AssignmentOutlinedIcon} title="Role Purpose" />
          <Typography sx={{ mt: 1.4, color: "var(--hr-row-text)", fontSize: 11.25, lineHeight: 1.72, whiteSpace: "pre-wrap" }}>{displayValue(job.Role_Purpose)}</Typography>
        </ProfileCard>
        <ProfileCard sx={{ p: { xs: 1.7, md: 2 } }}>
          <SectionHeading icon={BusinessCenterOutlinedIcon} title="Role Context" />
          <Box component="dl" sx={{ m: 0, mt: 1.15 }}>
            <DetailRow label="Job Family" value={job.Job_Family} />
            <DetailRow label="Work Environment" value={job.Work_Environment_and_Schedule} />
            <DetailRow label="Supervisory Scope" value={job.Supervisory_Scope} />
            <DetailRow label="Validation Owner" value={job.Profile_Validation_Owner} />
          </Box>
        </ProfileCard>
      </Stack>
      <ProfileCard sx={{ overflow: "hidden" }}>
        <Box sx={{ px: { xs: 1.7, md: 2 }, py: 1.45, borderBottom: "1px solid var(--hr-divider-soft)" }}><SectionHeading icon={FactCheckOutlinedIcon} title="Key Accountabilities" subtitle="Primary outcomes expected from this role." /></Box>
        <AccountabilityList value={job.Key_Accountabilities} />
      </ProfileCard>
    </Box>
    <PositionAllocation job={job} onOpen={openPositions} />
  </>
);

const ResponsibilitiesTab = ({ job }: { job: JobRecord }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 1.35 }}>
    <Box sx={{ gridColumn: { lg: "1 / -1" } }}><FieldPanel title="Key Accountabilities" value={job.Key_Accountabilities} icon={FactCheckOutlinedIcon} /></Box>
    <FieldPanel title="Typical Deliverables" value={job.Typical_Deliverables} icon={AssignmentOutlinedIcon} />
    <FieldPanel title="Decision Authority" value={job.Decision_Authority} icon={GppGoodOutlinedIcon} />
    <FieldPanel title="Supervisory Scope" value={job.Supervisory_Scope} icon={GroupsOutlinedIcon} />
    <FieldPanel title="Key Interfaces" value={job.Key_Interfaces} icon={AccountTreeOutlinedIcon} />
    <Box sx={{ gridColumn: { lg: "1 / -1" } }}><FieldPanel title="HSE & Process Safety Accountabilities" value={job.HSE_Process_Safety_Accountabilities} icon={GppGoodOutlinedIcon} /></Box>
  </Box>
);

const RequirementsTab = ({ job }: { job: JobRecord }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 1.35 }}>
    <FieldPanel title="Minimum Education Benchmark" value={job.Minimum_Education_Benchmark} icon={SchoolOutlinedIcon} />
    <FieldPanel title="Preferred Qualifications" value={job.Preferred_Qualifications} icon={SchoolOutlinedIcon} />
    <FieldPanel title="Minimum Experience Benchmark" value={job.Minimum_Experience_Benchmark} icon={BusinessCenterOutlinedIcon} />
    <FieldPanel title="Mandatory Training & Licences" value={job.Mandatory_Training_Licences_Benchmark} icon={FactCheckOutlinedIcon} />
    <FieldPanel title="Required Languages" value={job.Required_Languages} />
    <FieldPanel title="Language Level (CEFR)" value={job.Language_Level_CEFR} />
    <Box sx={{ gridColumn: { lg: "1 / -1" } }}><FieldPanel title="Physical & Medical Fitness" value={job.Physical_Medical_Fitness} /></Box>
  </Box>
);

const CompetenciesTab = ({ job }: { job: JobRecord }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 1.35 }}>
    <FieldPanel title="Technical Competencies" value={job.Technical_Competencies} icon={PsychologyOutlinedIcon} />
    <FieldPanel title="Behavioral Competencies" value={job.Behavioral_Competencies} icon={PsychologyOutlinedIcon} />
    <FieldPanel title="Competency Assurance Method" value={job.Competency_Assurance_Method} icon={FactCheckOutlinedIcon} />
    <FieldPanel title="Applicable Standards & Procedures" value={job.Applicable_Standards_Procedures} icon={GppGoodOutlinedIcon} />
    <FieldPanel title="KPI Benchmark" value={job.KPI_Benchmark} />
    <FieldPanel title="Profile Validation Owner" value={job.Profile_Validation_Owner} />
  </Box>
);

const PositionsTab = ({ jobId }: { jobId: number }) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const positionsQuery = useQuery({
    queryKey: ["hr", "jobs", "profile", jobId, "positions", page, pageSize],
    queryFn: () => positionsApi.list({ jobId, page, pageSize }),
    staleTime: 30_000
  });
  const result = positionsQuery.data;
  const rows = result?.success ? result.data : [];
  const pagination = result?.success ? result.pagination : { page, pageSize, total: 0, totalPages: 0 };
  const errorMessage = result && !result.success ? result.errors?.join(". ") || result.message : positionsQuery.isError ? "Positions could not be loaded." : null;

  return (
    <ProfileCard sx={{ overflow: "hidden" }}>
      <Box sx={{ px: { xs: 1.6, md: 2 }, py: 1.5, borderBottom: "1px solid var(--hr-border)" }}><SectionHeading icon={GroupsOutlinedIcon} title={`Position Allocation (${pagination.total.toLocaleString()})`} subtitle="Every organizational position currently linked to this job." /></Box>
      {errorMessage ? <Alert severity="error" sx={{ m: 1.5 }}>{errorMessage}</Alert> : null}
      <TableContainer sx={{ minHeight: 330 }}>
        <Table size="small" aria-label="Positions allocated to this job">
          <TableHead><TableRow>{["Position", "Position Number", "Type", "Level / Degree", "Employee", "Occupancy", "Created"].map((label) => <TableCell key={label} sx={{ bgcolor: "var(--hr-surface-soft)", borderColor: "var(--hr-border)", color: "var(--hr-text)", fontSize: 10, fontWeight: 900, whiteSpace: "nowrap" }}>{label}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {positionsQuery.isLoading ? <TableRow><TableCell colSpan={7} sx={{ height: 250, border: 0 }}><Box sx={{ display: "grid", placeItems: "center" }}><CircularProgress size={26} /></Box></TableCell></TableRow> : rows.length === 0 ? <TableRow><TableCell colSpan={7} sx={{ height: 250, border: 0, textAlign: "center" }}><Typography sx={{ color: "var(--hr-muted)", fontSize: 11.5 }}>No positions are linked to this job.</Typography></TableCell></TableRow> : rows.map((position: PositionRecord) => {
              const occupied = position.EmployeeId !== null;
              const employeeName = position.EmployeeName_EN?.trim() || position.EmployeeName_AR?.trim() || "—";
              return (
                <TableRow key={position.PositionId} hover>
                  <TableCell sx={{ borderColor: "var(--hr-divider-soft)" }}><Link component={RouterLink} to={`/human-resources/jobs/positions/${position.PositionId}`} underline="hover" sx={{ color: "var(--hr-accent)", fontSize: 10.5, fontWeight: 850 }}>{positionCode(position.PositionId)}</Link></TableCell>
                  <TableCell sx={{ color: "var(--hr-row-text)", borderColor: "var(--hr-divider-soft)", fontSize: 10.5 }}>{displayValue(position.Position_Number)}</TableCell>
                  <TableCell sx={{ color: "var(--hr-row-text)", borderColor: "var(--hr-divider-soft)", fontSize: 10.5 }}>{displayValue(position.Position_Type)}</TableCell>
                  <TableCell sx={{ color: "var(--hr-row-text)", borderColor: "var(--hr-divider-soft)", fontSize: 10.5 }}>{displayValue(position.PositionLevel)} / {displayValue(position.Position_Degree)}</TableCell>
                  <TableCell sx={{ borderColor: "var(--hr-divider-soft)" }}>{occupied && position.EmployeeId ? <Link component={RouterLink} to={`/human-resources/employees/employee-profile/${position.EmployeeId}`} underline="hover" sx={{ color: "var(--hr-accent)", fontSize: 10.5, fontWeight: 750 }}>{employeeName}</Link> : <Typography sx={{ color: "var(--hr-muted)", fontSize: 10.5 }}>—</Typography>}</TableCell>
                  <TableCell sx={{ borderColor: "var(--hr-divider-soft)" }}><Chip size="small" label={occupied ? "Occupied" : "Vacant"} sx={{ height: 22, color: occupied ? "var(--hr-success-text)" : "var(--hr-accent)", bgcolor: occupied ? "var(--hr-success-bg)" : "var(--hr-selected)", fontSize: 9.25, fontWeight: 850 }} /></TableCell>
                  <TableCell sx={{ color: "var(--hr-row-text)", borderColor: "var(--hr-divider-soft)", fontSize: 10.25, whiteSpace: "nowrap" }}>{displayDate(position.Position_DateCreation)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination component="div" count={pagination.total} page={Math.max(0, page - 1)} onPageChange={(_event, nextPage) => setPage(nextPage + 1)} rowsPerPage={pageSize} onRowsPerPageChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} rowsPerPageOptions={[10, 25, 50]} labelRowsPerPage="Rows per page:" sx={{ borderTop: "1px solid var(--hr-border)", color: "var(--hr-strong-muted)", "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { fontSize: 10.25 } }} />
    </ProfileCard>
  );
};

const HistoryTab = () => (
  <ProfileCard sx={{ minHeight: 330, display: "grid", placeItems: "center", p: 3, textAlign: "center" }}>
    <Box>
      <Box sx={{ mx: "auto", width: 54, height: 54, display: "grid", placeItems: "center", borderRadius: "50%", color: "var(--hr-accent)", bgcolor: "var(--hr-selected)" }}><HistoryRoundedIcon sx={{ fontSize: 27 }} /></Box>
      <Typography component="h2" sx={{ mt: 1.4, color: "var(--hr-text)", fontSize: 14, fontWeight: 900 }}>Job history is not recorded yet</Typography>
      <Typography sx={{ mt: 0.55, maxWidth: 470, color: "var(--hr-muted)", fontSize: 11, lineHeight: 1.6 }}>This catalog does not currently store version history, approvals, or profile change events. This tab is ready for a future audit-history data source.</Typography>
    </Box>
  </ProfileCard>
);

export default function JobProfilePage() {
  const navigate = useNavigate();
  const { jobId } = useParams<{ jobId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const parsedJobId = jobId && /^[1-9]\d*$/.test(jobId) && Number(jobId) <= 2147483647 ? Number(jobId) : null;
  const requestedTab = searchParams.get("tab") as ProfileTab | null;
  const [activeTab, setActiveTab] = useState<ProfileTab>(() => PROFILE_TABS.some((tab) => tab.id === requestedTab) ? requestedTab as ProfileTab : "overview");
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
  const [toast, setToast] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  const detailQuery = useQuery({
    queryKey: ["hr", "jobs", "detail", parsedJobId],
    queryFn: () => jobsApi.getById(parsedJobId as number),
    enabled: parsedJobId !== null,
    retry: false,
    staleTime: 60_000
  });

  const result = detailQuery.data;
  const job = result?.success ? result.data : null;
  const errorMessage = parsedJobId === null
    ? "The Job ID in this address is invalid."
    : result && !result.success
      ? result.errors?.join(". ") || result.message
      : detailQuery.isError
        ? "The job profile could not be loaded."
        : null;

  const backToCatalog = () => navigate({ pathname: "/human-resources/jobs/catalog" });

  useEffect(() => {
    if (!job) return;
    const previousTitle = document.title;
    document.title = `${job.Job_Name_EN} | IMS-HAROUGE`;
    window.requestAnimationFrame(() => headingRef.current?.focus());
    return () => { document.title = previousTitle; };
  }, [job]);

  const setTab = (tab: ProfileTab) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === "overview") next.delete("tab");
    else next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  const exportProfile = () => {
    if (!job) return;
    const rows = [
      ...EXPORT_FIELDS.map(([field, label]) => ({ field: label, value: displayValue(job[field]) })),
      { field: "Total Positions", value: String(job.TotalPositions ?? 0) },
      { field: "Occupied Positions", value: String(job.OccupiedPositions ?? 0) },
      { field: "Vacant Positions", value: String(job.VacantPositions ?? 0) }
    ];
    exportToExcel(`${jobCode(job.Job_ID)}-profile.csv`, [{ header: "Field", value: (row) => row.field }, { header: "Value", value: (row) => row.value }], rows);
    setToast("Job profile exported as CSV.");
    setMoreAnchor(null);
  };

  const copyCode = async () => {
    if (!job) return;
    await navigator.clipboard.writeText(jobCode(job.Job_ID));
    setToast(`${jobCode(job.Job_ID)} copied.`);
    setMoreAnchor(null);
  };

  const totalPositions = job?.TotalPositions ?? 0;
  const occupiedPositions = job?.OccupiedPositions ?? 0;
  const vacantPositions = job?.VacantPositions ?? 0;
  const fillRate = totalPositions > 0 ? Math.round((occupiedPositions / totalPositions) * 100) : 0;
  const occupiedWidth = totalPositions > 0 ? (occupiedPositions / totalPositions) * 100 : 0;
  const vacantWidth = totalPositions > 0 ? (vacantPositions / totalPositions) * 100 : 0;

  return (
    <Box sx={(theme) => ({ ...getHrThemeVars(theme), color: "var(--hr-text)", pb: 4 })}>
      {detailQuery.isLoading ? <Box sx={{ minHeight: 520, display: "grid", placeItems: "center" }}><CircularProgress size={30} /></Box> : errorMessage ? <Box sx={{ pt: 2 }}><Alert severity="error" action={<Button color="inherit" onClick={backToCatalog}>Back to catalog</Button>}>{errorMessage}</Alert></Box> : job ? (
        <>
          <Box component="header" sx={{ pt: { xs: 1.25, md: 1.9 }, pb: 1.45 }}>
            <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", lg: "flex-start" }} gap={2}>
              <Box sx={{ minWidth: 0 }}>
                <Breadcrumbs separator="/" aria-label="Breadcrumb" sx={{ mb: 0.65, "& .MuiBreadcrumbs-separator": { color: "var(--hr-muted)", mx: 0.8 } }}>
                  <Link component={RouterLink} to="/human-resources/hr-dashboard" underline="hover" sx={{ color: "var(--hr-accent)", fontSize: 11.5, fontWeight: 700 }}>HR</Link>
                  <Link component={RouterLink} to="/human-resources/jobs/catalog" underline="hover" sx={{ color: "var(--hr-accent)", fontSize: 11.5, fontWeight: 700 }}>Job Catalog</Link>
                  <Typography sx={{ color: "var(--hr-muted)", fontSize: 11.5 }}>{jobCode(job.Job_ID)}</Typography>
                </Breadcrumbs>
                <Typography ref={headingRef} tabIndex={-1} component="h1" sx={{ color: "var(--hr-text)", fontSize: { xs: 26, md: 31 }, lineHeight: 1.08, fontWeight: 900, letterSpacing: "-0.035em", outline: "none" }}>{job.Job_Name_EN}</Typography>
                <Typography lang="ar" dir="rtl" sx={{ mt: 0.45, color: "var(--hr-text)", fontSize: 14, fontWeight: 750, textAlign: "left" }}>{job.Job_Name_AR}</Typography>
                <Typography sx={{ mt: 0.35, color: "var(--hr-muted)", fontSize: 11.25, fontWeight: 650 }}>{jobCode(job.Job_ID)}</Typography>
              </Box>
              <Stack direction="row" flexWrap="wrap" useFlexGap justifyContent={{ xs: "flex-start", lg: "flex-end" }} gap={1} sx={{ pt: { lg: 2 } }}>
                <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={backToCatalog} sx={{ height: 42, px: 2, borderColor: "var(--hr-accent-border)", color: "var(--hr-text)", fontSize: 11.25, fontWeight: 800, textTransform: "none" }}>Back to Job Catalog</Button>
                <Button variant="outlined" startIcon={<MoreVertRoundedIcon />} onClick={(event) => setMoreAnchor(event.currentTarget)} sx={{ height: 42, px: 2, borderColor: "var(--hr-accent-border)", color: "var(--hr-text)", fontSize: 11.25, fontWeight: 800, textTransform: "none" }}>More</Button>
                <Tooltip title="Job editing needs an approved update workflow and is not enabled yet"><span><Button variant="contained" disabled startIcon={<EditRoundedIcon />} sx={{ height: 42, px: 2.3, fontSize: 11.25, fontWeight: 800, textTransform: "none" }}>Edit Job</Button></span></Tooltip>
              </Stack>
            </Stack>
          </Box>

          <ProfileCard sx={{ p: { xs: 1.7, md: 2.1 } }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1fr) 395px" }, gap: { xs: 2, xl: 2.5 } }}>
              <Box sx={{ minWidth: 0 }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.7} alignItems={{ xs: "flex-start", md: "center" }}>
                  <Box sx={{ width: 56, height: 56, flex: "0 0 auto", display: "grid", placeItems: "center", borderRadius: "13px", color: "var(--hr-accent)", bgcolor: "var(--hr-selected)" }}><WorkOutlineRoundedIcon sx={{ fontSize: 31 }} /></Box>
                  <Stack direction="row" flexWrap="wrap" useFlexGap gap={0.75} alignItems="center">
                    {[job.Job_Family, job.Career_Level, job.Job_Type, job.Role_Criticality].map((value) => <Chip key={value} label={value} size="small" variant="outlined" sx={{ height: 27, borderColor: "var(--hr-border)", color: "var(--hr-strong-muted)", bgcolor: "var(--hr-surface)", fontSize: 9.75, fontWeight: 750 }} />)}
                    <Stack direction="row" spacing={0.7} alignItems="center" sx={{ ml: { md: 0.6 } }}><Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: job.Role_Criticality.toLowerCase().includes("review required") ? "#7e22ce" : "#29952e" }} /><Typography sx={{ color: "var(--hr-strong-muted)", fontSize: 10.5, fontWeight: 700 }}>{job.Role_Criticality.toLowerCase().includes("review required") ? "Under review" : "Catalogued"}</Typography></Stack>
                  </Stack>
                </Stack>
                <Box component="dl" sx={{ m: 0, mt: 2.2, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "0.55fr 1.35fr 0.85fr 1.45fr" }, gap: 0 }}>
                  {[
                    ["Job ID", jobCode(job.Job_ID)],
                    ["Job Family", job.Job_Family],
                    ["Career Level", job.Career_Level],
                    ["Job Type", job.Job_Type]
                  ].map(([label, value], index) => <Box key={String(label)} sx={{ minWidth: 0, pl: { sm: index % 2 ? 2 : 0, lg: index > 0 ? 2 : 0 }, borderLeft: { sm: index % 2 ? "1px solid var(--hr-border)" : 0, lg: index > 0 ? "1px solid var(--hr-border)" : 0 }, pt: { xs: 1, sm: index > 1 ? 1.4 : 0, lg: 0 } }}><Typography component="dt" sx={{ color: "var(--hr-muted)", fontSize: 9.5, fontWeight: 850 }}>{label}</Typography><Typography component="dd" sx={{ m: 0, mt: 0.65, color: "var(--hr-row-text)", fontSize: 10.75, fontWeight: 750, lineHeight: 1.45, overflowWrap: "anywhere" }}>{value}</Typography></Box>)}
                </Box>
              </Box>
              <Box sx={{ pl: { xl: 2.5 }, borderLeft: { xl: "1px solid var(--hr-border)" } }}>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
                  {[
                    ["Total Positions", totalPositions, "var(--hr-text)"],
                    ["Occupied", occupiedPositions, "var(--hr-success-text)"],
                    ["Vacant", vacantPositions, "var(--hr-accent)"]
                  ].map(([label, value, color]) => <Box key={String(label)}><Typography sx={{ color: String(color), fontSize: 23, fontWeight: 900, lineHeight: 1 }}>{Number(value).toLocaleString()}</Typography><Typography sx={{ mt: 0.55, color: "var(--hr-muted)", fontSize: 10.25 }}>{label}</Typography></Box>)}
                </Box>
                <Box aria-label={`${fillRate}% of positions are filled`} sx={{ mt: 2.1, height: 7, display: "flex", overflow: "hidden", borderRadius: "999px", bgcolor: "var(--hr-divider-soft)" }}><Box sx={{ width: `${occupiedWidth}%`, bgcolor: "#2f9d38" }} /><Box sx={{ width: `${vacantWidth}%`, bgcolor: "#2364d8" }} /></Box>
                <Typography sx={{ mt: 1.1, color: "var(--hr-muted)", fontSize: 10.25, fontWeight: 750 }}>{fillRate}% filled</Typography>
              </Box>
            </Box>
          </ProfileCard>

          <Box sx={{ mt: 1.35, border: "1px solid var(--hr-border)", borderRadius: "11px", bgcolor: "var(--hr-surface)", overflowX: "auto" }}>
            <Tabs value={activeTab} onChange={(_event, value: ProfileTab) => setTab(value)} aria-label="Job profile sections" variant="scrollable" scrollButtons="auto" sx={{ minHeight: 46, "& .MuiTabs-indicator": { height: 3, borderRadius: "3px 3px 0 0", bgcolor: "var(--hr-accent)" }, "& .MuiTab-root": { minHeight: 46, minWidth: "auto", px: 2.3, color: "var(--hr-strong-muted)", fontSize: 10.25, fontWeight: 850, textTransform: "none" }, "& .Mui-selected": { color: "var(--hr-accent) !important" } }}>
              {PROFILE_TABS.map((tab) => <Tab key={tab.id} id={`job-tab-${tab.id}`} aria-controls={`job-tabpanel-${tab.id}`} value={tab.id} label={tab.id === "positions" ? `${tab.label} (${totalPositions})` : tab.label} />)}
            </Tabs>
          </Box>

          <TabPanel id="overview" active={activeTab === "overview"}><OverviewTab job={job} openPositions={() => setTab("positions")} /></TabPanel>
          <TabPanel id="responsibilities" active={activeTab === "responsibilities"}><ResponsibilitiesTab job={job} /></TabPanel>
          <TabPanel id="requirements" active={activeTab === "requirements"}><RequirementsTab job={job} /></TabPanel>
          <TabPanel id="competencies" active={activeTab === "competencies"}><CompetenciesTab job={job} /></TabPanel>
          <TabPanel id="positions" active={activeTab === "positions"}><PositionsTab jobId={job.Job_ID} /></TabPanel>
          <TabPanel id="history" active={activeTab === "history"}><HistoryTab /></TabPanel>

          <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)} slotProps={{ paper: { sx: { minWidth: 205, border: "1px solid var(--hr-border)", borderRadius: "10px", boxShadow: "var(--hr-shadow)" } } }}>
            <MenuItem onClick={() => void copyCode()}><ListItemIcon><ContentCopyRoundedIcon fontSize="small" /></ListItemIcon><ListItemText primary="Copy Job ID" primaryTypographyProps={{ fontSize: 11.5, fontWeight: 700 }} /></MenuItem>
            <MenuItem onClick={exportProfile}><ListItemIcon><DownloadRoundedIcon fontSize="small" /></ListItemIcon><ListItemText primary="Export profile (CSV)" primaryTypographyProps={{ fontSize: 11.5, fontWeight: 700 }} /></MenuItem>
            <MenuItem onClick={() => { setMoreAnchor(null); setTab("positions"); }}><ListItemIcon><GroupsOutlinedIcon fontSize="small" /></ListItemIcon><ListItemText primary="View positions" primaryTypographyProps={{ fontSize: 11.5, fontWeight: 700 }} /></MenuItem>
          </Menu>
          <Snackbar open={Boolean(toast)} autoHideDuration={2600} onClose={() => setToast("")} message={toast} />
        </>
      ) : null}
    </Box>
  );
}
