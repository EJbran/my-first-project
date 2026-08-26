import EditRoundedIcon from "@mui/icons-material/EditRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import { Alert, Box, Button, Chip, CircularProgress, IconButton, Stack } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useCallback, useEffect, useMemo, useState } from "react";
import { chartGroupsApi } from "../../../api/chartGroups.api";
import { DataGridToolbar } from "../../../components/DataGridToolbar";
import type { ChartGroup } from "../../../types/chartGroup.types";
import { exportToExcel } from "../../../utils/exportExcel";
import { ChartGroupEditDialog, type ChartGroupEditTarget } from "./ChartGroupEditDialog";

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

type ChartGroupRow = ChartGroupEditTarget;

const toRow = (item: ChartGroup): ChartGroupRow => ({
  id: item.id_AccountGroupCode,
  accountClassCode: item.AccountClassCode,
  accountClassName: item.AccountClassName,
  accountGroupCode: item.AccountGroupCode,
  accountGroupName: item.AccountGroupName,
  defaultSuggestedModule: item.DefaultSuggestedModule ?? "",
  defaultAnalyticTemplate: item.DefaultAnalyticTemplate ?? "",
  allowedAnalyticTemplates: item.AllowedAnalyticTemplates ?? "",
  isActive: item.IsActive
});

export default function ChartGroupsPage() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<ChartGroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("edit");
  const [editTarget, setEditTarget] = useState<ChartGroupRow | null>(null);

  const openCreateDialog = () => {
    setDialogMode("create");
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEditDialog = (row: ChartGroupRow) => {
    setDialogMode("edit");
    setEditTarget(row);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditTarget(null);
  };

  const loadChartGroups = useCallback(async (searchValue: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await chartGroupsApi.list(
        searchValue.trim() ? { search: searchValue.trim() } : undefined
      );

      if (!response.success) {
        setError(response.message || "Failed to load account groups");
        setRows([]);
        return;
      }

      setRows(response.data.map(toRow));
    } catch {
      setError("Failed to load account groups");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadChartGroups(search);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [loadChartGroups, search]);

  const handleExport = () => {
    exportToExcel(
      "coa-account-groups",
      [
        { header: "Class Code", value: (row) => row.accountClassCode },
        { header: "Class Name", value: (row) => row.accountClassName },
        { header: "Group Code", value: (row) => row.accountGroupCode },
        { header: "Group Name", value: (row) => row.accountGroupName },
        { header: "Default Module", value: (row) => row.defaultSuggestedModule },
        { header: "Default Analytic", value: (row) => row.defaultAnalyticTemplate },
        { header: "Allowed Analytics", value: (row) => row.allowedAnalyticTemplates },
        { header: "Active", value: (row) => (row.isActive ? "Yes" : "No") }
      ],
      rows
    );
  };

  const columns = useMemo<GridColDef<ChartGroupRow>[]>(
    () => [
      { field: "accountClassCode", headerName: "Class", width: 80 },
      { field: "accountClassName", headerName: "Class Name", width: 140 },
      { field: "accountGroupCode", headerName: "Group Code", width: 110 },
      { field: "accountGroupName", headerName: "Group Name", minWidth: 220, flex: 1 },
      { field: "defaultSuggestedModule", headerName: "Module", width: 160 },
      { field: "defaultAnalyticTemplate", headerName: "Default Analytic", width: 170 },
      {
        field: "isActive",
        headerName: "Status",
        width: 110,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.value ? "Active" : "Inactive"}
            color={params.value ? "success" : "default"}
            variant={params.value ? "filled" : "outlined"}
          />
        )
      },
      {
        field: "actions",
        headerName: "Actions",
        width: 100,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <IconButton
            size="small"
            aria-label="Edit account group"
            onClick={() => openEditDialog(params.row)}
          >
            <EditRoundedIcon fontSize="small" />
          </IconButton>
        )
      }
    ],
    []
  );

  return (
    <Box>
      <DataGridToolbar
        search={search}
        onSearchChange={setSearch}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateDialog}>
              New Account Group
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
            rows={rows}
            columns={columns}
            pageSizeOptions={[10, 20, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            disableRowSelectionOnClick
            sx={dataGridSx}
          />
        </Box>
      )}

      <ChartGroupEditDialog
        open={dialogOpen}
        mode={dialogMode}
        chartGroup={editTarget}
        onClose={closeDialog}
        onSaved={() => void loadChartGroups(search)}
      />
    </Box>
  );
}
