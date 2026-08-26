import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import EventBusyRoundedIcon from "@mui/icons-material/EventBusyRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { hrReportsApi } from "../../../api/hrReports.api";
import { HrPageHeader } from "./PageHeader";
import { getHrThemeVars } from "./Theme";
import { MonthlySeniorityAwardReportView } from "./MonthlySeniorityAwardReport";

type FutureReportCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
};

const moneyFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3
});

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

const FutureReportCard = ({ icon, title, description }: FutureReportCardProps) => (
  <Card
    variant="outlined"
    sx={{
      minHeight: 210,
      display: "flex",
      flexDirection: "column",
      p: 2,
      borderColor: "var(--hr-border)",
      borderRadius: "12px",
      bgcolor: "var(--hr-surface)",
      boxShadow: "0 4px 16px rgba(15, 42, 91, 0.035)"
    }}
  >
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
      <Box sx={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: "11px", color: "var(--hr-muted)", bgcolor: "var(--hr-surface-soft)", "& .MuiSvgIcon-root": { fontSize: 23 } }}>
        {icon}
      </Box>
      <Chip size="small" label="NOT CONFIGURED" sx={{ height: 22, color: "var(--hr-muted)", bgcolor: "var(--hr-surface-soft)", fontSize: 8.75, fontWeight: 850 }} />
    </Stack>
    <Typography sx={{ mt: 1.6, color: "var(--hr-text)", fontSize: 14, fontWeight: 900 }}>{title}</Typography>
    <Typography sx={{ mt: 0.65, color: "var(--hr-muted)", fontSize: 10.75, lineHeight: 1.55 }}>{description}</Typography>
    <Typography sx={{ mt: "auto", pt: 1.8, color: "var(--hr-muted)", fontSize: 10, fontWeight: 700 }}>Reserved for a future monthly workflow</Typography>
  </Card>
);

export default function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentMonth = dayjs().format("YYYY-MM");
  const requestedMonth = searchParams.get("month") ?? currentMonth;
  const month = monthPattern.test(requestedMonth) ? requestedMonth : currentMonth;
  const selectedReport = searchParams.get("report");
  const isSeniorityReportOpen = selectedReport === "seniority-awards";

  const overviewQuery = useQuery({
    queryKey: ["hr", "reports", "seniority-awards", "overview", month],
    queryFn: () => hrReportsApi.getSeniorityAwards({ month, page: 1, pageSize: 1 }),
    enabled: !isSeniorityReportOpen,
    staleTime: 60_000
  });

  const updateMonth = (nextMonth: string) => {
    if (!monthPattern.test(nextMonth)) return;
    const next = new URLSearchParams(searchParams);
    next.set("month", nextMonth);
    setSearchParams(next);
  };

  const openSeniorityReport = () => {
    const next = new URLSearchParams(searchParams);
    next.set("month", month);
    next.set("report", "seniority-awards");
    setSearchParams(next);
  };

  const closeReport = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("report");
    next.set("month", month);
    setSearchParams(next);
  };

  const report = overviewQuery.data;
  const reportNeedsReview = Boolean(
    report
    && (report.summary.heldAwards > 0 || report.summary.reviewRequiredAwards > 0)
  );
  const reportIsEmpty = Boolean(report && report.summary.awardsDue === 0);
  const overviewStatus = reportIsEmpty ? "No awards due" : reportNeedsReview ? "Needs review" : "Ready";
  const overviewStatusColor = reportIsEmpty ? "var(--hr-muted)" : reportNeedsReview ? "#a15c00" : "#087a43";
  const overviewStatusBackground = reportIsEmpty ? "var(--hr-surface-soft)" : reportNeedsReview ? "#fff4df" : "#e9f8ee";

  return (
    <Box
      sx={(theme) => ({
        ...getHrThemeVars(theme),
        color: "var(--hr-text)",
        pb: 3
      })}
    >
      <HrPageHeader
        compact
        title={isSeniorityReportOpen ? "Seniority Award Report" : "Reports"}
        subtitle={isSeniorityReportOpen ? "Prepare the official monthly award register and submission PDF." : "Prepare, review, and export recurring HR reports."}
        actions={(
          <TextField
            type="month"
            size="small"
            label="Reporting month"
            value={month}
            onChange={(event) => updateMonth(event.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: "1970-01", max: "9999-12" } }}
            sx={{ width: { xs: "100%", sm: 190 }, "& .MuiInputBase-root": { height: 40, fontSize: 11.5 } }}
          />
        )}
      />

      {isSeniorityReportOpen ? (
        <MonthlySeniorityAwardReportView key={month} month={month} onBack={closeReport} />
      ) : (
        <Stack spacing={1.5}>
          <Card
            variant="outlined"
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.35fr) minmax(360px, 0.65fr)" },
              overflow: "hidden",
              borderColor: "var(--hr-border)",
              borderRadius: "12px",
              bgcolor: "var(--hr-surface)",
              boxShadow: "var(--hr-shadow)"
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2} sx={{ p: { xs: 2, md: 2.5 } }}>
              <Box sx={{ width: 54, height: 54, flex: "0 0 auto", display: "grid", placeItems: "center", borderRadius: "14px", color: "#fff", bgcolor: "#031c68", boxShadow: "0 7px 18px rgba(3,28,104,0.22)" }}>
                <CalendarMonthRoundedIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box>
                <Typography sx={{ color: "var(--hr-text)", fontSize: 17, fontWeight: 900 }}>Monthly HR close</Typography>
                <Typography sx={{ mt: 0.4, color: "var(--hr-muted)", fontSize: 11.25, lineHeight: 1.5 }}>
                  Review each required report, resolve exceptions, generate the formal document, and submit it through the approved HR workflow.
                </Typography>
              </Box>
            </Stack>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", alignItems: "center", px: 2, py: 1.75, borderTop: { xs: "1px solid var(--hr-border)", lg: 0 }, borderLeft: { lg: "1px solid var(--hr-border)" }, bgcolor: "var(--hr-surface-soft)" }}>
              {[
                ["Live reports", "1"],
                ["Future templates", "2"],
                ["Current cycle", dayjs(`${month}-01`).format("MMM YYYY")]
              ].map(([label, value]) => (
                <Box key={label} sx={{ minWidth: 0, textAlign: "center" }}>
                  <Typography noWrap sx={{ color: "var(--hr-text)", fontSize: 15, fontWeight: 900 }}>{value}</Typography>
                  <Typography noWrap sx={{ mt: 0.35, color: "var(--hr-muted)", fontSize: 9.75, fontWeight: 650 }}>{label}</Typography>
                </Box>
              ))}
            </Box>
          </Card>

          <Box>
            <Typography component="h2" sx={{ mb: 1, color: "var(--hr-text)", fontSize: 15, fontWeight: 900 }}>Reports requiring action</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", xl: "repeat(3, 1fr)" }, gap: 1.5 }}>
              <Card
                variant="outlined"
                sx={{
                  minHeight: 272,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  borderColor: "#b7c9f3",
                  borderRadius: "12px",
                  bgcolor: "var(--hr-surface)",
                  boxShadow: "0 8px 24px rgba(15, 42, 91, 0.075)"
                }}
              >
                <Box sx={{ height: 4, bgcolor: "#1769f7" }} />
                <Box sx={{ flex: 1, p: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                    <Box sx={{ width: 44, height: 44, display: "grid", placeItems: "center", borderRadius: "12px", color: "#1769f7", bgcolor: "#eaf1ff" }}>
                      <AssessmentRoundedIcon sx={{ fontSize: 24 }} />
                    </Box>
                    {overviewQuery.isLoading ? (
                      <CircularProgress size={20} />
                    ) : report ? (
                      <Chip size="small" icon={reportNeedsReview ? <ErrorOutlineRoundedIcon /> : <CheckCircleRoundedIcon />} label={overviewStatus.toUpperCase()} sx={{ height: 24, color: overviewStatusColor, bgcolor: overviewStatusBackground, fontSize: 8.75, fontWeight: 900, "& .MuiChip-icon": { color: "inherit", fontSize: 15 } }} />
                    ) : null}
                  </Stack>
                  <Typography sx={{ mt: 1.6, color: "var(--hr-text)", fontSize: 15, fontWeight: 900 }}>Seniority Award Report</Typography>
                  <Typography sx={{ mt: 0.5, color: "var(--hr-muted)", fontSize: 10.75, lineHeight: 1.5 }}>
                    Employees reaching a 5-to-50-year service milestone in the selected month, with official award amounts and review controls.
                  </Typography>

                  {overviewQuery.isError ? (
                    <Alert severity="error" sx={{ mt: 1.5, py: 0, fontSize: 9.75 }}>Unable to load this report summary.</Alert>
                  ) : (
                    <Box sx={{ mt: 1.7, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, p: 1.25, borderRadius: "9px", bgcolor: "var(--hr-surface-soft)" }}>
                      {[
                        [<GroupsRoundedIcon key="employees" />, report ? String(report.summary.employeesDue) : "-", "Employees"],
                        [<PaymentsRoundedIcon key="amount" />, report ? moneyFormatter.format(report.summary.payableAmount) : "-", "LYD payable"],
                        [<ErrorOutlineRoundedIcon key="exceptions" />, report ? String(report.summary.heldAwards + report.summary.reviewRequiredAwards) : "-", "Exceptions"]
                      ].map(([icon, value, label]) => (
                        <Box key={String(label)} sx={{ minWidth: 0, textAlign: "center" }}>
                          <Box sx={{ color: "var(--hr-muted)", lineHeight: 0, "& .MuiSvgIcon-root": { fontSize: 17 } }}>{icon}</Box>
                          <Typography noWrap sx={{ mt: 0.55, color: "var(--hr-text)", fontSize: 12.5, fontWeight: 900 }}>{value}</Typography>
                          <Typography noWrap sx={{ mt: 0.2, color: "var(--hr-muted)", fontSize: 8.75, fontWeight: 650 }}>{label}</Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
                <Button endIcon={<ArrowForwardRoundedIcon />} onClick={openSeniorityReport} sx={{ mx: 2, mb: 2, height: 38, justifyContent: "space-between", color: "#fff", bgcolor: "#031c68", fontSize: 10.75, fontWeight: 800, textTransform: "none", "&:hover": { bgcolor: "#02144d" } }}>
                  Open official report
                </Button>
              </Card>

              <FutureReportCard icon={<EventBusyRoundedIcon />} title="Contract Expiry Report" description="Monthly review of contracts expiring soon, renewals requiring action, and unresolved contract data." />
              <FutureReportCard icon={<TrendingUpRoundedIcon />} title="Employee Movement Report" description="Monthly appointments, transfers, promotions, secondments, and employee status changes once an effective-dated movement source is connected." />
            </Box>
          </Box>

          <Card variant="outlined" sx={{ p: 2, borderColor: "var(--hr-border)", borderRadius: "11px", bgcolor: "var(--hr-surface)" }}>
            <Stack direction="row" spacing={1.2} alignItems="flex-start">
              <DescriptionRoundedIcon sx={{ color: "var(--hr-accent)" }} />
              <Box>
                <Typography sx={{ color: "var(--hr-text)", fontSize: 12, fontWeight: 850 }}>Official report standard</Typography>
                <Typography sx={{ mt: 0.35, color: "var(--hr-muted)", fontSize: 10.5, lineHeight: 1.55 }}>
                  Every live report includes document metadata, calculation basis, exact employee-level evidence, exception handling, totals, approval fields, and a branded submission PDF.
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Stack>
      )}
    </Box>
  );
}
