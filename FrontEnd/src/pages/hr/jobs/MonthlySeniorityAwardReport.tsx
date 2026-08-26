import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LockClockRoundedIcon from "@mui/icons-material/LockClockRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  GlobalStyles,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent, type ReactElement, type ReactNode } from "react";
import { createPortal, flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";
import { hrReportsApi } from "../../../api/hrReports.api";
import type {
  MonthlySeniorityAwardReport,
  MonthlySeniorityAwardReportRequest,
  SeniorityAwardLineStatus,
  SeniorityAwardReportLine
} from "../../../types/hrReports.types";
import { MonthlySeniorityAwardPdfDocument } from "./MonthlySeniorityAwardPdfDocument";

type MonthlySeniorityAwardReportProps = {
  month: string;
  onBack: () => void;
  initialReport?: MonthlySeniorityAwardReport;
  loadReport?: (request: MonthlySeniorityAwardReportRequest) => Promise<MonthlySeniorityAwardReport>;
  loadCompleteReport?: (month: string) => Promise<MonthlySeniorityAwardReport>;
};

type ReportMetricCardProps = {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  color: string;
  background: string;
};

const moneyFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC"
});

const formatDate = (value?: string | null): string => {
  if (!value) return "-";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? value : dateFormatter.format(parsed).replaceAll("/", "-");
};

const statusPresentation: Record<SeniorityAwardLineStatus, { label: string; color: string; background: string; icon: ReactElement }> = {
  eligible: {
    label: "Eligible",
    color: "#087a43",
    background: "#e9f8ee",
    icon: <CheckCircleRoundedIcon />
  },
  "review-required": {
    label: "Review required",
    color: "#a15c00",
    background: "#fff4df",
    icon: <ErrorOutlineRoundedIcon />
  },
  held: {
    label: "Held",
    color: "#c11b2b",
    background: "#ffeaed",
    icon: <LockClockRoundedIcon />
  }
};

const ReportMetricCard = ({ icon, label, value, detail, color, background }: ReportMetricCardProps) => (
  <Card
    variant="outlined"
    sx={{
      minHeight: 104,
      display: "flex",
      alignItems: "center",
      gap: 1.5,
      px: 2,
      py: 1.5,
      borderColor: "var(--hr-border)",
      borderRadius: "11px",
      bgcolor: "var(--hr-surface)",
      boxShadow: "0 4px 15px rgba(15, 42, 91, 0.045)"
    }}
  >
    <Box sx={{ width: 44, height: 44, flex: "0 0 auto", display: "grid", placeItems: "center", borderRadius: "12px", color, bgcolor: background, "& .MuiSvgIcon-root": { fontSize: 25 } }}>
      {icon}
    </Box>
    <Box minWidth={0}>
      <Typography sx={{ color: "var(--hr-strong-muted)", fontSize: 11, fontWeight: 750 }}>{label}</Typography>
      <Typography noWrap sx={{ mt: 0.35, color: "var(--hr-text)", fontSize: 19, lineHeight: 1.15, fontWeight: 900 }}>{value}</Typography>
      <Typography noWrap sx={{ mt: 0.45, color: "var(--hr-muted)", fontSize: 10.25, fontWeight: 600 }}>{detail}</Typography>
    </Box>
  </Card>
);

const ReportStatusChip = ({ status }: { status: SeniorityAwardLineStatus }) => {
  const presentation = statusPresentation[status];
  return (
    <Chip
      size="small"
      icon={presentation.icon}
      label={presentation.label}
      sx={{
        height: 24,
        color: presentation.color,
        bgcolor: presentation.background,
        borderRadius: "999px",
        fontSize: 10.5,
        fontWeight: 850,
        "& .MuiChip-icon": { ml: 0.7, mr: -0.25, color: "inherit", fontSize: 15 }
      }}
    />
  );
};

const EmployeeIdentityCell = ({ line }: { line: SeniorityAwardReportLine }) => (
  <Box minWidth={0}>
    <Typography noWrap dir="auto" sx={{ color: "var(--hr-row-text)", fontSize: 11.5, fontWeight: 800 }}>{line.employeeName}</Typography>
    {line.employeeNameArabic && line.employeeNameArabic !== line.employeeName && (
      <Typography noWrap dir="rtl" sx={{ mt: 0.3, color: "var(--hr-muted)", fontSize: 10 }}>{line.employeeNameArabic}</Typography>
    )}
    <Typography noWrap sx={{ mt: 0.35, color: "var(--hr-muted)", fontSize: 9.75, fontWeight: 600 }}>
      Employee #{line.employeeNumber || "-"} · Finance {line.financeNumber || "Not recorded"}
    </Typography>
  </Box>
);

const OrganizationCell = ({ line }: { line: SeniorityAwardReportLine }) => (
  <Box minWidth={0}>
    <Typography noWrap dir="auto" sx={{ color: "var(--hr-row-text)", fontSize: 11, fontWeight: 750 }}>{line.jobName}</Typography>
    <Typography noWrap dir="auto" sx={{ mt: 0.35, color: "var(--hr-muted)", fontSize: 9.75 }}>{line.departmentName}</Typography>
    <Typography noWrap dir="auto" sx={{ mt: 0.25, color: "var(--hr-muted)", fontSize: 9.75 }}>{line.workLocation}</Typography>
  </Box>
);

export const MonthlySeniorityAwardReportView = ({
  month,
  onBack,
  initialReport,
  loadReport = hrReportsApi.getSeniorityAwards,
  loadCompleteReport = hrReportsApi.getAllSeniorityAwards
}: MonthlySeniorityAwardReportProps) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [milestone, setMilestone] = useState<number | null>(null);
  const [status, setStatus] = useState<SeniorityAwardLineStatus | null>(null);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [pdfReport, setPdfReport] = useState<MonthlySeniorityAwardReport | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const reportQuery = useQuery({
    queryKey: ["hr", "reports", "seniority-awards", month, page, pageSize, search, milestone, status],
    queryFn: () => loadReport({ month, page, pageSize, search, milestone, status }),
    initialData: page === 1 && pageSize === 25 && !search && milestone === null && status === null
      ? initialReport
      : undefined,
    placeholderData: (previousData) => previousData,
    staleTime: 60_000
  });

  const report = reportQuery.data;
  const reportIsEmpty = Boolean(report && report.summary.awardsDue === 0);
  const reportIsReady = Boolean(
    report
    && report.summary.awardsDue > 0
    && report.summary.heldAwards === 0
    && report.summary.reviewRequiredAwards === 0
  );
  const filteredRowsDescription = useMemo(() => {
    if (!report) return "";
    const start = report.pagination.total === 0 ? 0 : ((report.pagination.page - 1) * report.pagination.pageSize) + 1;
    const end = Math.min(report.pagination.page * report.pagination.pageSize, report.pagination.total);
    return `${start}-${end} of ${report.pagination.total}`;
  }, [report]);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(draftSearch.trim());
  };

  const handleResetFilters = () => {
    setDraftSearch("");
    setSearch("");
    setMilestone(null);
    setStatus(null);
    setPage(1);
  };

  const handleExportPdf = async () => {
    if (isPreparingPdf) return;
    setIsPreparingPdf(true);
    setPdfError(null);
    const previousTitle = document.title;
    let restored = false;

    const restoreAfterPrint = () => {
      if (restored) return;
      restored = true;
      window.removeEventListener("afterprint", restoreAfterPrint);
      document.title = previousTitle;
      setPdfReport(null);
      setIsPreparingPdf(false);
    };

    try {
      const completeReport = await loadCompleteReport(month);
      flushSync(() => setPdfReport(completeReport));
      await document.fonts.ready;
      const logos = Array.from(
        document.querySelectorAll<HTMLImageElement>(".monthly-seniority-award-pdf-document img")
      );
      await Promise.all(logos.map((logo) => logo.decode().catch(() => undefined)));
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      window.addEventListener("afterprint", restoreAfterPrint, { once: true });
      document.title = `Monthly_Seniority_Award_Report_${completeReport.period}`;
      window.print();
      window.setTimeout(restoreAfterPrint, 1800);
    } catch (error) {
      restoreAfterPrint();
      setPdfError(error instanceof Error ? error.message : "Unable to prepare the report PDF");
    }
  };

  if (reportQuery.isLoading && !report) {
    return (
      <Card variant="outlined" sx={{ minHeight: 420, display: "grid", placeItems: "center", borderColor: "var(--hr-border)", borderRadius: "12px", bgcolor: "var(--hr-surface)" }}>
        <Stack alignItems="center" spacing={1.2}>
          <CircularProgress size={30} />
          <Typography sx={{ color: "var(--hr-muted)", fontSize: 12 }}>Preparing the monthly report…</Typography>
        </Stack>
      </Card>
    );
  }

  if (reportQuery.isError || !report) {
    return (
      <Card variant="outlined" sx={{ p: 3, borderColor: "var(--hr-border)", borderRadius: "12px", bgcolor: "var(--hr-surface)" }}>
        <Button startIcon={<ArrowBackRoundedIcon />} onClick={onBack} sx={{ mb: 2, textTransform: "none" }}>Back to reports</Button>
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void reportQuery.refetch()}>Retry</Button>}>
          {reportQuery.error instanceof Error ? reportQuery.error.message : "Unable to load the seniority award report."}
        </Alert>
      </Card>
    );
  }

  return (
    <>
      <GlobalStyles
        styles={{
          "@page": { size: "A4 landscape", margin: 0 },
          ".monthly-seniority-award-print-root": {
            position: "fixed",
            top: 0,
            left: "-20000px",
            width: "297mm",
            pointerEvents: "none"
          },
          "@media print": {
            "html, body": {
              width: "297mm",
              margin: "0 !important",
              padding: "0 !important",
              overflow: "visible !important",
              background: "#fff !important"
            },
            "body > *:not(.monthly-seniority-award-print-root)": { display: "none !important" },
            "body > .monthly-seniority-award-print-root": {
              display: "block !important",
              position: "static !important",
              width: "297mm !important",
              pointerEvents: "auto"
            },
            ".monthly-seniority-award-pdf-page": { breakInside: "avoid" }
          }
        }}
      />

      <Stack spacing={1.5}>
        <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" gap={1.5}>
          <Button startIcon={<ArrowBackRoundedIcon />} onClick={onBack} sx={{ alignSelf: "flex-start", color: "var(--hr-strong-muted)", fontSize: 11.5, fontWeight: 750, textTransform: "none" }}>
            Back to monthly reports
          </Button>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Reload the live draft from the employee database">
              <span>
                <Button variant="outlined" startIcon={reportQuery.isFetching ? <CircularProgress size={15} /> : <RefreshRoundedIcon />} disabled={reportQuery.isFetching} onClick={() => void reportQuery.refetch()} sx={{ height: 38, borderColor: "var(--hr-border)", color: "var(--hr-text)", fontSize: 11, fontWeight: 750, textTransform: "none" }}>
                  Refresh
                </Button>
              </span>
            </Tooltip>
            <Button variant="contained" startIcon={<FileDownloadRoundedIcon />} disabled={isPreparingPdf} onClick={() => void handleExportPdf()} sx={{ height: 38, px: 2, bgcolor: "#031c68", fontSize: 11, fontWeight: 800, textTransform: "none", boxShadow: "0 6px 16px rgba(3, 28, 104, 0.2)", "&:hover": { bgcolor: "#02144d" } }}>
              {isPreparingPdf ? "Preparing all rows…" : "Export submission PDF"}
            </Button>
          </Stack>
        </Stack>

        {pdfError && <Alert severity="error" onClose={() => setPdfError(null)}>{pdfError}</Alert>}

        <Card variant="outlined" sx={{ overflow: "hidden", borderColor: "var(--hr-border)", borderRadius: "12px", bgcolor: "var(--hr-surface)", boxShadow: "var(--hr-shadow)" }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.7fr) minmax(330px, 0.8fr)" }, gap: 0 }}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ minWidth: 0, p: { xs: 2, md: 2.5 } }}>
              <Box component="img" src="/harouge-report-logo.png" alt="Harouge Oil Operations" sx={{ width: { xs: 92, md: 118 }, height: 72, flex: "0 0 auto", objectFit: "contain" }} />
              <Box minWidth={0}>
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                  <Typography component="h2" sx={{ color: "var(--hr-text)", fontSize: { xs: 18, md: 22 }, lineHeight: 1.15, fontWeight: 900 }}>
                    Monthly Seniority Award Report
                  </Typography>
                  <Chip size="small" label="DRAFT" sx={{ height: 22, color: "#9a5a00", bgcolor: "#fff3dc", fontSize: 9.5, fontWeight: 900 }} />
                </Stack>
                <Typography lang="ar" dir="rtl" sx={{ mt: 0.55, width: "fit-content", color: "#e00e14", fontFamily: "Tahoma, Arial, sans-serif", fontSize: 15, fontWeight: 800 }}>
                  التقرير الشهري لمكافآت الأقدمية
                </Typography>
                <Typography sx={{ mt: 0.9, maxWidth: 760, color: "var(--hr-muted)", fontSize: 11.25, lineHeight: 1.55 }}>
                  Official month-end register of employees reaching a configured service milestone, their scheduled award, payable amount, and review status.
                </Typography>
              </Box>
            </Stack>
            <Box sx={{ display: "grid", gridTemplateColumns: "128px 1fr", alignContent: "center", gap: 0.75, px: { xs: 2, md: 2.5 }, py: 2, borderTop: { xs: "1px solid var(--hr-border)", lg: 0 }, borderLeft: { lg: "1px solid var(--hr-border)" }, bgcolor: "var(--hr-surface-soft)" }}>
              {[
                ["Document No.", report.documentNumber],
                ["Reporting period", report.periodLabel],
                ["Due date", formatDate(report.dueDate)],
                ["Generated by", report.generatedBy.name],
                ["Generated at", new Date(report.generatedAt).toLocaleString("en-GB")],
                ["Classification", report.classification]
              ].map(([label, value]) => (
                <Box key={label} sx={{ display: "contents" }}>
                  <Typography sx={{ color: "var(--hr-strong-muted)", fontSize: 10.25, fontWeight: 800 }}>{label}</Typography>
                  <Typography noWrap sx={{ color: "var(--hr-text)", fontSize: 10.5, fontWeight: 700 }}>{value}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Card>

        <Card variant="outlined" sx={{ p: 1.5, borderColor: "var(--hr-border)", borderRadius: "11px", bgcolor: "var(--hr-surface)" }}>
          <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" gap={1.5}>
            <Box>
              <Typography sx={{ color: "var(--hr-text)", fontSize: 12, fontWeight: 850 }}>Report workflow</Typography>
              <Typography sx={{ mt: 0.3, color: "var(--hr-muted)", fontSize: 10.25 }}>The live report is ready for digital review and PDF submission; immutable approval storage is the next workflow layer.</Typography>
            </Box>
            <Stack direction="row" alignItems="center" spacing={0.8} sx={{ overflowX: "auto", pb: 0.25 }}>
              {report.workflow.steps.map((step, index) => {
                const active = index === 0;
                return (
                  <Box key={step} sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                    {index > 0 && <Box sx={{ width: 26, height: 2, bgcolor: "var(--hr-border)" }} />}
                    <Chip size="small" icon={active ? <TaskAltRoundedIcon /> : undefined} label={step === "review" ? "Under review" : step[0].toUpperCase() + step.slice(1)} sx={{ height: 27, flex: "0 0 auto", color: active ? "#087a43" : "var(--hr-muted)", bgcolor: active ? "#e9f8ee" : "var(--hr-surface-soft)", fontSize: 10.25, fontWeight: 800, "& .MuiChip-icon": { color: "inherit", fontSize: 16 } }} />
                  </Box>
                );
              })}
            </Stack>
          </Stack>
        </Card>

        <Box>
          <Typography component="h3" sx={{ mb: 1, color: "var(--hr-text)", fontSize: 14, fontWeight: 900 }}>Executive Summary</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }, gap: 1.25 }}>
            <ReportMetricCard icon={<PeopleAltRoundedIcon />} label="Employees due" value={String(report.summary.employeesDue)} detail={`${report.summary.awardsDue} award records`} color="#1769f7" background="#eaf1ff" />
            <ReportMetricCard icon={<WorkspacePremiumRoundedIcon />} label="Awards due" value={String(report.summary.awardsDue)} detail={`${report.summary.eligibleAwards} fully validated`} color="#7650e8" background="#f1edff" />
            <ReportMetricCard icon={<PaymentsRoundedIcon />} label="Validated payable amount" value={`${moneyFormatter.format(report.summary.payableAmount)} LYD`} detail={`${moneyFormatter.format(report.summary.scheduledAmount)} LYD scheduled`} color="#087a43" background="#e9f8ee" />
            <ReportMetricCard
              icon={reportIsReady ? <CheckCircleRoundedIcon /> : <ErrorOutlineRoundedIcon />}
              label="Submission readiness"
              value={reportIsEmpty ? "No awards due" : reportIsReady ? "Ready" : "Needs review"}
              detail={reportIsEmpty ? "No submission required" : `${report.summary.heldAwards} held · ${report.summary.reviewRequiredAwards} require review`}
              color={reportIsEmpty ? "#60708e" : reportIsReady ? "#087a43" : "#b86800"}
              background={reportIsEmpty ? "#f2f4f8" : reportIsReady ? "#e9f8ee" : "#fff4df"}
            />
          </Box>
        </Box>

        <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ alignItems: "center", border: "1px solid #c8d8ff", bgcolor: "light-dark(#f3f7ff, rgba(23, 105, 247, 0.12))", fontSize: 10.75 }}>
          <strong>Calculation basis:</strong> {report.policy.note} Employees marked Held remain visible for audit but are excluded from the payable total.
        </Alert>

        <Card variant="outlined" sx={{ borderColor: "var(--hr-border)", borderRadius: "11px", bgcolor: "var(--hr-surface)", overflow: "hidden" }}>
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography component="h3" sx={{ color: "var(--hr-text)", fontSize: 13, fontWeight: 900 }}>Awards by service milestone</Typography>
            <Typography sx={{ mt: 0.25, color: "var(--hr-muted)", fontSize: 10.25 }}>Exact scheduled and payable amounts for {report.periodLabel}.</Typography>
          </Box>
          <Divider />
          {report.summary.milestoneBreakdown.length === 0 ? (
            <Typography sx={{ px: 2, py: 2.5, color: "var(--hr-muted)", fontSize: 11 }}>No milestone awards are due in this month.</Typography>
          ) : (
            <TableContainer>
              <Table size="small" aria-label="Seniority award milestone breakdown">
                <TableHead>
                  <TableRow sx={{ bgcolor: "var(--hr-surface-soft)" }}>
                    {[
                      ["Milestone", "left"],
                      ["Awards due", "center"],
                      ["Validated", "center"],
                      ["Review", "center"],
                      ["Held", "center"],
                      ["Amount per award", "right"],
                      ["Payable total", "right"]
                    ].map(([label, align]) => <TableCell key={label} align={align as "left" | "center" | "right"} sx={{ color: "var(--hr-text)", fontSize: 10.25, fontWeight: 850 }}>{label}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.summary.milestoneBreakdown.map((item) => (
                    <TableRow key={item.milestoneYears} hover>
                      <TableCell sx={{ color: "var(--hr-row-text)", fontSize: 10.75, fontWeight: 800 }}>{item.awardLabel}</TableCell>
                      <TableCell align="center" sx={{ fontSize: 10.75 }}>{item.awardsDue}</TableCell>
                      <TableCell align="center" sx={{ color: "#087a43", fontSize: 10.75, fontWeight: 800 }}>{item.payableAwards}</TableCell>
                      <TableCell align="center" sx={{ color: item.reviewRequiredAwards > 0 ? "#a15c00" : "var(--hr-muted)", fontSize: 10.75, fontWeight: 800 }}>{item.reviewRequiredAwards}</TableCell>
                      <TableCell align="center" sx={{ color: item.heldAwards > 0 ? "#c11b2b" : "var(--hr-muted)", fontSize: 10.75, fontWeight: 800 }}>{item.heldAwards}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 10.75, fontWeight: 700 }}>{moneyFormatter.format(item.scheduledAmountPerAward)} LYD</TableCell>
                      <TableCell align="right" sx={{ color: "#087a43", fontSize: 10.75, fontWeight: 850 }}>{moneyFormatter.format(item.payableAmount)} LYD</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>

        <Card variant="outlined" sx={{ borderColor: "var(--hr-border)", borderRadius: "11px", bgcolor: "var(--hr-surface)", overflow: "hidden" }}>
          <Stack direction={{ xs: "column", lg: "row" }} alignItems={{ xs: "stretch", lg: "center" }} justifyContent="space-between" gap={1.2} sx={{ px: 2, py: 1.5 }}>
            <Box>
              <Typography component="h3" sx={{ color: "var(--hr-text)", fontSize: 13, fontWeight: 900 }}>Employee award register</Typography>
              <Typography sx={{ mt: 0.25, color: "var(--hr-muted)", fontSize: 10.25 }}>{filteredRowsDescription} matching records · click an employee to open the profile.</Typography>
            </Box>
            <Stack component="form" direction={{ xs: "column", sm: "row" }} spacing={1} onSubmit={handleSearch}>
              <TextField
                size="small"
                value={draftSearch}
                onChange={(event) => setDraftSearch(event.target.value)}
                placeholder="Search employee, job, department…"
                slotProps={{
                  htmlInput: { "aria-label": "Search employee award register" },
                  input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18 }} /></InputAdornment> }
                }}
                sx={{ minWidth: { sm: 280 }, "& .MuiInputBase-root": { height: 36, fontSize: 10.75 } }}
              />
              <FormControl size="small" sx={{ minWidth: 145 }}>
                <Select inputProps={{ "aria-label": "Filter by service milestone" }} value={milestone ?? "all"} onChange={(event) => { setMilestone(event.target.value === "all" ? null : Number(event.target.value)); setPage(1); }} sx={{ height: 36, fontSize: 10.75 }}>
                  <MenuItem value="all">All milestones</MenuItem>
                  {report.filters.availableMilestones.map((years) => <MenuItem key={years} value={years}>{years}-Year Award</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 145 }}>
                <Select inputProps={{ "aria-label": "Filter by award status" }} value={status ?? "all"} onChange={(event) => { setStatus(event.target.value === "all" ? null : event.target.value as SeniorityAwardLineStatus); setPage(1); }} sx={{ height: 36, fontSize: 10.75 }}>
                  <MenuItem value="all">All statuses</MenuItem>
                  <MenuItem value="eligible">Eligible</MenuItem>
                  <MenuItem value="review-required">Review required</MenuItem>
                  <MenuItem value="held">Held</MenuItem>
                </Select>
              </FormControl>
              <Button type="submit" variant="contained" sx={{ height: 36, px: 1.8, bgcolor: "var(--hr-primary-button)", fontSize: 10.5, fontWeight: 800, textTransform: "none" }}>Search</Button>
              {(search || milestone !== null || status !== null) && <Button onClick={handleResetFilters} sx={{ height: 36, color: "var(--hr-muted)", fontSize: 10.5, fontWeight: 750, textTransform: "none" }}>Reset</Button>}
            </Stack>
          </Stack>
          <Divider />

          <TableContainer sx={{ minHeight: 250 }}>
            <Table stickyHeader size="small" aria-label="Monthly seniority award employee register" sx={{ minWidth: 1120, tableLayout: "fixed" }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: "26%", color: "var(--hr-text)", bgcolor: "var(--hr-surface-soft)", fontSize: 10.25, fontWeight: 850 }}>Employee</TableCell>
                  <TableCell sx={{ width: "22%", color: "var(--hr-text)", bgcolor: "var(--hr-surface-soft)", fontSize: 10.25, fontWeight: 850 }}>Job and organization</TableCell>
                  <TableCell sx={{ width: "15%", color: "var(--hr-text)", bgcolor: "var(--hr-surface-soft)", fontSize: 10.25, fontWeight: 850 }}>Service dates</TableCell>
                  <TableCell sx={{ width: "13%", color: "var(--hr-text)", bgcolor: "var(--hr-surface-soft)", fontSize: 10.25, fontWeight: 850 }}>Award</TableCell>
                  <TableCell align="right" sx={{ width: "12%", color: "var(--hr-text)", bgcolor: "var(--hr-surface-soft)", fontSize: 10.25, fontWeight: 850 }}>Payable amount</TableCell>
                  <TableCell align="center" sx={{ width: "12%", color: "var(--hr-text)", bgcolor: "var(--hr-surface-soft)", fontSize: 10.25, fontWeight: 850 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ height: 210, textAlign: "center" }}>
                      <WorkspacePremiumRoundedIcon sx={{ color: "var(--hr-muted)", fontSize: 32 }} />
                      <Typography sx={{ mt: 0.8, color: "var(--hr-text)", fontSize: 12, fontWeight: 800 }}>No award records found</Typography>
                      <Typography sx={{ mt: 0.4, color: "var(--hr-muted)", fontSize: 10.5 }}>Change the month or reset the current filters.</Typography>
                    </TableCell>
                  </TableRow>
                ) : report.items.map((line) => (
                  <TableRow
                    key={line.key}
                    hover
                    role="link"
                    tabIndex={0}
                    aria-label={`Open profile for ${line.employeeName}`}
                    onClick={() => navigate(`/human-resources/employees/employee-profile/${line.employeeId}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/human-resources/employees/employee-profile/${line.employeeId}`);
                      }
                    }}
                    sx={{ cursor: "pointer", "&:focus-visible": { outline: "2px solid var(--hr-accent)", outlineOffset: -2 } }}
                  >
                    <TableCell sx={{ py: 1.1 }}><EmployeeIdentityCell line={line} /></TableCell>
                    <TableCell sx={{ py: 1.1 }}><OrganizationCell line={line} /></TableCell>
                    <TableCell sx={{ py: 1.1 }}>
                      <Typography sx={{ color: "var(--hr-row-text)", fontSize: 10.5, fontWeight: 700 }}>Start: {formatDate(line.contractStartDate)}</Typography>
                      <Typography sx={{ mt: 0.45, color: "#1769f7", fontSize: 10.5, fontWeight: 800 }}>Eligible: {formatDate(line.eligibilityDate)}</Typography>
                      {line.serviceSupplement.isRecorded && <Typography sx={{ mt: 0.35, color: "#a15c00", fontSize: 9.5, fontWeight: 700 }}>Service supplement recorded</Typography>}
                      {line.urgentAwardDate && <Typography sx={{ mt: 0.35, color: "#a15c00", fontSize: 9.5, fontWeight: 700 }}>Urgent date: {formatDate(line.urgentAwardDate)}</Typography>}
                    </TableCell>
                    <TableCell sx={{ py: 1.1 }}>
                      <Typography sx={{ color: "var(--hr-row-text)", fontSize: 11, fontWeight: 850 }}>{line.milestoneYears}-Year Award</Typography>
                      <Typography sx={{ mt: 0.4, color: "var(--hr-muted)", fontSize: 9.75 }}>Annual rate: {moneyFormatter.format(line.annualNetReward)} LYD</Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.1 }}>
                      <Typography sx={{ color: line.status === "held" ? "#c11b2b" : "#087a43", fontSize: 11.5, fontWeight: 900 }}>{moneyFormatter.format(line.payableAmount)} LYD</Typography>
                      {line.status !== "eligible" && <Typography sx={{ mt: 0.35, color: "var(--hr-muted)", fontSize: 9.5 }}>Scheduled: {moneyFormatter.format(line.scheduledAmount)}</Typography>}
                    </TableCell>
                    <TableCell align="center" sx={{ py: 1.1 }}>
                      <Tooltip title={line.holdReason || line.validationWarnings.join(" · ") || "Ready for submission"} arrow>
                        <span tabIndex={line.status === "eligible" ? -1 : 0}><ReportStatusChip status={line.status} /></span>
                      </Tooltip>
                      {line.validationWarnings.length > 0 && <Typography sx={{ mt: 0.55, color: "var(--hr-muted)", fontSize: 9.25 }}>{line.validationWarnings.length} warning{line.validationWarnings.length === 1 ? "" : "s"}</Typography>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={report.pagination.total}
            page={report.pagination.page - 1}
            onPageChange={(_event, nextPage) => setPage(nextPage + 1)}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage="Rows per page"
            sx={{ borderTop: "1px solid var(--hr-border)", color: "var(--hr-strong-muted)", "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { fontSize: 10.5 } }}
          />
        </Card>

        <Card variant="outlined" sx={{ p: 2, borderColor: reportIsReady ? "#b9dfc4" : "#f0d1a5", borderRadius: "11px", bgcolor: reportIsReady ? "light-dark(#f4fbf6, rgba(8,122,67,0.11))" : "light-dark(#fffaf1, rgba(184,104,0,0.1))" }}>
          <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" gap={1.5}>
            <Stack direction="row" spacing={1.2} alignItems="flex-start">
              {reportIsReady ? <CheckCircleRoundedIcon sx={{ color: "#087a43" }} /> : <ErrorOutlineRoundedIcon sx={{ color: "#b86800" }} />}
              <Box>
                <Typography sx={{ color: "var(--hr-text)", fontSize: 12.5, fontWeight: 900 }}>{reportIsEmpty ? "No seniority awards are due this month" : reportIsReady ? "Report is ready for managerial review" : "Resolve exceptions before final submission"}</Typography>
                <Typography sx={{ mt: 0.35, color: "var(--hr-strong-muted)", fontSize: 10.5, lineHeight: 1.5 }}>
                  {reportIsEmpty
                    ? "The report is complete and no employee reaches a configured milestone in this period."
                    : reportIsReady
                    ? `All ${report.summary.awardsDue} award records passed the currently configured checks.`
                    : `${report.summary.heldAwards} held and ${report.summary.reviewRequiredAwards} review-required records remain visible in the official register.`}
                </Typography>
              </Box>
            </Stack>
            <Button variant="outlined" startIcon={<FileDownloadRoundedIcon />} onClick={() => void handleExportPdf()} disabled={isPreparingPdf} sx={{ flex: "0 0 auto", borderColor: "var(--hr-accent-border)", color: "var(--hr-accent)", fontSize: 10.75, fontWeight: 800, textTransform: "none" }}>
              Generate formal submission copy
            </Button>
          </Stack>
        </Card>
      </Stack>

      {pdfReport && createPortal(
        <Box className="monthly-seniority-award-print-root" aria-hidden="true">
          <MonthlySeniorityAwardPdfDocument report={pdfReport} logoId="monthly-seniority-award-pdf-logo" />
        </Box>,
        document.body
      )}
    </>
  );
};
