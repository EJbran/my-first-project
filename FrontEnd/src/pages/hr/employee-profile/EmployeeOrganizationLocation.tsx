import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CorporateFareRoundedIcon from "@mui/icons-material/CorporateFareRounded";
import Groups2RoundedIcon from "@mui/icons-material/Groups2Rounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import PersonOffOutlinedIcon from "@mui/icons-material/PersonOffOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import {
  Alert,
  Avatar,
  Box,
  Button,
  ButtonBase,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Skeleton,
  Stack,
  Tooltip,
  Typography
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { departmentsApi } from "../../../api/departments.api";
import type {
  Department,
  DepartmentHierarchyLeader
} from "../../../types/department.types";

const navy = "var(--hr-text)";
const blue = "var(--hr-accent)";
const muted = "var(--hr-muted)";
const border = "var(--hr-border)";
const surface = "var(--hr-surface)";

const cardSx = {
  border: `1px solid ${border}`,
  borderRadius: "11px",
  bgcolor: surface,
  boxShadow: "0 2px 9px rgba(8, 30, 75, 0.055)"
};

export type OrganizationLocationEmployee = {
  id?: string;
  employeeNumber?: string;
  name: string;
  initials: string;
  profileImageUrl?: string;
  jobName?: string;
  lineLevel?: string;
  positionNumber?: string;
  positionType?: string;
  positionLevel?: string;
  positionDegree?: string;
  contractStart?: string;
  assignedDepartmentId?: string;
  locationId?: string;
  locationNameEnglish?: string;
  locationNameArabic?: string;
  locationCode?: string;
  locationMapAvailable?: boolean;
  workSystem?: string;
  workSystemDescription?: string;
  workStart?: string;
  workEnd?: string;
};

type EmployeeOrganizationLocationProps = {
  employee: OrganizationLocationEmployee;
  departments: Department[];
  fallbackDepartments?: Department[];
  loading?: boolean;
  error?: string | null;
};

type PathNode = Department & {
  siblingCount: number;
};

const normalizeId = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeText = (value: string | null | undefined): string => value?.trim() ?? "";

const initialsFromName = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const departmentName = (department: Department): string =>
  normalizeText(department.DepartmentName_English)
  || normalizeText(department.DepartmentName_Arabic)
  || `Organizational unit ${department.Id}`;

const departmentType = (department: Department): string =>
  normalizeText(department.DepartmentType) || "Organizational unit";

const departmentPresentation = (
  department: Department
): { label: string; code: string } => ({
  label: departmentType(department).toUpperCase(),
  code: `ID ${department.Id}`
});

const iconForDepartmentType = (type: string): ReactNode => {
  const normalized = type.toLowerCase();
  if (normalized.includes("top") || normalized.includes("director")) {
    return <AccountBalanceRoundedIcon sx={{ fontSize: 19 }} />;
  }
  if (normalized.includes("manager") || normalized.includes("department")) {
    return <ApartmentRoundedIcon sx={{ fontSize: 19 }} />;
  }
  if (normalized.includes("section") || normalized.includes("division")) {
    return <AccountTreeRoundedIcon sx={{ fontSize: 19 }} />;
  }
  if (normalized.includes("unit") || normalized.includes("coordinator")) {
    return <Inventory2RoundedIcon sx={{ fontSize: 18 }} />;
  }
  return <CorporateFareRoundedIcon sx={{ fontSize: 18 }} />;
};

const buildOrganizationalPath = (
  departments: Department[],
  assignedDepartmentId?: string
): PathNode[] => {
  const assignedId = normalizeId(assignedDepartmentId);
  if (!assignedId) return [];

  const byId = new Map<number, Department>();
  departments.forEach((department) => {
    const id = normalizeId(department.Id);
    if (id) byId.set(id, department);
  });

  const path: Department[] = [];
  const visited = new Set<number>();
  let currentId: number | null = assignedId;

  while (currentId && !visited.has(currentId) && path.length < 64) {
    const current = byId.get(currentId);
    if (!current) break;
    path.push(current);
    visited.add(currentId);
    currentId = normalizeId(current.AttachedNumber);
  }

  return path.reverse().map((department) => {
    const parentId = normalizeId(department.AttachedNumber);
    const siblingCount = parentId
      ? departments.filter((candidate) =>
          normalizeId(candidate.AttachedNumber) === parentId
          && normalizeId(candidate.Id) !== normalizeId(department.Id)
        ).length
      : 0;
    return { ...department, siblingCount };
  });
};

const formatTime = (value?: string): string | undefined => {
  const match = value?.trim().match(/^(\d{1,2}):(\d{2})/);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : value?.trim() || undefined;
};

const SectionHeading = ({
  icon,
  title,
  action
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
}) => (
  <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1.5}>
    <Stack direction="row" alignItems="center" spacing={1.5} minWidth={0}>
      <Box
        sx={{
          width: 38,
          height: 38,
          flex: "0 0 auto",
          display: "grid",
          placeItems: "center",
          color: blue,
          bgcolor: "var(--hr-selected)",
          borderRadius: "10px",
          "& svg": { fontSize: 21 }
        }}
      >
        {icon}
      </Box>
      <Typography sx={{ color: navy, fontSize: 18, fontWeight: 800, lineHeight: 1.25 }}>
        {title}
      </Typography>
    </Stack>
    {action}
  </Stack>
);

const PathConnector = () => (
  <Box
    aria-hidden="true"
    sx={{
      width: { xs: 44, md: 52 },
      height: 226,
      flex: { xs: "0 0 44px", md: "0 0 52px" },
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}
  >
    <Box sx={{ position: "relative", width: "100%", height: 28 }}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: "1.5px",
          bgcolor: "#0b4bec",
          transform: "translateY(-50%)"
        }}
      />
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 26,
          height: 26,
          display: "grid",
          placeItems: "center",
          color: "#fff",
          bgcolor: "#0b4bec",
          borderRadius: "50%",
          transform: "translate(-50%, -50%)",
          boxShadow: "0 2px 5px rgba(11, 75, 236, 0.22)"
        }}
      >
        <ArrowForwardRoundedIcon sx={{ fontSize: 18 }} />
      </Box>
    </Box>
  </Box>
);

const DepartmentPathCard = ({
  department,
  assigned,
  leaderResult,
  leaderLoading,
  leaderLoadFailed,
  onOpenProfile
}: {
  department: PathNode;
  assigned: boolean;
  leaderResult?: DepartmentHierarchyLeader;
  leaderLoading: boolean;
  leaderLoadFailed: boolean;
  onOpenProfile: (employeeId: number) => void;
}) => {
  const type = departmentType(department);
  const presentation = departmentPresentation(department);
  const englishName = normalizeText(department.DepartmentName_English);
  const arabicName = normalizeText(department.DepartmentName_Arabic);
  const leader = leaderResult?.leader ?? null;
  const leaderTitle = leader?.titleEnglish || leader?.titleArabic || leader?.lineLevelEnglish;
  const unresolvedName = leaderLoadFailed
    ? "Leader data unavailable"
    : leaderResult?.status === "ambiguous"
      ? "Multiple leader records"
      : leaderResult?.status === "unsupported-type"
        ? "Leadership role not mapped"
        : "Leader not linked";
  const unresolvedTitle = leaderLoadFailed
    ? "Could not load organizational leaders"
    : leaderResult?.status === "ambiguous"
      ? `${leaderResult.exactCandidateCount} matching assignments need review`
      : leaderResult?.status === "unsupported-type"
        ? "No line-level rule for this unit type"
        : leaderResult?.expectedLineLevel || "No active assignment found";
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: { xs: 286, md: 312 },
        minWidth: { xs: 286, md: 312 },
        height: 226,
        px: 2.1,
        py: 1.75,
        border: `1px solid ${border}`,
        borderRadius: "10px",
        bgcolor: surface,
        boxShadow: "0 3px 9px rgba(11, 30, 70, 0.07)",
        scrollSnapAlign: "start"
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.15}>
        <Box sx={{ color: blue, display: "grid", placeItems: "center", "& svg": { fontSize: 27 } }}>
          {iconForDepartmentType(type)}
        </Box>
        <Chip
          label={presentation.label}
          size="small"
          sx={{
            height: 24,
            color: assigned ? "#fff" : navy,
            bgcolor: assigned ? "#0b4bec" : "var(--hr-selected)",
            borderRadius: "7px",
            fontSize: 11,
            fontWeight: 850,
            "& .MuiChip-label": { px: 1.25 }
          }}
        />
      </Stack>
      <Typography
        title={englishName || departmentName(department)}
        sx={{
          mt: 1.25,
          overflow: "hidden",
          color: navy,
          fontSize: 17,
          fontWeight: 800,
          lineHeight: 1.25,
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }}
      >
        {englishName || departmentName(department)}
      </Typography>
      <Typography
        dir="rtl"
        title={arabicName || undefined}
        sx={{
          mt: 0.35,
          width: "fit-content",
          maxWidth: "100%",
          overflow: "hidden",
          color: muted,
          fontSize: 14,
          lineHeight: 1.4,
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }}
      >
        {arabicName || "—"}
      </Typography>
      <Chip
        label={presentation.code}
        size="small"
        sx={{
          mt: 0.7,
          alignSelf: "flex-start",
          height: 23,
          color: navy,
          bgcolor: "var(--hr-surface-soft)",
          fontSize: 10.5,
          fontWeight: 750,
          "& .MuiChip-label": { px: 1.15 }
        }}
      />
      <ButtonBase
        component="button"
        type="button"
        disabled={!leader}
        aria-label={leader ? `Open ${leader.displayName} profile` : undefined}
        onClick={leader ? () => onOpenProfile(leader.employeeId) : undefined}
        sx={{
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "center",
          flex: 1,
          minWidth: 0,
          width: "100%",
          mt: 1.15,
          pt: 1.15,
          px: 0.2,
          borderTop: `1px solid ${border}`,
          borderRadius: 0,
          textAlign: "left",
          cursor: leader ? "pointer" : "default",
          "&:hover": leader ? { bgcolor: "var(--hr-surface-soft)" } : undefined,
          "&.Mui-focusVisible": {
            outline: "2px solid var(--hr-accent)",
            outlineOffset: 2
          }
        }}
      >
        {leaderLoading ? (
          <>
            <Skeleton variant="circular" width={48} height={48} sx={{ flex: "0 0 auto" }} />
            <Box sx={{ ml: 1.25, minWidth: 120, flex: 1 }}>
              <Skeleton width="82%" height={17} />
              <Skeleton width="58%" height={15} />
            </Box>
          </>
        ) : (
          <>
            <Avatar
              src={leader?.profileImageUrl || undefined}
              alt={leader?.displayName || ""}
              sx={{
                width: 48,
                height: 48,
                flex: "0 0 auto",
                color: leader ? navy : muted,
                bgcolor: leader ? "var(--hr-selected)" : "var(--hr-surface-soft)",
                border: `1px solid ${border}`,
                fontSize: 14,
                fontWeight: 900
              }}
            >
              {leader ? initialsFromName(leader.displayName) : <PersonOffOutlinedIcon sx={{ fontSize: 23 }} />}
            </Avatar>
            <Box minWidth={0} ml={1.05}>
              <Typography
                noWrap
                title={leader?.displayName || unresolvedName}
                sx={{
                  color: leader ? navy : "var(--hr-strong-muted)",
                  fontSize: 13.5,
                  fontWeight: 800
                }}
              >
                {leader?.displayName || unresolvedName}
              </Typography>
              <Typography
                noWrap
                title={leaderTitle || unresolvedTitle}
                sx={{ mt: 0.25, color: muted, fontSize: 11.5, lineHeight: 1.35 }}
              >
                {leaderTitle || unresolvedTitle}
              </Typography>
            </Box>
          </>
        )}
      </ButtonBase>
    </Box>
  );
};

const EmployeePathCard = ({ employee }: { employee: OrganizationLocationEmployee }) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      width: { xs: 286, md: 322 },
      minWidth: { xs: 286, md: 322 },
      height: 221,
      px: 1.75,
      py: 1.8,
      overflow: "hidden",
      border: "1.5px solid #2862ff",
      borderRadius: "10px",
      bgcolor: "light-dark(#fbfdff, #15233b)",
      boxShadow: "0 3px 10px rgba(24, 73, 210, 0.09)",
      scrollSnapAlign: "start"
    }}
  >
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.05}
      sx={{ color: blue }}
    >
      <PersonOutlineRoundedIcon sx={{ fontSize: 24 }} />
      <Typography sx={{ fontSize: 12.5, fontWeight: 850, letterSpacing: 0.2 }}>
        EMPLOYEE
      </Typography>
    </Stack>
    <Stack direction="row" alignItems="center" spacing={1.75} sx={{ mt: 2.2, minWidth: 0 }}>
      <Avatar
        src={employee.profileImageUrl || undefined}
        alt={employee.name}
        sx={{
          width: 68,
          height: 68,
          flex: "0 0 auto",
          color: navy,
          bgcolor: "var(--hr-surface-soft)",
          border: `1px solid ${border}`,
          fontSize: 20,
          fontWeight: 850
        }}
      >
        {employee.initials}
      </Avatar>
      <Box minWidth={0}>
        <Typography
          title={employee.name}
          sx={{
            display: "-webkit-box",
            overflow: "hidden",
            color: navy,
            fontSize: 17,
            fontWeight: 800,
            lineHeight: 1.35,
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2
          }}
        >
          {employee.name}
        </Typography>
        <Typography
          title={employee.jobName}
          sx={{
            mt: 0.65,
            overflow: "hidden",
            color: muted,
            fontSize: 12.5,
            lineHeight: 1.4,
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}
        >
          {employee.jobName || "Job not linked"}
        </Typography>
        <Chip
          label={employee.employeeNumber ? `EMP-${employee.employeeNumber}` : "EMP—"}
          size="small"
          sx={{
            mt: 1.25,
            height: 24,
            color: navy,
            bgcolor: "var(--hr-surface-soft)",
            fontSize: 10.5,
            fontWeight: 750,
            "& .MuiChip-label": { px: 1.2 }
          }}
        />
      </Box>
    </Stack>
  </Box>
);

const PositionRow = ({ icon, label, value }: { icon: ReactNode; label: string; value?: string }) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: "28px 112px minmax(0, 1fr)",
      alignItems: "center",
      gap: 1,
      minHeight: 48,
      px: 1.4,
      borderBottom: "1px solid var(--hr-divider-soft)",
      "&:last-child": { borderBottom: 0 }
    }}
  >
    <Box sx={{ color: navy, display: "grid", placeItems: "center", "& svg": { fontSize: 18 } }}>{icon}</Box>
    <Typography noWrap sx={{ color: "var(--hr-strong-muted)", fontSize: 12.5, fontWeight: 650 }}>{label}</Typography>
    <Typography
      title={value || "Not recorded"}
      noWrap
      sx={{ minWidth: 0, color: value ? navy : muted, fontSize: 12.5, fontWeight: 750, textAlign: "right" }}
    >
      {value || "—"}
    </Typography>
  </Box>
);

export function EmployeeOrganizationLocation({
  employee,
  departments,
  fallbackDepartments = [],
  loading = false,
  error = null
}: EmployeeOrganizationLocationProps) {
  const navigate = useNavigate();
  const [locationDetailsOpen, setLocationDetailsOpen] = useState(false);
  const allDepartments = useMemo(() => {
    const merged = new Map<number, Department>();
    fallbackDepartments.forEach((department) => merged.set(department.Id, department));
    departments.forEach((department) => merged.set(department.Id, department));
    return Array.from(merged.values());
  }, [departments, fallbackDepartments]);

  const path = useMemo(
    () => buildOrganizationalPath(allDepartments, employee.assignedDepartmentId),
    [allDepartments, employee.assignedDepartmentId]
  );
  const displayPath = useMemo(() => [...path].reverse(), [path]);
  const pathDepartmentIds = useMemo(
    () => path.map((department) => department.Id),
    [path]
  );
  const hierarchyLeadersQuery = useQuery({
    queryKey: ["departments", "hierarchy-leaders", pathDepartmentIds.join(",")],
    queryFn: () => departmentsApi.getHierarchyLeaders(pathDepartmentIds),
    enabled: pathDepartmentIds.length > 0,
    staleTime: 5 * 60_000
  });
  const leadersByDepartmentId = useMemo(
    () => new Map(
      hierarchyLeadersQuery.data?.success
        ? hierarchyLeadersQuery.data.data.map((result) => [result.departmentId, result] as const)
        : []
    ),
    [hierarchyLeadersQuery.data]
  );
  const reportingLine = useMemo(() => {
    const currentEmployeeId = normalizeId(employee.id);
    const assignedIndex = path.length - 1;
    const assigned = path[assignedIndex];
    if (!assigned) return null;

    const assignedLeader = leadersByDepartmentId.get(assigned.Id)?.leader;
    if (assignedLeader && assignedLeader.employeeId !== currentEmployeeId) {
      return { department: assigned, leader: assignedLeader };
    }

    if (assignedLeader?.employeeId === currentEmployeeId) {
      const immediateParent = path[assignedIndex - 1];
      const parentLeader = immediateParent
        ? leadersByDepartmentId.get(immediateParent.Id)?.leader
        : null;
      if (immediateParent && parentLeader && parentLeader.employeeId !== currentEmployeeId) {
        return { department: immediateParent, leader: parentLeader };
      }
    }

    return null;
  }, [employee.id, leadersByDepartmentId, path]);

  const assignedDepartment = path.at(-1);
  const managerDepartment = [...path].reverse().find((node) => {
    const normalizedType = departmentType(node).toLowerCase();
    return normalizedType === "manager"
      || normalizedType === "department"
      || normalizedType.includes("department manager");
  });
  const assignedUnitSummary = assignedDepartment
    ? `${departmentName(assignedDepartment)} | ID ${assignedDepartment.Id}`
    : undefined;
  const managerDepartmentSummary = managerDepartment
    ? `${departmentName(managerDepartment)} | ID ${managerDepartment.Id}`
    : undefined;
  const formattedStart = formatTime(employee.workStart);
  const formattedEnd = formatTime(employee.workEnd);
  const schedule = formattedStart && formattedEnd ? `${formattedStart}–${formattedEnd}` : formattedStart || formattedEnd;
  const workMode = employee.workSystemDescription || employee.workSystem;
  const locationEnglish = employee.locationNameEnglish?.trim();
  const locationArabic = employee.locationNameArabic?.trim();
  const locationLabel = locationEnglish || locationArabic || "Work location not assigned";
  return (
    <Box data-testid="employee-organization-location">
      <Card
        data-testid="organizational-path-card"
        sx={{
          ...cardSx,
          p: { xs: 1.75, md: 2.5 },
          minHeight: 295,
          overflow: "hidden"
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          gap={1}
          sx={{ mb: 1.5 }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography sx={{ color: navy, fontSize: 18.5, fontWeight: 800 }}>
              Reporting Path
            </Typography>
            <Chip
              label={`${displayPath.length + 1} ${displayPath.length === 0 ? "level" : "levels"}`}
              size="small"
              sx={{
                height: 27,
                color: navy,
                bgcolor: "var(--hr-selected)",
                fontSize: 11,
                fontWeight: 700
              }}
            />
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1.1}>
            <Typography sx={{ color: "var(--hr-strong-muted)", fontSize: 12.5, fontWeight: 650 }}>
              Employee
            </Typography>
            <ArrowForwardRoundedIcon sx={{ color: "var(--hr-strong-muted)", fontSize: 21 }} />
            <Typography sx={{ color: "var(--hr-strong-muted)", fontSize: 12.5, fontWeight: 650 }}>
              Highest organizational level
            </Typography>
          </Stack>
        </Stack>

        {error ? (
          <Alert severity="warning" sx={{ mx: 0.45, mb: 1, fontSize: 10.5 }}>
            {error}
          </Alert>
        ) : null}

        <Box
          role="region"
          aria-label="Organizational path from current employee to highest organizational level"
          tabIndex={0}
          sx={{
            width: "100%",
            overflowX: "auto",
            overflowY: "hidden",
            pb: 0.75,
            scrollBehavior: "smooth",
            scrollSnapType: "x proximity",
            scrollbarColor: "var(--hr-border-strong) transparent",
            scrollbarWidth: "thin",
            "&:focus-visible": {
              outline: "2px solid var(--hr-accent)",
              outlineOffset: 2,
              borderRadius: 1
            },
            "&::-webkit-scrollbar": { height: 6 },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "var(--hr-border-strong)",
              borderRadius: 10
            }
          }}
        >
          {loading && path.length === 0 ? (
            <Stack direction="row" alignItems="center" sx={{ width: "max-content", minWidth: "100%" }}>
              {[0, 1, 2, 3].map((item, index) => (
                <Stack key={item} direction="row" alignItems="center">
                  {index > 0 ? <Skeleton variant="rounded" width={52} height={3} /> : null}
                  <Skeleton variant="rounded" width={index === 0 ? 322 : 312} height={index === 0 ? 221 : 226} />
                </Stack>
              ))}
            </Stack>
          ) : path.length > 0 ? (
            <Stack
              direction="row"
              alignItems="flex-start"
              sx={{
                width: "max-content",
                minWidth: "100%"
              }}
            >
              <EmployeePathCard employee={employee} />
              <PathConnector />
              {displayPath.map((department, index) => (
                <Stack key={department.Id} direction="row" alignItems="flex-start">
                  <DepartmentPathCard
                    department={department}
                    assigned={index === 0}
                    leaderResult={leadersByDepartmentId.get(department.Id)}
                    leaderLoading={hierarchyLeadersQuery.isPending}
                    leaderLoadFailed={hierarchyLeadersQuery.isError}
                    onOpenProfile={(leaderEmployeeId) =>
                      navigate(`/human-resources/employees/employee-profile/${leaderEmployeeId}`)
                    }
                  />
                  {index < displayPath.length - 1 ? (
                    <PathConnector />
                  ) : null}
                </Stack>
              ))}
            </Stack>
          ) : (
            <Stack
              alignItems="center"
              justifyContent="center"
              spacing={1.1}
              sx={{ minHeight: 221, px: 2, textAlign: "center" }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  display: "grid",
                  placeItems: "center",
                  color: blue,
                  bgcolor: "var(--hr-selected)",
                  borderRadius: 2
                }}
              >
                <AccountTreeRoundedIcon />
              </Box>
              <Typography sx={{ color: navy, fontSize: 12.5, fontWeight: 850 }}>
                No organizational assignment
              </Typography>
              <Typography sx={{ maxWidth: 360, color: muted, fontSize: 10.3, lineHeight: 1.5 }}>
                Link this employee to an organizational unit to display the reporting path.
              </Typography>
            </Stack>
          )}
        </Box>
      </Card>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            md: "repeat(2, minmax(0, 1fr))",
            xl: "minmax(320px, 0.9fr) minmax(380px, 1fr) minmax(460px, 1.2fr)"
          },
          gap: 2.25,
          mt: 2,
          alignItems: "stretch"
        }}
      >
        <Card data-testid="reporting-line-card" sx={{ ...cardSx, p: 1.75, minHeight: 230 }}>
          <SectionHeading
            icon={<Groups2RoundedIcon sx={{ fontSize: 19 }} />}
            title="Direct Supervisor"
          />
          {hierarchyLeadersQuery.isPending ? (
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 2.25 }}>
              <Skeleton variant="circular" width={64} height={64} />
              <Box sx={{ flex: 1 }}>
                <Skeleton width="76%" height={18} />
                <Skeleton width="58%" height={16} />
              </Box>
            </Stack>
          ) : reportingLine ? (
            <>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 2.25 }}>
                <Avatar
                  src={reportingLine.leader.profileImageUrl || undefined}
                  alt={reportingLine.leader.displayName}
                  sx={{
                    width: 64,
                    height: 64,
                    color: navy,
                    bgcolor: "var(--hr-selected)",
                    border: `1px solid ${border}`,
                    fontSize: 16,
                    fontWeight: 850
                  }}
                >
                  {initialsFromName(reportingLine.leader.displayName)}
                </Avatar>
                <Box minWidth={0}>
                  <Typography
                    noWrap
                    title={reportingLine.leader.displayName}
                    sx={{ color: navy, fontSize: 15.5, fontWeight: 800 }}
                  >
                    {reportingLine.leader.displayName}
                  </Typography>
                  <Typography
                    title={
                      reportingLine.leader.titleEnglish
                      || reportingLine.leader.titleArabic
                      || reportingLine.leader.lineLevelEnglish
                      || undefined
                    }
                    sx={{ mt: 0.45, color: muted, fontSize: 12.5, lineHeight: 1.45 }}
                  >
                    {
                      reportingLine.leader.titleEnglish
                      || reportingLine.leader.titleArabic
                      || reportingLine.leader.lineLevelEnglish
                      || departmentName(reportingLine.department)
                    }
                  </Typography>
                </Box>
              </Stack>
              <Button
                variant="outlined"
                size="small"
                startIcon={<PersonOutlineRoundedIcon />}
                onClick={() =>
                  navigate(`/human-resources/employees/employee-profile/${reportingLine.leader.employeeId}`)
                }
                sx={{
                  mt: 2.1,
                  ml: 7,
                  minHeight: 44,
                  px: 2.6,
                  borderColor: "#7d91ba",
                  borderRadius: "7px",
                  color: navy,
                  fontSize: 12.5,
                  fontWeight: 750,
                  textTransform: "none"
                }}
              >
                View Profile
              </Button>
            </>
          ) : (
            <>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 2.25 }}>
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    color: muted,
                    bgcolor: "var(--hr-surface-soft)",
                    border: `1px solid ${border}`
                  }}
                >
                  <PersonOffOutlinedIcon sx={{ fontSize: 28 }} />
                </Avatar>
                <Box minWidth={0}>
                  <Typography sx={{ color: navy, fontSize: 15, fontWeight: 800 }}>
                    Supervisor not resolved
                  </Typography>
                  <Typography sx={{ mt: 0.4, color: muted, fontSize: 12, lineHeight: 1.45 }}>
                    No unique active leader was found directly above this employee.
                  </Typography>
                </Box>
              </Stack>
              <Tooltip title="A leader profile will be available after the organizational assignment is resolved.">
                <span>
                  <Button
                    disabled
                    variant="outlined"
                    size="small"
                    startIcon={<PersonOutlineRoundedIcon />}
                    sx={{
                      mt: 2.1,
                      ml: 7,
                      minHeight: 44,
                      px: 2.6,
                      borderRadius: "7px",
                      fontSize: 12.5,
                      fontWeight: 750,
                      textTransform: "none"
                    }}
                  >
                    View Profile
                  </Button>
                </span>
              </Tooltip>
            </>
          )}
        </Card>

        <Card sx={{ ...cardSx, p: 1.75, minHeight: 230 }}>
          <SectionHeading
            icon={<Inventory2RoundedIcon sx={{ fontSize: 18 }} />}
            title="Position Summary"
          />
          <Box sx={{ mt: 1.15, overflow: "hidden", border: `1px solid ${border}`, borderRadius: "8px" }}>
            <PositionRow
              icon={<AccountTreeRoundedIcon />}
              label="Level"
              value={employee.lineLevel || assignedDepartment?.DepartmentType || undefined}
            />
            <PositionRow
              icon={<CorporateFareRoundedIcon />}
              label="Assigned unit"
              value={assignedUnitSummary}
            />
            <PositionRow
              icon={<ApartmentRoundedIcon />}
              label="Department"
              value={managerDepartmentSummary}
            />
          </Box>
        </Card>

        <Card
          data-testid="work-location-card"
          sx={{
            ...cardSx,
            display: "block",
            gridColumn: { xs: "auto", md: "1 / -1", xl: "auto" },
            minHeight: 230,
            overflow: "hidden"
          }}
        >
          <Box sx={{ p: 1.75 }}>
            <Stack direction="row" alignItems="center" spacing={1.4} flexWrap="wrap" useFlexGap>
              <LocationOnRoundedIcon sx={{ color: blue, fontSize: 27 }} />
              <Typography sx={{ color: navy, fontSize: 18, fontWeight: 800 }}>
                Primary Workplace
              </Typography>
              {locationEnglish || locationArabic ? (
                <Chip
                  label="Primary"
                  size="small"
                  sx={{
                    height: 27,
                    color: "var(--hr-success-text)",
                    bgcolor: "var(--hr-success-bg)",
                    border: "1px solid var(--hr-success-border)",
                    fontSize: 11,
                    fontWeight: 750
                  }}
                />
              ) : null}
            </Stack>
            <Typography sx={{ mt: 1.65, color: navy, fontSize: 19.5, fontWeight: 800 }}>
              {locationLabel}
            </Typography>
            {locationArabic && locationArabic !== locationEnglish ? (
              <Typography
                dir="rtl"
                sx={{ width: "fit-content", mt: 0.4, color: muted, fontSize: 13.5, fontWeight: 600 }}
              >
                {locationArabic}
              </Typography>
            ) : null}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 74px",
                gap: 1,
                maxWidth: 285,
                mt: 1.25,
                pt: 1.15,
                borderTop: `1px solid ${border}`
              }}
            >
              <Typography sx={{ color: navy, fontSize: 12.5, fontWeight: 650 }}>
                Location ID
              </Typography>
              <Typography sx={{ color: navy, fontSize: 12.5, fontWeight: 750, textAlign: "right" }}>
                {employee.locationId || employee.locationCode || "—"}
              </Typography>
            </Box>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "stretch", sm: "center" }}
              justifyContent="space-between"
              gap={1.25}
              sx={{ mt: 1.25 }}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                  minHeight: 42,
                  maxWidth: 285,
                  px: 1.25,
                  color: locationEnglish || locationArabic ? "var(--hr-success-text)" : muted,
                  bgcolor: locationEnglish || locationArabic
                    ? "var(--hr-success-bg)"
                    : "var(--hr-surface-soft)",
                  border: `1px solid ${
                    locationEnglish || locationArabic
                      ? "var(--hr-success-border)"
                      : border
                  }`,
                  borderRadius: "7px"
                }}
              >
                {locationEnglish || locationArabic ? (
                  <CheckCircleRoundedIcon sx={{ fontSize: 20 }} />
                ) : (
                  <LocationOnRoundedIcon sx={{ fontSize: 20 }} />
                )}
                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                  {locationEnglish || locationArabic
                    ? "Primary work location assigned"
                    : "No primary work location recorded"}
                </Typography>
              </Stack>
              <Button
                variant="outlined"
                onClick={() => setLocationDetailsOpen(true)}
                sx={{
                  minHeight: 41,
                  px: 2.2,
                  borderColor: "#7d91ba",
                  borderRadius: "7px",
                  color: navy,
                  fontSize: 12.5,
                  fontWeight: 750,
                  textTransform: "none"
                }}
              >
                View location details
              </Button>
            </Stack>
          </Box>
        </Card>
      </Box>

      <Dialog
        open={locationDetailsOpen}
        onClose={() => setLocationDetailsOpen(false)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="work-location-details-title"
        slotProps={{
          paper: {
            sx: {
              border: `1px solid ${border}`,
              borderRadius: "12px",
              bgcolor: surface,
              boxShadow: "0 24px 70px rgba(7, 28, 89, 0.22)"
            }
          }
        }}
      >
        <DialogTitle id="work-location-details-title" sx={{ color: navy, fontSize: 20, fontWeight: 850 }}>
          Primary Workplace
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
              gap: "1px",
              overflow: "hidden",
              border: `1px solid ${border}`,
              borderRadius: "8px",
              bgcolor: "var(--hr-divider-soft)"
            }}
          >
            {[
              ["Location", locationLabel],
              ["Location ID", employee.locationId || "—"],
              ["Location code", employee.locationCode || "—"],
              ["Work mode", workMode || "—"],
              ["Working hours", schedule || "—"]
            ].map(([label, value]) => (
              <Box key={label} sx={{ p: 1.5, bgcolor: surface }}>
                <Typography sx={{ color: muted, fontSize: 11, fontWeight: 700 }}>{label}</Typography>
                <Typography dir="auto" sx={{ mt: 0.45, color: navy, fontSize: 13, fontWeight: 750 }}>
                  {value}
                </Typography>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.2 }}>
          <Button onClick={() => setLocationDetailsOpen(false)} sx={{ fontWeight: 750, textTransform: "none" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
