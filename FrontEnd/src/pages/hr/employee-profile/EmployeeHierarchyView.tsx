import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import FormatListBulletedRoundedIcon from "@mui/icons-material/FormatListBulletedRounded";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ZoomInRoundedIcon from "@mui/icons-material/ZoomInRounded";
import ZoomOutRoundedIcon from "@mui/icons-material/ZoomOutRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { HrPageHeader } from "../jobs/PageHeader";
import { getHrThemeVars } from "../jobs/Theme";

export type EmployeeHierarchyRow = {
  departmentId: number;
  parentDepartmentId: number | null;
  departmentNameEnglish: string | null;
  departmentNameArabic: string | null;
  departmentType: string | null;
  childDepartmentCount: number;
  directEmployeeCount: number;
  leaderStatus: "resolved" | "unassigned" | "ambiguous" | "unsupported-type";
  expectedLineLevel: string | null;
  employeeId: number | null;
  employeeNumber: string | null;
  displayName: string | null;
  nameArabic: string | null;
  titleEnglish: string | null;
  titleArabic: string | null;
  lineLevelEnglish: string | null;
  profileImageUrl: string | null;
};

export type EmployeeHierarchyNode = {
  row: EmployeeHierarchyRow;
  children: EmployeeHierarchyNode[];
};

type EmployeeHierarchyViewProps = {
  nodes: EmployeeHierarchyNode[];
  loading?: boolean;
  error?: string | null;
  orphanCount?: number;
  onRetry?: () => void;
  onShowList: () => void;
  onOpenProfile: (employee: EmployeeHierarchyRow) => void;
};

type HierarchyCardVariant = "boss" | "committee" | "manager";

type CanvasDragState = {
  pointerId: number;
  startX: number;
  startY: number;
  scrollLeft: number;
  scrollTop: number;
};

const navy = "var(--hr-text)";
const blue = "var(--hr-accent)";
const muted = "var(--hr-muted)";
const border = "var(--hr-border)";
const connector = "var(--hr-connector)";

const CANVAS_WIDTH = 1300;
const CANVAS_HEIGHT = 650;
const ROOT_LEFT = 487;
const ROOT_TOP = 14;
const ROOT_WIDTH = 326;
const ROOT_HEIGHT = 96;
const MEMBER_TOP = 150;
const MEMBER_WIDTH = 272;
const MEMBER_HEIGHT = 76;
const MANAGER_TOP = 252;
const MANAGER_WIDTH = 230;
const MANAGER_HEIGHT = 64;
const MANAGER_GAP = 71;
const MEMBER_LEFT = [36, 356, 676, 996];

const typeLabels: Record<string, string> = {
  "Top management": "Boss",
  Member: "Committee Member",
  Manager: "Manager",
  Division: "Supervisor",
  Coordinator: "Coordinator",
  Section: "Unit Manager",
  Unit: "Employee"
};

const controlButtonSx = {
  height: 48,
  px: 2.25,
  borderRadius: "8px",
  bgcolor: "var(--hr-surface)",
  textTransform: "none",
  fontSize: 14,
  fontWeight: 650,
  whiteSpace: "nowrap",
  "&:hover": {
    bgcolor: "var(--hr-surface-hover)"
  }
};

const countLinkedLeaders = (nodes: EmployeeHierarchyNode[]): number =>
  nodes.reduce(
    (total, node) => total + (node.row.employeeId ? 1 : 0) + countLinkedLeaders(node.children),
    0
  );

const hasLinkedLeader = (node: EmployeeHierarchyNode): boolean =>
  Boolean(node.row.employeeId) || node.children.some(hasLinkedLeader);

const matchesSearch = (row: EmployeeHierarchyRow, query: string) => {
  const value = [
    row.displayName,
    row.nameArabic,
    row.titleEnglish,
    row.titleArabic,
    row.lineLevelEnglish,
    row.departmentNameEnglish,
    row.departmentNameArabic,
    row.employeeNumber,
    row.departmentType,
    row.departmentId
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return value.includes(query.trim().toLowerCase());
};

const HierarchyPersonCard = ({
  employee,
  variant,
  left,
  top,
  onOpen
}: {
  employee: EmployeeHierarchyRow;
  variant: HierarchyCardVariant;
  left: number;
  top: number;
  onOpen: (employee: EmployeeHierarchyRow) => void;
}) => {
  const isBoss = variant === "boss";
  const isCommittee = variant === "committee";
  const width = isBoss ? ROOT_WIDTH : isCommittee ? MEMBER_WIDTH : MANAGER_WIDTH;
  const height = isBoss ? ROOT_HEIGHT : isCommittee ? MEMBER_HEIGHT : MANAGER_HEIGHT;
  const typeLabel = employee.expectedLineLevel
    ?? typeLabels[employee.departmentType ?? ""]
    ?? employee.departmentType
    ?? "Organizational leader";
  const canOpenProfile = employee.employeeId !== null;
  const primaryName = employee.displayName
    || employee.departmentNameEnglish
    || employee.departmentNameArabic
    || `Department ${employee.departmentId}`;
  const secondaryTitle = employee.titleEnglish
    || employee.titleArabic
    || employee.lineLevelEnglish
    || (canOpenProfile ? employee.departmentNameEnglish : "Leader not linked");
  const recordLabel = employee.employeeNumber
    ? `Employee ${employee.employeeNumber}`
    : `Department ID ${employee.departmentId}`;

  return (
    <Paper
      elevation={0}
      role={canOpenProfile ? "button" : undefined}
      tabIndex={canOpenProfile ? 0 : -1}
      title={canOpenProfile ? "Double-click to view employee profile" : "No leader is linked to this organizational unit"}
      onDoubleClick={canOpenProfile ? () => onOpen(employee) : undefined}
      onKeyDown={(event) => {
        if (canOpenProfile && event.key === "Enter") onOpen(employee);
      }}
      sx={{
        position: "absolute",
        zIndex: 2,
        left,
        top,
        width,
        height,
        display: "flex",
        alignItems: "center",
        borderRadius: isBoss ? "13px" : "11px",
        border: "1px solid",
        borderColor: isBoss ? "#f1a62d" : isCommittee ? "#4947c9" : "#b9cbef",
        color: isCommittee ? "#ffffff" : navy,
        bgcolor: "var(--hr-surface)",
        background: isBoss
          ? "linear-gradient(135deg, #ffd27a 0%, #ffb83f 100%)"
          : isCommittee
            ? "linear-gradient(135deg, #6965dd 0%, #403dcc 100%)"
            : "var(--hr-surface)",
        boxShadow: isBoss
          ? "0 10px 22px rgba(224, 148, 31, 0.18)"
          : isCommittee
            ? "0 8px 18px rgba(57, 54, 183, 0.18)"
            : "0 5px 13px rgba(43, 73, 130, 0.10)",
        cursor: canOpenProfile ? "pointer" : "default",
        overflow: "hidden",
        transition: "transform 150ms ease, box-shadow 150ms ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: isBoss
            ? "0 13px 27px rgba(224, 148, 31, 0.24)"
            : isCommittee
              ? "0 11px 23px rgba(57, 54, 183, 0.24)"
              : "0 8px 18px rgba(43, 73, 130, 0.16)"
        },
        "&:focus-visible": { outline: `3px solid rgba(13, 67, 220, 0.24)`, outlineOffset: 2 }
      }}
    >
      {isBoss || isCommittee ? (
        <Box
          sx={{
            width: isBoss ? 64 : 46,
            height: isBoss ? 64 : 46,
            ml: isBoss ? 2.2 : 1.25,
            mr: isBoss ? 1.8 : 1.2,
            display: "grid",
            placeItems: "center",
            flex: "0 0 auto",
            borderRadius: "50%",
            color: isBoss ? "#f6ad2d" : "#6c68dc",
            bgcolor: "#ffffff",
            boxShadow: "0 3px 9px rgba(37, 55, 96, 0.12)"
          }}
        >
          <PersonRoundedIcon sx={{ fontSize: isBoss ? 42 : 33 }} />
        </Box>
      ) : (
        <Box
          sx={{
            width: 44,
            height: "100%",
            display: "grid",
            placeItems: "center",
            flex: "0 0 auto",
            color: "#ffffff",
            background: "linear-gradient(145deg, #3986ef 0%, #115bd0 100%)"
          }}
        >
          <Box sx={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: "rgba(255,255,255,0.96)", color: "#4e8ce2" }}>
            <PersonRoundedIcon sx={{ fontSize: 21 }} />
          </Box>
        </Box>
      )}

      <Box
        sx={{
          minWidth: 0,
          flex: 1,
          pl: variant === "manager" ? 1.15 : 0,
          pr: isBoss ? 3.8 : 3.2,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start"
        }}
      >
        <Typography
          noWrap
          sx={{
            display: "inline-block",
            maxWidth: "100%",
            px: 0.8,
            py: 0.2,
            borderRadius: "8px",
            color: isBoss ? "#765218" : isCommittee ? "#ffffff" : blue,
            bgcolor: isBoss ? "rgba(255,255,255,0.38)" : isCommittee ? "rgba(255,255,255,0.16)" : "transparent",
            fontSize: isBoss ? 9.5 : 8.3,
            lineHeight: 1.2,
            fontWeight: 800
          }}
        >
          {typeLabel} · {recordLabel}
        </Typography>
        <Typography noWrap sx={{ mt: 0.35, color: "inherit", fontSize: isBoss ? 18 : isCommittee ? 13.5 : 12, lineHeight: 1.15, fontWeight: 850 }}>
          {primaryName}
        </Typography>
        <Typography
          noWrap
          dir="rtl"
          sx={{ mt: 0.28, color: isCommittee ? "rgba(255,255,255,0.9)" : isBoss ? "#7a5419" : muted, fontSize: isBoss ? 11.5 : isCommittee ? 9.2 : 8.8, lineHeight: 1.2, fontWeight: 650, textAlign: "left" }}
        >
          {secondaryTitle}
        </Typography>
      </Box>

      <Tooltip title={canOpenProfile ? "View employee profile" : "Leader not linked"}>
        <IconButton
          disabled={!canOpenProfile}
          aria-label={canOpenProfile ? `Open ${primaryName} profile` : "Leader not linked"}
          onClick={(event) => {
            event.stopPropagation();
            if (canOpenProfile) onOpen(employee);
          }}
          sx={{
            position: "absolute",
            top: isBoss ? 10 : 8,
            right: 9,
            width: 25,
            height: 22,
            borderRadius: "7px",
            color: isCommittee ? "#ffffff" : blue,
            bgcolor: isCommittee ? "rgba(255,255,255,0.15)" : isBoss ? "rgba(255,255,255,0.36)" : "transparent",
            opacity: canOpenProfile ? 1 : 0.55,
            "&:hover": { bgcolor: isCommittee ? "rgba(255,255,255,0.24)" : "rgba(13,67,220,0.08)" }
          }}
        >
          <MoreHorizRoundedIcon sx={{ fontSize: 17 }} />
        </IconButton>
      </Tooltip>
    </Paper>
  );
};

const OverviewDiagram = ({
  root,
  zoom,
  query,
  onOpen
}: {
  root: EmployeeHierarchyNode;
  zoom: number;
  query: string;
  onOpen: (employee: EmployeeHierarchyRow) => void;
}) => {
  const committees = root.children.slice(0, 4);
  const visibleManagerCounts = committees.map(
    (committee) => committee.children.filter((manager) => !query || matchesSearch(manager.row, query)).length
  );
  const canvasHeight = Math.max(
    CANVAS_HEIGHT,
    MANAGER_TOP + Math.max(1, ...visibleManagerCounts) * MANAGER_GAP + 32
  );

  return (
    <Box sx={{ width: CANVAS_WIDTH * zoom, height: canvasHeight * zoom, position: "relative" }}>
      <Box sx={{ position: "absolute", inset: 0, width: CANVAS_WIDTH, height: canvasHeight, transform: `scale(${zoom})`, transformOrigin: "top left" }}>
        <Box component="svg" viewBox={`0 0 ${CANVAS_WIDTH} ${canvasHeight}`} sx={{ position: "absolute", inset: 0, width: CANVAS_WIDTH, height: canvasHeight, overflow: "visible", pointerEvents: "none" }}>
          <path d="M650 110 V128 M172 128 H1132" fill="none" stroke={connector} strokeWidth="1.35" />
          {committees.map((committee, committeeIndex) => {
            const memberLeft = MEMBER_LEFT[committeeIndex];
            const memberCenter = memberLeft + MEMBER_WIDTH / 2;
            const managerLeft = memberLeft + 32;
            const railX = memberLeft + 13;
            const visibleManagers = committee.children.filter((manager) => !query || matchesSearch(manager.row, query));
            const lastManagerCenter = MANAGER_TOP + Math.max(0, visibleManagers.length - 1) * MANAGER_GAP + MANAGER_HEIGHT / 2;

            return (
              <g key={committee.row.departmentId}>
                <path d={`M${memberCenter} 128 V${MEMBER_TOP}`} fill="none" stroke={connector} strokeWidth="1.35" />
                {visibleManagers.length > 0 ? (
                  <>
                    <path d={`M${memberCenter} ${MEMBER_TOP + MEMBER_HEIGHT} V238 H${railX} V${lastManagerCenter}`} fill="none" stroke={connector} strokeWidth="1.2" />
                    {visibleManagers.map((manager, managerIndex) => {
                      const managerCenter = MANAGER_TOP + managerIndex * MANAGER_GAP + MANAGER_HEIGHT / 2;
                      return <path key={manager.row.departmentId} d={`M${railX} ${managerCenter} H${managerLeft}`} fill="none" stroke={connector} strokeWidth="1.2" />;
                    })}
                  </>
                ) : null}
              </g>
            );
          })}
        </Box>

        <HierarchyPersonCard employee={root.row} variant="boss" left={ROOT_LEFT} top={ROOT_TOP} onOpen={onOpen} />

        {committees.map((committee, committeeIndex) => {
          const memberLeft = MEMBER_LEFT[committeeIndex];
          const visibleManagers = committee.children.filter((manager) => !query || matchesSearch(manager.row, query));

          return (
            <Box key={committee.row.departmentId}>
              <HierarchyPersonCard employee={committee.row} variant="committee" left={memberLeft} top={MEMBER_TOP} onOpen={onOpen} />
              {visibleManagers.map((manager, managerIndex) => (
                <HierarchyPersonCard
                  key={manager.row.departmentId}
                  employee={manager.row}
                  variant="manager"
                  left={memberLeft + 32}
                  top={MANAGER_TOP + managerIndex * MANAGER_GAP}
                  onOpen={onOpen}
                />
              ))}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

const DetailDiagram = ({ node, zoom, onOpen }: { node: EmployeeHierarchyNode; zoom: number; onOpen: (employee: EmployeeHierarchyRow) => void }) => {
  const supervisor = node.children[0];
  const coordinator = supervisor?.children[0];
  const unitManager = coordinator?.children[0];
  const chain = [node, supervisor, coordinator, unitManager].filter(Boolean) as EmployeeHierarchyNode[];
  const employees = unitManager?.children ?? [];

  const detailWidth = 760;
  const detailHeight = 590;
  const left = 265;

  return (
    <Box sx={{ width: detailWidth * zoom, height: detailHeight * zoom, position: "relative", mx: "auto" }}>
      <Box sx={{ position: "absolute", inset: 0, width: detailWidth, height: detailHeight, transform: `scale(${zoom})`, transformOrigin: "top left" }}>
        <Box component="svg" viewBox={`0 0 ${detailWidth} ${detailHeight}`} sx={{ position: "absolute", inset: 0, width: detailWidth, height: detailHeight, pointerEvents: "none" }}>
          {chain.slice(0, -1).map((item, index) => {
            const y = 24 + index * 102;
            return <path key={item.row.departmentId} d={`M380 ${y + MANAGER_HEIGHT} V${y + 102}`} fill="none" stroke={connector} strokeWidth="1.4" />;
          })}
          {employees.length > 0 ? (
            <path d={`M380 ${24 + (chain.length - 1) * 102 + MANAGER_HEIGHT} V430 M255 430 H505 M255 430 V450 M505 430 V450`} fill="none" stroke={connector} strokeWidth="1.4" />
          ) : null}
        </Box>
        {chain.map((item, index) => (
          <HierarchyPersonCard key={item.row.departmentId} employee={item.row} variant="manager" left={left} top={24 + index * 102} onOpen={onOpen} />
        ))}
        {employees.slice(0, 2).map((employee, index) => (
          <HierarchyPersonCard key={employee.row.departmentId} employee={employee.row} variant="manager" left={index === 0 ? 140 : 390} top={450} onOpen={onOpen} />
        ))}
      </Box>
    </Box>
  );
};

export function EmployeeHierarchyView({
  nodes,
  loading = false,
  error = null,
  orphanCount = 0,
  onRetry,
  onShowList,
  onOpenProfile
}: EmployeeHierarchyViewProps) {
  const [activePageId, setActivePageId] = useState<string>("overview");
  const [zoom, setZoom] = useState(1);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filterActive, setFilterActive] = useState(false);
  const [railExpanded, setRailExpanded] = useState(true);
  const [isPanning, setIsPanning] = useState(false);
  const canvasDragRef = useRef<CanvasDragState | null>(null);

  const startCanvasPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    const target = event.target as HTMLElement;
    if (target.closest("button, input, [role='button']")) return;

    const canvas = event.currentTarget;
    canvasDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: canvas.scrollLeft,
      scrollTop: canvas.scrollTop
    };
    canvas.setPointerCapture(event.pointerId);
    setIsPanning(true);
    event.preventDefault();
  };

  const moveCanvasPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = canvasDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.currentTarget.scrollLeft = drag.scrollLeft - (event.clientX - drag.startX);
    event.currentTarget.scrollTop = drag.scrollTop - (event.clientY - drag.startY);
    event.preventDefault();
  };

  const stopCanvasPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = canvasDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    canvasDragRef.current = null;
    setIsPanning(false);
  };

  const root = nodes[0];
  const managers = useMemo(() => root?.children.flatMap((committee) => committee.children) ?? [], [root]);
  const sidebarManagers = managers;
  const overviewEmployeeCount = root ? countLinkedLeaders([root]) : 0;
  const activeManager = managers.find((manager) => `manager-${manager.row.departmentId}` === activePageId);
  const visibleRoot = useMemo<EmployeeHierarchyNode | undefined>(() => {
    if (!root || !filterActive) return root;
    return { ...root, children: root.children.filter(hasLinkedLeader) };
  }, [filterActive, root]);

  return (
    <Box sx={(theme) => ({ ...getHrThemeVars(theme), color: navy })}>
      <HrPageHeader
        title="Employee Hierarchy"
        subtitle="Explore reporting lines from committee leadership to employees."
        actions={
          <Stack direction="row" alignItems="center" justifyContent={{ xs: "flex-start", lg: "flex-end" }} flexWrap="wrap" useFlexGap gap={1.1}>
          <Button
            variant="outlined"
            startIcon={<FilterAltOutlinedIcon />}
            onClick={() => setFilterActive((current) => !current)}
            sx={{
              ...controlButtonSx,
              borderColor: filterActive ? blue : undefined,
              color: filterActive ? blue : undefined,
              bgcolor: filterActive ? "var(--hr-selected)" : "var(--hr-surface)"
            }}
          >
            Filters
          </Button>
          {searchOpen ? (
            <TextField
              autoFocus
              size="small"
              placeholder="Search employees"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onBlur={() => { if (!query) setSearchOpen(false); }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ color: muted, fontSize: 19 }} /></InputAdornment> }}
              sx={{ width: 210, "& .MuiOutlinedInput-root": { height: 48, borderRadius: "8px", fontSize: 14, bgcolor: "var(--hr-surface)" } }}
            />
          ) : (
            <Button variant="outlined" startIcon={<SearchRoundedIcon />} onClick={() => setSearchOpen(true)} sx={controlButtonSx}>Search</Button>
          )}

          <Paper elevation={0} sx={{ height: 48, display: "flex", alignItems: "center", px: 0.6, border: `1px solid ${border}`, borderRadius: "8px", bgcolor: "var(--hr-surface)" }}>
            <IconButton aria-label="Zoom out" onClick={() => setZoom((current) => Math.max(0.7, Number((current - 0.1).toFixed(1))))} sx={{ width: 32, height: 32, color: navy, bgcolor: "var(--hr-surface-hover)" }}><ZoomOutRoundedIcon sx={{ fontSize: 18 }} /></IconButton>
            <Button onClick={() => setZoom(1)} sx={{ minWidth: 68, color: navy, fontSize: 11.5, fontWeight: 800 }}>{Math.round(zoom * 100)}%</Button>
            <IconButton aria-label="Zoom in" onClick={() => setZoom((current) => Math.min(1.3, Number((current + 0.1).toFixed(1))))} sx={{ width: 32, height: 32, color: navy, bgcolor: "var(--hr-surface-hover)" }}><ZoomInRoundedIcon sx={{ fontSize: 18 }} /></IconButton>
          </Paper>

          <Button
            variant="contained"
            startIcon={<FormatListBulletedRoundedIcon />}
            onClick={onShowList}
            sx={{
              ...controlButtonSx,
              color: "var(--hr-on-accent)",
              bgcolor: "var(--hr-primary-button)",
              boxShadow: "0 2px 6px rgba(11, 31, 58, 0.2)",
              "&:hover": { bgcolor: "var(--hr-primary-button-hover)", boxShadow: "0 3px 8px rgba(11, 31, 58, 0.25)" }
            }}
          >
            List View
          </Button>
          </Stack>
        }
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: `${railExpanded ? 264 : 76}px minmax(0, 1fr)` },
          gap: 1.6,
          height: { xs: "auto", lg: "calc(100vh - 112px)" },
          minHeight: { lg: 733 },
          transition: "grid-template-columns 280ms cubic-bezier(0.4, 0, 0.2, 1)"
        }}
      >
        <Paper elevation={0} sx={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: { xs: 530, lg: 0 }, border: `1px solid ${border}`, borderRadius: "13px", bgcolor: "var(--hr-surface)", boxShadow: "var(--hr-shadow)", overflow: "hidden", transition: "width 280ms cubic-bezier(0.4, 0, 0.2, 1)" }}>
          <Stack direction="row" alignItems="center" spacing={railExpanded ? 1.1 : 0} sx={{ position: "relative", minHeight: 76, pl: railExpanded ? 2.1 : 1, pr: railExpanded ? 6 : 1, py: 1.3, transition: "padding 280ms cubic-bezier(0.4, 0, 0.2, 1)" }}>
            {railExpanded ? <AccountTreeRoundedIcon sx={{ color: blue, fontSize: 32, flex: "0 0 auto" }} /> : null}
            <Box sx={{ minWidth: 0, flex: railExpanded ? 1 : 0, maxWidth: railExpanded ? 136 : 0, opacity: railExpanded ? 1 : 0, overflow: "hidden", whiteSpace: "nowrap", transition: "max-width 220ms ease, opacity 160ms ease" }}>
              <Typography sx={{ color: navy, fontSize: 12, fontWeight: 850, letterSpacing: "0.02em" }}>HIERARCHY VIEWS</Typography>
              <Typography sx={{ color: muted, fontSize: 10.5, mt: 0.3 }}>Select a view to explore</Typography>
            </Box>
            <Tooltip title={railExpanded ? "Collapse hierarchy views" : "Expand hierarchy views"} placement="right">
              <IconButton
                aria-label={railExpanded ? "Collapse hierarchy views" : "Expand hierarchy views"}
                onClick={() => setRailExpanded((current) => !current)}
                sx={{
                  position: "absolute",
                  top: 21,
                  right: railExpanded ? 10 : "50%",
                  width: 34,
                  height: 34,
                  flex: "0 0 auto",
                  color: blue,
                  border: `1px solid ${border}`,
                  borderRadius: "9px",
                  bgcolor: "var(--hr-surface-soft)",
                  transform: railExpanded ? "none" : "translateX(50%)",
                  transition: "transform 180ms ease, background-color 180ms ease",
                  "&:hover": {
                    bgcolor: "var(--hr-selected)",
                    transform: railExpanded ? "scale(1.04)" : "translateX(50%) scale(1.04)"
                  }
                }}
              >
                {railExpanded ? <ChevronLeftRoundedIcon /> : <ChevronRightRoundedIcon />}
              </IconButton>
            </Tooltip>
          </Stack>

          <Box sx={{ px: railExpanded ? 1.3 : 0.8, pb: 0.65, transition: "padding 280ms cubic-bezier(0.4, 0, 0.2, 1)" }}>
            <Button
              fullWidth
              aria-label="Employee Overview"
              onClick={() => setActivePageId("overview")}
              sx={{
                minHeight: 68,
                px: railExpanded ? 1.2 : 0.5,
                justifyContent: railExpanded ? "flex-start" : "center",
                border: "1px solid",
                borderColor: activePageId === "overview" ? "var(--hr-accent-border)" : "transparent",
                borderRadius: "10px",
                color: navy,
                bgcolor: activePageId === "overview" ? "var(--hr-selected)" : "transparent",
                textTransform: "none"
              }}
            >
              <Box sx={{ width: 38, height: 38, display: "grid", placeItems: "center", flex: "0 0 auto", borderRadius: "10px", color: "#ffffff", background: "linear-gradient(145deg, #3479ed, #1149d5)", boxShadow: "0 5px 12px rgba(25, 78, 214, 0.22)" }}><AccountTreeRoundedIcon sx={{ fontSize: 22 }} /></Box>
              <Box sx={{ minWidth: 0, ml: railExpanded ? 1.35 : 0, textAlign: "left", flex: railExpanded ? 1 : 0, maxWidth: railExpanded ? 150 : 0, opacity: railExpanded ? 1 : 0, overflow: "hidden", whiteSpace: "nowrap", transition: "max-width 220ms ease, margin 220ms ease, opacity 150ms ease" }}>
                <Typography noWrap sx={{ color: blue, fontSize: 12.5, fontWeight: 850 }}>Employee Overview</Typography>
                <Typography sx={{ color: muted, fontSize: 10.5, mt: 0.25 }}>{overviewEmployeeCount} linked leaders</Typography>
              </Box>
              {railExpanded ? <Box sx={{ width: 11, height: 11, borderRadius: "50%", bgcolor: activePageId === "overview" ? blue : "transparent" }} /> : null}
            </Button>
          </Box>

          <Box sx={{ flex: 1, overflowY: "auto" }}>
            {sidebarManagers.map((manager, index) => {
              const pageId = `manager-${manager.row.departmentId}`;
              const selected = activePageId === pageId;
              return (
                <Button key={manager.row.departmentId} fullWidth aria-label={manager.row.departmentNameEnglish || `Manager ${index + 1}`} onClick={() => setActivePageId(pageId)} sx={{ minHeight: 68, px: railExpanded ? 2.2 : 0, justifyContent: railExpanded ? "flex-start" : "center", borderTop: "1px solid var(--hr-divider-soft)", borderRadius: 0, color: navy, bgcolor: selected ? "var(--hr-selected)" : "var(--hr-surface)", textTransform: "none", transition: "padding 280ms ease, background-color 160ms ease", "&:hover": { bgcolor: "var(--hr-surface-hover)" } }}>
                  <Box sx={{ width: 34, height: 34, display: "grid", placeItems: "center", flex: "0 0 auto", borderRadius: "50%", color: blue, bgcolor: "var(--hr-surface-soft)", fontSize: 11.5, fontWeight: 850 }}>{index + 1}</Box>
                  <Box sx={{ minWidth: 0, ml: railExpanded ? 1.5 : 0, textAlign: "left", maxWidth: railExpanded ? 158 : 0, opacity: railExpanded ? 1 : 0, overflow: "hidden", whiteSpace: "nowrap", transition: "max-width 220ms ease, margin 220ms ease, opacity 150ms ease" }}>
                    <Typography noWrap sx={{ color: selected ? blue : navy, fontSize: 11.5, fontWeight: 800 }}>{manager.row.departmentNameEnglish}</Typography>
                    <Typography sx={{ color: muted, fontSize: 10, mt: 0.3 }}>{countLinkedLeaders([manager])} linked leaders</Typography>
                  </Box>
                </Button>
              );
            })}
          </Box>

          <Box sx={{ m: railExpanded ? 1.35 : 0, p: railExpanded ? 1.7 : 0, maxHeight: railExpanded ? 140 : 0, opacity: railExpanded ? 1 : 0, border: railExpanded ? "1px solid var(--hr-accent-border)" : "0 solid transparent", borderRadius: "10px", bgcolor: "var(--hr-surface-soft)", overflow: "hidden", transition: "max-height 220ms ease, opacity 150ms ease, margin 220ms ease, padding 220ms ease" }}>
            <Stack direction="row" alignItems="flex-start" spacing={1.2}>
              <LightbulbOutlinedIcon sx={{ color: blue, fontSize: 25, mt: 0.15 }} />
              <Typography sx={{ color: muted, fontSize: 10.5, lineHeight: 1.75 }}>Double-click any card to view the employee profile and additional details.</Typography>
            </Stack>
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ minWidth: 0, display: "flex", flexDirection: "column", border: `1px solid ${border}`, borderRadius: "13px", bgcolor: "var(--hr-surface)", boxShadow: "var(--hr-shadow)", overflow: "hidden" }}>
          <Box
            role="region"
            aria-label="Draggable employee hierarchy canvas"
            onPointerDown={startCanvasPan}
            onPointerMove={moveCanvasPan}
            onPointerUp={stopCanvasPan}
            onPointerCancel={stopCanvasPan}
            onLostPointerCapture={() => {
              canvasDragRef.current = null;
              setIsPanning(false);
            }}
            sx={{
              flex: 1,
              minHeight: 620,
              overflow: "auto",
              cursor: isPanning ? "grabbing" : "grab",
              touchAction: "none",
              userSelect: isPanning ? "none" : "auto",
              bgcolor: "var(--hr-surface)",
              backgroundImage: "radial-gradient(circle, var(--hr-canvas-dot) 0.85px, transparent 0.9px)",
              backgroundSize: "17px 17px"
            }}
          >
            {loading ? (
              <Stack alignItems="center" justifyContent="center" spacing={1.6} sx={{ minHeight: 620, color: muted }}>
                <CircularProgress size={34} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 750 }}>
                  Loading the official organization hierarchy…
                </Typography>
              </Stack>
            ) : error ? (
              <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ minHeight: 620, px: 3 }}>
                <Alert severity="error" sx={{ width: "min(100%, 520px)" }}>{error}</Alert>
                {onRetry ? <Button variant="outlined" onClick={onRetry}>Try again</Button> : null}
              </Stack>
            ) : activeManager ? (
              <DetailDiagram node={activeManager} zoom={zoom} onOpen={onOpenProfile} />
            ) : visibleRoot ? (
              <OverviewDiagram root={visibleRoot} zoom={zoom} query={query} onOpen={onOpenProfile} />
            ) : (
              <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ minHeight: 620, color: muted }}>
                <Typography sx={{ color: navy, fontSize: 14, fontWeight: 850 }}>
                  No hierarchy records available
                </Typography>
                <Typography sx={{ fontSize: 11.5 }}>
                  The organization endpoint returned no root departments.
                </Typography>
              </Stack>
            )}
          </Box>
          {orphanCount > 0 ? (
            <Alert severity="warning" sx={{ m: 1.2, mt: 0, fontSize: 10.5 }}>
              {orphanCount} organizational {orphanCount === 1 ? "unit has" : "units have"} a missing parent link and cannot be placed in the tree.
            </Alert>
          ) : null}
        </Paper>
      </Box>
    </Box>
  );
}
