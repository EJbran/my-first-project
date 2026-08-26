import EditRoundedIcon from "@mui/icons-material/EditRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import AddBusinessRoundedIcon from "@mui/icons-material/AddBusinessRounded";
import { Alert, Box, Button, CircularProgress, IconButton, Stack } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useCallback, useEffect, useMemo, useState } from "react";
import { locationsApi } from "../../api/locations.api";
import { DataGridToolbar } from "../../components/DataGridToolbar";
import type { Location } from "../../types/location.types";
import { exportToExcel } from "../../utils/exportExcel";
import { LocationEditDialog, type LocationEditTarget } from "./LocationEditDialog";
import { SubLocationCreateDialog } from "./SubLocationCreateDialog";

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

type LocationRow = LocationEditTarget;

const toRow = (location: Location): LocationRow => ({
  id: location.ID_Location,
  locationCode: location.LocationCode,
  locationNameEn: location.LocationName_en,
  locationNameAr: location.LocationName_ar ?? ""
});

export default function LocationPage() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("edit");
  const [editTarget, setEditTarget] = useState<LocationRow | null>(null);
  const [subLocationDialogOpen, setSubLocationDialogOpen] = useState(false);
  const [subLocationTarget, setSubLocationTarget] = useState<LocationRow | null>(null);

  const openCreateDialog = () => {
    setDialogMode("create");
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEditDialog = (row: LocationRow) => {
    setDialogMode("edit");
    setEditTarget(row);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditTarget(null);
  };

  const openSubLocationDialog = (row: LocationRow) => {
    setSubLocationTarget(row);
    setSubLocationDialogOpen(true);
  };

  const closeSubLocationDialog = () => {
    setSubLocationDialogOpen(false);
    setSubLocationTarget(null);
  };

  const loadLocations = useCallback(async (searchValue: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await locationsApi.list(searchValue.trim() ? { search: searchValue.trim() } : undefined);

      if (!response.success) {
        setError(response.message || "Failed to load locations");
        setRows([]);
        return;
      }

      setRows(response.data.map(toRow));
    } catch {
      setError("Failed to load locations");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadLocations(search);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [loadLocations, search]);

  const handleExport = () => {
    exportToExcel("locations", [
      { header: "ID", value: (row) => row.id },
      { header: "Location Code", value: (row) => row.locationCode },
      { header: "Location Name (EN)", value: (row) => row.locationNameEn },
      { header: "Location Name (AR)", value: (row) => row.locationNameAr }
    ], rows);
  };

  const columns = useMemo<GridColDef<LocationRow>[]>(
    () => [
      { field: "id", headerName: "ID", width: 90 },
      { field: "locationCode", headerName: "Location Code", minWidth: 160, flex: 1 },
      { field: "locationNameEn", headerName: "Location Name (EN)", minWidth: 200, flex: 1 },
      { field: "locationNameAr", headerName: "Location Name (AR)", minWidth: 200, flex: 1 },
      {
        field: "actions",
        headerName: "Actions",
        width: 260,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.5}>
            <IconButton
              size="small"
              aria-label="Edit location"
              onClick={() => openEditDialog(params.row)}
            >
              <EditRoundedIcon fontSize="small" />
            </IconButton>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddBusinessRoundedIcon fontSize="small" />}
              onClick={() => openSubLocationDialog(params.row)}
            >
              Add Sub Location
            </Button>
          </Stack>
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
              New Location
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
            disableRowSelectionOnClick
            sx={dataGridSx}
          />
        </Box>
      )}

      <LocationEditDialog
        open={dialogOpen}
        mode={dialogMode}
        location={editTarget}
        onClose={closeDialog}
        onSaved={() => void loadLocations(search)}
      />

      <SubLocationCreateDialog
        open={subLocationDialogOpen}
        locationId={subLocationTarget?.id ?? null}
        locationName={subLocationTarget?.locationNameEn || subLocationTarget?.locationCode || ""}
        onClose={closeSubLocationDialog}
        onSaved={() => void loadLocations(search)}
      />
    </Box>
  );
}
