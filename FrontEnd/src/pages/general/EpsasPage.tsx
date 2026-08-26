import EditRoundedIcon from "@mui/icons-material/EditRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import { Alert, Box, Button, CircularProgress, IconButton, Stack } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useCallback, useEffect, useMemo, useState } from "react";
import { epsasApi } from "../../api/epsas.api";
import { DataGridToolbar } from "../../components/DataGridToolbar";
import type { Epsa } from "../../types/epsa.types";
import { exportToExcel } from "../../utils/exportExcel";
import { EpsaEditDialog, type EpsaEditTarget } from "./EpsaEditDialog";

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

type EpsaRow = EpsaEditTarget;

const toRow = (epsa: Epsa): EpsaRow => ({
  id: epsa.Id,
  interstName: epsa.InterstName,
  noc: epsa.NOC,
  pc: epsa.PC,
  epsaType: epsa.EPSAType
});

export default function EpsasPage() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<EpsaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("edit");
  const [editTarget, setEditTarget] = useState<EpsaRow | null>(null);

  const openCreateDialog = () => {
    setDialogMode("create");
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEditDialog = (row: EpsaRow) => {
    setDialogMode("edit");
    setEditTarget(row);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditTarget(null);
  };

  const loadEpsas = useCallback(async (searchValue: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await epsasApi.list(searchValue.trim() ? { search: searchValue.trim() } : undefined);

      if (!response.success) {
        setError(response.message || "Failed to load EPSAs");
        setRows([]);
        return;
      }

      setRows(response.data.map(toRow));
    } catch {
      setError("Failed to load EPSAs");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadEpsas(search);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [loadEpsas, search]);

  const formatPercent = (value: number | null) => (value == null ? "" : `${value}%`);

  const handleExport = () => {
    exportToExcel(
      "epsas",
      [
        { header: "ID", value: (row) => row.id },
        { header: "Interest Name", value: (row) => row.interstName },
        { header: "NOC (%)", value: (row) => formatPercent(row.noc) },
        { header: "PC (%)", value: (row) => formatPercent(row.pc) },
        { header: "EPSA Type", value: (row) => row.epsaType || "" }
      ],
      rows
    );
  };

  const columns = useMemo<GridColDef<EpsaRow>[]>(
    () => [
      { field: "id", headerName: "ID", width: 90 },
      { field: "interstName", headerName: "Interest Name", minWidth: 220, flex: 1 },
      {
        field: "noc",
        headerName: "NOC (%)",
        minWidth: 120,
        flex: 0.5,
        valueFormatter: (value: number | null) => (value == null ? "" : `${value}%`)
      },
      {
        field: "pc",
        headerName: "PC (%)",
        minWidth: 120,
        flex: 0.5,
        valueFormatter: (value: number | null) => (value == null ? "" : `${value}%`)
      },
      {
        field: "epsaType",
        headerName: "EPSA Type",
        minWidth: 120,
        flex: 0.5
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
            aria-label="Edit EPSA"
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
              New EPSA
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

      <EpsaEditDialog
        open={dialogOpen}
        mode={dialogMode}
        epsa={editTarget}
        onClose={closeDialog}
        onSaved={() => void loadEpsas(search)}
      />
    </Box>
  );
}
