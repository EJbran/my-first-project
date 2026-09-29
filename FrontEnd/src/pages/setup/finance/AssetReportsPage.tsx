import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useSnackbar } from "notistack";
import { assetsApi } from "../../../api/assets.api";
import { assetCategoriesApi } from "../../../api/assetCategories.api";
import type { Asset } from "../../../types/asset.types";
import { exportToExcel, type ExportColumn } from "../../../utils/exportExcel";
import { DataGridToolbar } from "../../../components/DataGridToolbar";

type ReportType = "all" | "by-category" | "by-all-fields";

interface AssetFilters {
  assetId?: number | null;
  assetCode?: string;
  assetDescription?: string;
  categoryId?: number | null;
  subLocationId?: number | null;
  departmentId?: number | null;
  purchaseDateFrom?: string;
  purchaseDateTo?: string;
  insertedDateFrom?: string;
  insertedDateTo?: string;
  purchaseCostFrom?: number | null;
  purchaseCostTo?: number | null;
  bookValueFrom?: number | null;
  bookValueTo?: number | null;
  openingBalanceFrom?: number | null;
  openingBalanceTo?: number | null;
  depreciationValueFrom?: number | null;
  depreciationValueTo?: number | null;
  netValueFrom?: number | null;
  netValueTo?: number | null;
  responsibleId?: number | null;
  responsibleNote?: string;
  status?: string;
}

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

const money = (value: string | number) => Number(value).toFixed(2);

const filterAssets = (assets: Asset[], filters: AssetFilters): Asset[] => {
  return assets.filter((asset) => {
    if (filters.assetId !== undefined && filters.assetId !== null && asset.AssetID !== filters.assetId) {
      return false;
    }
    if (filters.assetCode && !asset.AssetCode.toLowerCase().includes(filters.assetCode.toLowerCase())) {
      return false;
    }
    if (filters.assetDescription && !asset.AssetDescription.toLowerCase().includes(filters.assetDescription.toLowerCase())) {
      return false;
    }
    if (filters.categoryId !== undefined && filters.categoryId !== null && asset.CategoryID !== filters.categoryId) {
      return false;
    }
    if (filters.subLocationId !== undefined && filters.subLocationId !== null && asset.SubLocationID !== filters.subLocationId) {
      return false;
    }
    if (filters.departmentId !== undefined && filters.departmentId !== null && asset.DepartmentID !== filters.departmentId) {
      return false;
    }
    if (filters.purchaseDateFrom && asset.PurchaseDate < filters.purchaseDateFrom) {
      return false;
    }
    if (filters.purchaseDateTo && asset.PurchaseDate > filters.purchaseDateTo) {
      return false;
    }
    if (filters.insertedDateFrom && asset.InsertedDate < filters.insertedDateFrom) {
      return false;
    }
    if (filters.insertedDateTo && asset.InsertedDate > filters.insertedDateTo) {
      return false;
    }
    const purchaseCost = Number(asset.PurchaseCost);
    if (filters.purchaseCostFrom !== undefined && filters.purchaseCostFrom !== null && purchaseCost < filters.purchaseCostFrom) {
      return false;
    }
    if (filters.purchaseCostTo !== undefined && filters.purchaseCostTo !== null && purchaseCost > filters.purchaseCostTo) {
      return false;
    }
    const bookValue = Number(asset.BookValue);
    if (filters.bookValueFrom !== undefined && filters.bookValueFrom !== null && bookValue < filters.bookValueFrom) {
      return false;
    }
    if (filters.bookValueTo !== undefined && filters.bookValueTo !== null && bookValue > filters.bookValueTo) {
      return false;
    }
    const openingBalance = Number(asset.OpeningBalanceBookValue);
    if (filters.openingBalanceFrom !== undefined && filters.openingBalanceFrom !== null && openingBalance < filters.openingBalanceFrom) {
      return false;
    }
    if (filters.openingBalanceTo !== undefined && filters.openingBalanceTo !== null && openingBalance > filters.openingBalanceTo) {
      return false;
    }
    const depreciationValue = Number(asset.DepreciationValue);
    if (filters.depreciationValueFrom !== undefined && filters.depreciationValueFrom !== null && depreciationValue < filters.depreciationValueFrom) {
      return false;
    }
    if (filters.depreciationValueTo !== undefined && filters.depreciationValueTo !== null && depreciationValue > filters.depreciationValueTo) {
      return false;
    }
    const netValue = Number(asset.NetValue);
    if (filters.netValueFrom !== undefined && filters.netValueFrom !== null && netValue < filters.netValueFrom) {
      return false;
    }
    if (filters.netValueTo !== undefined && filters.netValueTo !== null && netValue > filters.netValueTo) {
      return false;
    }
    if (filters.responsibleId !== undefined && filters.responsibleId !== null && asset.ResponsibleID !== filters.responsibleId) {
      return false;
    }
    if (filters.responsibleNote && !asset.ResponsibleNote?.toLowerCase().includes(filters.responsibleNote.toLowerCase())) {
      return false;
    }
    if (filters.status && asset.Status.toLowerCase() !== filters.status.toLowerCase()) {
      return false;
    }
    return true;
  });
};

export default function AssetReportsPage() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [reportType, setReportType] = useState<ReportType>("all");
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<AssetFilters>({});

  const assetsQuery = useQuery({
    queryKey: ["finance", "assets", search.trim(), reportType, filters],
    queryFn: () => assetsApi.list(search.trim() ? { search: search.trim() } : undefined),
    staleTime: 20_000
  });

  const categoriesQuery = useQuery({
    queryKey: ["finance", "asset-categories"],
    queryFn: () => assetCategoriesApi.list(),
    staleTime: 60_000,
    enabled: reportType === "by-category" || reportType === "by-all-fields"
  });

  const assets = assetsQuery.data?.success ? assetsQuery.data.data : [];
  const categories = categoriesQuery.data?.success ? categoriesQuery.data.data : [];
  const filteredAssets = filterAssets(assets, filters);
  const error =
    assetsQuery.data && !assetsQuery.data.success
      ? assetsQuery.data.message
      : assetsQuery.isError
        ? "Assets could not be loaded"
        : null;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["finance", "assets"] });
  };

  const resetFilters = () => {
    setFilters({});
    setSearch("");
  };

  const handleExport = async () => {
    if (isExporting || filteredAssets.length === 0) return;

    try {
      setIsExporting(true);

      const columns: ExportColumn<Asset>[] = [
        { header: "Asset ID", value: (row: Asset) => row.AssetID },
        { header: "Asset Code", value: (row: Asset) => row.AssetCode },
        { header: "Description", value: (row: Asset) => row.AssetDescription },
        { header: "Category", value: (row: Asset) => row.Category?.CategoryName || `ID: ${row.CategoryID}` },
        { header: "Sub-location", value: (row: Asset) => row.SubLocation?.Name || `ID: ${row.SubLocationID}` },
        { header: "Department", value: (row: Asset) => row.Department?.DepartmentName_English || `ID: ${row.DepartmentID}` },
        { header: "Purchase Date", value: (row: Asset) => row.PurchaseDate },
        { header: "Inserted Date", value: (row: Asset) => row.InsertedDate },
        { header: "Purchase Cost", value: (row: Asset) => row.PurchaseCost, format: (value) => (value ? Number(value).toFixed(2) : "0.00") },
        { header: "Book Value", value: (row: Asset) => row.BookValue, format: (value) => (value ? Number(value).toFixed(2) : "0.00") },
        { header: "Opening Balance", value: (row: Asset) => row.OpeningBalanceBookValue, format: (value) => (value ? Number(value).toFixed(2) : "0.00") },
        { header: "Depreciation", value: (row: Asset) => row.DepreciationValue, format: (value) => (value ? Number(value).toFixed(2) : "0.00") },
        { header: "Net Value", value: (row: Asset) => row.NetValue, format: (value) => (value ? Number(value).toFixed(2) : "0.00") },
        { header: "Responsible ID", value: (row: Asset) => row.ResponsibleID },
        { header: "Responsible Note", value: (row: Asset) => row.ResponsibleNote ?? "" },
        { header: "Status", value: (row: Asset) => row.Status }
      ];

      const reportName =
        reportType === "all"
          ? "Asset_Report_All"
          : reportType === "by-category"
            ? "Asset_Report_By_Category"
            : "Asset_Report_Advanced";

      exportToExcel(reportName, columns, filteredAssets);
      enqueueSnackbar("Export completed successfully", { variant: "success" });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to export data";
      enqueueSnackbar(errorMessage, { variant: "error" });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const columns = useMemo<GridColDef<Asset>[]>(
    () => [
      { field: "AssetID", headerName: "ID", width: 90 },
      { field: "AssetCode", headerName: "Asset Code", width: 145 },
      { field: "AssetDescription", headerName: "Description", minWidth: 230, flex: 1 },
      { 
        field: "Category", 
        headerName: "Category", 
        width: 105,
        sortable: false,
        filterable: false,
        valueGetter: (_value, row) => row.Category?.CategoryName || row.CategoryID,
        renderCell: (params) => params.row.Category?.CategoryName || `ID: ${params.row.CategoryID}`
      },
      { 
        field: "SubLocation", 
        headerName: "Sub-location", 
        width: 125,
        sortable: false,
        filterable: false,
        valueGetter: (_value, row) => row.SubLocation?.Name || row.SubLocationID,
        renderCell: (params) => params.row.SubLocation?.Name || `ID: ${params.row.SubLocationID}`
      },
      { 
        field: "Department", 
        headerName: "Department", 
        width: 120,
        sortable: false,
        filterable: false,
        valueGetter: (_value, row) => row.Department?.DepartmentName_English || row.DepartmentID,
        renderCell: (params) => params.row.Department?.DepartmentName_English || `ID: ${params.row.DepartmentID}`
      },
      { field: "PurchaseDate", headerName: "Purchase Date", width: 125 },
      { field: "PurchaseCost", headerName: "Purchase Cost", width: 135, valueFormatter: (value) => money(value) },
      { field: "NetValue", headerName: "Net Value", width: 125, valueFormatter: (value) => money(value) },
      {
        field: "Status",
        headerName: "Status",
        width: 120,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.value}
            color={String(params.value).toLowerCase() === "active" ? "success" : "default"}
            variant="outlined"
          />
        )
      }
    ],
    []
  );

  return (
    <Box>
      <Stack spacing={3}>
        {/* Report Type Selection */}
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <AssessmentRoundedIcon color="primary" />
                <Typography variant="h6">Asset Report Type</Typography>
              </Stack>
              <FormControl fullWidth size="small">
                <InputLabel>Select Report Type</InputLabel>
                <Select value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)} label="Select Report Type">
                  <MenuItem value="all">All Assets</MenuItem>
                  <MenuItem value="by-category">Assets By Category</MenuItem>
                  <MenuItem value="by-all-fields">Advanced Filters</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </CardContent>
        </Card>

        {/* Filters Section */}
        {reportType !== "all" && (
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="subtitle1" fontWeight="600">
                  Filters
                </Typography>

                {reportType === "by-category" && (
                  <FormControl fullWidth size="small">
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={String(filters.categoryId ?? "")}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFilters((prev) => ({
                          ...prev,
                          categoryId: val === "" ? null : Number(val)
                        }));
                      }}
                      label="Category"
                    >
                      <MenuItem value="">All Categories</MenuItem>
                      {categories.map((cat) => (
                        <MenuItem key={cat.CategoryID} value={cat.CategoryID}>
                          {cat.CategoryName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {reportType === "by-all-fields" && (
                  <Box>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Asset ID"
                          type="number"
                          value={filters.assetId ?? ""}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              assetId: e.target.value === "" ? null : Number(e.target.value)
                            }))
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Asset Code"
                          value={filters.assetCode ?? ""}
                          onChange={(e) => setFilters((prev) => ({ ...prev, assetCode: e.target.value }))}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Description"
                          value={filters.assetDescription ?? ""}
                          onChange={(e) => setFilters((prev) => ({ ...prev, assetDescription: e.target.value }))}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Category</InputLabel>
                          <Select
                            value={String(filters.categoryId ?? "")}
                            onChange={(e) =>
                              setFilters((prev) => ({
                                ...prev,
                                categoryId: e.target.value === "" ? null : Number(e.target.value)
                              }))
                            }
                            label="Category"
                          >
                            <MenuItem value="">All Categories</MenuItem>
                            {categories.map((cat) => (
                              <MenuItem key={cat.CategoryID} value={cat.CategoryID}>
                                {cat.CategoryName}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Sub-location ID"
                          type="number"
                          value={filters.subLocationId ?? ""}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              subLocationId: e.target.value === "" ? null : Number(e.target.value)
                            }))
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Department ID"
                          type="number"
                          value={filters.departmentId ?? ""}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              departmentId: e.target.value === "" ? null : Number(e.target.value)
                            }))
                          }
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                          Purchase Date
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="From"
                          type="date"
                          value={filters.purchaseDateFrom ?? ""}
                          onChange={(e) => setFilters((prev) => ({ ...prev, purchaseDateFrom: e.target.value || undefined }))}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="To"
                          type="date"
                          value={filters.purchaseDateTo ?? ""}
                          onChange={(e) => setFilters((prev) => ({ ...prev, purchaseDateTo: e.target.value || undefined }))}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                          Inserted Date
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="From"
                          type="date"
                          value={filters.insertedDateFrom ?? ""}
                          onChange={(e) => setFilters((prev) => ({ ...prev, insertedDateFrom: e.target.value || undefined }))}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="To"
                          type="date"
                          value={filters.insertedDateTo ?? ""}
                          onChange={(e) => setFilters((prev) => ({ ...prev, insertedDateTo: e.target.value || undefined }))}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                          Purchase Cost
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="From"
                          type="number"
                          value={filters.purchaseCostFrom ?? ""}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              purchaseCostFrom: e.target.value === "" ? null : Number(e.target.value)
                            }))
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="To"
                          type="number"
                          value={filters.purchaseCostTo ?? ""}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              purchaseCostTo: e.target.value === "" ? null : Number(e.target.value)
                            }))
                          }
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                          Book Value
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="From"
                          type="number"
                          value={filters.bookValueFrom ?? ""}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              bookValueFrom: e.target.value === "" ? null : Number(e.target.value)
                            }))
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="To"
                          type="number"
                          value={filters.bookValueTo ?? ""}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              bookValueTo: e.target.value === "" ? null : Number(e.target.value)
                            }))
                          }
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                          Opening Balance Book Value
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="From"
                          type="number"
                          value={filters.openingBalanceFrom ?? ""}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              openingBalanceFrom: e.target.value === "" ? null : Number(e.target.value)
                            }))
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="To"
                          type="number"
                          value={filters.openingBalanceTo ?? ""}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              openingBalanceTo: e.target.value === "" ? null : Number(e.target.value)
                            }))
                          }
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                          Depreciation Value
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="From"
                          type="number"
                          value={filters.depreciationValueFrom ?? ""}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              depreciationValueFrom: e.target.value === "" ? null : Number(e.target.value)
                            }))
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="To"
                          type="number"
                          value={filters.depreciationValueTo ?? ""}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              depreciationValueTo: e.target.value === "" ? null : Number(e.target.value)
                            }))
                          }
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                          Net Value
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="From"
                          type="number"
                          value={filters.netValueFrom ?? ""}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              netValueFrom: e.target.value === "" ? null : Number(e.target.value)
                            }))
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="To"
                          type="number"
                          value={filters.netValueTo ?? ""}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              netValueTo: e.target.value === "" ? null : Number(e.target.value)
                            }))
                          }
                        />
                      </Grid>

                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Responsible ID"
                          type="number"
                          value={filters.responsibleId ?? ""}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              responsibleId: e.target.value === "" ? null : Number(e.target.value)
                            }))
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Responsible Note"
                          value={filters.responsibleNote ?? ""}
                          onChange={(e) => setFilters((prev) => ({ ...prev, responsibleNote: e.target.value }))}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Status</InputLabel>
                          <Select
                            value={filters.status ?? ""}
                            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value || undefined }))}
                            label="Status"
                          >
                            <MenuItem value="">All Statuses</MenuItem>
                            <MenuItem value="Active">Active</MenuItem>
                            <MenuItem value="Inactive">Inactive</MenuItem>
                            <MenuItem value="Disposed">Disposed</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Report Results */}
        <DataGridToolbar
          search={search}
          onSearchChange={setSearch}
          actions={
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<RefreshRoundedIcon />}
                onClick={refresh}
                disabled={assetsQuery.isFetching}
              >
                Refresh
              </Button>
              <Button
                variant="outlined"
                startIcon={<RestartAltRoundedIcon />}
                onClick={resetFilters}
              >
                Reset
              </Button>
              <Button
                variant="outlined"
                startIcon={isPrinting ? <CircularProgress size={20} /> : <PrintRoundedIcon />}
                onClick={handlePrint}
                disabled={isPrinting || assetsQuery.isLoading || filteredAssets.length === 0}
              >
                Print
              </Button>
              <Button
                variant="contained"
                startIcon={isExporting ? <CircularProgress size={20} /> : <FileDownloadRoundedIcon />}
                onClick={handleExport}
                disabled={isExporting || assetsQuery.isLoading || filteredAssets.length === 0}
              >
                {isExporting ? "Exporting..." : "Export"}
              </Button>
            </Stack>
          }
        />

        <Typography variant="body2" color="text.secondary">
          {filteredAssets.length === 0 ? "No assets found" : `Showing ${filteredAssets.length} asset(s)`}
        </Typography>

        {error ? (
          <Alert severity="error">{error}</Alert>
        ) : null}

        {assetsQuery.isLoading ? (
          <Box display="flex" justifyContent="center" py={6} sx={tableContainerSx}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <Box sx={tableContainerSx}>
            <DataGrid
              autoHeight
              rows={filteredAssets}
              getRowId={(row) => row.AssetID}
              columns={columns}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              disableRowSelectionOnClick
              sx={dataGridSx}
            />
          </Box>
        )}
      </Stack>
    </Box>
  );
}
