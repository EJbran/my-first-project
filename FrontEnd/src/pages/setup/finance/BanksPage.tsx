import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import UnfoldMoreRoundedIcon from "@mui/icons-material/UnfoldMoreRounded";
import UnfoldLessRoundedIcon from "@mui/icons-material/UnfoldLessRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import TagRoundedIcon from "@mui/icons-material/TagRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  Typography
} from "@mui/material";
import { DataGrid, type GridColDef, type GridRowClassNameParams } from "@mui/x-data-grid";
import { useCallback, useEffect, useMemo, useState } from "react";
import { banksApi } from "../../../api/banks.api";
import { DataGridToolbar } from "../../../components/DataGridToolbar";
import type { Bank } from "../../../types/bank.types";
import { exportToExcel } from "../../../utils/exportExcel";
import { BankEditDialog, type BankEditTarget } from "./BankEditDialog";
import {
  BankSerialChecksDialog,
  type BankSerialChecksBankTarget
} from "./BankSerialChecksDialog";

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
  "& .bank-group-row": {
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

type BankLeafRow = BankEditTarget & {
  rowType: "leaf";
  groupKey: string;
};

type BankGroupRow = {
  id: string;
  rowType: "group";
  groupKey: string;
  bankId: number | null;
  bankName: string;
  branchCount: number;
  branch: string;
  serialNumId: number | null;
  glCreditAccount: string;
};

type BankTreeRow = BankGroupRow | BankLeafRow;

const UNASSIGNED_KEY = "unassigned";
const UNASSIGNED_LABEL = "Unassigned";

const toLeaf = (item: Bank): BankLeafRow => {
  const bankId = item.BankId;
  const bankName =
    item.BankGeneral?.BackName?.trim() ||
    (bankId != null ? `Bank ${bankId}` : UNASSIGNED_LABEL);

  return {
    id: item.Id,
    rowType: "leaf",
    groupKey: bankId == null ? UNASSIGNED_KEY : `bank-${bankId}`,
    bankId,
    bankName,
    branch: item.Branch ?? "",
    serialNumId: item.SerialNum_Id,
    glCreditAccount: item.GLCreditAccount ?? ""
  };
};

const buildGroupedTree = (
  leaves: BankLeafRow[],
  expandedGroups: Set<string>
): BankTreeRow[] => {
  const groups = new Map<string, { bankId: number | null; bankName: string; children: BankLeafRow[] }>();

  leaves.forEach((leaf) => {
    const existing = groups.get(leaf.groupKey);
    if (existing) {
      existing.children.push(leaf);
      return;
    }

    groups.set(leaf.groupKey, {
      bankId: leaf.bankId,
      bankName: leaf.bankName || UNASSIGNED_LABEL,
      children: [leaf]
    });
  });

  const sortedGroups = Array.from(groups.entries()).sort((a, b) =>
    a[1].bankName.localeCompare(b[1].bankName)
  );

  const treeRows: BankTreeRow[] = [];

  sortedGroups.forEach(([groupKey, group]) => {
    const children = [...group.children].sort((a, b) =>
      (a.branch || String(a.id)).localeCompare(b.branch || String(b.id))
    );

    treeRows.push({
      id: `group-${groupKey}`,
      rowType: "group",
      groupKey,
      bankId: group.bankId,
      bankName: group.bankName,
      branchCount: children.length,
      branch: "",
      serialNumId: null,
      glCreditAccount: ""
    });

    if (expandedGroups.has(groupKey)) {
      treeRows.push(...children);
    }
  });

  return treeRows;
};

export default function BanksPage() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<BankLeafRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("edit");
  const [editTarget, setEditTarget] = useState<BankLeafRow | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [serialDialogOpen, setSerialDialogOpen] = useState(false);
  const [serialBank, setSerialBank] = useState<BankSerialChecksBankTarget | null>(null);

  const openCreateDialog = () => {
    setDialogMode("create");
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEditDialog = (row: BankLeafRow) => {
    setDialogMode("edit");
    setEditTarget(row);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditTarget(null);
  };

  const openSerialChecks = (row: BankLeafRow) => {
    setSerialBank({
      id: row.id,
      bankName: row.bankName,
      branch: row.branch
    });
    setSerialDialogOpen(true);
  };

  const closeSerialChecks = () => {
    setSerialDialogOpen(false);
    setSerialBank(null);
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  const allGroupKeys = useMemo(
    () => Array.from(new Set(rows.map((row) => row.groupKey))),
    [rows]
  );

  const expandAll = () => {
    setExpandedGroups(new Set(allGroupKeys));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  const loadBanks = useCallback(async (searchValue: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await banksApi.list(searchValue.trim() ? { search: searchValue.trim() } : undefined);

      if (!response.success) {
        setError(response.message || "Failed to load banks");
        setRows([]);
        return;
      }

      const leafRows = response.data.map(toLeaf);
      setRows(leafRows);
    } catch {
      setError("Failed to load banks");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadBanks(search);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [loadBanks, search]);

  const treeRows = useMemo(
    () => buildGroupedTree(rows, expandedGroups),
    [expandedGroups, rows]
  );

  const handleExport = () => {
    exportToExcel(
      "banks",
      [
        { header: "ID", value: (row) => row.id },
        { header: "Bank", value: (row) => row.bankName },
        { header: "Branch", value: (row) => row.branch },
        { header: "Serial Number Id", value: (row) => row.serialNumId ?? "" },
        { header: "GL Credit Account", value: (row) => row.glCreditAccount }
      ],
      rows
    );
  };

  const columns = useMemo<GridColDef<BankTreeRow>[]>(
    () => [
      {
        field: "bankName",
        headerName: "Bank",
        minWidth: 260,
        flex: 1.2,
        sortable: false,
        renderCell: (params) => {
          if (params.row.rowType === "group") {
            const expanded = expandedGroups.has(params.row.groupKey);
            return (
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ height: "100%" }}>
                <IconButton
                  size="small"
                  aria-label={expanded ? "Collapse bank group" : "Expand bank group"}
                  onClick={() => toggleGroup(params.row.groupKey)}
                >
                  {expanded ? (
                    <ExpandMoreRoundedIcon fontSize="small" />
                  ) : (
                    <ChevronRightRoundedIcon fontSize="small" />
                  )}
                </IconButton>
                <Typography variant="body2" fontWeight={700}>
                  {params.row.bankName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ({params.row.branchCount})
                </Typography>
              </Stack>
            );
          }

          return (
            <Typography variant="body2" sx={{ pl: 5 }}>
              {params.row.bankName}
            </Typography>
          );
        }
      },
      {
        field: "id",
        headerName: "ID",
        width: 90,
        valueGetter: (_value, row) => (row.rowType === "group" ? "" : row.id)
      },
      {
        field: "branch",
        headerName: "Branch",
        minWidth: 160,
        flex: 1,
        valueGetter: (_value, row) => (row.rowType === "group" ? "" : row.branch)
      },
      {
        field: "serialNumId",
        headerName: "Serial Number Id",
        minWidth: 140,
        flex: 0.6,
        valueGetter: (_value, row) => (row.rowType === "group" ? "" : row.serialNumId)
      },
      {
        field: "glCreditAccount",
        headerName: "GL Credit Account",
        minWidth: 160,
        flex: 1,
        valueGetter: (_value, row) => (row.rowType === "group" ? "" : row.glCreditAccount)
      },
      {
        field: "actions",
        headerName: "Actions",
        width: 120,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const row = params.row;

          if (row.rowType === "group") {
            return null;
          }

          return (
            <Stack direction="row" spacing={0.25}>
              <IconButton
                size="small"
                aria-label="Serial checks"
                onClick={() => openSerialChecks(row)}
              >
                <TagRoundedIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                aria-label="Edit bank"
                onClick={() => openEditDialog(row)}
              >
                <EditRoundedIcon fontSize="small" />
              </IconButton>
            </Stack>
          );
        }
      }
    ],
    [expandedGroups]
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
              disabled={loading || allGroupKeys.length === 0}
            >
              Expand All
            </Button>
            <Button
              variant="outlined"
              startIcon={<UnfoldLessRoundedIcon />}
              onClick={collapseAll}
              disabled={loading || allGroupKeys.length === 0}
            >
              Collapse All
            </Button>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateDialog}>
              New Bank
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
              pagination: { paginationModel: { pageSize: 10 } }
            }}
            disableRowSelectionOnClick
            getRowClassName={(params: GridRowClassNameParams<BankTreeRow>) =>
              params.row.rowType === "group" ? "bank-group-row" : ""
            }
            sx={dataGridSx}
          />
        </Box>
      )}

      <BankEditDialog
        open={dialogOpen}
        mode={dialogMode}
        bank={editTarget}
        onClose={closeDialog}
        onSaved={() => void loadBanks(search)}
      />

      <BankSerialChecksDialog
        open={serialDialogOpen}
        bank={serialBank}
        onClose={closeSerialChecks}
      />
    </Box>
  );
}
