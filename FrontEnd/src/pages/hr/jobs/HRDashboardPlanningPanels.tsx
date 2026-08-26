import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import DataObjectRoundedIcon from "@mui/icons-material/DataObjectRounded";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import PolicyOutlinedIcon from "@mui/icons-material/PolicyOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  Stack,
  Typography
} from "@mui/material";
import dayjs from "dayjs";
import type {
  HrDashboardContractRiskBucket,
  HrDashboardData,
  HrDashboardModuleReadiness,
  HrDashboardSeverity
} from "../../../types/hrDashboard.types";

type HRDashboardPlanningPanelsProps = {
  data: HrDashboardData;
  onOpenEmployees: (query: Record<string, string>) => void;
};

const COLORS = {
  navy: "#10265b",
  blue: "#3270e5",
  blueSoft: "#eaf1ff",
  green: "#2fa77c",
  greenSoft: "#e8f8f2",
  purple: "#7650e8",
  purpleSoft: "#f1edff",
  amber: "#e0a51c",
  amberSoft: "#fff6dd",
  red: "#df4858",
  redSoft: "#fff0f2",
  gray: "#75839a"
} as const;

const panelSx = {
  minWidth: 0,
  border: "1px solid var(--hr-border)",
  borderRadius: "11px",
  bgcolor: "var(--hr-surface)",
  boxShadow: "0 3px 14px rgba(23, 54, 103, 0.045)",
  overflow: "hidden"
};

const formatInteger = (value: number): string =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);

const formatCurrency = (value: number, currency: string): string =>
  `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)} ${currency}`;

const severityColor = (severity: HrDashboardSeverity) => {
  if (severity === "high") return { color: COLORS.red, background: COLORS.redSoft };
  if (severity === "medium") return { color: COLORS.amber, background: COLORS.amberSoft };
  return { color: COLORS.blue, background: COLORS.blueSoft };
};

const statusDetails = (status: HrDashboardModuleReadiness["status"]) => {
  if (status === "live") return { label: "Live", color: COLORS.green, background: COLORS.greenSoft };
  if (status === "partial") return { label: "Partial", color: COLORS.amber, background: COLORS.amberSoft };
  if (status === "policy-required") return { label: "Policy required", color: COLORS.purple, background: COLORS.purpleSoft };
  return { label: "Ready to connect", color: COLORS.blue, background: COLORS.blueSoft };
};

const SectionHeading = ({ title, arabic, detail }: { title: string; arabic: string; detail: string }) => (
  <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "flex-end" }} gap={0.75} sx={{ mb: 0.9 }}>
    <Box>
      <Typography sx={{ color: "var(--hr-text)", fontSize: 14, lineHeight: 1.2, fontWeight: 850 }}>
        {title}
      </Typography>
      <Typography lang="ar" dir="rtl" sx={{ mt: 0.2, width: "fit-content", color: "var(--hr-strong-muted)", fontSize: 10, fontWeight: 750 }}>
        {arabic}
      </Typography>
    </Box>
    <Typography sx={{ maxWidth: 560, color: "var(--hr-muted)", fontSize: 9, lineHeight: 1.45, fontWeight: 600 }}>
      {detail}
    </Typography>
  </Stack>
);

const EmptyReadyState = ({ title, detail }: { title: string; detail: string }) => (
  <Stack alignItems="center" justifyContent="center" spacing={0.7} sx={{ minHeight: 112, px: 2, py: 1.5, textAlign: "center" }}>
    <DataObjectRoundedIcon sx={{ color: COLORS.blue, fontSize: 25 }} />
    <Typography sx={{ color: "var(--hr-text)", fontSize: 10, fontWeight: 800 }}>{title}</Typography>
    <Typography sx={{ maxWidth: 300, color: "var(--hr-muted)", fontSize: 8.4, lineHeight: 1.45, fontWeight: 600 }}>{detail}</Typography>
  </Stack>
);

const RiskBucket = ({ bucket, maximum, onOpenEmployees }: {
  bucket: HrDashboardContractRiskBucket;
  maximum: number;
  onOpenEmployees: (query: Record<string, string>) => void;
}) => (
  <Button
    fullWidth
    disabled={bucket.value === 0}
    onClick={() => onOpenEmployees({ contractRisk: bucket.key })}
    sx={{ display: "block", px: 0, py: 0.35, color: "inherit", textAlign: "left", textTransform: "none", borderRadius: "7px" }}
  >
    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
      <Typography sx={{ color: "var(--hr-row-text)", fontSize: 8.8, fontWeight: 700 }}>{bucket.label}</Typography>
      <Typography sx={{ color: "var(--hr-text)", fontSize: 9, fontWeight: 850 }}>{formatInteger(bucket.value)}</Typography>
    </Stack>
    <LinearProgress
      variant="determinate"
      value={maximum > 0 ? (bucket.value / maximum) * 100 : 0}
      sx={{ mt: 0.45, height: 5, borderRadius: 99, bgcolor: "var(--hr-surface-soft)", "& .MuiLinearProgress-bar": { borderRadius: 99, bgcolor: bucket.key === "expired" ? COLORS.red : COLORS.blue } }}
    />
  </Button>
);

const ReadinessCard = ({ module }: { module: HrDashboardModuleReadiness }) => {
  const status = statusDetails(module.status);
  return (
    <Card sx={[panelSx, { p: 1.35, minHeight: 154 }]}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ color: "var(--hr-text)", fontSize: 10.5, fontWeight: 850 }}>{module.label}</Typography>
          <Typography sx={{ mt: 0.45, color: "var(--hr-muted)", fontSize: 8.2, lineHeight: 1.4, fontWeight: 600 }}>{module.description}</Typography>
        </Box>
        <Chip label={status.label} size="small" sx={{ height: 21, flex: "0 0 auto", color: status.color, bgcolor: status.background, fontSize: 7.3, fontWeight: 800, "& .MuiChip-label": { px: 0.8 } }} />
      </Stack>
      {module.metrics.length ? (
        <Stack direction="row" spacing={1.6} sx={{ mt: 1.1 }}>
          {module.metrics.slice(0, 3).map((metric) => (
            <Box key={metric.label} sx={{ minWidth: 0 }}>
              <Typography sx={{ color: "var(--hr-text)", fontSize: 13, fontWeight: 850 }}>
                {metric.value === null ? "—" : formatInteger(metric.value)}{metric.unit ? ` ${metric.unit}` : ""}
              </Typography>
              <Typography sx={{ mt: 0.15, color: "var(--hr-muted)", fontSize: 7.2, fontWeight: 650 }}>{metric.label}</Typography>
            </Box>
          ))}
        </Stack>
      ) : null}
      <Divider sx={{ my: 1, borderColor: "var(--hr-divider-soft)" }} />
      <Typography sx={{ color: "var(--hr-strong-muted)", fontSize: 7.4, lineHeight: 1.45, fontWeight: 650 }}>
        Required: {module.requiredSources.join(" · ")}
      </Typography>
    </Card>
  );
};

export const HRDashboardPlanningPanels = ({ data, onOpenEmployees }: HRDashboardPlanningPanelsProps) => {
  const quality = data.dataQuality;
  const contractRisk = data.contractRisk;
  const seniority = data.seniorityForecast;
  const retirement = data.retirementForecast;
  const contractsExpiringMetric = data.kpis.contractsExpiring90Days;
  const contractsExpiringValue = typeof contractsExpiringMetric === "number"
    ? contractsExpiringMetric
    : contractsExpiringMetric?.value ?? null;
  const retirementOneYear = retirement?.horizons.find((horizon) => horizon.years === 1)?.employees ?? null;
  const qualityColor = !quality || quality.scorePercent < 80
    ? COLORS.red
    : quality.scorePercent < 95
      ? COLORS.amber
      : COLORS.green;
  const contractQuality = contractRisk?.quality === "verified"
    ? { label: "Verified", color: COLORS.green, background: COLORS.greenSoft }
    : contractRisk?.quality === "unverified" || contractRisk?.quality === "partial"
      ? { label: contractRisk.quality === "unverified" ? "Verify dates" : "Partial", color: COLORS.amber, background: COLORS.amberSoft }
      : { label: "Source ready", color: COLORS.gray, background: "var(--hr-surface-soft)" };
  const riskMaximum = Math.max(1, ...(contractRisk?.buckets.map((bucket) => bucket.value) ?? [0]));
  const readiness = data.moduleReadiness ?? [];

  return (
    <Box id="hr-planning-readiness" data-testid="hr-planning-readiness" sx={{ mt: 1.35 }}>
      <SectionHeading
        title="Workforce Planning & Readiness"
        arabic="التخطيط والاستعداد للقوى العاملة"
        detail="Live decisions use employee records. Future modules show the exact source or policy needed before a value can be calculated."
      />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" }, gap: 0.9, mb: 0.9 }}>
        {[
          { label: "Data completeness", value: quality ? `${quality.scorePercent.toFixed(1)}%` : "—", detail: quality ? `${formatInteger(quality.evaluatedEmployees)} employees evaluated` : "Quality contract ready", icon: CheckCircleOutlineRoundedIcon, color: COLORS.green, bg: COLORS.greenSoft },
          { label: "Contract risk · 90 days", value: contractsExpiringValue === null ? "—" : formatInteger(contractsExpiringValue), detail: contractRisk?.quality === "unverified" ? "Dates require HR verification" : contractRisk?.available ? "Active contracts" : "Contract end source required", icon: CalendarMonthOutlinedIcon, color: COLORS.red, bg: COLORS.redSoft },
          { label: "Seniority rewards · 12 months", value: seniority?.available ? formatInteger(seniority.employeesDue) : "—", detail: seniority?.available ? formatCurrency(seniority.expectedCost, seniority.currency) : "Forecast contract ready", icon: AccountBalanceWalletOutlinedIcon, color: COLORS.purple, bg: COLORS.purpleSoft },
          { label: "Retirement risk · 12 months", value: retirement?.available && retirementOneYear !== null ? formatInteger(retirementOneYear) : "—", detail: retirement?.reason ?? "Approved retirement policy required", icon: PolicyOutlinedIcon, color: COLORS.blue, bg: COLORS.blueSoft }
        ].map((metric) => (
          <Card key={metric.label} sx={[panelSx, { p: 1.25, minHeight: 86 }]}>
            <Stack direction="row" alignItems="flex-start" spacing={1}>
              <Box sx={{ width: 34, height: 34, display: "grid", placeItems: "center", flex: "0 0 auto", borderRadius: "9px", color: metric.color, bgcolor: metric.bg }}><metric.icon sx={{ fontSize: 19 }} /></Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: "var(--hr-muted)", fontSize: 8, fontWeight: 700 }}>{metric.label}</Typography>
                <Typography sx={{ mt: 0.25, color: "var(--hr-text)", fontSize: 17, lineHeight: 1.05, fontWeight: 850 }}>{metric.value}</Typography>
                <Typography sx={{ mt: 0.45, color: "var(--hr-strong-muted)", fontSize: 7.4, lineHeight: 1.35, fontWeight: 600 }}>{metric.detail}</Typography>
              </Box>
            </Stack>
          </Card>
        ))}
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(12, minmax(0, 1fr))" }, gap: 0.9, mb: 1.3 }}>
        <Card sx={[panelSx, { gridColumn: { lg: "span 4" }, minHeight: 260, p: 1.45 }]}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Box>
              <Typography sx={{ color: "var(--hr-text)", fontSize: 11.5, fontWeight: 850 }}>Employee Data Quality</Typography>
              <Typography lang="ar" dir="rtl" sx={{ width: "fit-content", color: "var(--hr-muted)", fontSize: 8, fontWeight: 700 }}>جودة بيانات الموظفين</Typography>
            </Box>
            {quality ? (
              <Box sx={{ position: "relative", width: 54, height: 54 }}>
                <CircularProgress variant="determinate" value={100} size={54} thickness={4.5} sx={{ position: "absolute", color: "var(--hr-surface-soft)" }} />
                <CircularProgress variant="determinate" value={quality.scorePercent} size={54} thickness={4.5} sx={{ color: qualityColor }} />
                <Typography sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--hr-text)", fontSize: 9, fontWeight: 850 }}>{quality.scorePercent.toFixed(0)}%</Typography>
              </Box>
            ) : null}
          </Stack>
          {quality ? (
            <Stack divider={<Divider flexItem sx={{ borderColor: "var(--hr-divider-soft)" }} />} sx={{ mt: 0.75 }}>
              {quality.issues.slice(0, 5).map((issue) => {
                const palette = severityColor(issue.severity);
                return (
                  <Button key={issue.key} onClick={() => issue.directoryQuery && onOpenEmployees(issue.directoryQuery)} disabled={!issue.directoryQuery || issue.count === 0} sx={{ px: 0.25, py: 0.7, justifyContent: "flex-start", color: "inherit", textAlign: "left", textTransform: "none" }}>
                    <Box sx={{ width: 25, height: 25, display: "grid", placeItems: "center", flex: "0 0 auto", borderRadius: "7px", color: palette.color, bgcolor: palette.background }}><ReportProblemOutlinedIcon sx={{ fontSize: 15 }} /></Box>
                    <Box sx={{ ml: 0.8, minWidth: 0, flex: 1 }}>
                      <Typography noWrap sx={{ color: "var(--hr-row-text)", fontSize: 8.4, fontWeight: 750 }}>{issue.label}</Typography>
                      <Typography noWrap sx={{ color: "var(--hr-muted)", fontSize: 7.2, fontWeight: 600 }}>{issue.description}</Typography>
                    </Box>
                    <Typography sx={{ ml: 0.8, color: palette.color, fontSize: 10, fontWeight: 850 }}>{formatInteger(issue.count)}</Typography>
                  </Button>
                );
              })}
            </Stack>
          ) : <EmptyReadyState title="Quality checks are ready" detail="Connect the extended analytics response to show missing and invalid employee fields." />}
        </Card>

        <Card sx={[panelSx, { gridColumn: { lg: "span 4" }, minHeight: 260, p: 1.45 }]}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
            <Box>
              <Typography sx={{ color: "var(--hr-text)", fontSize: 11.5, fontWeight: 850 }}>Contract Risk Center</Typography>
              <Typography lang="ar" dir="rtl" sx={{ width: "fit-content", color: "var(--hr-muted)", fontSize: 8, fontWeight: 700 }}>مركز مخاطر العقود</Typography>
            </Box>
            <Chip label={contractQuality.label} size="small" sx={{ height: 21, color: contractQuality.color, bgcolor: contractQuality.background, fontSize: 7.2, fontWeight: 800 }} />
          </Stack>
          {contractRisk?.available ? (
            <Stack spacing={0.25} sx={{ mt: 1 }}>
              {contractRisk.buckets.map((bucket) => <RiskBucket key={bucket.key} bucket={bucket} maximum={riskMaximum} onOpenEmployees={onOpenEmployees} />)}
              {contractRisk.warning ? <Typography sx={{ pt: 0.55, color: COLORS.amber, fontSize: 7.2, lineHeight: 1.35, fontWeight: 700 }}>{contractRisk.warning}</Typography> : null}
            </Stack>
          ) : <EmptyReadyState title="Contract risk logic is ready" detail="Populate and verify employee contract end dates to activate 30, 60, 90 and 180-day alerts." />}
        </Card>

        <Card sx={[panelSx, { gridColumn: { lg: "span 4" }, minHeight: 260, p: 1.45 }]}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
            <Box>
              <Typography sx={{ color: "var(--hr-text)", fontSize: 11.5, fontWeight: 850 }}>Seniority Reward Forecast</Typography>
              <Typography lang="ar" dir="rtl" sx={{ width: "fit-content", color: "var(--hr-muted)", fontSize: 8, fontWeight: 700 }}>توقعات مكافآت الأقدمية</Typography>
            </Box>
            <Chip label="12 months" size="small" sx={{ height: 21, color: COLORS.purple, bgcolor: COLORS.purpleSoft, fontSize: 7.2, fontWeight: 800 }} />
          </Stack>
          {seniority?.available ? (
            <>
              <Stack direction="row" spacing={2.2} sx={{ mt: 1.1 }}>
                <Box><Typography sx={{ color: "var(--hr-text)", fontSize: 18, fontWeight: 850 }}>{formatInteger(seniority.employeesDue)}</Typography><Typography sx={{ color: "var(--hr-muted)", fontSize: 7.3, fontWeight: 650 }}>employees due</Typography></Box>
                <Box><Typography sx={{ color: "var(--hr-text)", fontSize: 18, fontWeight: 850 }}>{formatCurrency(seniority.expectedCost, seniority.currency)}</Typography><Typography sx={{ color: "var(--hr-muted)", fontSize: 7.3, fontWeight: 650 }}>expected reward cost</Typography></Box>
              </Stack>
              <Stack divider={<Divider flexItem sx={{ borderColor: "var(--hr-divider-soft)" }} />} sx={{ mt: 0.7 }}>
                {seniority.rows.filter((row) => row.employees > 0).slice(0, 4).map((row) => (
                  <Button key={row.years} onClick={() => onOpenEmployees({ seniorityMilestone: String(row.years) })} sx={{ px: 0.2, py: 0.6, justifyContent: "flex-start", color: "inherit", textAlign: "left", textTransform: "none" }}>
                    <Box sx={{ width: 29, height: 29, display: "grid", placeItems: "center", borderRadius: "50%", color: COLORS.purple, border: `1px solid ${COLORS.purple}`, fontSize: 8, fontWeight: 850 }}>{row.years}y</Box>
                    <Box sx={{ ml: 0.8, minWidth: 0, flex: 1 }}><Typography sx={{ color: "var(--hr-row-text)", fontSize: 8.4, fontWeight: 750 }}>{formatInteger(row.employees)} employees · {formatCurrency(row.rewardAmount, seniority.currency)} each</Typography><Typography sx={{ color: "var(--hr-muted)", fontSize: 7.1, fontWeight: 600 }}>{row.nextDate ? `Next ${dayjs(row.nextDate).format("MMM D, YYYY")}` : "No upcoming date"}</Typography></Box>
                    <ArrowForwardRoundedIcon sx={{ color: COLORS.blue, fontSize: 15 }} />
                  </Button>
                ))}
              </Stack>
              <Typography sx={{ mt: 0.65, color: "var(--hr-muted)", fontSize: 7.1, lineHeight: 1.35, fontWeight: 600 }}>{seniority.basisNote}</Typography>
            </>
          ) : <EmptyReadyState title="Seniority forecast is ready" detail="Contract Start Date activates the forecast; recognized previous NOC service remains an explicit future input." />}
        </Card>
      </Box>

      <Box sx={{ display: "none" }} aria-hidden>
        <SectionHeading
          title="Source-Ready HR Modules"
        arabic="وحدات الموارد البشرية الجاهزة للربط"
        detail="These are completed interface and API contracts. A dash means the authoritative source is missing—not zero activity."
      />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(5, minmax(0, 1fr))" }, gap: 0.9 }}>
        {readiness.length ? readiness.map((module) => <ReadinessCard key={module.key} module={module} />) : (
          [
            { key: "retirement", label: "Retirement Forecast", description: "Waiting for an approved retirement-age policy.", requiredSources: ["Retirement policy"], status: "policy-required" as const, metrics: [{ label: "1-year risk", value: null }] },
            { key: "movement", label: "Workforce Movement", description: "Hires are available; exits, transfers and promotions need history.", requiredSources: ["Employment event history"], status: "partial" as const, metrics: [{ label: "Exits", value: null }] },
            { key: "attendance-leave", label: "Attendance & Leave", description: "Ready for monthly attendance, absence and leave KPIs.", requiredSources: ["TimeSheet", "Vacation"], status: "source-not-connected" as const, metrics: [{ label: "Absence rate", value: null }] },
            { key: "recruitment", label: "Recruitment Pipeline", description: "Ready for applicants, stages, offers and time-to-hire.", requiredSources: ["Candidates", "Recruitment stages"], status: "source-not-connected" as const, metrics: [{ label: "Open candidates", value: null }] },
            { key: "training", label: "Training & Certifications", description: "Ready for compliance, expiry and skills coverage.", requiredSources: ["Training records", "Certifications"], status: "source-not-connected" as const, metrics: [{ label: "Expiring certificates", value: null }] }
          ].map((module) => <ReadinessCard key={module.key} module={module} />)
        )}
        </Box>
      </Box>

      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" gap={0.8} sx={{ mt: 0.9, px: 1.2, py: 0.9, border: "1px solid var(--hr-border)", borderRadius: "9px", bgcolor: "var(--hr-surface-soft)" }}>
        <Stack direction="row" alignItems="center" spacing={0.8}>
          <GroupsOutlinedIcon sx={{ color: COLORS.blue, fontSize: 17 }} />
          <Typography sx={{ color: "var(--hr-strong-muted)", fontSize: 8, lineHeight: 1.4, fontWeight: 650 }}>
            {data.privacy?.demographicDrilldownSuppressed
              ? `Privacy policy active · demographic drill-downs below ${data.privacy.smallGroupThreshold} employees are suppressed.`
              : `Privacy contract ready · small-group suppression threshold ${data.privacy?.smallGroupThreshold ?? 5} is not enforced until an HR access policy is approved.`}
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.55}>
          <ScheduleOutlinedIcon sx={{ color: COLORS.gray, fontSize: 15 }} />
          <Typography sx={{ color: "var(--hr-muted)", fontSize: 7.6, fontWeight: 650 }}>
            Generated {data.generatedAt ? dayjs(data.generatedAt).format("MMM D, YYYY HH:mm") : dayjs(data.asOf).format("MMM D, YYYY")}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
};
