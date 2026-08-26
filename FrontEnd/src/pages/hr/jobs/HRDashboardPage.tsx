import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import Diversity3OutlinedIcon from "@mui/icons-material/Diversity3Outlined";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import MilitaryTechOutlinedIcon from "@mui/icons-material/MilitaryTechOutlined";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import PersonAddAlt1OutlinedIcon from "@mui/icons-material/PersonAddAlt1Outlined";
import PersonOffOutlinedIcon from "@mui/icons-material/PersonOffOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import {
  Avatar,
  Autocomplete,
  Badge,
  Box,
  Button,
  Card,
  CircularProgress,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  GlobalStyles,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  type SelectChangeEvent,
  type SxProps,
  type Theme
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { SparkLineChart } from "@mui/x-charts/SparkLineChart";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState, type ElementType, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { hrDashboardApi } from "../../../api/hrDashboard.api";
import { useAuth } from "../../../auth/useAuth";
import type {
  HrDashboardCategoryValue,
  HrDashboardAgeRow,
  HrDashboardData,
  HrDashboardFilterOption,
  HrDashboardFilters,
  HrDashboardMetric
} from "../../../types/hrDashboard.types";
import { exportToExcel } from "../../../utils/exportExcel";
import { HrPageHeader } from "./PageHeader";
import { HRDashboardPlanningPanels } from "./HRDashboardPlanningPanels";
import { getHrThemeVars } from "./Theme";

const COLORS = {
  navy: "#10265b",
  blue: "#3270e5",
  blueSoft: "#eaf1ff",
  green: "#2fa77c",
  greenSoft: "#e8f8f2",
  purple: "#7650e8",
  purpleSoft: "#f1edff",
  teal: "#2497a8",
  tealSoft: "#e8f7f8",
  pink: "#e86f9f",
  amber: "#eeb12d",
  orange: "#f97824",
  red: "#ef4f5f",
  gray: "#9aa7ba",
  paleGray: "#e7edf5"
} as const;

const PIE_COLORS = [
  COLORS.blue,
  "#6f9df0",
  COLORS.pink,
  COLORS.amber,
  COLORS.gray,
  COLORS.teal,
  COLORS.purple
];

const emptyFilters: HrDashboardFilters = {
  status: "all",
  department: "all",
  workLocation: "all",
  gender: "all",
  contractType: "all",
  employeeType: "all",
  job: "all",
  nationality: "all",
  ageBand: "all",
  contractRisk: "all",
  seniorityMilestone: "all"
};

const chartSx = {
  "& .MuiChartsAxis-line, & .MuiChartsAxis-tick": { stroke: "#d9e2ef" },
  "& .MuiChartsAxis-tickLabel": { fill: "#65738c", fontSize: 9, fontWeight: 600 },
  "& .MuiChartsGrid-line": { stroke: "#e8eef6", strokeDasharray: "3 3" },
  "& .MuiChartsTooltip-paper": { borderRadius: "10px", border: "1px solid #e1e8f2" }
};

const surfaceSx = {
  minWidth: 0,
  border: "1px solid var(--hr-border)",
  borderRadius: "11px",
  bgcolor: "var(--hr-surface)",
  boxShadow: "0 3px 14px rgba(23, 54, 103, 0.045)",
  overflow: "hidden"
};

const formatInteger = (value: number): string =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);

const formatDecimal = (value: number, suffix = ""): string =>
  `${new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}${suffix}`;

const metricValue = (metric: HrDashboardMetric | number | null | undefined): number | null => {
  if (typeof metric === "number") return metric;
  return metric?.value ?? null;
};

const metricDelta = (metric: HrDashboardMetric | number | null | undefined): number | null =>
  typeof metric === "object" && metric !== null ? metric.delta ?? null : null;

const totalOf = (series: HrDashboardCategoryValue[]): number =>
  series.reduce((sum, item) => sum + item.value, 0);

const labelPercent = (value: number, total: number): string =>
  total > 0 ? `${((value / total) * 100).toFixed(1)}%` : "0.0%";

const getInitials = (value: string): string =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "HR";

const safeSeries = (series: HrDashboardCategoryValue[] | undefined): HrDashboardCategoryValue[] =>
  (series ?? []).filter((item) => Number.isFinite(item.value) && item.value >= 0);

const SAVED_VIEWS_STORAGE_KEY = "herp.hr-dashboard.saved-views.v1";

type SavedDashboardView = {
  id: string;
  name: string;
  filters: HrDashboardFilters;
};

type DashboardExportRow = {
  section: string;
  metric: string;
  value: string | number;
  status: string;
};

const isDashboardFilters = (value: unknown): value is HrDashboardFilters => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return Object.keys(emptyFilters).every((key) => typeof record[key] === "string");
};

const readSavedViews = (storageKey: string): SavedDashboardView[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { version?: unknown; views?: unknown };
    if (parsed.version !== 1 || !Array.isArray(parsed.views)) return [];
    return parsed.views.filter((view): view is SavedDashboardView => {
      if (!view || typeof view !== "object") return false;
      const candidate = view as Record<string, unknown>;
      return typeof candidate.id === "string"
        && typeof candidate.name === "string"
        && isDashboardFilters(candidate.filters);
    });
  } catch {
    return [];
  }
};

const writeSavedViews = (storageKey: string, views: SavedDashboardView[]): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify({ version: 1, views }));
  } catch {
    // Browser storage can be disabled or full; the in-memory view remains usable for this session.
  }
};

const buildDashboardExportRows = (data: HrDashboardData, filters: HrDashboardFilters): DashboardExportRow[] => {
  const rows: DashboardExportRow[] = [
    { section: "Dashboard", metric: "As of", value: data.asOf, status: "Live" },
    { section: "Dashboard", metric: "Generated at", value: data.generatedAt ?? "", status: "Live" },
    { section: "Workforce", metric: "Total employees", value: metricValue(data.kpis.totalEmployees) ?? "Unavailable", status: "Live" },
    { section: "Workforce", metric: "Active employees", value: metricValue(data.kpis.activeEmployees) ?? "Unavailable", status: "Live" },
    { section: "Workforce", metric: "Vacancies", value: metricValue(data.kpis.vacancies) ?? "Unavailable", status: "Live" },
    { section: "Workforce", metric: "Turnover rate", value: metricValue(data.kpis.turnoverRate) ?? "Unavailable", status: metricValue(data.kpis.turnoverRate) === null ? "Source not connected" : "Live" },
    { section: "Planning", metric: "Data completeness", value: data.dataQuality ? `${data.dataQuality.scorePercent}%` : "Unavailable", status: data.dataQuality ? "Live" : "Ready" },
    { section: "Planning", metric: "Contracts expiring in 90 days", value: metricValue(data.kpis.contractsExpiring90Days) ?? "Unavailable", status: data.contractRisk?.quality ?? "Ready" },
    { section: "Planning", metric: "Seniority employees due in 12 months", value: data.seniorityForecast?.employeesDue ?? "Unavailable", status: data.seniorityForecast?.available ? "Live" : "Ready" },
    { section: "Planning", metric: "Seniority expected cost", value: data.seniorityForecast ? `${data.seniorityForecast.expectedCost} ${data.seniorityForecast.currency}` : "Unavailable", status: data.seniorityForecast?.available ? "Live" : "Ready" },
    { section: "Planning", metric: "Retirement risk in 12 months", value: metricValue(data.kpis.retirementRiskNext12Months) ?? "Unavailable", status: data.retirementForecast?.available ? "Live" : "Policy required" }
  ];

  for (const [key, value] of Object.entries(filters)) {
    if (value !== "all") rows.push({ section: "Applied filters", metric: key, value, status: "Applied" });
  }

  const categorySeries: Array<[string, HrDashboardCategoryValue[] | undefined]> = [
    ["Employment status", data.series.employmentStatus],
    ["Gender", data.series.gender],
    ["Department", data.series.departments],
    ["Work location", data.series.workLocations],
    ["Contract type", data.series.contractTypes],
    ["Contract tenure", data.series.yearsOfService],
    ["Place of birth", data.series.placesOfBirth],
    ["Family Book Issuer", data.series.familyBookIssuers],
    ["Job", data.series.jobs]
  ];
  for (const [section, series] of categorySeries) {
    for (const item of series ?? []) rows.push({ section, metric: item.label, value: item.value, status: "Live" });
  }
  for (const point of data.series.contractStartsLast12Months ?? []) {
    rows.push({ section: "Contract starts", metric: point.label, value: point.value, status: "Live" });
  }
  for (const age of data.series.agePyramid ?? []) {
    rows.push({ section: "Age pyramid", metric: age.label, value: age.male + age.female + age.unknown, status: `Male ${age.male}; Female ${age.female}; Unknown ${age.unknown}` });
  }

  for (const field of data.dataQuality?.fields ?? []) {
    rows.push({ section: "Data quality", metric: field.label, value: `${field.coveragePercent}%`, status: `${field.missing} missing; ${field.invalid} invalid` });
  }
  for (const bucket of data.contractRisk?.buckets ?? []) {
    rows.push({ section: "Contract risk", metric: bucket.label, value: bucket.value, status: data.contractRisk?.quality ?? "Ready" });
  }
  for (const milestone of data.seniorityForecast?.rows ?? []) {
    rows.push({ section: "Seniority", metric: `${milestone.years}-year milestone`, value: milestone.employees, status: `${milestone.expectedCost} ${data.seniorityForecast?.currency ?? "LYD"}` });
  }
  for (const module of data.moduleReadiness ?? []) {
    rows.push({ section: "Source readiness", metric: module.label, value: module.recordCount ?? "Unavailable", status: module.status });
  }
  return rows;
};

type DashboardCardProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  sx?: SxProps<Theme>;
  contentSx?: SxProps<Theme>;
};

const DashboardCard = ({ title, subtitle, action, children, sx, contentSx }: DashboardCardProps) => (
  <Card sx={[surfaceSx, { display: "flex", flexDirection: "column" }, ...(Array.isArray(sx) ? sx : [sx])]}>
    <Stack
      direction="row"
      alignItems="flex-start"
      justifyContent="space-between"
      spacing={1}
      sx={{ px: 1.6, pt: 1.35, pb: subtitle ? 0.35 : 0.85 }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ color: "var(--hr-text)", fontSize: 12, lineHeight: 1.2, fontWeight: 800 }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography sx={{ mt: 0.35, color: "var(--hr-muted)", fontSize: 9.5, fontWeight: 600 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {action}
    </Stack>
    <Box sx={[{ minHeight: 0, flex: 1 }, ...(Array.isArray(contentSx) ? contentSx : [contentSx])]}> {children} </Box>
  </Card>
);

type FilterFieldProps = {
  label: string;
  value: string;
  options: HrDashboardFilterOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
};

const FilterField = ({ label, value, options, disabled = false, onChange }: FilterFieldProps) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography sx={{ mb: 0.45, color: "var(--hr-text)", fontSize: 9.5, fontWeight: 750 }}>
      {label}
    </Typography>
    <Tooltip title={disabled ? `${label} data is not linked to employee records yet` : ""} arrow>
      <FormControl fullWidth size="small" disabled={disabled}>
        <Select
          value={value}
          onChange={(event: SelectChangeEvent) => onChange(event.target.value)}
          displayEmpty
          inputProps={{ "aria-label": label }}
          sx={{
            height: 36,
            borderRadius: "8px",
            bgcolor: "var(--hr-surface)",
            color: "var(--hr-row-text)",
            fontSize: 10.5,
            fontWeight: 600,
            "& .MuiOutlinedInput-notchedOutline": { borderColor: "var(--hr-border)" },
            "& .MuiSelect-select": { py: 0.75, pl: 1.2 },
            "&.Mui-disabled": { bgcolor: "var(--hr-surface-soft)", opacity: 0.8 }
          }}
        >
          <MenuItem value="all" sx={{ fontSize: 11 }}>All</MenuItem>
          {options.map((option) => (
            <MenuItem key={option.value} value={option.value} sx={{ fontSize: 11 }}>
              {option.label} ({formatInteger(option.count)})
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Tooltip>
  </Box>
);

const ALL_FILTER_OPTION: HrDashboardFilterOption = { value: "all", label: "All", count: 0 };

const SearchableFilterField = ({ label, value, options, disabled = false, onChange }: FilterFieldProps) => {
  const allOptions = [ALL_FILTER_OPTION, ...options];
  const selected = allOptions.find((option) => option.value === value) ?? ALL_FILTER_OPTION;
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ mb: 0.45, color: "var(--hr-text)", fontSize: 9.5, fontWeight: 750 }}>{label}</Typography>
      <Autocomplete
        disableClearable
        disabled={disabled}
        options={allOptions}
        value={selected}
        onChange={(_event, option) => onChange(option.value)}
        isOptionEqualToValue={(option, selectedOption) => option.value === selectedOption.value}
        getOptionLabel={(option) => option.value === "all" ? "All" : `${option.label} (${formatInteger(option.count)})`}
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            inputProps={{ ...params.inputProps, "aria-label": label }}
            sx={{ "& .MuiOutlinedInput-root": { minHeight: 36, py: 0, borderRadius: "8px", bgcolor: "var(--hr-surface)", fontSize: 10.5, fontWeight: 600 } }}
          />
        )}
        slotProps={{ listbox: { sx: { fontSize: 10.5 } } }}
      />
    </Box>
  );
};

type MetricCardProps = {
  label: string;
  value: string;
  comparison: string;
  delta?: number | null;
  deltaSuffix?: string;
  icon: ElementType;
  color: string;
  softColor: string;
  sparkData?: number[];
  inverseDelta?: boolean;
};

const MetricSparkline = ({ data, color }: { data: number[]; color: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => setWidth(Math.max(0, Math.floor(container.getBoundingClientRect().width)));
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <Box ref={containerRef} sx={{ width: "100%", minWidth: 0, height: 24, overflow: "hidden" }}>
      {width > 0 ? (
        <SparkLineChart
          data={data}
          width={width}
          height={24}
          color={color}
          curve="linear"
          margin={{ top: 4, right: 1, bottom: 1, left: 1 }}
          showTooltip
          sx={{ "& .MuiAreaElement-root": { opacity: 0.08 } }}
        />
      ) : null}
    </Box>
  );
};

const MetricCard = ({
  label,
  value,
  comparison,
  delta,
  deltaSuffix = "%",
  icon: Icon,
  color,
  softColor,
  sparkData,
  inverseDelta = false
}: MetricCardProps) => {
  const positive = delta !== null && delta !== undefined && delta >= 0;
  const favorable = inverseDelta ? !positive : positive;

  return (
    <Card
      sx={[
        surfaceSx,
        {
          height: 100,
          p: 1.15,
          display: "grid",
          gridTemplateRows: sparkData?.length ? "1fr 24px" : "1fr",
          gap: 0.15
        }
      ]}
    >
      <Stack direction="row" spacing={1} sx={{ minWidth: 0 }}>
        <Box
          sx={{
            width: 37,
            height: 37,
            display: "grid",
            placeItems: "center",
            flex: "0 0 auto",
            borderRadius: "9px",
            bgcolor: softColor,
            color
          }}
        >
          <Icon sx={{ fontSize: 20 }} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography noWrap sx={{ color: "var(--hr-row-text)", fontSize: 9, lineHeight: 1.15, fontWeight: 700 }}>
            {label}
          </Typography>
          <Typography sx={{ mt: 0.35, color: "var(--hr-text)", fontSize: 19, lineHeight: 1, fontWeight: 850 }}>
            {value}
          </Typography>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.4} sx={{ mt: 0.55 }}>
            <Typography noWrap sx={{ color: "var(--hr-muted)", fontSize: 7.5, fontWeight: 600 }}>
              {comparison}
            </Typography>
            {delta !== null && delta !== undefined ? (
              <Stack direction="row" alignItems="center" spacing={0.15} sx={{ color: favorable ? COLORS.green : COLORS.red }}>
                {positive ? <TrendingUpRoundedIcon sx={{ fontSize: 10 }} /> : <TrendingDownRoundedIcon sx={{ fontSize: 10 }} />}
                <Typography noWrap sx={{ color: "inherit", fontSize: 7.8, fontWeight: 800 }}>
                  {Math.abs(delta).toFixed(1)}{deltaSuffix}
                </Typography>
              </Stack>
            ) : null}
          </Stack>
        </Box>
      </Stack>
      {sparkData?.length ? <MetricSparkline data={sparkData} color={color} /> : null}
    </Card>
  );
};

type LegendListProps = {
  data: HrDashboardCategoryValue[];
  colors?: string[];
  onSelect?: (item: HrDashboardCategoryValue) => void;
  minimumDrilldownCount?: number;
};

const LegendList = ({ data, colors = PIE_COLORS, onSelect, minimumDrilldownCount = 1 }: LegendListProps) => {
  const total = totalOf(data);
  return (
    <Stack spacing={0.9} sx={{ minWidth: 0, flex: 1 }}>
      {data.slice(0, 5).map((item, index) => {
        const row = (
          <Stack direction="row" alignItems="center" spacing={0.7} sx={{ width: "100%", minWidth: 0 }}>
          <Box sx={{ width: 7, height: 7, flex: "0 0 auto", borderRadius: "2px", bgcolor: colors[index % colors.length] }} />
          <Typography noWrap sx={{ minWidth: 0, flex: 1, color: "var(--hr-row-text)", fontSize: 8.5, fontWeight: 650 }}>
            {item.label}
          </Typography>
          <Typography noWrap sx={{ color: "var(--hr-text)", fontSize: 8.2, fontWeight: 750 }}>
            {formatInteger(item.value)} ({labelPercent(item.value, total)})
          </Typography>
          </Stack>
        );
        return onSelect ? (
          <Tooltip key={item.key ?? item.label} title={item.value < minimumDrilldownCount ? `Drill-down protected for groups below ${minimumDrilldownCount}` : "Open matching employees"} arrow>
            <span>
              <Button fullWidth disabled={item.value < minimumDrilldownCount} onClick={() => onSelect(item)} sx={{ minWidth: 0, p: 0, color: "inherit", textTransform: "none", "&.Mui-disabled": { color: "inherit", opacity: 1 } }}>{row}</Button>
            </span>
          </Tooltip>
        ) : <Box key={item.key ?? item.label}>{row}</Box>;
      })}
    </Stack>
  );
};

type DonutCardProps = {
  title: string;
  data: HrDashboardCategoryValue[];
  totalLabel?: string;
  colors?: string[];
  sx?: SxProps<Theme>;
  onSelect?: (item: HrDashboardCategoryValue) => void;
  minimumDrilldownCount?: number;
};

const DonutCard = ({ title, data, totalLabel = "Total", colors = PIE_COLORS, sx, onSelect, minimumDrilldownCount }: DonutCardProps) => {
  const normalizedData = data.length ? data : [{ label: "No data", value: 1 }];
  const total = data.length ? totalOf(data) : 0;
  return (
    <DashboardCard title={title} sx={sx} contentSx={{ px: 1.15, pb: 1.05 }}>
      <Stack direction="row" alignItems="center" spacing={0.7} sx={{ height: 128 }}>
        <Box sx={{ position: "relative", width: "46%", minWidth: 112, height: 124, flex: "0 0 auto" }}>
          <PieChart
            hideLegend
            height={124}
            series={[
              {
                data: normalizedData.map((item, index) => ({
                  id: `${item.label}-${index}`,
                  label: item.label,
                  value: item.value,
                  color: data.length ? colors[index % colors.length] : COLORS.paleGray
                })),
                innerRadius: 39,
                outerRadius: 54,
                paddingAngle: 0.8,
                cornerRadius: 1
              }
            ]}
            margin={{ top: 6, right: 6, bottom: 6, left: 6 }}
            sx={chartSx}
          />
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              pointerEvents: "none",
              textAlign: "center"
            }}
          >
            <Box>
              <Typography sx={{ color: "var(--hr-text)", fontSize: 14, lineHeight: 1, fontWeight: 850 }}>
                {formatInteger(total)}
              </Typography>
              <Typography sx={{ mt: 0.35, color: "var(--hr-muted)", fontSize: 7.5, fontWeight: 650 }}>
                {totalLabel}
              </Typography>
            </Box>
          </Box>
        </Box>
        <LegendList data={data} colors={colors} onSelect={onSelect} minimumDrilldownCount={minimumDrilldownCount} />
      </Stack>
    </DashboardCard>
  );
};

const UnavailablePanel = ({ label }: { label: string }) => (
  <Stack alignItems="center" justifyContent="center" spacing={0.75} sx={{ minHeight: 112, px: 2, textAlign: "center" }}>
    <ReportProblemOutlinedIcon sx={{ color: COLORS.gray, fontSize: 23 }} />
    <Typography sx={{ color: "var(--hr-muted)", fontSize: 9.5, fontWeight: 650 }}>
      {label}
    </Typography>
  </Stack>
);

type InsightRowProps = {
  icon: ElementType;
  title: string;
  detail: string;
  color: string;
  softColor: string;
};

const InsightRow = ({ icon: Icon, title, detail, color, softColor }: InsightRowProps) => (
  <Stack direction="row" alignItems="flex-start" spacing={1.05} sx={{ py: 0.85 }}>
    <Box sx={{ width: 34, height: 34, display: "grid", placeItems: "center", flex: "0 0 auto", borderRadius: "8px", bgcolor: softColor, color }}>
      <Icon sx={{ fontSize: 19 }} />
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ color: "var(--hr-text)", fontSize: 9.4, lineHeight: 1.25, fontWeight: 800 }}>
        {title}
      </Typography>
      <Typography sx={{ mt: 0.3, color: "var(--hr-muted)", fontSize: 8.2, lineHeight: 1.35, fontWeight: 600 }}>
        {detail}
      </Typography>
    </Box>
  </Stack>
);

type AlertRowProps = {
  icon: ElementType;
  title: string;
  detail: string;
  severity: "High" | "Medium" | "Low";
  color: string;
  onClick?: () => void;
};

const AlertRow = ({ icon: Icon, title, detail, severity, color, onClick }: AlertRowProps) => {
  const pill = severity === "High"
    ? { color: COLORS.red, bg: "#fff0f2" }
    : severity === "Medium"
      ? { color: COLORS.orange, bg: "#fff5e8" }
      : { color: COLORS.blue, bg: COLORS.blueSoft };
  const row = (
    <Stack direction="row" alignItems="center" spacing={0.95} sx={{ width: "100%", py: 0.85 }}>
      <Box sx={{ width: 28, display: "grid", placeItems: "center", flex: "0 0 auto", color }}>
        <Icon sx={{ fontSize: 19 }} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography noWrap sx={{ color: "var(--hr-text)", fontSize: 9, fontWeight: 800 }}>{title}</Typography>
        <Typography noWrap sx={{ mt: 0.22, color: "var(--hr-muted)", fontSize: 8, fontWeight: 600 }}>{detail}</Typography>
      </Box>
      <Box sx={{ minWidth: 48, px: 0.8, py: 0.35, borderRadius: "6px", bgcolor: pill.bg, color: pill.color, textAlign: "center", fontSize: 8, fontWeight: 800 }}>
        {severity}
      </Box>
    </Stack>
  );
  return onClick ? (
    <Button fullWidth onClick={onClick} sx={{ p: 0, color: "inherit", justifyContent: "stretch", textAlign: "left", textTransform: "none" }}>{row}</Button>
  ) : row;
};

const AGE_BAND_ORDER = ["55+", "45-54", "35-44", "25-34", "<25"];

const sortAgeBandsTopToBottom = (rows: HrDashboardAgeRow[]): HrDashboardAgeRow[] =>
  [...rows].sort((left, right) => {
    const leftIndex = AGE_BAND_ORDER.indexOf(left.label);
    const rightIndex = AGE_BAND_ORDER.indexOf(right.label);
    if (leftIndex === -1 && rightIndex === -1) return left.label.localeCompare(right.label);
    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    return leftIndex - rightIndex;
  });

const AgePyramidExactCounts = ({ rows, onSelect, minimumDrilldownCount = 1 }: {
  rows: HrDashboardAgeRow[];
  onSelect?: (row: HrDashboardAgeRow) => void;
  minimumDrilldownCount?: number;
}) => {
  const validBirthDateTotal = rows.reduce(
    (total, row) => total + row.male + row.female + row.unknown,
    0
  );

  return (
    <Box
      data-testid="employee-age-exact-counts"
      sx={{
        minWidth: 0,
        height: "100%",
        pl: { sm: 0.9 },
        borderLeft: { sm: "1px solid var(--hr-divider-soft)" }
      }}
    >
      <Typography sx={{ mb: 0.55, color: "var(--hr-text)", fontSize: 8.3, fontWeight: 850 }}>
        Exact numbers
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "minmax(34px, 1fr) repeat(4, minmax(22px, auto))",
          alignItems: "center",
          columnGap: 0.45,
          rowGap: 0.25
        }}
      >
        {["Age", "M", "F", "Unk", "Total"].map((label) => (
          <Typography
            key={label}
            sx={{ color: "var(--hr-muted)", fontSize: 6.9, fontWeight: 800, textAlign: label === "Age" ? "left" : "right" }}
          >
            {label}
          </Typography>
        ))}
        {rows.map((row) => {
          const total = row.male + row.female + row.unknown;
          return (
            <Button
              key={row.label}
              aria-label={`Open employees aged ${row.label}; ${formatInteger(total)} employees`}
              onClick={() => onSelect?.(row)}
              disabled={!onSelect || total < minimumDrilldownCount}
              sx={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "minmax(34px, 1fr) repeat(4, minmax(22px, auto))", columnGap: 0.45, minWidth: 0, p: 0, color: "inherit", textTransform: "none", "&.Mui-disabled": { color: "inherit", opacity: 1 } }}
            >
              {[row.label, row.male, row.female, row.unknown, total].map((value, index) => (
                <Typography
                  key={`${row.label}-${index}`}
                  sx={{
                    width: "100%",
                    py: 0.18,
                    color: index === 1 ? COLORS.blue : index === 2 ? COLORS.pink : "var(--hr-row-text)",
                    fontSize: 7.5,
                    fontWeight: index === 0 || index === 4 ? 850 : 750,
                    textAlign: index === 0 ? "left" : "right",
                    borderTop: "1px solid var(--hr-divider-soft)"
                  }}
                >
                  {typeof value === "number" ? formatInteger(value) : value}
                </Typography>
              ))}
            </Button>
          );
        })}
      </Box>
      <Typography sx={{ mt: 0.5, color: "var(--hr-muted)", fontSize: 6.8, fontWeight: 650 }}>
        Valid birth dates: {formatInteger(validBirthDateTotal)}
      </Typography>
    </Box>
  );
};

type RankedCategoryItem = HrDashboardCategoryValue & {
  kind: "known" | "other" | "unrecorded";
};

const isUnrecordedCategory = (label: string): boolean =>
  ["unknown", "not recorded", "unassigned"].includes(label.trim().toLowerCase());

const summarizeRankedCategories = (
  data: HrDashboardCategoryValue[],
  categoryNoun: string,
  visibleKnownCategories = 7
) => {
  const nonzero = safeSeries(data).filter((item) => item.value > 0);
  const known = nonzero.filter((item) => !isUnrecordedCategory(item.label));
  const unrecordedValue = nonzero
    .filter((item) => isUnrecordedCategory(item.label))
    .reduce((sum, item) => sum + item.value, 0);
  const displayed: RankedCategoryItem[] = known
    .slice(0, visibleKnownCategories)
    .map((item) => ({ ...item, kind: "known" }));
  const remaining = known.slice(visibleKnownCategories);

  if (remaining.length) {
    displayed.push({
      label: `Other (${formatInteger(remaining.length)} ${categoryNoun})`,
      value: totalOf(remaining),
      kind: "other"
    });
  }

  if (unrecordedValue > 0) {
    displayed.push({ label: "Not recorded", value: unrecordedValue, kind: "unrecorded" });
  }

  return {
    displayed,
    distinctKnown: known.length,
    recorded: totalOf(known),
    total: totalOf(nonzero)
  };
};

type RankedCategoryCardProps = {
  title: string;
  sourceLabel?: string;
  data: HrDashboardCategoryValue[];
  categoryNoun: string;
  color: string;
  testId: string;
  coverageVerb?: string;
  lgColumns?: 4 | 6 | 12;
  fullWidthAtMd?: boolean;
  onSelect?: (item: HrDashboardCategoryValue) => void;
  minimumDrilldownCount?: number;
};

const RankedCategoryCard = ({
  title,
  sourceLabel,
  data,
  categoryNoun,
  color,
  testId,
  coverageVerb = "recorded",
  lgColumns = 6,
  fullWidthAtMd = false,
  onSelect,
  minimumDrilldownCount = 1
}: RankedCategoryCardProps) => {
  const [showAll, setShowAll] = useState(false);
  const summary = summarizeRankedCategories(data, categoryNoun);
  const maximum = Math.max(1, ...summary.displayed.map((item) => item.value));
  const coverage = `${formatInteger(summary.recorded)} of ${formatInteger(summary.total)} ${coverageVerb}`;
  const subtitle = `${sourceLabel ? `${sourceLabel} | ` : ""}${coverage} | ${formatInteger(summary.distinctKnown)} ${categoryNoun}`;

  return (
    <DashboardCard
      title={title}
      subtitle={subtitle}
      action={summary.distinctKnown > 7 ? <Button size="small" onClick={() => setShowAll(true)} sx={{ p: 0, minWidth: 0, color: COLORS.blue, fontSize: 8, fontWeight: 800, textTransform: "none" }}>View all</Button> : undefined}
      sx={{ gridColumn: { md: fullWidthAtMd ? "1 / -1" : undefined, lg: `span ${lgColumns}` }, minHeight: 276 }}
      contentSx={{ px: 1.55, pb: 1.2 }}
    >
      {summary.total > 0 ? (
        <Stack data-testid={testId} role="list" spacing={0.72}>
          {summary.displayed.map((item) => {
            const percentage = summary.total > 0 ? (item.value / summary.total) * 100 : 0;
            const barColor = item.kind === "unrecorded" ? COLORS.gray : item.kind === "other" ? COLORS.teal : color;
            return (
              <Box key={`${item.kind}-${item.label}`} role="listitem">
                <Button
                aria-label={`${item.label}: ${formatInteger(item.value)} employees, ${percentage.toFixed(1)} percent`}
                disabled={!onSelect || item.kind === "other" || item.value < minimumDrilldownCount}
                onClick={() => onSelect?.(item)}
                sx={{ display: "block", width: "100%", minWidth: 0, p: 0, color: "inherit", textAlign: "left", textTransform: "none", "&.Mui-disabled": { color: "inherit", opacity: 1 } }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                  <Typography
                    noWrap
                    dir="auto"
                    title={item.label}
                    sx={{ minWidth: 0, color: "var(--hr-row-text)", fontSize: 8.7, fontWeight: 750 }}
                  >
                    {item.label}
                  </Typography>
                  <Typography noWrap sx={{ color: "var(--hr-text)", fontSize: 8.4, fontWeight: 850 }}>
                    {formatInteger(item.value)} <Box component="span" sx={{ color: "var(--hr-muted)", fontSize: 7.4 }}>({percentage.toFixed(1)}%)</Box>
                  </Typography>
                </Stack>
                <Box sx={{ mt: 0.32, height: 5, overflow: "hidden", borderRadius: 99, bgcolor: "var(--hr-surface-soft)" }}>
                  <Box sx={{ width: `${Math.max(1.5, (item.value / maximum) * 100)}%`, height: "100%", borderRadius: 99, bgcolor: barColor }} />
                </Box>
                </Button>
              </Box>
            );
          })}
          <Typography sx={{ pt: 0.25, color: "var(--hr-muted)", fontSize: 7.2, fontWeight: 650 }}>
            Exact employee count and share of the currently filtered workforce.
          </Typography>
        </Stack>
      ) : <UnavailablePanel label="No employee records match the current filters" />}
      <Dialog open={showAll} onClose={() => setShowAll(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ color: "var(--hr-text)", fontSize: 15, fontWeight: 850 }}>{title} · All categories</DialogTitle>
        <DialogContent dividers sx={{ p: 1.25 }}>
          <Stack divider={<Divider flexItem sx={{ borderColor: "var(--hr-divider-soft)" }} />}>
            {safeSeries(data).filter((item) => item.value > 0).map((item) => {
              const canOpen = Boolean(onSelect) && item.value >= minimumDrilldownCount;
              return (
                <Button key={item.key ?? item.label} disabled={!canOpen} onClick={() => { onSelect?.(item); setShowAll(false); }} sx={{ px: 0.6, py: 0.8, color: "inherit", justifyContent: "space-between", textTransform: "none" }}>
                  <Typography dir="auto" sx={{ color: "var(--hr-row-text)", fontSize: 11, fontWeight: 700 }}>{item.label}</Typography>
                  <Typography sx={{ color: "var(--hr-text)", fontSize: 11, fontWeight: 850 }}>{formatInteger(item.value)}</Typography>
                </Button>
              );
            })}
          </Stack>
        </DialogContent>
      </Dialog>
    </DashboardCard>
  );
};

const CoverageData = ({ data, onOpenEmployees }: {
  data: HrDashboardData;
  onOpenEmployees: (query: Record<string, string>) => void;
}) => {
  const totalEmployees = metricValue(data.kpis.totalEmployees) ?? 0;
  const activeEmployees = metricValue(data.kpis.activeEmployees) ?? 0;
  const vacancies = metricValue(data.kpis.vacancies) ?? 0;
  const averageAge = metricValue(data.kpis.averageAgeYears);
  const averageTenure = metricValue(data.kpis.averageTenureYears);
  const newHires = metricValue(data.kpis.newHiresThisMonth) ?? 0;
  const onLeave = metricValue(data.kpis.employeesOnLeave);
  const turnover = metricValue(data.kpis.turnoverRate);
  const activeShare = totalEmployees > 0 ? (activeEmployees / totalEmployees) * 100 : 0;
  const genderSeries = safeSeries(data.series.gender);
  const genderTotal = totalOf(genderSeries);
  const femaleCount = genderSeries.find((item) => item.label.toLowerCase() === "female")?.value ?? 0;
  const femaleShare = genderTotal > 0 ? (femaleCount / genderTotal) * 100 : 0;
  const unknownGender = genderSeries.find((item) => item.label.toLowerCase() === "unknown")?.value ?? 0;
  const trend = data.series.contractStartsLast12Months ?? [];
  const trendValues = trend.map((item) => item.value);
  const lastMonthStarts = trendValues.at(-1) ?? 0;
  const previousMonthStarts = trendValues.at(-2) ?? 0;
  const startsDelta = previousMonthStarts > 0 ? ((lastMonthStarts - previousMonthStarts) / previousMonthStarts) * 100 : null;
  const employmentSeries = safeSeries(data.series.employmentStatus);
  const locationSeries = safeSeries(data.series.workLocations);
  const contractSeries = safeSeries(data.series.contractTypes);
  const serviceSeries = safeSeries(data.series.yearsOfService);
  const departmentSeries = safeSeries(data.series.departments);
  const employeeTypeSeries = safeSeries(data.series.employeeTypes);
  const placeOfBirthSeries = safeSeries(data.series.placesOfBirth);
  const familyBookIssuerSeries = safeSeries(data.series.familyBookIssuers);
  const jobSeries = safeSeries(data.series.jobs);
  const expirations = data.upcomingContractExpirations ?? [];
  const contractsExpiring90Days = metricValue(data.kpis.contractsExpiring90Days);
  const agePyramidRows = sortAgeBandsTopToBottom(data.series.agePyramid);
  const demographicDrilldownMinimum = data.privacy?.demographicDrilldownSuppressed
    ? data.privacy.smallGroupThreshold
    : 1;

  const seniorityGroups = Array.from(
    data.seniorityNext90Days.reduce((groups, item) => {
      const current = groups.get(item.years) ?? { years: item.years, count: 0, nextDate: item.milestoneDate };
      current.count += 1;
      if (item.milestoneDate < current.nextDate) current.nextDate = item.milestoneDate;
      groups.set(item.years, current);
      return groups;
    }, new Map<number, { years: number; count: number; nextDate: string }>()).values()
  ).sort((left, right) => left.years - right.years).slice(0, 4);

  const kpis: MetricCardProps[] = [
    {
      label: "Total Employees",
      value: formatInteger(totalEmployees),
      comparison: "current workforce",
      delta: metricDelta(data.kpis.totalEmployees),
      icon: Groups2OutlinedIcon,
      color: COLORS.blue,
      softColor: COLORS.blueSoft,
    },
    {
      label: "Active Employees",
      value: formatInteger(activeEmployees),
      comparison: `${activeShare.toFixed(1)}% of workforce`,
      delta: metricDelta(data.kpis.activeEmployees),
      icon: PersonOutlineRoundedIcon,
      color: COLORS.green,
      softColor: COLORS.greenSoft,
    },
    {
      label: "Vacancies",
      value: formatInteger(vacancies),
      comparison: "employee no. equals 0",
      delta: metricDelta(data.kpis.vacancies),
      icon: BadgeOutlinedIcon,
      color: COLORS.blue,
      softColor: COLORS.blueSoft,
    },
    {
      label: "Turnover Rate",
      value: turnover === null ? "—" : formatDecimal(turnover, "%"),
      comparison: turnover === null ? "source not connected" : "current period",
      delta: metricDelta(data.kpis.turnoverRate),
      deltaSuffix: " pp",
      inverseDelta: true,
      icon: PersonOffOutlinedIcon,
      color: COLORS.purple,
      softColor: COLORS.purpleSoft,
    },
    {
      label: "Average Age",
      value: averageAge === null ? "—" : formatDecimal(averageAge),
      comparison: "valid birth dates",
      delta: metricDelta(data.kpis.averageAgeYears),
      icon: Diversity3OutlinedIcon,
      color: COLORS.teal,
      softColor: COLORS.tealSoft,
    },
    {
      label: "Average Tenure",
      value: averageTenure === null ? "—" : `${formatDecimal(averageTenure)} yrs`,
      comparison: "contract tenure",
      delta: metricDelta(data.kpis.averageTenureYears),
      icon: MilitaryTechOutlinedIcon,
      color: COLORS.blue,
      softColor: COLORS.blueSoft,
    },
    {
      label: "New Hires This Month",
      value: formatInteger(newHires),
      comparison: dayjs(data.asOf).format("MMM YYYY"),
      delta: startsDelta,
      icon: PersonAddAlt1OutlinedIcon,
      color: COLORS.green,
      softColor: COLORS.greenSoft,
      sparkData: trendValues.length ? trendValues : undefined
    },
    {
      label: "Employees on Leave",
      value: onLeave === null ? "—" : formatInteger(onLeave),
      comparison: onLeave === null ? "source not connected" : "current month",
      delta: metricDelta(data.kpis.employeesOnLeave),
      inverseDelta: true,
      icon: EventBusyOutlinedIcon,
      color: COLORS.orange,
      softColor: "#fff1e8",
    }
  ];

  const alerts: AlertRowProps[] = [
    data.coverage.department
      ? {
          icon: BusinessRoundedIcon,
          title: "Department coverage available",
          detail: `${formatInteger(totalOf(departmentSeries))} linked employees`,
          severity: "Low",
          color: COLORS.blue,
          onClick: () => onOpenEmployees({})
        }
      : {
          icon: ReportProblemOutlinedIcon,
          title: "Employees lack department links",
          detail: "Department analytics unavailable",
          severity: "High",
          color: COLORS.red,
          onClick: () => onOpenEmployees({ missingField: "department" })
        },
    contractsExpiring90Days === null
      ? {
          icon: CalendarMonthOutlinedIcon,
          title: "Contract expiry metric unavailable",
          detail: "Contract end-date source needs verification",
          severity: "Medium",
          color: COLORS.orange,
          onClick: () => document.getElementById("hr-planning-readiness")?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      : {
          icon: CalendarMonthOutlinedIcon,
          title: `${formatInteger(contractsExpiring90Days)} contracts expiring in 90 days`,
          detail: data.contractRisk?.quality === "unverified" ? "Unverified dates · review records" : "Review contract records",
          severity: contractsExpiring90Days > 0 ? "Medium" : "Low",
          color: COLORS.orange,
          onClick: contractsExpiring90Days > 0 ? () => onOpenEmployees({ contractRisk: "expiring-90" }) : undefined
        },
    {
      icon: AccessTimeRoundedIcon,
      title: "Attendance source not connected",
      detail: "No timesheet records available",
      severity: "Medium",
      color: COLORS.orange,
      onClick: () => document.getElementById("hr-planning-readiness")?.scrollIntoView({ behavior: "smooth", block: "start" })
    },
    ...(unknownGender > 0 ? [{
      icon: CampaignOutlinedIcon,
      title: `${formatInteger(unknownGender)} gender values need review`,
      detail: "Data-quality follow-up",
      severity: "Low" as const,
      color: COLORS.blue,
      onClick: () => onOpenEmployees({ missingField: "gender" })
    }] : [])
  ];

  return (
    <>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))", lg: "repeat(8, minmax(0, 1fr))" },
          gap: 0.8,
          mb: 0.9
        }}
      >
        {kpis.map((kpi) => <MetricCard key={kpi.label} {...kpi} />)}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", lg: "repeat(12, minmax(0, 1fr))" },
          gap: 0.9,
          mb: 0.9
        }}
      >
        <DashboardCard
          title="Workforce Overview"
          subtitle="Contract Starts Trend"
          action={<Button size="small" endIcon={<KeyboardArrowDownRoundedIcon />} sx={{ minHeight: 28, px: 1, color: "var(--hr-strong-muted)", border: "1px solid var(--hr-border)", borderRadius: "7px", fontSize: 8.5, fontWeight: 750, textTransform: "none" }}>Last 12 Months</Button>}
          sx={{ gridColumn: { lg: "span 6" }, minHeight: 270 }}
          contentSx={{ px: 0.7, pb: 0.8 }}
        >
          <LineChart
            height={176}
            hideLegend
            grid={{ horizontal: true }}
            xAxis={[{ scaleType: "point", data: trend.map((item) => item.label), tickLabelStyle: { fontSize: 8.5, fontWeight: 600 } }]}
            yAxis={[{ min: 0, tickLabelStyle: { fontSize: 8.5 }, width: 42 }]}
            series={[{ data: trendValues, color: COLORS.blue, curve: "linear", showMark: true, valueFormatter: (value) => value === null ? "—" : formatInteger(value) }]}
            margin={{ top: 10, right: 15, bottom: 24, left: 4 }}
            sx={chartSx}
          />
          <Box sx={{ mx: 0.8, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderRadius: "8px", bgcolor: "var(--hr-surface-soft)", overflow: "hidden" }}>
            {[
              { label: "Starts This Month", value: `+${formatInteger(lastMonthStarts)}` },
              { label: "Previous Month", value: formatInteger(previousMonthStarts) },
              { label: "Active Share", value: `${activeShare.toFixed(1)}%` },
              { label: "12-Month Starts", value: `+${formatInteger(trendValues.reduce((sum, value) => sum + value, 0))}` }
            ].map((item, index) => (
              <Box key={item.label} sx={{ px: 0.8, py: 0.75, textAlign: "center", borderLeft: index ? "1px solid var(--hr-divider-soft)" : 0 }}>
                <Typography noWrap sx={{ color: "var(--hr-muted)", fontSize: 7.5, fontWeight: 650 }}>{item.label}</Typography>
                <Typography sx={{ mt: 0.25, color: COLORS.green, fontSize: 13, fontWeight: 850 }}>{item.value}</Typography>
              </Box>
            ))}
          </Box>
        </DashboardCard>

        <DashboardCard title="Executive Insights" sx={{ gridColumn: { lg: "span 3" }, minHeight: 270 }} contentSx={{ px: 1.5, pb: 0.8 }}>
          <InsightRow icon={TrendingUpRoundedIcon} title={`${activeShare.toFixed(1)}% of employees are active`} detail={`${formatInteger(activeEmployees)} active employee records`} color={COLORS.green} softColor={COLORS.greenSoft} />
          <InsightRow icon={PersonAddAlt1OutlinedIcon} title={`${formatInteger(newHires)} new hires this month`} detail={`Contract starts through ${dayjs(data.asOf).format("MMM D")}`} color={COLORS.blue} softColor={COLORS.blueSoft} />
          <InsightRow icon={MilitaryTechOutlinedIcon} title="Experienced workforce" detail={`Average contract tenure is ${averageTenure === null ? "unavailable" : `${averageTenure.toFixed(1)} years`}`} color={COLORS.purple} softColor={COLORS.purpleSoft} />
          <InsightRow icon={Diversity3OutlinedIcon} title={`${femaleShare.toFixed(1)}% female representation`} detail={`${formatInteger(femaleCount)} of ${formatInteger(genderTotal)} classified records`} color={COLORS.teal} softColor={COLORS.tealSoft} />
        </DashboardCard>

        <DashboardCard title="Key Alerts" action={<Button size="small" onClick={() => document.getElementById("hr-planning-readiness")?.scrollIntoView({ behavior: "smooth", block: "start" })} sx={{ p: 0, minWidth: 0, color: COLORS.blue, fontSize: 8.5, fontWeight: 800, textTransform: "none" }}>View all</Button>} sx={{ gridColumn: { lg: "span 3" }, minHeight: 270 }} contentSx={{ px: 1.4, pb: 0.7 }}>
          <Stack divider={<Divider flexItem sx={{ borderColor: "var(--hr-divider-soft)" }} />}>
            {alerts.map((alert) => <AlertRow key={alert.title} {...alert} />)}
          </Stack>
        </DashboardCard>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", lg: "repeat(12, minmax(0, 1fr))" }, gap: 0.9, mb: 0.9 }}>
        <DonutCard title="Employment Status" data={employmentSeries} onSelect={(item) => onOpenEmployees({ status: item.key ?? item.label.toLowerCase() })} sx={{ gridColumn: { lg: "span 3" }, minHeight: 164 }} />
        <DonutCard title="Gender Distribution" data={genderSeries} colors={[COLORS.blue, COLORS.pink, COLORS.gray]} onSelect={(item) => onOpenEmployees({ gender: item.key ?? item.label.toLowerCase() })} minimumDrilldownCount={demographicDrilldownMinimum} sx={{ gridColumn: { lg: "span 3" }, minHeight: 164 }} />
        <DashboardCard title="Employees by Department" sx={{ gridColumn: { lg: "span 2" }, minHeight: 164 }} contentSx={{ px: 0.6, pb: 0.4 }}>
          {data.coverage.department && departmentSeries.length ? (
            <BarChart
              height={132}
              layout="horizontal"
              hideLegend
              grid={{ vertical: true }}
              yAxis={[{ scaleType: "band", data: departmentSeries.slice(0, 6).map((item) => item.label), width: 104, tickLabelStyle: { fontSize: 7.8 } }]}
              xAxis={[{ min: 0, tickLabelStyle: { fontSize: 8 } }]}
              series={[{ data: departmentSeries.slice(0, 6).map((item) => item.value), color: COLORS.blue, valueFormatter: (value) => value === null ? "—" : formatInteger(value) }]}
              margin={{ top: 4, right: 12, bottom: 22, left: 2 }}
              sx={chartSx}
            />
          ) : <UnavailablePanel label="Department IDs are not linked on employee records" />}
        </DashboardCard>
        <DashboardCard title="Employee Age Pyramid" sx={{ gridColumn: { lg: "span 4" }, minHeight: 164 }} contentSx={{ px: 0.6, pb: 0.4 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) 152px" }, gap: 0.7, alignItems: "stretch" }}>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" justifyContent="center" spacing={2} sx={{ mt: -0.4, mb: -0.8 }}>
                <Stack direction="row" alignItems="center" spacing={0.45}><Box sx={{ width: 7, height: 7, borderRadius: "2px", bgcolor: COLORS.blue }} /><Typography sx={{ color: COLORS.blue, fontSize: 8, fontWeight: 800 }}>Male</Typography></Stack>
                <Stack direction="row" alignItems="center" spacing={0.45}><Box sx={{ width: 7, height: 7, borderRadius: "2px", bgcolor: COLORS.pink }} /><Typography sx={{ color: COLORS.pink, fontSize: 8, fontWeight: 800 }}>Female</Typography></Stack>
              </Stack>
              <BarChart
                height={132}
                layout="horizontal"
                hideLegend
                grid={{ vertical: true }}
                yAxis={[{ scaleType: "band", data: agePyramidRows.map((item) => item.label), width: 45, tickLabelStyle: { fontSize: 7.8 } }]}
                xAxis={[{ valueFormatter: (value: number) => formatInteger(Math.abs(value)), tickLabelStyle: { fontSize: 7.5 } }]}
                series={[
                  { label: "Male", data: agePyramidRows.map((item) => -item.male), color: COLORS.blue, stack: "age" },
                  { label: "Female", data: agePyramidRows.map((item) => item.female), color: COLORS.pink, stack: "age" }
                ]}
                margin={{ top: 4, right: 8, bottom: 22, left: 2 }}
                sx={chartSx}
              />
            </Box>
            <AgePyramidExactCounts rows={agePyramidRows} minimumDrilldownCount={demographicDrilldownMinimum} onSelect={(row) => onOpenEmployees({ ageBand: row.label })} />
          </Box>
        </DashboardCard>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", lg: "repeat(12, minmax(0, 1fr))" }, gap: 0.9, mb: 0.9 }}>
        <RankedCategoryCard
          title="Employee Place of Birth"
          data={placeOfBirthSeries}
          categoryNoun="places"
          color={COLORS.blue}
          testId="employee-place-of-birth-statistics"
          lgColumns={4}
          minimumDrilldownCount={demographicDrilldownMinimum}
          onSelect={(item) => onOpenEmployees(item.key === "unknown" ? { missingField: "placeOfBirth" } : { placeOfBirth: item.key ?? item.label })}
        />
        <RankedCategoryCard
          title="Family Place of Birth"
          sourceLabel="Family Book Issuer"
          data={familyBookIssuerSeries}
          categoryNoun="issuer locations"
          color={COLORS.purple}
          testId="family-book-issuer-statistics"
          lgColumns={4}
          minimumDrilldownCount={demographicDrilldownMinimum}
          onSelect={(item) => onOpenEmployees(item.key === "unknown" ? { missingField: "familyBookIssuer" } : { familyBookIssuer: item.key ?? item.label })}
        />
        <RankedCategoryCard
          title="Employees by Job"
          sourceLabel="Jobs table"
          data={jobSeries}
          categoryNoun="jobs"
          color={COLORS.green}
          testId="employee-job-statistics"
          coverageVerb="linked"
          lgColumns={4}
          fullWidthAtMd
          onSelect={(item) => onOpenEmployees(item.key === "unassigned" ? { missingField: "job" } : { jobId: item.key ?? item.label })}
        />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", lg: "repeat(12, minmax(0, 1fr))" }, gap: 0.9, mb: 0.9 }}>
        <DashboardCard title="Department Gender Composition" sx={{ gridColumn: { lg: "span 3" }, minHeight: 160 }} contentSx={{ px: 0.6, pb: 0.4 }}>
          {data.coverage.department && data.series.departmentGenderComposition?.length ? (
            <BarChart
              height={128}
              layout="horizontal"
              hideLegend
              yAxis={[{ scaleType: "band", data: data.series.departmentGenderComposition.map((item) => item.label), width: 95, tickLabelStyle: { fontSize: 7.5 } }]}
              xAxis={[{ min: 0, tickLabelStyle: { fontSize: 7.5 } }]}
              series={[
                { label: "Male", data: data.series.departmentGenderComposition.map((item) => item.male), color: COLORS.blue, stack: "gender" },
                { label: "Female", data: data.series.departmentGenderComposition.map((item) => item.female), color: COLORS.pink, stack: "gender" },
                { label: "Unknown", data: data.series.departmentGenderComposition.map((item) => item.unknown), color: COLORS.gray, stack: "gender" }
              ]}
              margin={{ top: 4, right: 8, bottom: 22, left: 2 }}
              sx={chartSx}
            />
          ) : <UnavailablePanel label="Department gender data will appear after employee department links are populated" />}
        </DashboardCard>
        <DonutCard title="Employees by Work Location" data={locationSeries} onSelect={(item) => onOpenEmployees(item.key === "unassigned" ? { missingField: "workLocation" } : { locationId: item.key ?? item.label })} sx={{ gridColumn: { lg: "span 2" }, minHeight: 160 }} />
        <DonutCard title="Contract Types" data={contractSeries} colors={[COLORS.blue, "#7da6ef", COLORS.amber, COLORS.gray]} onSelect={(item) => onOpenEmployees({ contractType: item.key ?? item.label })} sx={{ gridColumn: { lg: "span 2" }, minHeight: 160 }} />
        {data.coverage.employeeType && employeeTypeSeries.length ? (
          <DonutCard title="Employee Types" data={employeeTypeSeries} colors={[COLORS.blue, "#8fb0ee", COLORS.amber, COLORS.gray]} sx={{ gridColumn: { lg: "span 2" }, minHeight: 160 }} />
        ) : (
          <DashboardCard title="Employee Types" sx={{ gridColumn: { lg: "span 2" }, minHeight: 160 }}><UnavailablePanel label="Employee type coverage is not reliable" /></DashboardCard>
        )}
        <DashboardCard title="Contract Tenure" subtitle="Based on Contract Start Date" sx={{ gridColumn: { lg: "span 3" }, minHeight: 160 }} contentSx={{ px: 0.45, pb: 0.35 }}>
          <BarChart
            height={128}
            hideLegend
            grid={{ horizontal: true }}
            xAxis={[{ scaleType: "band", data: serviceSeries.map((item) => item.label), tickLabelStyle: { fontSize: 7.5 } }]}
            yAxis={[{ min: 0, tickLabelStyle: { fontSize: 7.5 }, width: 34 }]}
            series={[{ data: serviceSeries.map((item) => item.value), color: COLORS.blue, valueFormatter: (value) => value === null ? "—" : formatInteger(value) }]}
            margin={{ top: 8, right: 7, bottom: 24, left: 2 }}
            sx={chartSx}
          />
        </DashboardCard>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", lg: "repeat(12, minmax(0, 1fr))" }, gap: 0.9 }}>
        <DashboardCard title="Upcoming Contract Expirations" action={<Button size="small" onClick={() => onOpenEmployees({ contractRisk: "expiring-90" })} sx={{ p: 0, minWidth: 0, color: COLORS.blue, fontSize: 8.2, fontWeight: 800, textTransform: "none" }}>View all</Button>} sx={{ gridColumn: { lg: "span 3" }, minHeight: 168 }} contentSx={{ px: 1.4, pb: 0.8 }}>
          {expirations.length ? (
            <Stack divider={<Divider flexItem sx={{ borderColor: "var(--hr-divider-soft)" }} />}>
              {expirations.slice(0, 3).map((item) => (
                <Stack key={`${item.employeeName}-${item.endDate}`} direction="row" alignItems="center" spacing={1} sx={{ py: 0.7 }}>
                  <Box sx={{ width: 35, height: 35, display: "grid", placeItems: "center", flex: "0 0 auto", borderRadius: "50%", border: "1px solid #cdd9eb", textAlign: "center" }}>
                    <Box>
                      <Typography sx={{ color: COLORS.navy, fontSize: 10, lineHeight: 1, fontWeight: 850 }}>{dayjs(item.endDate).format("D")}</Typography>
                      <Typography sx={{ mt: 0.15, color: COLORS.navy, fontSize: 6.5, lineHeight: 1, fontWeight: 800 }}>{dayjs(item.endDate).format("MMM").toUpperCase()}</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap sx={{ color: "var(--hr-text)", fontSize: 8.6, fontWeight: 750 }}>{item.employeeName} · {item.jobName || "Employee"}</Typography>
                    <Typography sx={{ mt: 0.25, color: "var(--hr-muted)", fontSize: 7.8, fontWeight: 600 }}>Contract expires in {item.daysRemaining} days</Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          ) : <UnavailablePanel label="No verified future contract expirations in the next 90 days" />}
        </DashboardCard>

        <DashboardCard title="Seniority Milestones" subtitle="Next 90 Days · Contract Start Date basis" action={<Button size="small" onClick={() => document.getElementById("hr-planning-readiness")?.scrollIntoView({ behavior: "smooth", block: "start" })} sx={{ p: 0, minWidth: 0, color: COLORS.blue, fontSize: 8.2, fontWeight: 800, textTransform: "none" }}>View all</Button>} sx={{ gridColumn: { lg: "span 2" }, minHeight: 168 }} contentSx={{ px: 1.15, pb: 0.8 }}>
          {seniorityGroups.length ? (
            <Stack spacing={0.65}>
              {seniorityGroups.map((group, index) => (
                <Stack key={group.years} direction="row" alignItems="center" spacing={0.8}>
                  <Box sx={{ width: 27, height: 27, display: "grid", placeItems: "center", flex: "0 0 auto", borderRadius: "50%", border: `1px solid ${[COLORS.blue, COLORS.green, COLORS.amber, COLORS.purple][index % 4]}`, color: [COLORS.blue, COLORS.green, COLORS.amber, COLORS.purple][index % 4], fontSize: 9, fontWeight: 850 }}>
                    {formatInteger(group.count)}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap sx={{ color: "var(--hr-text)", fontSize: 8.4, fontWeight: 750 }}>Employees at {group.years} years</Typography>
                    <Typography sx={{ color: "var(--hr-muted)", fontSize: 7.4, fontWeight: 600 }}>Next · {dayjs(group.nextDate).format("MMM D, YYYY")}</Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          ) : <UnavailablePanel label="No seniority anniversaries fall within the next 90 days" />}
        </DashboardCard>

        <DashboardCard title="Hiring Pipeline" action={<Button size="small" onClick={() => document.getElementById("hr-planning-readiness")?.scrollIntoView({ behavior: "smooth", block: "start" })} sx={{ p: 0, minWidth: 0, color: COLORS.blue, fontSize: 8.2, fontWeight: 800, textTransform: "none" }}>View readiness</Button>} sx={{ gridColumn: { lg: "span 2" }, minHeight: 168 }}>
          <UnavailablePanel label="Recruitment pipeline source is not connected" />
        </DashboardCard>

        <DashboardCard title="Attendance Snapshot" subtitle="This Month" sx={{ gridColumn: { lg: "span 2" }, minHeight: 168 }} contentSx={{ px: 1.1, pb: 0.9 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ height: 118 }}>
            <Box sx={{ position: "relative", width: 112, height: 112, flex: "0 0 auto" }}>
              <PieChart
                hideLegend
                height={112}
                series={[{ data: [{ id: "unavailable", value: 1, label: "No source", color: COLORS.paleGray }], innerRadius: 35, outerRadius: 48 }]}
                margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
                sx={chartSx}
              />
              <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center", pointerEvents: "none" }}>
                <Box>
                  <Typography sx={{ color: COLORS.navy, fontSize: 16, fontWeight: 850 }}>—</Typography>
                  <Typography sx={{ color: "var(--hr-muted)", fontSize: 7.3, fontWeight: 650 }}>Attendance Rate</Typography>
                </Box>
              </Box>
            </Box>
            <Typography sx={{ color: "var(--hr-muted)", fontSize: 8.5, lineHeight: 1.45, fontWeight: 650 }}>Timesheet data has not been populated yet.</Typography>
          </Stack>
        </DashboardCard>

        <DashboardCard title="Diversity & Inclusion" action={<Button size="small" onClick={() => onOpenEmployees({ gender: "female" })} sx={{ p: 0, minWidth: 0, color: COLORS.blue, fontSize: 8.2, fontWeight: 800, textTransform: "none" }}>View details</Button>} sx={{ gridColumn: { lg: "span 3" }, minHeight: 168 }} contentSx={{ px: 1.45, pb: 0.8 }}>
          <Stack divider={<Divider flexItem sx={{ borderColor: "var(--hr-divider-soft)" }} />}>
            {[
              { icon: Diversity3OutlinedIcon, label: "Female Representation", value: `${(data.diversity?.femaleRepresentation ?? femaleShare).toFixed(1)}%`, detail: `${formatInteger(femaleCount)} classified employees`, color: COLORS.purple, bg: COLORS.purpleSoft },
              { icon: WorkspacePremiumOutlinedIcon, label: "Management · Female", value: data.diversity?.femaleManagement === null || data.diversity?.femaleManagement === undefined ? "—" : `${data.diversity.femaleManagement.toFixed(1)}%`, detail: "department roles not linked", color: COLORS.purple, bg: COLORS.purpleSoft },
              { icon: BusinessRoundedIcon, label: "Nationalities Represented", value: formatInteger(data.diversity?.nationalitiesRepresented ?? 0), detail: "from employee nationality records", color: COLORS.teal, bg: COLORS.tealSoft }
            ].map((item) => (
              <Stack key={item.label} direction="row" alignItems="center" spacing={1} sx={{ py: 0.72 }}>
                <Box sx={{ width: 32, height: 32, display: "grid", placeItems: "center", flex: "0 0 auto", borderRadius: "50%", bgcolor: item.bg, color: item.color }}><item.icon sx={{ fontSize: 18 }} /></Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography noWrap sx={{ color: "var(--hr-text)", fontSize: 8.7, fontWeight: 750 }}>{item.label}</Typography>
                  <Typography noWrap sx={{ mt: 0.2, color: "var(--hr-muted)", fontSize: 7.3, fontWeight: 600 }}>{item.detail}</Typography>
                </Box>
                <Typography sx={{ color: "var(--hr-text)", fontSize: 15, fontWeight: 850 }}>{item.value}</Typography>
              </Stack>
            ))}
          </Stack>
        </DashboardCard>
      </Box>
      <HRDashboardPlanningPanels data={data} onOpenEmployees={onOpenEmployees} />
    </>
  );
};

type HRDashboardPageProps = {
  loadDashboard?: typeof hrDashboardApi.get;
};

export default function HRDashboardPage({ loadDashboard = hrDashboardApi.get }: HRDashboardPageProps = {}) {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const savedViewStorageKey = useMemo(
    () => `${SAVED_VIEWS_STORAGE_KEY}:${encodeURIComponent(user?.email ?? user?.displayName ?? "anonymous")}`,
    [user?.displayName, user?.email]
  );
  const [draftFilters, setDraftFilters] = useState<HrDashboardFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<HrDashboardFilters>(emptyFilters);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [savedViews, setSavedViews] = useState<SavedDashboardView[]>([]);
  const [selectedSavedView, setSelectedSavedView] = useState("");

  useEffect(() => {
    setSavedViews(readSavedViews(savedViewStorageKey));
    setSelectedSavedView("");
  }, [savedViewStorageKey]);

  const dashboardQuery = useQuery({
    queryKey: ["hr", "hr-dashboard", appliedFilters],
    queryFn: () => loadDashboard(appliedFilters),
    placeholderData: (previousData) => previousData,
    staleTime: 60_000
  });

  const options = useMemo(() => dashboardQuery.data?.availableFilters ?? {
    statuses: [],
    workLocations: [],
    genders: [],
    contractTypes: [],
    departments: [],
    employeeTypes: [],
    jobs: [],
    nationalities: [],
    ageBands: [],
    contractRisks: [],
    seniorityMilestones: []
  }, [dashboardQuery.data]);

  const updateDraftFilter = (key: keyof HrDashboardFilters) => (value: string) => {
    setDraftFilters((current) => ({ ...current, [key]: value }));
    setSelectedSavedView("");
  };

  const handleReset = () => {
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setSelectedSavedView("");
  };

  const handleSaveView = () => {
    const activeFilterCount = Object.values(draftFilters).filter((value) => value !== "all").length;
    const nextView: SavedDashboardView = {
      id: `${Date.now()}`,
      name: `Saved view ${savedViews.length + 1} · ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"}`,
      filters: { ...draftFilters }
    };
    const nextViews = [...savedViews, nextView].slice(-8);
    setSavedViews(nextViews);
    setSelectedSavedView(nextView.id);
    setAppliedFilters(nextView.filters);
    writeSavedViews(savedViewStorageKey, nextViews);
  };

  const handleSelectSavedView = (viewId: string) => {
    setSelectedSavedView(viewId);
    const view = savedViews.find((candidate) => candidate.id === viewId);
    if (!view) return;
    const validValue = (value: string, available: HrDashboardFilterOption[]) =>
      value === "all" || available.some((option) => option.value === value) ? value : "all";
    const validatedFilters: HrDashboardFilters = {
      status: validValue(view.filters.status, options.statuses),
      department: validValue(view.filters.department, options.departments ?? []),
      workLocation: validValue(view.filters.workLocation, options.workLocations),
      gender: validValue(view.filters.gender, options.genders),
      contractType: validValue(view.filters.contractType, options.contractTypes),
      employeeType: validValue(view.filters.employeeType, options.employeeTypes ?? []),
      job: validValue(view.filters.job, options.jobs ?? []),
      nationality: validValue(view.filters.nationality, options.nationalities ?? []),
      ageBand: validValue(view.filters.ageBand, options.ageBands ?? []),
      contractRisk: validValue(view.filters.contractRisk, options.contractRisks ?? []),
      seniorityMilestone: validValue(view.filters.seniorityMilestone, options.seniorityMilestones ?? [])
    };
    setDraftFilters(validatedFilters);
    setAppliedFilters(validatedFilters);
    if ([validatedFilters.job, validatedFilters.nationality, validatedFilters.ageBand, validatedFilters.contractRisk, validatedFilters.seniorityMilestone].some((value) => value !== "all")) {
      setShowMoreFilters(true);
    }
  };

  const openEmployees = (query: Record<string, string>) => {
    const searchParams = new URLSearchParams(query);
    navigate(`/human-resources/employees/employees-list?${searchParams.toString()}`);
  };

  const handleExport = () => {
    if (!dashboardQuery.data || dashboardQuery.isFetching) return;
    exportToExcel(
      `hr-dashboard-${dashboardQuery.data.asOf}`,
      [
        { header: "Section", value: (row: DashboardExportRow) => row.section },
        { header: "Metric", value: (row: DashboardExportRow) => row.metric },
        { header: "Value", value: (row: DashboardExportRow) => row.value },
        { header: "Data status", value: (row: DashboardExportRow) => row.status }
      ],
      buildDashboardExportRows(dashboardQuery.data, appliedFilters)
    );
  };

  const actionableAlertCount = dashboardQuery.data
    ? (dashboardQuery.data.dataQuality?.issues.filter((issue) => issue.count > 0 && issue.severity !== "low").length ?? 0)
      + (dashboardQuery.data.contractRisk?.buckets.some((bucket) => bucket.value > 0) ? 1 : 0)
      + (dashboardQuery.data.moduleReadiness?.filter((module) => module.status !== "live").length ?? 0)
    : 0;
  const completeness = dashboardQuery.data?.dataQuality?.scorePercent;

  const displayName = user?.displayName ?? "HR User";
  const roleName = roles[0] ?? "HR Manager";

  return (
    <>
      <GlobalStyles styles={{
        "@media print": {
          "nav, aside": { display: "none !important" },
          main: { width: "100% !important", marginLeft: "0 !important", paddingTop: "0 !important" },
          ".hr-dashboard-print-root": { paddingBottom: "0 !important" },
          ".hr-dashboard-print-root .MuiCard-root": { breakInside: "avoid", boxShadow: "none !important" }
        }
      }} />
      <Box
      className="hr-dashboard-print-root"
      sx={(theme) => ({
        ...getHrThemeVars(theme),
        color: "var(--hr-text)",
        pb: 3
      })}
    >
      <HrPageHeader
        compact
        title="HR Dashboard"
        subtitle="Company-wide workforce analytics and employee insights."
        actions={(
          <Stack direction="row" alignItems="center" justifyContent={{ xs: "flex-start", lg: "flex-end" }} spacing={0.85} flexWrap="wrap" useFlexGap>
            <Stack direction="row" alignItems="center" spacing={0.65} sx={{ px: 1, height: 35, color: "var(--hr-text)" }}>
              <CalendarMonthOutlinedIcon sx={{ fontSize: 18 }} />
              <Typography sx={{ fontSize: 10, fontWeight: 750 }}>{dayjs().format("MMM D, YYYY")}</Typography>
            </Stack>
            <Tooltip title="Export CSV for Excel" arrow>
              <span><IconButton disabled={!dashboardQuery.data || dashboardQuery.isFetching} aria-label="Export dashboard CSV for Excel" onClick={handleExport} sx={{ width: 35, height: 35, color: "var(--hr-text)" }}><FileDownloadRoundedIcon sx={{ fontSize: 19 }} /></IconButton></span>
            </Tooltip>
            <Tooltip title="Print or save as PDF" arrow>
              <span><IconButton disabled={!dashboardQuery.data || dashboardQuery.isFetching} aria-label="Print or save dashboard as PDF" onClick={() => window.print()} sx={{ width: 35, height: 35, color: "var(--hr-text)" }}><PrintRoundedIcon sx={{ fontSize: 19 }} /></IconButton></span>
            </Tooltip>
            <Tooltip title="Notifications" arrow>
              <IconButton aria-label="Open HR action alerts" onClick={() => document.getElementById("hr-planning-readiness")?.scrollIntoView({ behavior: "smooth", block: "start" })} sx={{ width: 35, height: 35, color: "var(--hr-text)" }}>
                <Badge badgeContent={actionableAlertCount} color="error" sx={{ "& .MuiBadge-badge": { minWidth: 15, height: 15, px: 0, fontSize: 7.5 } }}><NotificationsNoneRoundedIcon sx={{ fontSize: 19 }} /></Badge>
              </IconButton>
            </Tooltip>
            <Tooltip title="Data sources and readiness" arrow><IconButton aria-label="Data sources and readiness" onClick={() => document.getElementById("hr-planning-readiness")?.scrollIntoView({ behavior: "smooth", block: "start" })} sx={{ width: 35, height: 35, color: "var(--hr-text)" }}><HelpOutlineRoundedIcon sx={{ fontSize: 20 }} /></IconButton></Tooltip>
            <Avatar sx={{ width: 34, height: 34, bgcolor: COLORS.navy, color: "#fff", fontSize: 10, fontWeight: 800 }}>{getInitials(displayName)}</Avatar>
            <Box sx={{ display: { xs: "none", xl: "block" }, minWidth: 0 }}>
              <Typography noWrap sx={{ color: "var(--hr-text)", fontSize: 9.2, fontWeight: 800 }}>{displayName}</Typography>
              <Typography noWrap sx={{ color: "var(--hr-muted)", fontSize: 7.8, fontWeight: 600 }}>{roleName}</Typography>
            </Box>
          </Stack>
        )}
      />

      <Box sx={{ mx: { md: -1.15 } }}>
        <Card sx={[surfaceSx, { p: 1.35, mb: 0.9 }]}>
          <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
            <Stack direction="row" alignItems="center" spacing={0.8}>
              <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: dashboardQuery.isError ? COLORS.red : COLORS.green }} />
              <Typography sx={{ color: "var(--hr-muted)", fontSize: 8.5, fontWeight: 650 }}>
                {dashboardQuery.data?.generatedAt ? `Last refreshed ${dayjs(dashboardQuery.data.generatedAt).format("MMM D, YYYY HH:mm")}` : "Loading live employee snapshot"}
                {typeof completeness === "number" ? ` · ${completeness.toFixed(1)}% data completeness` : ""}
              </Typography>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} spacing={0.75}>
              <FormControl size="small" sx={{ minWidth: 170 }}>
                <Select value={selectedSavedView} displayEmpty onChange={(event) => handleSelectSavedView(event.target.value)} inputProps={{ "aria-label": "Saved dashboard views" }} sx={{ height: 32, borderRadius: "8px", fontSize: 9.5 }}>
                  <MenuItem value="" sx={{ fontSize: 10 }}>Saved views · this browser</MenuItem>
                  {savedViews.map((view) => <MenuItem key={view.id} value={view.id} sx={{ fontSize: 10 }}>{view.name}</MenuItem>)}
                </Select>
              </FormControl>
              <Button variant="outlined" startIcon={<SaveRoundedIcon />} onClick={handleSaveView} sx={{ height: 32, px: 1.1, borderColor: "var(--hr-border)", borderRadius: "8px", fontSize: 9, fontWeight: 800, textTransform: "none" }}>Save view</Button>
              <Button variant={showMoreFilters ? "contained" : "outlined"} startIcon={<TuneRoundedIcon />} onClick={() => setShowMoreFilters((current) => !current)} sx={{ height: 32, px: 1.1, color: showMoreFilters ? "#fff" : COLORS.blue, bgcolor: showMoreFilters ? COLORS.blue : undefined, borderColor: "var(--hr-border)", borderRadius: "8px", fontSize: 9, fontWeight: 800, textTransform: "none", "&:hover": { bgcolor: showMoreFilters ? "#235ec9" : undefined } }}>More filters</Button>
            </Stack>
          </Stack>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                md: "repeat(3, minmax(0, 1fr))",
                lg: "repeat(6, minmax(110px, 1fr)) auto auto"
              },
              alignItems: "end",
              gap: 1
            }}
          >
            <FilterField label="Status" value={draftFilters.status} options={options.statuses} onChange={updateDraftFilter("status")} />
            <FilterField label="Department" value={draftFilters.department} options={options.departments ?? []} disabled={!dashboardQuery.data?.coverage.department} onChange={updateDraftFilter("department")} />
            <FilterField label="Work Location" value={draftFilters.workLocation} options={options.workLocations} onChange={updateDraftFilter("workLocation")} />
            <FilterField label="Gender" value={draftFilters.gender} options={options.genders} onChange={updateDraftFilter("gender")} />
            <FilterField label="Contract Type" value={draftFilters.contractType} options={options.contractTypes} onChange={updateDraftFilter("contractType")} />
            <FilterField label="Employee Type" value={draftFilters.employeeType} options={options.employeeTypes ?? []} disabled={!dashboardQuery.data?.coverage.employeeType} onChange={updateDraftFilter("employeeType")} />
            <Button
              variant="outlined"
              startIcon={<RefreshRoundedIcon />}
              onClick={handleReset}
              sx={{ height: 36, minWidth: 82, px: 1.3, color: COLORS.blue, borderColor: "var(--hr-border)", borderRadius: "8px", fontSize: 10, fontWeight: 800, textTransform: "none" }}
            >
              Reset
            </Button>
            <Button
              variant="contained"
              startIcon={<FilterAltOutlinedIcon />}
              onClick={() => setAppliedFilters(draftFilters)}
              disabled={dashboardQuery.isFetching}
              sx={{ height: 36, minWidth: 116, px: 1.4, bgcolor: COLORS.navy, color: "#fff", borderRadius: "8px", boxShadow: "0 5px 12px rgba(16, 38, 91, 0.16)", fontSize: 10, fontWeight: 800, textTransform: "none", "&:hover": { bgcolor: "#081b49" } }}
            >
              Apply Filters
            </Button>
          </Box>
          <Collapse in={showMoreFilters} unmountOnExit>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))", lg: "repeat(5, minmax(0, 1fr))" }, gap: 1, pt: 1.15, mt: 1.15, borderTop: "1px solid var(--hr-divider-soft)" }}>
              <SearchableFilterField label="Job" value={draftFilters.job} options={options.jobs ?? []} onChange={updateDraftFilter("job")} />
              <SearchableFilterField label="Nationality" value={draftFilters.nationality} options={options.nationalities ?? []} onChange={updateDraftFilter("nationality")} />
              <FilterField label="Age Band" value={draftFilters.ageBand} options={options.ageBands ?? []} onChange={updateDraftFilter("ageBand")} />
              <FilterField label="Contract Risk" value={draftFilters.contractRisk} options={options.contractRisks ?? []} disabled={(options.contractRisks?.length ?? 0) === 0} onChange={updateDraftFilter("contractRisk")} />
              <FilterField label="Seniority Milestone" value={draftFilters.seniorityMilestone} options={options.seniorityMilestones ?? []} disabled={(options.seniorityMilestones?.length ?? 0) === 0} onChange={updateDraftFilter("seniorityMilestone")} />
            </Box>
          </Collapse>
        </Card>

        {dashboardQuery.isLoading ? (
          <Card sx={[surfaceSx, { minHeight: 420, display: "grid", placeItems: "center" }]}>
            <Stack alignItems="center" spacing={1.2}>
              <CircularProgress size={30} thickness={4} />
              <Typography sx={{ color: "var(--hr-muted)", fontSize: 11, fontWeight: 650 }}>Loading workforce analytics…</Typography>
            </Stack>
          </Card>
        ) : dashboardQuery.isError || !dashboardQuery.data ? (
          <Card sx={[surfaceSx, { minHeight: 320, display: "grid", placeItems: "center", p: 3 }]}>
            <Stack alignItems="center" spacing={1} textAlign="center">
              <ReportProblemOutlinedIcon sx={{ color: COLORS.red, fontSize: 30 }} />
              <Typography sx={{ color: "var(--hr-text)", fontSize: 14, fontWeight: 800 }}>Dashboard data could not be loaded</Typography>
              <Typography sx={{ color: "var(--hr-muted)", fontSize: 10.5 }}>{dashboardQuery.error instanceof Error ? dashboardQuery.error.message : "Please try again."}</Typography>
              <Button variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={() => void dashboardQuery.refetch()} sx={{ mt: 0.5, textTransform: "none" }}>Try again</Button>
            </Stack>
          </Card>
        ) : (
          <Box aria-busy={dashboardQuery.isFetching} inert={dashboardQuery.isFetching} sx={{ position: "relative" }}>
            {dashboardQuery.isFetching ? <Box sx={{ position: "absolute", inset: 0, zIndex: 5, display: "grid", placeItems: "start center", pt: 4, bgcolor: "rgba(255,255,255,0.72)", pointerEvents: "auto", cursor: "progress" }}><Stack direction="row" alignItems="center" spacing={0.8} sx={{ px: 1.2, py: 0.7, border: "1px solid var(--hr-border)", borderRadius: "8px", bgcolor: "var(--hr-surface)", boxShadow: "var(--hr-shadow)" }}><CircularProgress size={14} /><Typography sx={{ color: "var(--hr-row-text)", fontSize: 9, fontWeight: 750 }}>Updating filtered analytics…</Typography></Stack></Box> : null}
            <CoverageData data={dashboardQuery.data} onOpenEmployees={openEmployees} />
          </Box>
        )}
      </Box>
      </Box>
    </>
  );
}
