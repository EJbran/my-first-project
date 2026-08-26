import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import FiberManualRecordRoundedIcon from "@mui/icons-material/FiberManualRecordRounded";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import RadioButtonCheckedRoundedIcon from "@mui/icons-material/RadioButtonCheckedRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  GlobalStyles,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography
} from "@mui/material";
import type { ReactNode } from "react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { EmployeeSeniorityPdfDocument, type SeniorityReportEmployee } from "./EmployeeSeniorityPdfDocument";
import { buildSenioritySchedule, lydAmountFormatter } from "../jobs/senioritySchedule";

type SeniorityMetricCardProps = {
  icon: ReactNode;
  iconColor: string;
  iconBackground: string;
  label: string;
  value: string;
  detail: string;
};

const BLUE = "#1769f7";
const GREEN = "#16a34a";
const PURPLE = "#8b43e8";
const AMBER = "#f59e0b";

const SeniorityMetricCard = ({
  icon,
  iconColor,
  iconBackground,
  label,
  value,
  detail
}: SeniorityMetricCardProps) => (
  <Box
    sx={{
      minHeight: 80,
      display: "flex",
      alignItems: "center",
      gap: 2,
      px: 2.25,
      py: 1.5,
      border: "1px solid var(--hr-border)",
      borderRadius: "9px",
      bgcolor: "var(--hr-surface)",
      boxShadow: "0 2px 8px rgba(15, 42, 91, 0.035)"
    }}
  >
    <Box
      aria-hidden="true"
      sx={{
        width: 46,
        height: 46,
        flex: "0 0 auto",
        display: "grid",
        placeItems: "center",
        borderRadius: "12px",
        color: iconColor,
        bgcolor: iconBackground,
        "& .MuiSvgIcon-root": { fontSize: 26 }
      }}
    >
      {icon}
    </Box>
    <Box minWidth={0}>
      <Typography sx={{ color: "var(--hr-strong-muted)", fontSize: 11, fontWeight: 650, lineHeight: 1.2 }}>
        {label}
      </Typography>
      <Typography noWrap sx={{ mt: 0.35, color: "var(--hr-text)", fontSize: 16.5, fontWeight: 850, lineHeight: 1.2 }}>
        {value}
      </Typography>
      <Typography noWrap sx={{ mt: 0.4, color: "var(--hr-muted)", fontSize: 10, fontWeight: 550, lineHeight: 1.2 }}>
        {detail}
      </Typography>
    </Box>
  </Box>
);

const StatusChip = ({ earned }: { earned: boolean }) => (
  <Chip
    size="small"
    icon={earned ? <CheckRoundedIcon /> : <AccessTimeRoundedIcon />}
    label={earned ? "Earned" : "Upcoming"}
    sx={{
      height: 18,
      minWidth: earned ? 76 : 94,
      color: earned ? "var(--hr-success-text)" : BLUE,
      bgcolor: earned ? "var(--hr-success-bg)" : "light-dark(#eaf1ff, rgba(23, 105, 247, 0.17))",
      borderRadius: "999px",
      fontSize: 10.5,
      fontWeight: 800,
      "& .MuiChip-icon": {
        ml: 0.65,
        mr: -0.25,
        color: "inherit",
        fontSize: 13.5
      },
      "& .MuiChip-label": { px: 0.9 }
    }}
  />
);

type EmployeeSeniorityReportProps = {
  employee: SeniorityReportEmployee;
};

export const EmployeeSeniorityReport = ({ employee }: EmployeeSeniorityReportProps) => {
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const schedule = buildSenioritySchedule(employee.contractStart);

  if (!schedule) {
    return (
      <Card
        sx={{
          border: "1px solid var(--hr-border)",
          borderRadius: "12px",
          bgcolor: "var(--hr-surface)",
          boxShadow: "var(--hr-shadow)",
          p: { xs: 1.5, md: 2 }
        }}
      >
        <Stack direction="row" alignItems="flex-start" spacing={1.25}>
          <Box sx={{ width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: "50%", color: "#fff", bgcolor: BLUE }}>
            <TrendingUpRoundedIcon sx={{ fontSize: 19 }} />
          </Box>
          <Box>
            <Typography sx={{ color: "var(--hr-text)", fontSize: 15, fontWeight: 850 }}>Seniority &amp; Reward Schedule</Typography>
            <Typography sx={{ mt: 0.2, color: "var(--hr-muted)", fontSize: 10.5 }}>Track service milestones, eligibility dates, and annual rewards.</Typography>
          </Box>
        </Stack>
        <Alert severity="warning" sx={{ mt: 2, fontSize: 11.5 }}>
          A valid Contract Start Date is required to calculate this employee&apos;s seniority reward schedule.
        </Alert>
      </Card>
    );
  }

  const {
    contractDate,
    yearsOfService,
    milestones,
    latestEarnedMilestone,
    nextMilestone,
    progress
  } = schedule;
  const orderedMilestones = sortDirection === "asc" ? milestones : milestones.toReversed();
  const reportIdentity = String(employee.employeeNumber ?? employee.id ?? "000");
  const reportNumberSuffix = (reportIdentity.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "000").padStart(3, "0");
  const documentNumber = `HR-SR-${schedule.asOf.year()}-${reportNumberSuffix}`;
  const safeFileIdentity = String(employee.employeeNumber ?? employee.id ?? "employee").replace(/[^a-zA-Z0-9_-]+/g, "-");
  const printRootId = `seniority-pdf-${safeFileIdentity}`;
  const logoId = `${printRootId}-logo`;

  const handleExportPdf = async () => {
    if (isPreparingPdf) return;
    setIsPreparingPdf(true);
    const previousTitle = document.title.startsWith("Employee_Seniority_Reward_Report_")
      ? "IMS-HAROUGE"
      : document.title;
    let restored = false;

    const restoreAfterPrint = () => {
      if (restored) return;
      restored = true;
      window.removeEventListener("afterprint", restoreAfterPrint);
      document.title = previousTitle;
      setIsPreparingPdf(false);
    };

    try {
      await document.fonts.ready;
      const logo = document.getElementById(logoId) as HTMLImageElement | null;
      if (logo) await logo.decode().catch(() => undefined);
      window.addEventListener("afterprint", restoreAfterPrint, { once: true });
      document.title = `Employee_Seniority_Reward_Report_${safeFileIdentity}`;
      window.print();
      window.setTimeout(restoreAfterPrint, 1500);
    } catch {
      restoreAfterPrint();
    }
  };

  return (
    <>
      <GlobalStyles
        styles={{
          "@page": { size: "A4 portrait", margin: 0 },
          ".seniority-pdf-print-root": {
            position: "fixed",
            top: 0,
            left: "-10000px",
            width: "210mm",
            height: "297mm",
            overflow: "hidden",
            pointerEvents: "none"
          },
          "@media print": {
            "html, body": {
              width: "210mm",
              height: "297mm",
              margin: "0 !important",
              padding: "0 !important",
              overflow: "hidden !important",
              background: "#fff !important"
            },
            "body > *:not(.seniority-pdf-print-root)": { display: "none !important" },
            "body > .seniority-pdf-print-root": {
              display: "block !important",
              position: "static !important",
              width: "210mm !important",
              height: "297mm !important",
              overflow: "hidden !important",
              pointerEvents: "auto"
            },
            ".seniority-pdf-page": { breakAfter: "avoid", breakInside: "avoid" }
          }
        }}
      />
      <Card
      sx={{
        border: "1px solid var(--hr-border)",
        borderRadius: "12px",
        bgcolor: "var(--hr-surface)",
        boxShadow: "0 6px 24px rgba(15, 42, 91, 0.06)",
        p: { xs: 1.5, md: 2 },
        pb: { xs: 2, md: 3.5 },
        overflow: "hidden"
      }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "flex-start" }} justifyContent="space-between" spacing={1.5}>
          <Stack direction="row" alignItems="flex-start" spacing={1.25}>
            <Box
              aria-hidden="true"
              sx={{
                width: 34,
                height: 34,
                flex: "0 0 auto",
                display: "grid",
                placeItems: "center",
                borderRadius: "50%",
                color: "#fff",
                bgcolor: BLUE
              }}
            >
              <TrendingUpRoundedIcon sx={{ fontSize: 19 }} />
            </Box>
            <Box minWidth={0}>
              <Typography sx={{ color: "var(--hr-text)", fontSize: 15, fontWeight: 850, lineHeight: 1.25 }}>
                Seniority &amp; Reward Schedule
              </Typography>
              <Typography sx={{ mt: 0.25, color: "var(--hr-muted)", fontSize: 10.5, fontWeight: 550, lineHeight: 1.25 }}>
                Track service milestones, eligibility dates, and annual rewards.
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="contained"
            startIcon={<PictureAsPdfRoundedIcon />}
            onClick={() => void handleExportPdf()}
            disabled={isPreparingPdf}
            sx={{
              minWidth: 132,
              height: 36,
              px: 1.7,
              alignSelf: { xs: "flex-start", sm: "auto" },
              borderRadius: "8px",
              color: "#fff",
              bgcolor: "#031c68",
              fontSize: 10.5,
              fontWeight: 800,
              textTransform: "none",
              boxShadow: "0 5px 12px rgba(3, 28, 104, 0.18)",
              "&:hover": { bgcolor: "#02144d" }
            }}
          >
            {isPreparingPdf ? "Preparing..." : "Export PDF"}
          </Button>
        </Stack>

      <Box sx={{ mt: 1.7, ml: { lg: 6.2 }, mr: { lg: 2.5 } }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" },
            gap: 2.1
          }}
        >
          <SeniorityMetricCard
            icon={<CalendarMonthOutlinedIcon />}
            iconColor={BLUE}
            iconBackground="light-dark(#eaf1ff, rgba(23, 105, 247, 0.16))"
            label="Contract Start Date"
            value={contractDate.format("DD-MM-YYYY")}
            detail=""
          />
          <SeniorityMetricCard
            icon={<PersonOutlineRoundedIcon />}
            iconColor={GREEN}
            iconBackground="light-dark(#eaf8ee, rgba(22, 163, 74, 0.16))"
            label="Years of Service"
            value={`${yearsOfService} ${yearsOfService === 1 ? "Year" : "Years"}`}
            detail="(as of today)"
          />
          <SeniorityMetricCard
            icon={<FlagOutlinedIcon />}
            iconColor={PURPLE}
            iconBackground="light-dark(#f2eaff, rgba(139, 67, 232, 0.16))"
            label="Next Milestone"
            value={nextMilestone ? `${nextMilestone.serviceYears} Years` : "-"}
            detail={nextMilestone ? nextMilestone.eligibilityDate.format("DD-MM-YYYY") : "Milestone reached"}
          />
          <SeniorityMetricCard
            icon={<EmojiEventsOutlinedIcon />}
            iconColor={AMBER}
            iconBackground="light-dark(#fff3dc, rgba(245, 158, 11, 0.16))"
            label="Latest Annual Reward"
            value={latestEarnedMilestone ? `${lydAmountFormatter.format(latestEarnedMilestone.annualNetReward)} LYD` : "-"}
            detail={latestEarnedMilestone ? `At ${latestEarnedMilestone.serviceYears} years milestone` : "No milestone earned"}
          />
        </Box>

        <Box
          sx={{
            mt: 1.65,
            overflowX: "auto",
            border: "1px solid var(--hr-border)",
            borderRadius: "9px",
            bgcolor: "var(--hr-surface)"
          }}
        >
          <Box sx={{ position: "relative", minWidth: 900, px: 2, pt: 1.25, pb: 0.55 }}>
            <LinearProgress
              aria-hidden="true"
              variant="determinate"
              value={progress}
              sx={{
                position: "absolute",
                top: 48,
                left: "calc(5% + 14px)",
                right: "calc(5% + 14px)",
                width: "auto",
                height: 3,
                borderRadius: 999,
                bgcolor: "light-dark(#dfe6f0, #334155)",
                "& .MuiLinearProgress-bar": { borderRadius: 999, bgcolor: GREEN }
              }}
            />
            <Box role="list" aria-label="Seniority milestones" sx={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: `repeat(${milestones.length}, minmax(0, 1fr))` }}>
              {milestones.map((milestone, index) => {
                const isHighlighted = nextMilestone
                  ? milestone.serviceYears === nextMilestone.serviceYears
                  : index === milestones.length - 1;
                const dotColor = milestone.isEarned ? GREEN : isHighlighted ? BLUE : "light-dark(#aeb9ca, #64748b)";

                return (
                  <Stack key={milestone.serviceYears} role="listitem" alignItems="center" sx={{ minWidth: 0 }}>
                    <Typography sx={{ color: "var(--hr-text)", fontSize: 11, fontWeight: 850, lineHeight: 1.1 }}>
                      {milestone.serviceYears}
                    </Typography>
                    <Typography sx={{ mt: 0.25, color: "var(--hr-muted)", fontSize: 10, fontWeight: 550, lineHeight: 1.1 }}>
                      Years
                    </Typography>
                    <Box sx={{ mt: 0.55, height: 20, display: "grid", placeItems: "center", color: dotColor, bgcolor: "var(--hr-surface)", lineHeight: 0 }}>
                      {isHighlighted ? (
                        <RadioButtonCheckedRoundedIcon sx={{ fontSize: 21 }} />
                      ) : (
                        <FiberManualRecordRoundedIcon sx={{ fontSize: 13 }} />
                      )}
                    </Box>
                  </Stack>
                );
              })}
            </Box>
          </Box>
        </Box>

        <TableContainer
          sx={{
            mt: 1.45,
            overflowX: "auto",
            border: "1px solid var(--hr-border)",
            borderRadius: "9px",
            bgcolor: "var(--hr-surface)"
          }}
        >
          <Table
            size="small"
            aria-label="Seniority reward schedule"
            sx={{
              minWidth: 980,
              tableLayout: "fixed",
              "& .MuiTableCell-root": {
                px: 1.8,
                py: 0.25,
                height: 20.5,
                color: "var(--hr-row-text)",
                borderRight: "1px solid var(--hr-divider-soft)",
                borderBottom: "1px solid var(--hr-divider-soft)",
                fontSize: 11.5,
                fontWeight: 550,
                lineHeight: 1.2,
                "&:first-of-type": { pl: 3.5 },
                "&:last-of-type": { borderRight: 0 }
              },
              "& .MuiTableHead-root .MuiTableCell-root": {
                py: 0.25,
                height: 25,
                color: "var(--hr-text)",
                fontSize: 10.75,
                fontWeight: 800
              },
              "& .MuiTableSortLabel-icon": { ml: 0.35, fontSize: 12 },
              "& .MuiTableBody-root .MuiTableRow-root:last-of-type .MuiTableCell-root": { borderBottom: 0 }
            }}
          >
            <TableHead>
              <TableRow sx={{ bgcolor: "light-dark(#f5f8fe, #172033)" }}>
                <TableCell sx={{ width: "20%" }}>Service Milestone</TableCell>
                <TableCell sx={{ width: "15%" }}>
                  <TableSortLabel
                    active
                    direction={sortDirection}
                    onClick={() => setSortDirection((current) => current === "asc" ? "desc" : "asc")}
                  >
                    Eligibility Date
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center" sx={{ width: "22.5%" }}>Annual Net Reward (LYD)</TableCell>
                <TableCell align="center" sx={{ width: "21.5%" }}>Total Net Reward (LYD)</TableCell>
                <TableCell align="center" sx={{ width: "21%" }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orderedMilestones.map((milestone) => (
                <TableRow key={milestone.serviceYears} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{milestone.serviceYears} years</TableCell>
                  <TableCell>{milestone.eligibilityDate.format("DD-MM-YYYY")}</TableCell>
                  <TableCell align="center">{lydAmountFormatter.format(milestone.annualNetReward)}</TableCell>
                  <TableCell align="center">{lydAmountFormatter.format(milestone.totalNetReward)}</TableCell>
                  <TableCell align="center"><StatusChip earned={milestone.isEarned} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Stack
          direction="row"
          alignItems="center"
          spacing={1.4}
          sx={{
            mt: 2.25,
            minHeight: 47,
            px: 1.7,
            py: 1,
            borderRadius: "8px",
            color: "var(--hr-strong-muted)",
            bgcolor: "light-dark(#f2f6ff, rgba(23, 105, 247, 0.11))"
          }}
        >
          <InfoOutlinedIcon sx={{ flex: "0 0 auto", color: BLUE, fontSize: 24 }} />
          <Typography sx={{ fontSize: 11, fontWeight: 600, lineHeight: 1.45 }}>
            These dates currently use Contract Start Date only. Previous NOC service and non-counted periods are not applied yet.
          </Typography>
        </Stack>
      </Box>
      </Card>
      {createPortal(
        <Box id={printRootId} className="seniority-pdf-print-root" aria-hidden="true">
          <EmployeeSeniorityPdfDocument
            employee={employee}
            schedule={schedule}
            documentNumber={documentNumber}
            logoId={logoId}
          />
        </Box>,
        document.body
      )}
    </>
  );
};
