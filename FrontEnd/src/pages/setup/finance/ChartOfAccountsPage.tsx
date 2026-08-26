import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import UnfoldMoreRoundedIcon from "@mui/icons-material/UnfoldMoreRounded";
import UnfoldLessRoundedIcon from "@mui/icons-material/UnfoldLessRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Typography
} from "@mui/material";
import { DataGrid, type GridColDef, type GridRowClassNameParams } from "@mui/x-data-grid";
import { useCallback, useEffect, useMemo, useState } from "react";
import { chartOfAccountsApi } from "../../../api/chartOfAccounts.api";
import { DataGridToolbar } from "../../../components/DataGridToolbar";
import type { ChartOfAccounts } from "../../../types/chartOfAccounts.types";
import { exportToExcel } from "../../../utils/exportExcel";
import {
  ChartOfAccountsEditDialog,
  type ChartOfAccountsEditTarget
} from "./ChartOfAccountsEditDialog";

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
  "& .coa-class-row": {
    bgcolor: "action.selected",
    fontWeight: 700,
    "&:hover": {
      bgcolor: "action.selected"
    }
  },
  "& .coa-group-row": {
    bgcolor: "action.hover",
    fontWeight: 600,
    "&:hover": {
      bgcolor: "action.selected"
    }
  },
  "[data-toolpad-color-scheme='light'] &": {
    bgcolor: "#ffffff",
    "& .MuiDataGrid-columnHeaders, & .MuiDataGrid-footerContainer, & .MuiDataGrid-overlay": {
      bgcolor: "#ffffff"
    }
  }
};

type AccountLeafRow = ChartOfAccountsEditTarget & {
  rowType: "leaf";
  classKey: string;
  groupKey: string;
};

type AccountClassRow = {
  id: string;
  rowType: "class";
  classKey: string;
  groupKey: string;
  accountClassName: string;
  accountCount: number;
  newAccountCode: string;
  type: string;
  legacyAcct: string;
  cleanDescription: string;
  accountGroupCode: string;
  accountGroupName: string;
  analyticTemplate: string;
  isActive: boolean;
};

type AccountGroupRow = {
  id: string;
  rowType: "group";
  classKey: string;
  groupKey: string;
  accountClassName: string;
  accountGroupCode: string;
  accountGroupName: string;
  accountCount: number;
  newAccountCode: string;
  type: string;
  legacyAcct: string;
  cleanDescription: string;
  analyticTemplate: string;
  isActive: boolean;
};

type CoaTreeRow = AccountClassRow | AccountGroupRow | AccountLeafRow;

const CLASS_SORT_ORDER = [
  "Assets",
  "Liabilities",
  "Equity",
  "Revenue",
  "Expenses",
  "Allocations",
  "Needs Review"
];

const toLeaf = (item: ChartOfAccounts): AccountLeafRow => ({
  id: Number(item.Id),
  rowType: "leaf",
  classKey: item.AccountClassName || "Unknown",
  groupKey: item.AccountGroupCode || "unknown",
  newAccountCode: item.NewAccountCode,
  type: item.Type ?? "",
  legacyAcct: item.LegacyAcct ?? "",
  cleanDescription: item.CleanDescription,
  legacyDescription: item.LegacyDescription ?? "",
  accountClassName: item.AccountClassName,
  accountGroupCode: item.AccountGroupCode,
  accountGroupName: item.AccountGroupName,
  suggestedModule: item.SuggestedModule ?? "",
  analyticTemplate: item.AnalyticTemplate ?? "",
  isActive: item.IsActive
});

const buildGroupedTree = (
  leaves: AccountLeafRow[],
  expandedClasses: Set<string>,
  expandedGroups: Set<string>
): CoaTreeRow[] => {
  const classMap = new Map<
    string,
    Map<string, { accountGroupName: string; children: AccountLeafRow[] }>
  >();

  leaves.forEach((leaf) => {
    let groups = classMap.get(leaf.classKey);
    if (!groups) {
      groups = new Map();
      classMap.set(leaf.classKey, groups);
    }

    const existing = groups.get(leaf.groupKey);
    if (existing) {
      existing.children.push(leaf);
      return;
    }

    groups.set(leaf.groupKey, {
      accountGroupName: leaf.accountGroupName || leaf.groupKey,
      children: [leaf]
    });
  });

  const sortedClasses = Array.from(classMap.keys()).sort((a, b) => {
    const ai = CLASS_SORT_ORDER.indexOf(a);
    const bi = CLASS_SORT_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) {
      return a.localeCompare(b);
    }
    if (ai === -1) {
      return 1;
    }
    if (bi === -1) {
      return -1;
    }
    return ai - bi;
  });

  const treeRows: CoaTreeRow[] = [];

  sortedClasses.forEach((classKey) => {
    const groups = classMap.get(classKey)!;
    const sortedGroups = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const classAccountCount = sortedGroups.reduce((sum, [, group]) => sum + group.children.length, 0);

    treeRows.push({
      id: `class-${classKey}`,
      rowType: "class",
      classKey,
      groupKey: "",
      accountClassName: classKey,
      accountCount: classAccountCount,
      newAccountCode: "",
      type: "",
      legacyAcct: "",
      cleanDescription: "",
      accountGroupCode: "",
      accountGroupName: "",
      analyticTemplate: "",
      isActive: true
    });

    if (!expandedClasses.has(classKey)) {
      return;
    }

    sortedGroups.forEach(([groupKey, group]) => {
      const children = [...group.children].sort((a, b) =>
        a.newAccountCode.localeCompare(b.newAccountCode)
      );

      treeRows.push({
        id: `group-${classKey}-${groupKey}`,
        rowType: "group",
        classKey,
        groupKey,
        accountClassName: classKey,
        accountGroupCode: groupKey,
        accountGroupName: group.accountGroupName,
        accountCount: children.length,
        newAccountCode: "",
        type: "",
        legacyAcct: "",
        cleanDescription: "",
        analyticTemplate: "",
        isActive: true
      });

      if (expandedGroups.has(`${classKey}::${groupKey}`)) {
        treeRows.push(...children);
      }
    });
  });

  return treeRows;
};

export default function ChartOfAccountsPage() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<AccountLeafRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("edit");
  const [editTarget, setEditTarget] = useState<AccountLeafRow | null>(null);
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const openCreateDialog = () => {
    setDialogMode("create");
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEditDialog = (row: AccountLeafRow) => {
    setDialogMode("edit");
    setEditTarget(row);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditTarget(null);
  };

  const toggleClass = (classKey: string) => {
    setExpandedClasses((current) => {
      const next = new Set(current);
      if (next.has(classKey)) {
        next.delete(classKey);
      } else {
        next.add(classKey);
      }
      return next;
    });
  };

  const toggleGroup = (classKey: string, groupKey: string) => {
    const key = `${classKey}::${groupKey}`;
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const allClassKeys = useMemo(
    () => Array.from(new Set(rows.map((row) => row.classKey))),
    [rows]
  );

  const allGroupKeys = useMemo(
    () => Array.from(new Set(rows.map((row) => `${row.classKey}::${row.groupKey}`))),
    [rows]
  );

  const expandAll = () => {
    setExpandedClasses(new Set(allClassKeys));
    setExpandedGroups(new Set(allGroupKeys));
  };

  const collapseAll = () => {
    setExpandedClasses(new Set());
    setExpandedGroups(new Set());
  };

  const loadAccounts = useCallback(async (searchValue: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await chartOfAccountsApi.list(
        searchValue.trim() ? { search: searchValue.trim() } : undefined
      );

      if (!response.success) {
        setError(response.message || "Failed to load chart of accounts");
        setRows([]);
        return;
      }

      const leafRows = response.data.map(toLeaf);
      setRows(leafRows);

      // Auto-expand matching results when searching
      if (searchValue.trim()) {
        setExpandedClasses(new Set(leafRows.map((row) => row.classKey)));
        setExpandedGroups(new Set(leafRows.map((row) => `${row.classKey}::${row.groupKey}`)));
      }
    } catch {
      setError("Failed to load chart of accounts");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAccounts(search);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [loadAccounts, search]);

  const treeRows = useMemo(
    () => buildGroupedTree(rows, expandedClasses, expandedGroups),
    [expandedClasses, expandedGroups, rows]
  );

  const handleExport = () => {
    exportToExcel(
      "chart-of-accounts",
      [
        { header: "New Account Code", value: (row) => row.newAccountCode },
        { header: "Type", value: (row) => row.type },
        { header: "Legacy Acct", value: (row) => row.legacyAcct },
        { header: "Clean Description", value: (row) => row.cleanDescription },
        { header: "Legacy Description", value: (row) => row.legacyDescription },
        { header: "Class", value: (row) => row.accountClassName },
        { header: "Group Code", value: (row) => row.accountGroupCode },
        { header: "Group Name", value: (row) => row.accountGroupName },
        { header: "Module", value: (row) => row.suggestedModule },
        { header: "Analytic Template", value: (row) => row.analyticTemplate },
        { header: "Active", value: (row) => (row.isActive ? "Yes" : "No") }
      ],
      rows
    );
  };

  const columns = useMemo<GridColDef<CoaTreeRow>[]>(
    () => [
      {
        field: "accountLabel",
        headerName: "Account Structure",
        minWidth: 320,
        flex: 1.4,
        sortable: false,
        renderCell: (params) => {
          if (params.row.rowType === "class") {
            const expanded = expandedClasses.has(params.row.classKey);
            return (
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ height: "100%" }}>
                <IconButton
                  size="small"
                  aria-label={expanded ? "Collapse class" : "Expand class"}
                  onClick={() => toggleClass(params.row.classKey)}
                >
                  {expanded ? (
                    <ExpandMoreRoundedIcon fontSize="small" />
                  ) : (
                    <ChevronRightRoundedIcon fontSize="small" />
                  )}
                </IconButton>
                <Typography variant="body2" fontWeight={700}>
                  {params.row.accountClassName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ({params.row.accountCount})
                </Typography>
              </Stack>
            );
          }

          if (params.row.rowType === "group") {
            const groupExpandKey = `${params.row.classKey}::${params.row.groupKey}`;
            const expanded = expandedGroups.has(groupExpandKey);
            return (
              <Stack
                direction="row"
                spacing={0.5}
                alignItems="center"
                sx={{ height: "100%", pl: 3 }}
              >
                <IconButton
                  size="small"
                  aria-label={expanded ? "Collapse group" : "Expand group"}
                  onClick={() => toggleGroup(params.row.classKey, params.row.groupKey)}
                >
                  {expanded ? (
                    <ExpandMoreRoundedIcon fontSize="small" />
                  ) : (
                    <ChevronRightRoundedIcon fontSize="small" />
                  )}
                </IconButton>
                <Typography variant="body2" fontWeight={600}>
                  {params.row.accountGroupCode} — {params.row.accountGroupName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ({params.row.accountCount})
                </Typography>
              </Stack>
            );
          }

          return (
            <Typography variant="body2" sx={{ pl: 8 }}>
              {params.row.newAccountCode}
            </Typography>
          );
        }
      },
      {
        field: "type",
        headerName: "Type",
        width: 70,
        valueGetter: (_value, row) => (row.rowType === "leaf" ? row.type : "")
      },
      {
        field: "legacyAcct",
        headerName: "Legacy",
        width: 100,
        valueGetter: (_value, row) => (row.rowType === "leaf" ? row.legacyAcct : "")
      },
      {
        field: "cleanDescription",
        headerName: "Clean Description",
        minWidth: 260,
        flex: 1.2,
        valueGetter: (_value, row) => (row.rowType === "leaf" ? row.cleanDescription : "")
      },
      {
        field: "analyticTemplate",
        headerName: "Analytic",
        width: 160,
        valueGetter: (_value, row) => (row.rowType === "leaf" ? row.analyticTemplate : "")
      },
      {
        field: "isActive",
        headerName: "Status",
        width: 140,
        renderCell: (params) => {
          if (params.row.rowType !== "leaf") {
            return null;
          }

          if (params.row.accountClassName === "Needs Review") {
            return <Chip size="small" label="Needs Review" color="warning" />;
          }

          return (
            <Chip
              size="small"
              label={params.row.isActive ? "Active" : "Inactive"}
              color={params.row.isActive ? "success" : "default"}
              variant={params.row.isActive ? "filled" : "outlined"}
            />
          );
        }
      },
      {
        field: "actions",
        headerName: "Actions",
        width: 100,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const row = params.row;

          if (row.rowType !== "leaf") {
            return null;
          }

          return (
            <IconButton
              size="small"
              aria-label="Edit chart of accounts"
              onClick={() => openEditDialog(row)}
            >
              <EditRoundedIcon fontSize="small" />
            </IconButton>
          );
        }
      }
    ],
    [expandedClasses, expandedGroups]
  );

  return (
    <Box>
      <DataGridToolbar
        search={search}
        onSearchChange={setSearch}
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              startIcon={<UnfoldMoreRoundedIcon />}
              onClick={expandAll}
              disabled={loading || allClassKeys.length === 0}
            >
              Expand All
            </Button>
            <Button
              variant="outlined"
              startIcon={<UnfoldLessRoundedIcon />}
              onClick={collapseAll}
              disabled={loading || allClassKeys.length === 0}
            >
              Collapse All
            </Button>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateDialog}>
              New Account
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
        <Box display="flex" justifyContent="center" py={6} sx={tableContainerSx}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <Box sx={tableContainerSx}>
          <DataGrid
            autoHeight
            rows={treeRows}
            columns={columns}
            pageSizeOptions={[10, 50, 100, { value: -1, label: "All" }]}
            initialState={{
              pagination: { paginationModel: { pageSize: 50 } }
            }}
            disableRowSelectionOnClick
            getRowClassName={(params: GridRowClassNameParams<CoaTreeRow>) => {
              if (params.row.rowType === "class") {
                return "coa-class-row";
              }
              if (params.row.rowType === "group") {
                return "coa-group-row";
              }
              return "";
            }}
            sx={dataGridSx}
          />
        </Box>
      )}

      <ChartOfAccountsEditDialog
        open={dialogOpen}
        mode={dialogMode}
        account={editTarget}
        onClose={closeDialog}
        onSaved={() => void loadAccounts(search)}
      />
    </Box>
  );
}
