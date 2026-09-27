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
import { assetsApi } from "../../../api/assets.api";
import { DataGridToolbar } from "../../../components/DataGridToolbar";
import type { Asset } from "../../../types/asset.types";
import { exportToExcel } from "../../../utils/exportExcel";
import { AssetEditDialog } from "./AssetEditDialog";

const tableContainerSx = { bgcolor: "background.paper", borderRadius: 2, border: 1, borderColor: "divider", overflow: "hidden", "[data-toolpad-color-scheme='light'] &": { bgcolor: "#ffffff" } };
const dataGridSx = { border: "none", bgcolor: "background.paper", "& .MuiDataGrid-columnHeaders, & .MuiDataGrid-footerContainer, & .MuiDataGrid-overlay": { bgcolor: "background.paper" }, "[data-toolpad-color-scheme='light'] &": { bgcolor: "#ffffff", "& .MuiDataGrid-columnHeaders, & .MuiDataGrid-footerContainer, & .MuiDataGrid-overlay": { bgcolor: "#ffffff" } } };
const money = (value: string | number) => Number(value).toFixed(2);

export default function AssetsPage() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editTarget, setEditTarget] = useState<Asset | null>(null);
  const query = useQuery({ queryKey: ["finance", "assets", search.trim()], queryFn: () => assetsApi.list(search.trim() ? { search: search.trim() } : undefined), staleTime: 20_000 });
  const rows = query.data?.success ? query.data.data : [];
  const error = query.data && !query.data.success ? query.data.message : query.isError ? "Assets could not be loaded" : null;
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["finance", "assets"] });
  const openCreate = () => { setDialogMode("create"); setEditTarget(null); setDialogOpen(true); };
  const openEdit = (asset: Asset) => { setDialogMode("edit"); setEditTarget(asset); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditTarget(null); };
  const handleExport = () => exportToExcel("assets", [
    { header: "Asset ID", value: (row: Asset) => row.AssetID }, 
    { header: "Asset Code", value: (row: Asset) => row.AssetCode },
    { header: "Description", value: (row: Asset) => row.AssetDescription }, 
    { header: "Category", value: (row: Asset) => row.Category?.CategoryName || `ID: ${row.CategoryID}` },
    { header: "Sub-location", value: (row: Asset) => row.SubLocation?.Name || `ID: ${row.SubLocationID}` }, 
    { header: "Department", value: (row: Asset) => row.Department?.DepartmentName_English || `ID: ${row.DepartmentID}` },
    { header: "Purchase Date", value: (row: Asset) => row.PurchaseDate }, 
    { header: "Inserted Date", value: (row: Asset) => row.InsertedDate },
    { header: "Purchase Cost", value: (row: Asset) => row.PurchaseCost }, 
    { header: "Book Value", value: (row: Asset) => row.BookValue },
    { header: "Opening Balance", value: (row: Asset) => row.OpeningBalanceBookValue }, 
    { header: "Depreciation", value: (row: Asset) => row.DepreciationValue },
    { header: "Net Value", value: (row: Asset) => row.NetValue }, 
    { header: "Responsible ID", value: (row: Asset) => row.ResponsibleID },
    { header: "Responsible Note", value: (row: Asset) => row.ResponsibleNote ?? "" }, 
    { header: "Status", value: (row: Asset) => row.Status }
  ], rows);
  const columns = useMemo<GridColDef<Asset>[]>(() => [
    { field: "AssetID", headerName: "ID", width: 90 }, { field: "AssetCode", headerName: "Asset Code", width: 145 },
    { field: "AssetDescription", headerName: "Description", minWidth: 230, flex: 1 }, 
    { 
      field: "Category", 
      headerName: "Category", 
      width: 105,
      sortable: false,
      filterable: false,
      valueGetter: (value, row) => row.Category?.CategoryName || row.CategoryID,
      renderCell: (params) => params.row.Category?.CategoryName || `ID: ${params.row.CategoryID}`
    },
    { 
      field: "SubLocation", 
      headerName: "Sub-location", 
      width: 125,
      sortable: false,
      filterable: false,
      valueGetter: (value, row) => row.SubLocation?.Name || row.SubLocationID,
      renderCell: (params) => params.row.SubLocation?.Name || `ID: ${params.row.SubLocationID}`
    }, 
    { 
      field: "Department", 
      headerName: "Department", 
      width: 120,
      sortable: false,
      filterable: false,
      valueGetter: (value, row) => row.Department?.DepartmentName_English || row.DepartmentID,
      renderCell: (params) => params.row.Department?.DepartmentName_English || `ID: ${params.row.DepartmentID}`
    },
    { field: "PurchaseDate", headerName: "Purchase Date", width: 125 },
    { field: "PurchaseCost", headerName: "Purchase Cost", width: 135, valueFormatter: (value) => money(value) },
    { field: "NetValue", headerName: "Net Value", width: 125, valueFormatter: (value) => money(value) },
    { field: "Status", headerName: "Status", width: 120, renderCell: (params) => <Chip size="small" label={params.value} color={String(params.value).toLowerCase() === "active" ? "success" : "default"} variant="outlined" /> },
    { field: "actions", headerName: "Actions", width: 85, sortable: false, filterable: false, renderCell: (params) => <Tooltip title="Edit asset"><IconButton size="small" aria-label={`Edit ${params.row.AssetCode}`} onClick={() => openEdit(params.row)}><EditRoundedIcon fontSize="small" /></IconButton></Tooltip> }
  ], []);

  return <Box>
    <DataGridToolbar search={search} onSearchChange={setSearch} actions={<Stack direction="row" spacing={1}>
      <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate}>New Asset</Button>
      <Button variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={refresh} disabled={query.isFetching}>Refresh</Button>
      <Button variant="outlined" startIcon={<FileDownloadRoundedIcon />} onClick={handleExport} disabled={query.isLoading || rows.length === 0}>Export to Excel</Button>
    </Stack>} />
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Manage fixed assets, valuation, depreciation, ownership, and accounting records.</Typography>
    {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
    {query.isLoading ? <Box display="flex" justifyContent="center" py={6} sx={tableContainerSx}><CircularProgress size={32} /></Box> : <Box sx={tableContainerSx}><DataGrid autoHeight rows={rows} getRowId={(row) => row.AssetID} columns={columns} pageSizeOptions={[10, 25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} disableRowSelectionOnClick sx={dataGridSx} /></Box>}
    <AssetEditDialog open={dialogOpen} mode={dialogMode} asset={editTarget} onClose={closeDialog} onSaved={() => { refresh(); enqueueSnackbar(`Asset ${dialogMode === "create" ? "created" : "saved"} successfully`, { variant: "success" }); }} />
  </Box>;
}
