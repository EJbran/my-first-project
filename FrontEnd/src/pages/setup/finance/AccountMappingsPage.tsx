import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import NotesRoundedIcon from "@mui/icons-material/NotesRounded";
import FiberManualRecordRoundedIcon from "@mui/icons-material/FiberManualRecordRounded";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { accountMappingsApi } from "../../../api/accountMappings.api";
import { epsasApi } from "../../../api/epsas.api";
import { DataGridToolbar } from "../../../components/DataGridToolbar";
import type { AccountMapping, LocationAccessMode } from "../../../types/accountMapping.types";
import { locationAccessModeLabel } from "../../../types/accountMapping.types";
import type { Epsa } from "../../../types/epsa.types";
import { exportToExcel } from "../../../utils/exportExcel";
import {
  AccountMappingEditDialog,
  type AccountMappingEditTarget
} from "./AccountMappingEditDialog";

const MAPPING_LOGIC_NOTES = [
  "Each card represents one EPSA that already has account mapping data.",
  "Mappings link an EPSA to Manager departments and allowed chart accounts.",
  "All Accounts means one row with IsAllAccounts = true and ChartAccountId = NULL.",
  "All Accounts is allowed only for departments where DepartmentType = Manager.",
  "LocationAccessMode ALL means LocationID NULL (all locations).",
  "INCLUDE means only selected LocationID; EXCLUDE means all except that LocationID.",
  "Some Accounts means selected chart accounts were mapped for that department.",
  "Do not create thousands of account rows for Manager All Accounts mode.",
  "Use New Mapping to add All Accounts for one or all Manager departments.",
  "Use Details to open the department list and review coverage per department.",
  "Inactive mappings are soft-deactivated and are not shown in this active list.",
  "Search filters EPSA cards by name; export downloads the underlying mapping rows."
];

const chipSx = {
  height: 22,
  fontWeight: 600,
  fontSize: "0.7rem",
  bgcolor: "transparent"
};

const percentChipSx = {
  height: 44,
  fontWeight: 800,
  fontSize: "1.05rem",
  px: 0.5,
  flex: "1 1 100px",
  justifyContent: "center",
  borderWidth: 1.5,
  bgcolor: "transparent",
  "& .MuiChip-label": {
    px: 1.25
  }
};

const statBoxSx = (colorKey?: "info" | "success" | "warning") => ({
  flex: "1 1 58px",
  minWidth: 58,
  px: 0.75,
  py: 0.85,
  borderRadius: 1.25,
  border: 1,
  borderColor: colorKey ? `${colorKey}.main` : "divider",
  bgcolor: (theme: { palette: { mode: string } }) => {
    if (!colorKey) {
      return theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)";
    }
    if (colorKey === "info") {
      return theme.palette.mode === "dark" ? "rgba(2, 136, 209, 0.14)" : "rgba(2, 136, 209, 0.07)";
    }
    if (colorKey === "success") {
      return theme.palette.mode === "dark" ? "rgba(46, 125, 50, 0.14)" : "rgba(46, 125, 50, 0.07)";
    }
    return theme.palette.mode === "dark" ? "rgba(237, 108, 2, 0.14)" : "rgba(237, 108, 2, 0.07)";
  },
  textAlign: "center" as const
});

type MappingLeaf = AccountMappingEditTarget;

type DepartmentGroup = {
  departmentId: number;
  departmentName: string;
  accounts: MappingLeaf[];
  coverage: "all" | "some" | "mixed";
  allAccountsMappings: MappingLeaf[];
};

type EpsaCard = {
  epsaId: number;
  epsaName: string;
  epsaType: string | null;
  noc: number | null;
  pc: number | null;
  departments: DepartmentGroup[];
  departmentCount: number;
  locationCount: number;
  hasAllLocations: boolean;
  excludeLocationCount: number;
  allAccountsDepartmentCount: number;
  someAccountsDepartmentCount: number;
  totalMappings: number;
};

const normalizeLocationAccessMode = (value: unknown): LocationAccessMode => {
  const mode = String(value || "ALL").trim().toUpperCase();
  if (mode === "INCLUDE" || mode === "EXCLUDE" || mode === "ALL") {
    return mode;
  }
  return "ALL";
};

const toLeaf = (item: AccountMapping): MappingLeaf => {
  const locationAccessMode = normalizeLocationAccessMode(item.LocationAccessMode);
  const locationId = item.LocationID == null ? null : Number(item.LocationID);

  return {
    id: Number(item.Id),
    epsaId: item.EPSAId,
    epsaName: item.Epsa?.InterstName || `EPSA ${item.EPSAId}`,
    departmentId: item.DepartmentId,
    departmentName:
      item.Department?.DepartmentName_English ||
      item.Department?.DepartmentName_Arabic ||
      `Department ${item.DepartmentId}`,
    chartAccountId: item.ChartAccountId == null ? null : Number(item.ChartAccountId),
    chartAccountCode: item.ChartAccount?.NewAccountCode || "",
    chartAccountDescription: item.ChartAccount?.CleanDescription || "",
    locationId,
    locationName:
      locationAccessMode === "ALL"
        ? "All locations"
        : item.Location
          ? `${item.Location.LocationCode} — ${item.Location.LocationName_en}`
          : locationId != null
            ? `Location ${locationId}`
            : "Location",
    locationAccessMode,
    isAllAccounts: Boolean(item.IsAllAccounts),
    isActive: item.IsActive
  };
};

const buildDepartmentGroups = (leaves: MappingLeaf[]): DepartmentGroup[] => {
  const departmentMap = new Map<number, { departmentName: string; accounts: MappingLeaf[] }>();

  leaves.forEach((leaf) => {
    let department = departmentMap.get(leaf.departmentId);
    if (!department) {
      department = {
        departmentName: leaf.departmentName,
        accounts: []
      };
      departmentMap.set(leaf.departmentId, department);
    }
    department.accounts.push(leaf);
  });

  return Array.from(departmentMap.entries())
    .map(([departmentId, department]) => {
      const accounts = [...department.accounts].sort((a, b) => {
        if (a.isAllAccounts !== b.isAllAccounts) {
          return a.isAllAccounts ? -1 : 1;
        }
        if (a.locationAccessMode !== b.locationAccessMode) {
          return a.locationAccessMode.localeCompare(b.locationAccessMode);
        }
        const locationCompare = a.locationName.localeCompare(b.locationName);
        if (locationCompare !== 0) {
          return locationCompare;
        }
        return a.chartAccountCode.localeCompare(b.chartAccountCode);
      });
      const allAccountsMappings = accounts.filter((account) => account.isAllAccounts);
      const selectedAccounts = accounts.filter((account) => !account.isAllAccounts);
      const coverage =
        allAccountsMappings.length && selectedAccounts.length
          ? ("mixed" as const)
          : allAccountsMappings.length
            ? ("all" as const)
            : ("some" as const);

      return {
        departmentId,
        departmentName: department.departmentName,
        accounts: selectedAccounts,
        coverage,
        allAccountsMappings
      };
    })
    .sort((a, b) => a.departmentName.localeCompare(b.departmentName));
};

const buildEpsaCards = (epsas: Epsa[], leaves: MappingLeaf[]): EpsaCard[] => {
  const leavesByEpsa = new Map<number, MappingLeaf[]>();

  leaves.forEach((leaf) => {
    const current = leavesByEpsa.get(leaf.epsaId) || [];
    current.push(leaf);
    leavesByEpsa.set(leaf.epsaId, current);
  });

  return [...epsas]
    .sort((a, b) => a.InterstName.localeCompare(b.InterstName))
    .map((epsa) => {
      const epsaLeaves = leavesByEpsa.get(epsa.Id) || [];
      const departments = buildDepartmentGroups(epsaLeaves);
      const allAccountsDepartmentCount = departments.filter(
        (dept) => dept.coverage === "all" || dept.coverage === "mixed"
      ).length;
      const someAccountsDepartmentCount = departments.filter(
        (dept) => dept.coverage === "some" || dept.coverage === "mixed"
      ).length;

      const includeLocationIds = new Set<number>();
      const excludeLocationIds = new Set<number>();
      let hasAllLocations = false;
      epsaLeaves.forEach((leaf) => {
        if (leaf.locationAccessMode === "ALL") {
          hasAllLocations = true;
        } else if (leaf.locationAccessMode === "INCLUDE" && leaf.locationId != null) {
          includeLocationIds.add(leaf.locationId);
        } else if (leaf.locationAccessMode === "EXCLUDE" && leaf.locationId != null) {
          excludeLocationIds.add(leaf.locationId);
        }
      });

      return {
        epsaId: epsa.Id,
        epsaName: epsa.InterstName,
        epsaType: epsa.EPSAType?.trim() || null,
        noc: epsa.NOC,
        pc: epsa.PC,
        departments,
        departmentCount: departments.length,
        locationCount: includeLocationIds.size,
        hasAllLocations,
        excludeLocationCount: excludeLocationIds.size,
        allAccountsDepartmentCount,
        someAccountsDepartmentCount,
        totalMappings: departments.reduce(
          (sum, dept) => sum + dept.allAccountsMappings.length + dept.accounts.length,
          0
        )
      };
    });
};

export default function AccountMappingsPage() {
  const [search, setSearch] = useState("");
  const [epsas, setEpsas] = useState<Epsa[]>([]);
  const [leaves, setLeaves] = useState<MappingLeaf[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("edit");
  const [editTarget, setEditTarget] = useState<MappingLeaf | null>(null);
  const [detailsEpsa, setDetailsEpsa] = useState<EpsaCard | null>(null);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  const openCreateDialog = () => {
    setDialogMode("create");
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEditDialog = (row: MappingLeaf) => {
    setDialogMode("edit");
    setEditTarget(row);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditTarget(null);
  };

  const openDetails = (epsa: EpsaCard) => {
    setExpandedAccounts(new Set());
    setDetailsEpsa(epsa);
  };

  const closeDetails = () => {
    setDetailsEpsa(null);
    setExpandedAccounts(new Set());
  };

  const toggleAccounts = (key: string) => {
    setExpandedAccounts((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [epsaResponse, mappingResponse] = await Promise.all([
        epsasApi.list(),
        accountMappingsApi.list({ activeOnly: true })
      ]);

      const normalizeEpsa = (item: Epsa & Record<string, unknown>): Epsa => ({
        Id: Number(item.Id),
        InterstName: String(item.InterstName ?? ""),
        NOC: item.NOC == null ? null : Number(item.NOC),
        PC: item.PC == null ? null : Number(item.PC),
        EPSAType:
          (item.EPSAType as string | null | undefined)?.toString().trim() ||
          (item.EpsaType as string | null | undefined)?.toString().trim() ||
          (item.epsatype as string | null | undefined)?.toString().trim() ||
          null
      });

      if (!epsaResponse.success) {
        setError(epsaResponse.message || "Failed to load EPSAs");
        setEpsas([]);
        setLeaves([]);
        return;
      }

      if (!mappingResponse.success) {
        setError(mappingResponse.message || "Failed to load account mappings");
        setEpsas(epsaResponse.data.map((item) => normalizeEpsa(item as Epsa & Record<string, unknown>)));
        setLeaves([]);
        return;
      }

      setEpsas(epsaResponse.data.map((item) => normalizeEpsa(item as Epsa & Record<string, unknown>)));
      setLeaves(mappingResponse.data.map(toLeaf));
    } catch {
      setError("Failed to load account mappings");
      setEpsas([]);
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const cards = useMemo(() => {
    const allCards = buildEpsaCards(epsas, leaves).filter((card) => card.departmentCount > 0);
    const query = search.trim().toLowerCase();
    if (!query) {
      return allCards;
    }

    return allCards.filter((card) => card.epsaName.toLowerCase().includes(query));
  }, [epsas, leaves, search]);

  // Keep details dialog in sync after reload/save
  useEffect(() => {
    setDetailsEpsa((current) => {
      if (!current) {
        return null;
      }

      return cards.find((card) => card.epsaId === current.epsaId) || null;
    });
  }, [cards]);

  const handleExport = () => {
    exportToExcel(
      "account-mappings",
      [
        { header: "EPSA", value: (row) => row.epsaName },
        { header: "Department", value: (row) => row.departmentName },
        {
          header: "Location Mode",
          value: (row) => row.locationAccessMode
        },
        {
          header: "Location",
          value: (row) =>
            row.locationAccessMode === "ALL"
              ? "All locations"
              : row.locationAccessMode === "EXCLUDE"
                ? `Except ${row.locationName}`
                : row.locationName
        },
        {
          header: "Coverage",
          value: (row) => (row.isAllAccounts ? "All accounts" : "Some accounts")
        },
        { header: "Chart Account Code", value: (row) => row.chartAccountCode },
        { header: "Chart Account Description", value: (row) => row.chartAccountDescription },
        { header: "Active", value: (row) => (row.isActive ? "Yes" : "No") }
      ],
      leaves
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2
      }}
    >
      <Box
        sx={{
          px: { xs: 1.5, sm: 2 },
          py: 1.5,
          borderRadius: 2,
          border: 1,
          borderColor: "divider",
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)"
        }}
      >
        <DataGridToolbar
          search={search}
          onSearchChange={setSearch}
          actions={
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddRoundedIcon />}
                onClick={openCreateDialog}
              >
                New Mapping
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<FileDownloadRoundedIcon />}
                onClick={handleExport}
                disabled={loading || leaves.length === 0}
              >
                Export
              </Button>
            </Stack>
          }
        />
      </Box>

      {error ? (
        <Alert severity="error" sx={{ py: 0.5 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress size={32} />
        </Box>
      ) : cards.length === 0 ? (
        <Box
          sx={{
            bgcolor: "background.paper",
            borderRadius: 2,
            border: 1,
            borderColor: "divider",
            borderStyle: "dashed",
            py: 7,
            textAlign: "center"
          }}
        >
          <Typography color="text.secondary" variant="body2">
            {search.trim()
              ? "No EPSAs match your search."
              : "No EPSAs with account mappings yet."}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1.75
          }}
        >
          {cards.map((epsa) => (
            <Card
              key={epsa.epsaId}
              variant="outlined"
              sx={{
                position: "relative",
                overflow: "hidden",
                width: {
                  xs: "100%",
                  sm: "calc(50% - 7px)",
                  md: "calc(33.333% - 12px)",
                  lg: "calc(25% - 14px)"
                },
                minWidth: { xs: "100%", sm: 260 },
                minHeight: 320,
                display: "flex",
                flexDirection: "column",
                borderRadius: 2,
                bgcolor: "background.paper",
                borderColor: "divider",
                transition: "border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease",
                "&:hover": {
                  borderColor: "primary.main",
                  boxShadow: (theme) =>
                    theme.palette.mode === "dark"
                      ? "0 8px 22px rgba(0,0,0,0.35)"
                      : "0 8px 22px rgba(15,23,42,0.08)",
                  transform: "translateY(-1px)"
                },
                "&::before": {
                  content: '""',
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 3,
                  bgcolor: "primary.main"
                },
                "[data-toolpad-color-scheme='light'] &": {
                  bgcolor: "#ffffff"
                }
              }}
            >
              <CardContent
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                  pt: 2,
                  px: 1.75,
                  pb: 1.5,
                  "&:last-child": { pb: 1.5 }
                }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  flexWrap="wrap"
                  useFlexGap
                  minWidth={0}
                >
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: 1.25,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(25, 118, 210, 0.18)"
                          : "rgba(25, 118, 210, 0.1)",
                      color: "primary.main"
                    }}
                  >
                    <ApartmentRoundedIcon sx={{ fontSize: 18 }} />
                  </Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    lineHeight={1.25}
                    noWrap
                    title={epsa.epsaName}
                    sx={{ minWidth: 0, flex: "1 1 auto", fontSize: "0.9rem" }}
                  >
                    {epsa.epsaName}
                  </Typography>
                  <Chip size="small" variant="outlined" label={`ID ${epsa.epsaId}`} sx={chipSx} />
                  <Chip
                    size="small"
                    color={
                      epsa.epsaType === "Opex"
                        ? "primary"
                        : epsa.epsaType === "Capex"
                          ? "secondary"
                          : "warning"
                    }
                    variant="filled"
                    label={epsa.epsaType || "Type —"}
                    sx={{ height: 22, fontWeight: 700, fontSize: "0.7rem" }}
                  />
                </Stack>

                <Box sx={{ display: "flex", flexDirection: "row", gap: 0.75, flexWrap: "wrap" }}>
                  <Box sx={statBoxSx()}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      lineHeight={1.1}
                      sx={{ fontSize: "0.65rem" }}
                    >
                      Depts
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={700} lineHeight={1.15}>
                      {epsa.departmentCount}
                    </Typography>
                  </Box>
                  <Box sx={statBoxSx("info")}>
                    <Typography
                      variant="caption"
                      color="info.main"
                      display="block"
                      lineHeight={1.1}
                      sx={{ fontSize: "0.65rem" }}
                    >
                      Locs
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      color="info.main"
                      lineHeight={1.15}
                      sx={{ fontSize: "0.95rem" }}
                    >
                      {epsa.hasAllLocations
                        ? "All"
                        : epsa.excludeLocationCount > 0 && epsa.locationCount === 0
                          ? `Excl ${epsa.excludeLocationCount}`
                          : epsa.locationCount}
                    </Typography>
                  </Box>
                  <Box sx={statBoxSx("success")}>
                    <Typography
                      variant="caption"
                      color="success.main"
                      display="block"
                      lineHeight={1.1}
                      sx={{ fontSize: "0.65rem" }}
                    >
                      All
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      color="success.main"
                      lineHeight={1.15}
                    >
                      {epsa.allAccountsDepartmentCount}
                    </Typography>
                  </Box>
                  <Box sx={statBoxSx("warning")}>
                    <Typography
                      variant="caption"
                      color="warning.main"
                      display="block"
                      lineHeight={1.1}
                      sx={{ fontSize: "0.65rem" }}
                    >
                      Some
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      color="warning.main"
                      lineHeight={1.15}
                    >
                      {epsa.someAccountsDepartmentCount}
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    minHeight: 100,
                    px: 1,
                    py: 1.5,
                    borderRadius: 1.5,
                    border: 1,
                    borderColor: "divider",
                    borderStyle: "dashed",
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.02)"
                        : "rgba(15,23,42,0.015)"
                  }}
                >
                  {epsa.noc != null ? (
                    <Chip
                      color="primary"
                      variant="outlined"
                      label={`NOC ${epsa.noc}%`}
                      sx={percentChipSx}
                    />
                  ) : (
                    <Chip
                      variant="outlined"
                      label="NOC —"
                      sx={{ ...percentChipSx, color: "text.disabled" }}
                    />
                  )}
                  {epsa.pc != null ? (
                    <Chip
                      color="secondary"
                      variant="outlined"
                      label={`PC ${epsa.pc}%`}
                      sx={percentChipSx}
                    />
                  ) : (
                    <Chip
                      variant="outlined"
                      label="PC —"
                      sx={{ ...percentChipSx, color: "text.disabled" }}
                    />
                  )}
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  size="small"
                  startIcon={<InfoOutlinedIcon />}
                  onClick={() => openDetails(epsa)}
                  sx={{
                    mt: "auto",
                    py: 0.85,
                    boxShadow: "none",
                    textTransform: "none",
                    fontWeight: 700,
                    "&:hover": { boxShadow: "none" }
                  }}
                >
                  Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Box
        component="footer"
        sx={{
          mt: 2,
          px: 1.5,
          py: 1.25,
          borderRadius: 1.5,
          border: 1,
          borderColor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(2, 136, 209, 0.35)" : "rgba(2, 136, 209, 0.25)",
          bgcolor: (theme) =>
            theme.palette.mode === "dark"
              ? "rgba(2, 136, 209, 0.08)"
              : "rgba(2, 136, 209, 0.04)"
        }}
      >
        <Stack direction="row" spacing={0.75} alignItems="center" mb={0.75}>
          <NotesRoundedIcon color="info" sx={{ fontSize: 14 }} />
          <Typography
            variant="caption"
            fontWeight={700}
            color="info.main"
            sx={{ fontSize: "0.68rem", letterSpacing: 0.2 }}
          >
            Note — EPSA mapping logic
          </Typography>
        </Stack>
        <Stack spacing={0.35}>
          {MAPPING_LOGIC_NOTES.map((note) => (
            <Stack key={note} direction="row" spacing={0.65} alignItems="flex-start">
              <FiberManualRecordRoundedIcon
                sx={{ fontSize: 6, mt: 0.5, color: "info.main", flexShrink: 0 }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                lineHeight={1.35}
                sx={{ fontSize: "0.62rem" }}
              >
                {note}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      <Dialog open={Boolean(detailsEpsa)} onClose={closeDetails} fullWidth maxWidth="md">
        <DialogTitle>
          <Stack spacing={0.5}>
            <Typography variant="h6" fontWeight={700}>
              {detailsEpsa?.epsaName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {detailsEpsa?.departmentCount || 0} department
              {(detailsEpsa?.departmentCount || 0) === 1 ? "" : "s"} mapped
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {!detailsEpsa || detailsEpsa.departments.length === 0 ? (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "stretch", sm: "center" }}
              justifyContent="space-between"
              sx={{
                px: 1.5,
                py: 1.5,
                borderRadius: 1.5,
                border: 1,
                borderColor: "divider",
                borderStyle: "dashed"
              }}
            >
              <Typography variant="body2" color="text.secondary">
                No departments mapped yet for this EPSA.
              </Typography>
              <Button
                size="small"
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={() => {
                  closeDetails();
                  openCreateDialog();
                }}
              >
                Add Mapping
              </Button>
            </Stack>
          ) : (
            <Stack spacing={1}>
              {detailsEpsa.departments.map((department) => {
                const expandKey = `${detailsEpsa.epsaId}::${department.departmentId}`;
                const expanded = expandedAccounts.has(expandKey);

                return (
                  <Accordion
                    key={expandKey}
                    disableGutters
                    elevation={0}
                    expanded={expanded}
                    onChange={() => toggleAccounts(expandKey)}
                    sx={{
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1.5,
                      "&:before": { display: "none" },
                      overflow: "hidden"
                    }}
                  >
                    <AccordionSummary
                      expandIcon={
                        expanded ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />
                      }
                      sx={{
                        px: 1.5,
                        minHeight: 56,
                        "& .MuiAccordionSummary-content": {
                          my: 1,
                          alignItems: "center",
                          gap: 1.5
                        }
                      }}
                    >
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        alignItems={{ xs: "flex-start", sm: "center" }}
                        justifyContent="space-between"
                        width="100%"
                        pr={1}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <BusinessRoundedIcon fontSize="small" color="action" />
                          <Typography variant="body1" fontWeight={600}>
                            {department.departmentName}
                          </Typography>
                        </Stack>

                        <Chip
                          size="small"
                          label={
                            department.coverage === "all"
                              ? "All accounts"
                              : department.coverage === "mixed"
                                ? "Mixed"
                                : "Some accounts"
                          }
                          color={
                            department.coverage === "all"
                              ? "success"
                              : department.coverage === "mixed"
                                ? "info"
                                : "warning"
                          }
                          variant="outlined"
                          sx={{ bgcolor: "transparent", fontWeight: 600 }}
                        />
                      </Stack>
                    </AccordionSummary>

                    <AccordionDetails sx={{ px: 1.5, pt: 0, pb: 1.5 }}>
                      <Stack spacing={0.75}>
                        {department.allAccountsMappings.map((mapping) => (
                          <Stack
                            key={mapping.id}
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{
                              px: 1.25,
                              py: 0.75,
                              borderRadius: 1,
                              bgcolor: "action.hover"
                            }}
                          >
                            <Box minWidth={0}>
                              <Typography variant="body2" fontWeight={600}>
                                All accounts
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {locationAccessModeLabel(mapping.locationAccessMode)}
                                {mapping.locationAccessMode !== "ALL"
                                  ? `: ${mapping.locationName}`
                                  : ""}
                              </Typography>
                            </Box>
                            <IconButton
                              size="small"
                              aria-label="Edit all-accounts mapping"
                              onClick={() => openEditDialog(mapping)}
                            >
                              <EditRoundedIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        ))}
                        {department.accounts.map((account) => (
                          <Stack
                            key={account.id}
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{
                              px: 1.25,
                              py: 0.75,
                              borderRadius: 1,
                              bgcolor: "action.hover"
                            }}
                          >
                            <Box minWidth={0}>
                              <Typography variant="body2" fontWeight={600} noWrap>
                                {account.chartAccountCode}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {account.chartAccountDescription}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {locationAccessModeLabel(account.locationAccessMode)}
                                {account.locationAccessMode !== "ALL"
                                  ? `: ${account.locationName}`
                                  : ""}
                              </Typography>
                            </Box>
                            <IconButton
                              size="small"
                              aria-label="Edit account mapping"
                              onClick={() => openEditDialog(account)}
                            >
                              <EditRoundedIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        ))}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            variant="outlined"
            startIcon={<AddRoundedIcon />}
            onClick={() => {
              closeDetails();
              openCreateDialog();
            }}
          >
            New Mapping
          </Button>
          <Button onClick={closeDetails}>Close</Button>
        </DialogActions>
      </Dialog>

      <AccountMappingEditDialog
        open={dialogOpen}
        mode={dialogMode}
        mapping={editTarget}
        onClose={closeDialog}
        onSaved={() => void loadData()}
      />
    </Box>
  );
}
