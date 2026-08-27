import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useSnackbar } from "notistack";
import { assetCategoriesApi } from "../../../api/assetCategories.api";
import { DataGridToolbar } from "../../../components/DataGridToolbar";
import type { AssetCategory } from "../../../types/assetCategory.types";
import { exportToExcel } from "../../../utils/exportExcel";
import { AssetCategoryEditDialog } from "./AssetCategoryEditDialog";

const tableContainerSx = {
  bgcolor: "background.paper",
  borderRadius: 2,
  border: 1,
  borderColor: "divider",
  overflow: "hidden",
  "[data-toolpad-color-scheme='light'] &": { bgcolor: "#ffffff" }
};

const dataGridSx = {
  border: "none",
  bgcolor: "background.paper",
  "& .MuiDataGrid-columnHeaders, & .MuiDataGrid-footerContainer, & .MuiDataGrid-overlay": { bgcolor: "background.paper" },
  "[data-toolpad-color-scheme='light'] &": {
    bgcolor: "#ffffff",
    "& .MuiDataGrid-columnHeaders, & .MuiDataGrid-footerContainer, & .MuiDataGrid-overlay": { bgcolor: "#ffffff" }
  }
};

export default function AssetCategoriesPage() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editTarget, setEditTarget] = useState<AssetCategory | null>(null);

  const query = useQuery({
    queryKey: ["finance", "asset-categories", search.trim()],
    queryFn: () => assetCategoriesApi.list(search.trim() ? { search: search.trim() } : undefined),
    staleTime: 20_000
  });
  const rows = query.data?.success ? query.data.data : [];
  const error = query.data && !query.data.success ? query.data.message : query.isError ? "Asset categories could not be loaded" : null;

  const openCreate = () => {
    setDialogMode("create");
    setEditTarget(null);
    setDialogOpen(true);
  };
  const openEdit = (category: AssetCategory) => {
    setDialogMode("edit");
    setEditTarget(category);
    setDialogOpen(true);
  };
  const closeDialog = () => {
    setDialogOpen(false);
    setEditTarget(null);
  };
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["finance", "asset-categories"] });
  const handleExport = () => {
    exportToExcel("asset-categories", [
      { header: "Category ID", value: (row: AssetCategory) => row.CategoryID },
      { header: "Category Name", value: (row: AssetCategory) => row.CategoryName },
      { header: "Percentage", value: (row: AssetCategory) => row.Percentage },
      { header: "Depreciation Account ID", value: (row: AssetCategory) => row.DepAccountID },
      { header: "Credit Account ID", value: (row: AssetCategory) => row.CreditAccountID },
      { header: "Description", value: (row: AssetCategory) => row.Description }
    ], rows);
  };

  const columns = useMemo<GridColDef<AssetCategory>[]>(() => [
    { field: "CategoryID", headerName: "ID", width: 105 },
    { field: "CategoryName", headerName: "Category Name", minWidth: 190, flex: 1 },
    {
      field: "Percentage", headerName: "Depreciation %", width: 155,
      renderCell: (params) => <Chip size="small" label={`${Number(params.row.Percentage).toFixed(2)}%`} color="primary" variant="outlined" />
    },
    { field: "DepAccountID", headerName: "Dep. Account ID", width: 170 },
    { field: "CreditAccountID", headerName: "Credit Account ID", width: 170 },
    { field: "Description", headerName: "Description", minWidth: 270, flex: 1.3 },
    {
      field: "actions", headerName: "Actions", width: 115, sortable: false, filterable: false,
      renderCell: (params) => <Stack direction="row" spacing={0.25} alignItems="center" sx={{ height: "100%" }}>
        <Tooltip title="Edit category"><IconButton size="small" aria-label={`Edit ${params.row.CategoryName}`} onClick={() => openEdit(params.row)}><EditRoundedIcon fontSize="small" /></IconButton></Tooltip>
      </Stack>
    }
  ], []);

  return <Box>
    <DataGridToolbar search={search} onSearchChange={setSearch} actions={<Stack direction="row" spacing={1}>
      <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate}>New Asset Category</Button>
      <Button variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={refresh} disabled={query.isFetching}>Refresh</Button>
      <Button variant="outlined" startIcon={<FileDownloadRoundedIcon />} onClick={handleExport} disabled={query.isLoading || rows.length === 0}>Export to Excel</Button>
    </Stack>} />
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Manage depreciation categories and their accounting mappings.</Typography>
    {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
    {query.isLoading ? <Box display="flex" justifyContent="center" py={6} sx={tableContainerSx}><CircularProgress size={32} /></Box> : <Box sx={tableContainerSx}>
      <DataGrid autoHeight rows={rows} getRowId={(row) => row.CategoryID} columns={columns} pageSizeOptions={[10, 25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} disableRowSelectionOnClick sx={dataGridSx} />
    </Box>}
    <AssetCategoryEditDialog open={dialogOpen} mode={dialogMode} category={editTarget} onClose={closeDialog} onSaved={() => { refresh(); enqueueSnackbar(`Asset category ${dialogMode === "create" ? "created" : "saved"} successfully`, { variant: "success" }); }} />
  </Box>;
}
