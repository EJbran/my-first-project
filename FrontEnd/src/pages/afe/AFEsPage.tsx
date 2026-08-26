import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import AssignmentRoundedIcon from "@mui/icons-material/AssignmentRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import PowerSettingsNewRoundedIcon from "@mui/icons-material/PowerSettingsNewRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LabelRoundedIcon from "@mui/icons-material/LabelRounded";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from "@mui/material";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { afesApi } from "../../api/afes.api";
import { DataGridToolbar } from "../../components/DataGridToolbar";
import {
  AFE_STATUSES,
  AFE_TYPES,
  type AFE,
  type AFESummary
} from "../../types/afe.types";
import { exportToExcel } from "../../utils/exportExcel";
import { AFEEditDialog, type AFEDialogMode } from "./AFEEditDialog";

type GroupByMode = "category" | "department" | "location";
type DialogGroupByMode = "status" | "type" | "category";

type AFEGroupCard = {
  key: string;
  titleEn: string;
  titleAr: string;
  count: number;
  categoryCount: number;
  budgetSum: number;
  currencyCode: string;
  items: AFE[];
};

type DialogSubGroup = {
  key: string;
  title: string;
  count: number;
  activeCount: number;
  inactiveCount: number;
  items: AFE[];
};

const UNASSIGNED = "Unassigned";

const emptySummary: AFESummary = {
  total: 0,
  active: 0,
  onHold: 0,
  closed: 0,
  cancelled: 0
};

const tableContainerSx = {
  bgcolor: "background.paper",
  borderRadius: 2,
  border: 1,
  borderColor: "divider",
  overflow: "hidden",
  "[data-toolpad-color-scheme='light'] &": {
    bgcolor: "#ffffff"
  }
};

const dataGridSx = {
  border: "none",
  bgcolor: "background.paper",
  "& .MuiDataGrid-columnHeaders, & .MuiDataGrid-footerContainer, & .MuiDataGrid-overlay": {
    bgcolor: "background.paper"
  },
  "[data-toolpad-color-scheme='light'] &": {
    bgcolor: "#ffffff",
    "& .MuiDataGrid-columnHeaders, & .MuiDataGrid-footerContainer, & .MuiDataGrid-overlay": {
      bgcolor: "#ffffff"
    }
  }
};

const statusChipColor = (
  status: string
): "success" | "warning" | "default" | "error" => {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "ON_HOLD":
      return "warning";
    case "CANCELLED":
      return "error";
    default:
      return "default";
  }
};

const formatMoney = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const normalizeKey = (value: string | null | undefined): string => {
  const text = value?.trim();
  return text ? text : UNASSIGNED;
};

const getDepartmentNameEn = (afe: AFE): string =>
  afe.DepartmentName?.trim() ||
  afe.Department?.DepartmentName_English?.trim() ||
  afe.LegacyDepartmentName?.trim() ||
  "";

const getDepartmentNameAr = (afe: AFE): string =>
  afe.DepartmentNameArabic?.trim() ||
  afe.Department?.DepartmentName_Arabic?.trim() ||
  "";

const getLocationNameEn = (afe: AFE): string =>
  afe.LocationName?.trim() ||
  afe.Location?.LocationName_en?.trim() ||
  "";

const getLocationNameAr = (afe: AFE): string =>
  afe.LocationNameArabic?.trim() ||
  afe.Location?.LocationName_ar?.trim() ||
  "";

const getDepartmentName = (afe: AFE): string => {
  const en = getDepartmentNameEn(afe);
  const ar = getDepartmentNameAr(afe);
  if (en && ar) return `${en} / ${ar}`;
  return en || ar || afe.LegacyDepartmentCode?.trim() || "";
};

const getLocationName = (afe: AFE): string => {
  const en = getLocationNameEn(afe);
  const ar = getLocationNameAr(afe);
  if (en && ar) return `${en} / ${ar}`;
  return en || ar || afe.LocationCode?.trim() || afe.LegacyLocationCode?.trim() || "";
};

const getDepartmentKey = (afe: AFE): string => {
  if (afe.DepartmentId != null && Number.isFinite(Number(afe.DepartmentId))) {
    return `dept-${afe.DepartmentId}`;
  }

  const legacyId = Number(String(afe.LegacyDepartmentCode ?? "").trim());
  if (Number.isInteger(legacyId) && legacyId > 0) {
    return `dept-${legacyId}`;
  }

  return normalizeKey(afe.LegacyDepartmentCode || afe.LegacyDepartmentName);
};

const getLocationKey = (afe: AFE): string => {
  if (afe.LocationId != null && Number.isFinite(Number(afe.LocationId))) {
    return `loc-${afe.LocationId}`;
  }

  const legacyId = Number(String(afe.LegacyLocationCode ?? "").trim());
  if (Number.isInteger(legacyId) && legacyId > 0) {
    return `loc-${legacyId}`;
  }

  return normalizeKey(afe.LegacyLocationCode);
};

const toBudgetNumber = (value: unknown): number => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatBudget = (amount: number, currencyCode: string): string =>
  `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })} ${currencyCode || "LYD"}`;

const getGroupIcon = (groupBy: GroupByMode) => {
  if (groupBy === "department") {
    return BusinessRoundedIcon;
  }
  if (groupBy === "location") {
    return LocationOnRoundedIcon;
  }
  return CategoryRoundedIcon;
};

const buildGroups = (rows: AFE[], groupBy: GroupByMode): AFEGroupCard[] => {
  const map = new Map<string, AFE[]>();

  rows.forEach((row) => {
    let key = UNASSIGNED;

    if (groupBy === "category") {
      key = normalizeKey(row.AFECategory);
    } else if (groupBy === "department") {
      key = getDepartmentKey(row);
    } else {
      key = getLocationKey(row);
    }

    const bucket = map.get(key);
    if (bucket) {
      bucket.push(row);
      return;
    }

    map.set(key, [row]);
  });

  return Array.from(map.entries())
    .map(([key, items]) => {
      const sortedItems = [...items].sort((a, b) => {
        const lineDiff = (a.SourceLineNo ?? 0) - (b.SourceLineNo ?? 0);
        if (lineDiff !== 0) {
          return lineDiff;
        }
        return Number(a.Id) - Number(b.Id);
      });

      const categoryCount = new Set(
        sortedItems
          .map((item) => item.AFECategory?.trim())
          .filter((value): value is string => Boolean(value))
      ).size;

      const budgetSum = sortedItems.reduce(
        (sum, item) =>
          sum +
          toBudgetNumber(item.ApprovedBudget ?? item.EstimatedBudget),
        0
      );

      const currencyCode =
        sortedItems.find((item) => item.CurrencyCode?.trim())?.CurrencyCode?.trim() ||
        "LYD";

      let titleEn = "";
      let titleAr = "";

      if (groupBy === "category") {
        titleEn = key === UNASSIGNED ? "No category assigned" : key;
      } else if (groupBy === "department") {
        const firstNamed = sortedItems.find((item) => getDepartmentName(item));
        titleEn =
          getDepartmentNameEn(firstNamed || sortedItems[0]) ||
          (key === UNASSIGNED ? "No department assigned" : key);
        titleAr = getDepartmentNameAr(firstNamed || sortedItems[0]);
      } else {
        const firstNamed = sortedItems.find((item) => getLocationName(item));
        titleEn =
          getLocationNameEn(firstNamed || sortedItems[0]) ||
          (key === UNASSIGNED ? "No location assigned" : key);
        titleAr = getLocationNameAr(firstNamed || sortedItems[0]);
      }

      return {
        key,
        titleEn,
        titleAr,
        count: sortedItems.length,
        categoryCount,
        budgetSum,
        currencyCode,
        items: sortedItems
      };
    })
    .sort((a, b) => {
      if (a.key === UNASSIGNED) return 1;
      if (b.key === UNASSIGNED) return -1;
      return a.titleEn.localeCompare(b.titleEn);
    });
};

const buildDialogSubGroups = (
  items: AFE[],
  dialogGroupBy: DialogGroupByMode
): DialogSubGroup[] => {
  const map = new Map<string, AFE[]>();

  items.forEach((row) => {
    let key = UNASSIGNED;

    if (dialogGroupBy === "status") {
      key = normalizeKey(row.Status);
    } else if (dialogGroupBy === "type") {
      key = normalizeKey(row.AFEType);
    } else {
      key = normalizeKey(row.AFECategory);
    }

    const bucket = map.get(key);
    if (bucket) {
      bucket.push(row);
      return;
    }

    map.set(key, [row]);
  });

  const statusOrder = new Map(AFE_STATUSES.map((status, index) => [status, index]));
  const typeOrder = new Map(AFE_TYPES.map((type, index) => [type, index]));

  return Array.from(map.entries())
    .map(([key, groupItems]) => {
      const sortedItems = [...groupItems].sort((a, b) => {
        const lineDiff = (a.SourceLineNo ?? 0) - (b.SourceLineNo ?? 0);
        if (lineDiff !== 0) {
          return lineDiff;
        }
        return Number(a.Id) - Number(b.Id);
      });

      return {
        key,
        title:
          key === UNASSIGNED
            ? dialogGroupBy === "status"
              ? "No status assigned"
              : dialogGroupBy === "type"
                ? "No type assigned"
                : "No category assigned"
            : key,
        count: sortedItems.length,
        activeCount: sortedItems.filter((item) => item.IsActive).length,
        inactiveCount: sortedItems.filter((item) => !item.IsActive).length,
        items: sortedItems
      };
    })
    .sort((a, b) => {
      if (a.key === UNASSIGNED) return 1;
      if (b.key === UNASSIGNED) return -1;

      if (dialogGroupBy === "status") {
        return (statusOrder.get(a.key as never) ?? 99) - (statusOrder.get(b.key as never) ?? 99);
      }

      if (dialogGroupBy === "type") {
        return (typeOrder.get(a.key as never) ?? 99) - (typeOrder.get(b.key as never) ?? 99);
      }

      return a.title.localeCompare(b.title);
    });
};

const SummaryCard = ({
  label,
  value,
  color
}: {
  label: string;
  value: number;
  color?: "primary" | "success" | "warning" | "error" | "info";
}) => (
  <Card variant="outlined" sx={{ flex: "1 1 160px", minWidth: 150 }}>
    <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography
        variant="h5"
        sx={{ fontWeight: 900, mt: 0.35 }}
        color={color ? `${color}.main` : "text.primary"}
      >
        {value.toLocaleString()}
      </Typography>
    </CardContent>
  </Card>
);

const getGroupPalette = (groupBy: GroupByMode) => {
  if (groupBy === "department") {
    return {
      main: "#2563eb",
      light: "#3b82f6",
      dark: "#1d4ed8",
      fold: "#1e3a8a",
      glow: "rgba(37, 99, 235, 0.28)"
    };
  }
  if (groupBy === "category") {
    return {
      main: "#7c3aed",
      light: "#8b5cf6",
      dark: "#6d28d9",
      fold: "#4c1d95",
      glow: "rgba(124, 58, 237, 0.28)"
    };
  }
  return {
    main: "#dc2626",
    light: "#ef4444",
    dark: "#b91c1c",
    fold: "#7f1d1d",
    glow: "rgba(220, 38, 38, 0.28)"
  };
};

const GroupRibbonTag = ({
  title,
  titleAr,
  groupBy,
  icon
}: {
  title: string;
  titleAr?: string;
  groupBy: GroupByMode;
  icon: ReactNode;
}) => {
  const palette = getGroupPalette(groupBy);

  return (
    <Box
      sx={{
        position: "relative",
        display: "inline-block",
        maxWidth: "100%",
        mb: 1.25,
        pl: 0.5
      }}
    >
      <Box
        sx={{
          position: "absolute",
          left: -7,
          top: 7,
          width: 8,
          height: "78%",
          bgcolor: palette.fold,
          transform: "skewY(-4deg)",
          borderRadius: "1px 0 0 1px",
          zIndex: 0,
          boxShadow: "inset -2px 0 4px rgba(0,0,0,0.25)"
        }}
      />

      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          display: "inline-flex",
          alignItems: "center",
          gap: 0.75,
          minHeight: 34,
          maxWidth: "100%",
          pl: 1.35,
          pr: 2.8,
          py: 0.7,
          color: "#fff",
          background: `linear-gradient(135deg, ${palette.light} 0%, ${palette.main} 55%, ${palette.dark} 100%)`,
          boxShadow: `0 4px 14px ${palette.glow}, 0 2px 4px rgba(0,0,0,0.18)`,
          clipPath:
            "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)",
          borderTop: "1px solid rgba(255,255,255,0.35)"
        }}
      >
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            borderRadius: "50%",
            bgcolor: "rgba(255,255,255,0.18)",
            flexShrink: 0,
            "& .MuiSvgIcon-root": { fontSize: 15 }
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: "0.78rem",
              lineHeight: 1.2,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              wordBreak: "break-word"
            }}
          >
            {title || "—"}
          </Typography>
          {titleAr ? (
            <Typography
              dir="rtl"
              sx={{
                mt: 0.2,
                fontSize: "0.68rem",
                lineHeight: 1.2,
                fontWeight: 700,
                opacity: 0.92,
                wordBreak: "break-word"
              }}
            >
              {titleAr}
            </Typography>
          ) : null}
        </Box>
      </Box>

      <Box
        sx={{
          position: "absolute",
          left: 0,
          bottom: -5,
          width: 0,
          height: 0,
          borderLeft: "7px solid transparent",
          borderTop: `6px solid ${palette.fold}`,
          zIndex: 0
        }}
      />
    </Box>
  );
};

const MetricChip = ({
  icon,
  label,
  value,
  accent
}: {
  icon: ReactNode;
  label: string;
  value: string;
  accent: string;
}) => (
  <Chip
    size="small"
    icon={
      <Box
        component="span"
        sx={{
          display: "inline-flex",
          color: accent,
          "& .MuiSvgIcon-root": { fontSize: 15 }
        }}
      >
        {icon}
      </Box>
    }
    label={
      <Box sx={{ py: 0.15, lineHeight: 1.15 }}>
        <Typography
          component="span"
          sx={{
            display: "block",
            fontSize: "0.62rem",
            fontWeight: 700,
            color: "text.secondary",
            lineHeight: 1.1
          }}
        >
          {label}
        </Typography>
        <Typography
          component="span"
          sx={{
            display: "block",
            fontSize: "0.78rem",
            fontWeight: 800,
            lineHeight: 1.2
          }}
        >
          {value}
        </Typography>
      </Box>
    }
    sx={{
      flex: "1 1 0",
      minWidth: 0,
      height: "auto",
      borderRadius: 2,
      border: "1px solid",
      borderColor: "divider",
      bgcolor: "action.hover",
      "& .MuiChip-icon": {
        ml: 0.75,
        mr: -0.25
      },
      "& .MuiChip-label": {
        px: 0.85,
        py: 0.55,
        whiteSpace: "normal",
        overflow: "hidden"
      }
    }}
  />
);

export default function AFEsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [groupBy, setGroupBy] = useState<GroupByMode>("location");
  const [rows, setRows] = useState<AFE[]>([]);
  const [summary, setSummary] = useState<AFESummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<AFEGroupCard | null>(null);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [dialogGroupBy, setDialogGroupBy] = useState<DialogGroupByMode>("status");
  const [dialogExpandedKey, setDialogExpandedKey] = useState<string | false>(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<AFEDialogMode>("edit");
  const [editTarget, setEditTarget] = useState<AFE | null>(null);
  const [statusBusyId, setStatusBusyId] = useState<number | null>(null);

  const openDialog = (mode: AFEDialogMode, row: AFE | null = null) => {
    setDialogMode(mode);
    setEditTarget(row);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditTarget(null);
  };

  const openGroupDialog = (group: AFEGroupCard) => {
    setSelectedGroup(group);
    setDialogGroupBy("status");
    setGroupDialogOpen(true);
  };

  const closeGroupDialog = () => {
    setGroupDialogOpen(false);
    setSelectedGroup(null);
    setDialogExpandedKey(false);
  };

  const loadAfes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await afesApi.list({
        page: 1,
        pageSize: 1000,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(statusFilter ? { Status: statusFilter } : {}),
        ...(typeFilter ? { AFEType: typeFilter } : {}),
        ...(activeFilter ? { IsActive: activeFilter } : {})
      });

      if (!response.success) {
        setError(response.message || "Failed to load AFEs");
        setRows([]);
        setSummary(emptySummary);
        return;
      }

      setRows(response.data);
      setSummary(response.summary || emptySummary);
    } catch {
      setError("Failed to load AFEs");
      setRows([]);
      setSummary(emptySummary);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, search, statusFilter, typeFilter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAfes();
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [loadAfes]);

  const groups = useMemo(() => buildGroups(rows, groupBy), [groupBy, rows]);

  const dialogSubGroups = useMemo(
    () => buildDialogSubGroups(selectedGroup?.items ?? [], dialogGroupBy),
    [dialogGroupBy, selectedGroup?.items]
  );

  useEffect(() => {
    if (!groupDialogOpen || !dialogSubGroups.length) {
      setDialogExpandedKey(false);
      return;
    }

    setDialogExpandedKey((current) => {
      if (current && dialogSubGroups.some((group) => group.key === current)) {
        return current;
      }
      return dialogSubGroups[0]?.key ?? false;
    });
  }, [dialogGroupBy, dialogSubGroups, groupDialogOpen]);

  useEffect(() => {
    if (!groupDialogOpen || !selectedGroup) {
      return;
    }

    const selectedKey = selectedGroup.key;
    const refreshed = groups.find((group) => group.key === selectedKey);

    if (!refreshed) {
      setGroupDialogOpen(false);
      setSelectedGroup(null);
      return;
    }

    if (refreshed.items !== selectedGroup.items) {
      setSelectedGroup(refreshed);
    }
  }, [groupDialogOpen, groups, selectedGroup]);

  const handleToggleActive = async (row: AFE) => {
    setStatusBusyId(row.Id);
    setError(null);

    try {
      const response = await afesApi.updateStatus(row.Id, {
        IsActive: !row.IsActive
      });
      const result = response.data as {
        success?: boolean;
        message?: string;
        errors?: string[];
      };

      if (!result.success) {
        setError(
          result.errors?.join(", ") ||
            result.message ||
            "Failed to update AFE active flag"
        );
        return;
      }

      await loadAfes();
    } catch {
      setError("Failed to update AFE active flag");
    } finally {
      setStatusBusyId(null);
    }
  };

  const handleExport = () => {
    const exportRows = selectedGroup?.items ?? rows;
    const cell = (value: string | number | null | undefined): string | number =>
      value === null || value === undefined ? "" : value;

    exportToExcel(
      selectedGroup ? `afe-group-${selectedGroup.titleEn}` : "afe-master-list",
      [
        { header: "Id", value: (row) => row.Id },
        { header: "SourceLineNo", value: (row) => cell(row.SourceLineNo) },
        { header: "ImportBatchNo", value: (row) => cell(row.ImportBatchNo) },
        { header: "AFENo", value: (row) => row.AFENo },
        { header: "AFEDescription", value: (row) => row.AFEDescription },
        {
          header: "AFEDescriptionArabic",
          value: (row) => cell(row.AFEDescriptionArabic)
        },
        { header: "LegacyDescription", value: (row) => cell(row.LegacyDescription) },
        { header: "LocationName_en", value: (row) => cell(getLocationNameEn(row)) },
        { header: "LocationName_ar", value: (row) => cell(getLocationNameAr(row)) },
        {
          header: "DepartmentName_English",
          value: (row) => cell(getDepartmentNameEn(row))
        },
        {
          header: "DepartmentName_Arabic",
          value: (row) => cell(getDepartmentNameAr(row))
        },
        { header: "AFEType", value: (row) => row.AFEType },
        { header: "AFECategory", value: (row) => cell(row.AFECategory) },
        { header: "ProjectNature", value: (row) => cell(row.ProjectNature) },
        { header: "Status", value: (row) => row.Status },
        { header: "CurrencyCode", value: (row) => row.CurrencyCode },
        { header: "EstimatedBudget", value: (row) => cell(row.EstimatedBudget) },
        { header: "ApprovedBudget", value: (row) => cell(row.ApprovedBudget) },
        { header: "CommittedAmount", value: (row) => row.CommittedAmount },
        { header: "ActualAmount", value: (row) => row.ActualAmount },
        { header: "RemainingBudget", value: (row) => cell(row.RemainingBudget) },
        { header: "IsActive", value: (row) => (row.IsActive ? "Yes" : "No") }
      ],
      exportRows
    );
  };

  const detailColumns = useMemo<GridColDef<AFE>[]>(
    () => [
      {
        field: "SourceLineNo",
        headerName: "Source Line",
        width: 110
      },
      {
        field: "AFENo",
        headerName: "AFE No",
        width: 120,
        renderCell: (params) => (
          <Typography
            variant="body2"
            sx={{ fontWeight: 800, color: "primary.main", lineHeight: 1.2 }}
          >
            {params.row.AFENo}
          </Typography>
        )
      },
      {
        field: "AFEDescription",
        headerName: "Description (EN)",
        minWidth: 220,
        flex: 1.2,
        renderCell: (params) => (
          <Stack sx={{ py: 0.5, lineHeight: 1.2 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {params.row.AFEDescription}
            </Typography>
            {params.row.AFEDescriptionArabic ? (
              <Typography
                variant="caption"
                color="text.secondary"
                dir="rtl"
                sx={{ display: "block" }}
              >
                {params.row.AFEDescriptionArabic}
              </Typography>
            ) : null}
          </Stack>
        )
      },
      {
        field: "LocationName",
        headerName: "LocationName_en / ar",
        minWidth: 180,
        flex: 0.8,
        valueGetter: (_value, row) => getLocationName(row) || "—",
        renderCell: (params) => (
          <Stack sx={{ py: 0.4, lineHeight: 1.2 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {getLocationNameEn(params.row) || "—"}
            </Typography>
            {getLocationNameAr(params.row) ? (
              <Typography variant="caption" color="text.secondary" dir="rtl">
                {getLocationNameAr(params.row)}
              </Typography>
            ) : null}
          </Stack>
        )
      },
      {
        field: "DepartmentName",
        headerName: "DepartmentName_English / Arabic",
        minWidth: 200,
        flex: 0.9,
        valueGetter: (_value, row) => getDepartmentName(row) || "—",
        renderCell: (params) => (
          <Stack sx={{ py: 0.4, lineHeight: 1.2 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {getDepartmentNameEn(params.row) || "—"}
            </Typography>
            {getDepartmentNameAr(params.row) ? (
              <Typography variant="caption" color="text.secondary" dir="rtl">
                {getDepartmentNameAr(params.row)}
              </Typography>
            ) : null}
          </Stack>
        )
      },
      { field: "AFECategory", headerName: "Category", width: 130 },
      { field: "AFEType", headerName: "Type", width: 120 },
      {
        field: "Status",
        headerName: "Status",
        width: 120,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.row.Status}
            color={statusChipColor(params.row.Status)}
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
        )
      },
      {
        field: "ApprovedBudget",
        headerName: "Approved",
        width: 120,
        valueFormatter: (value) => formatMoney(value as number | null)
      },
      {
        field: "RemainingBudget",
        headerName: "Remaining",
        width: 120,
        valueFormatter: (value) => formatMoney(value as number | null)
      },
      {
        field: "IsActive",
        headerName: "Active",
        width: 90,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.row.IsActive ? "Yes" : "No"}
            color={params.row.IsActive ? "success" : "default"}
            variant="outlined"
          />
        )
      },
      {
        field: "actions",
        headerName: "Actions",
        width: 140,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.25}>
            <Tooltip title="View">
              <IconButton
                size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  openDialog("view", params.row);
                }}
              >
                <VisibilityRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit">
              <IconButton
                size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  openDialog("edit", params.row);
                }}
              >
                <EditRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={params.row.IsActive ? "Deactivate" : "Activate"}>
              <span>
                <IconButton
                  size="small"
                  disabled={statusBusyId === params.row.Id}
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleToggleActive(params.row);
                  }}
                >
                  <PowerSettingsNewRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        )
      }
    ],
    [statusBusyId]
  );

  const groupByLabel =
    groupBy === "category"
      ? "Categories"
      : groupBy === "department"
        ? "Departments"
        : "Locations";

  return (
    <Box>
      <Stack spacing={0.35} sx={{ mb: 1.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
          AFE Management
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Browse distinct {groupByLabel.toLowerCase()} as cards. Click a card to open
          AFE details. Each AFE row stays unique by Id — AFENo may be duplicated.
        </Typography>
      </Stack>

      <Stack
        direction="row"
        spacing={1.25}
        useFlexGap
        flexWrap="wrap"
        sx={{ mb: 1.75 }}
      >
        <SummaryCard label="Total AFE Records" value={summary.total} color="primary" />
        <SummaryCard label="Active AFEs" value={summary.active} color="success" />
        <SummaryCard label="On Hold AFEs" value={summary.onHold} color="warning" />
        <SummaryCard label="Closed AFEs" value={summary.closed} color="info" />
        <SummaryCard label="Cancelled AFEs" value={summary.cancelled} color="error" />
        <SummaryCard label={`${groupByLabel} Cards`} value={groups.length} />
      </Stack>

      <DataGridToolbar
        search={search}
        onSearchChange={setSearch}
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            <ToggleButtonGroup
              exclusive
              size="small"
              value={groupBy}
              onChange={(_event, value: GroupByMode | null) => {
                if (value) {
                  setGroupBy(value);
                }
              }}
            >
              <ToggleButton value="category">
                <CategoryRoundedIcon sx={{ fontSize: 16, mr: 0.6 }} />
                Categories
              </ToggleButton>
              <ToggleButton value="department">
                <BusinessRoundedIcon sx={{ fontSize: 16, mr: 0.6 }} />
                Department
              </ToggleButton>
              <ToggleButton value="location">
                <LocationOnRoundedIcon sx={{ fontSize: 16, mr: 0.6 }} />
                Location
              </ToggleButton>
            </ToggleButtonGroup>

            <TextField
              select
              size="small"
              label="Status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              sx={{ minWidth: 130 }}
            >
              <MenuItem value="">All</MenuItem>
              {AFE_STATUSES.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Type"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="">All</MenuItem>
              {AFE_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Active"
              value={activeFilter}
              onChange={(event) => setActiveFilter(event.target.value)}
              sx={{ minWidth: 110 }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="true">Yes</MenuItem>
              <MenuItem value="false">No</MenuItem>
            </TextField>
            <Button
              variant="outlined"
              startIcon={<RefreshRoundedIcon />}
              onClick={() => void loadAfes()}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => openDialog("create")}
            >
              New AFE
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileDownloadRoundedIcon />}
              onClick={handleExport}
              disabled={loading || rows.length === 0}
            >
              Export to Excel
            </Button>
          </Stack>
        }
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" sx={{ py: 8 }}>
          <CircularProgress size={32} />
        </Box>
      ) : groups.length === 0 ? (
        <Alert severity="info">No AFE groups match the current filters.</Alert>
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: {
              xs: "1fr",
              sm: "1fr 1fr",
              md: "1fr 1fr 1fr",
              lg: "1fr 1fr 1fr 1fr"
            }
          }}
        >
          {groups.map((group) => {
            const GroupIcon = getGroupIcon(groupBy);
            const palette = getGroupPalette(groupBy);

            return (
              <Card
                key={`${groupBy}-${group.key}`}
                variant="outlined"
                sx={{
                  position: "relative",
                  overflow: "visible",
                  borderRadius: 2.5,
                  border: "1px solid",
                  borderColor: "divider",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 28%), background.paper",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                  transition:
                    "transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    inset: 0,
                    borderRadius: "inherit",
                    padding: "1px",
                    background: `linear-gradient(145deg, ${palette.light}55, transparent 42%, ${palette.main}33)`,
                    WebkitMask:
                      "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude",
                    pointerEvents: "none"
                  },
                  "&:hover": {
                    transform: "translateY(-3px)",
                    borderColor: palette.main,
                    boxShadow: `0 10px 24px ${palette.glow}, 0 4px 10px rgba(0,0,0,0.12)`
                  }
                }}
              >
                <CardActionArea
                  onClick={() => openGroupDialog(group)}
                  sx={{
                    height: "100%",
                    borderRadius: "inherit",
                    alignItems: "stretch"
                  }}
                >
                  <CardContent
                    sx={{
                      pt: 2.2,
                      pb: 1.6,
                      px: 1.6,
                      "&:last-child": { pb: 1.6 }
                    }}
                  >
                    <GroupRibbonTag
                      title={group.titleEn}
                      titleAr={group.titleAr}
                      groupBy={groupBy}
                      icon={<GroupIcon fontSize="small" />}
                    />

                    <Stack
                      direction="row"
                      spacing={0.75}
                      useFlexGap
                      sx={{ mt: 0.75, flexWrap: { xs: "wrap", sm: "nowrap" } }}
                    >
                      <MetricChip
                        icon={<AssignmentRoundedIcon />}
                        label="AFE count"
                        value={group.count.toLocaleString()}
                        accent={palette.main}
                      />
                      <MetricChip
                        icon={<CategoryRoundedIcon />}
                        label="Categories"
                        value={group.categoryCount.toLocaleString()}
                        accent={palette.main}
                      />
                      <MetricChip
                        icon={<AccountBalanceWalletRoundedIcon />}
                        label="Sum budget"
                        value={formatBudget(group.budgetSum, group.currencyCode)}
                        accent={palette.main}
                      />
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      )}

      <Dialog
        open={groupDialogOpen}
        onClose={closeGroupDialog}
        fullWidth
        maxWidth={false}
        PaperProps={{
          sx: {
            width: "min(98vw, 1800px)",
            maxWidth: "98vw",
            m: 1
          }
        }}
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            {(() => {
              const GroupIcon = getGroupIcon(groupBy);
              return <GroupIcon color="primary" />;
            })()}
            <Stack spacing={0.2} sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                {selectedGroup?.titleEn ?? "AFE Group"}
              </Typography>
              {selectedGroup?.titleAr ? (
                <Typography variant="body2" color="text.secondary" dir="rtl">
                  {selectedGroup.titleAr}
                </Typography>
              ) : null}
            </Stack>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ overflow: "visible" }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="space-between"
            sx={{ mb: 1.25 }}
          >
            <ToggleButtonGroup
              exclusive
              size="small"
              value={dialogGroupBy}
              onChange={(_event, value: DialogGroupByMode | null) => {
                if (value) {
                  setDialogGroupBy(value);
                }
              }}
              sx={{ flexWrap: "wrap" }}
            >
              <ToggleButton value="status">
                <CheckCircleRoundedIcon sx={{ fontSize: 16, mr: 0.6 }} />
                Status
              </ToggleButton>
              <ToggleButton value="type">
                <LabelRoundedIcon sx={{ fontSize: 16, mr: 0.6 }} />
                Type
              </ToggleButton>
              <ToggleButton value="category">
                <CategoryRoundedIcon sx={{ fontSize: 16, mr: 0.6 }} />
                Categories
              </ToggleButton>
            </ToggleButtonGroup>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                label={`AFE count: ${selectedGroup?.count ?? 0}`}
                sx={{ fontWeight: 700 }}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`Categories: ${selectedGroup?.categoryCount ?? 0}`}
                sx={{ fontWeight: 700 }}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`Sum budget: ${formatBudget(
                  selectedGroup?.budgetSum ?? 0,
                  selectedGroup?.currencyCode || "LYD"
                )}`}
                sx={{ fontWeight: 700 }}
              />
            </Stack>
          </Stack>

          <Stack spacing={1}>
            {dialogSubGroups.map((subGroup) => (
              <Accordion
                key={`${dialogGroupBy}-${subGroup.key}`}
                disableGutters
                expanded={dialogExpandedKey === subGroup.key}
                onChange={(_event, expanded) => {
                  setDialogExpandedKey(expanded ? subGroup.key : false);
                }}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: "10px !important",
                  overflow: "hidden",
                  "&:before": { display: "none" }
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%", pr: 1 }}>
                    <Typography sx={{ fontWeight: 800, flex: 1 }}>
                      {subGroup.title}
                    </Typography>
                    <Chip
                      size="small"
                      label={`${subGroup.count} AFE`}
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                    <Chip
                      size="small"
                      label={`${subGroup.activeCount} active`}
                      color="success"
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                    <Chip
                      size="small"
                      label={`${subGroup.inactiveCount} not active`}
                      color="default"
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <Box sx={tableContainerSx}>
                    <DataGrid
                      autoHeight
                      rows={subGroup.items}
                      columns={detailColumns}
                      getRowId={(row) => row.Id}
                      pageSizeOptions={[6, 10, 25, 50]}
                      initialState={{
                        pagination: { paginationModel: { pageSize: 6, page: 0 } }
                      }}
                      disableRowSelectionOnClick
                      getRowHeight={() => "auto"}
                      sx={{
                        ...dataGridSx,
                        "& .MuiDataGrid-main": { overflow: "hidden" },
                        "& .MuiDataGrid-virtualScroller": {
                          overflowY: "hidden !important"
                        }
                      }}
                    />
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        </DialogContent>        <DialogActions>
          <Button
            startIcon={<FileDownloadRoundedIcon />}
            onClick={handleExport}
            disabled={!selectedGroup?.items.length}
          >
            Export Group
          </Button>
          <Button onClick={closeGroupDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      <AFEEditDialog
        open={dialogOpen}
        mode={dialogMode}
        afe={editTarget}
        onClose={closeDialog}
        onSaved={() => void loadAfes()}
      />
    </Box>
  );
}
