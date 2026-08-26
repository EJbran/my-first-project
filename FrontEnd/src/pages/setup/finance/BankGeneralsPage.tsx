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
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useCallback, useEffect, useMemo, useState } from "react";
import { bankGeneralsApi } from "../../../api/bankGenerals.api";
import { DataGridToolbar } from "../../../components/DataGridToolbar";
import type { BankGeneral } from "../../../types/bankGeneral.types";
import { exportToExcel } from "../../../utils/exportExcel";
import { BankGeneralEditDialog, type BankGeneralEditTarget } from "./BankGeneralEditDialog";

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

type BankGeneralRow = BankGeneralEditTarget & {
  branchCount: number;
};

const toRow = (item: BankGeneral): BankGeneralRow => ({
  id: item.Id,
  backName: item.BackName ?? "",
  branchCount: Number(item.BranchCount ?? 0)
});

export default function BankGeneralsPage() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<BankGeneralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("edit");
  const [editTarget, setEditTarget] = useState<BankGeneralRow | null>(null);

  const openCreateDialog = () => {
    setDialogMode("create");
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEditDialog = (row: BankGeneralRow) => {
    setDialogMode("edit");
    setEditTarget(row);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditTarget(null);
  };

  const loadBankGenerals = useCallback(async (searchValue: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await bankGeneralsApi.list(
        searchValue.trim() ? { search: searchValue.trim() } : undefined
      );

      if (!response.success) {
        setError(response.message || "Failed to load bank generals");
        setRows([]);
        return;
      }

      setRows(response.data.map(toRow));
    } catch {
      setError("Failed to load bank generals");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadBankGenerals(search);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [loadBankGenerals, search]);

  const handleExport = () => {
    exportToExcel(
      "bank-generals",
      [
        { header: "ID", value: (row) => row.id },
        { header: "Bank Name", value: (row) => row.backName },
        { header: "Nbr of Branch", value: (row) => row.branchCount }
      ],
      rows
    );
  };

  const columns = useMemo<GridColDef<BankGeneralRow>[]>(
    () => [
      { field: "id", headerName: "ID", width: 90 },
      {
        field: "backName",
        headerName: "Bank Name",
        minWidth: 260,
        flex: 1,
        renderCell: (params) => (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ height: "100%" }}>
            <Typography variant="body2">{params.row.backName || "—"}</Typography>
            <Chip
              size="small"
              label={params.row.branchCount}
              color="primary"
              variant="outlined"
              sx={{
                height: 22,
                fontSize: "0.75rem",
                fontWeight: 600,
                bgcolor: "transparent"
              }}
            />
          </Stack>
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
            aria-label="Edit bank general"
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
              New Bank General
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
            pageSizeOptions={[10, 50, { value: -1, label: "All" }]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } }
            }}
            disableRowSelectionOnClick
            sx={dataGridSx}
          />
        </Box>
      )}

      <BankGeneralEditDialog
        open={dialogOpen}
        mode={dialogMode}
        bankGeneral={editTarget}
        onClose={closeDialog}
        onSaved={() => void loadBankGenerals(search)}
      />
    </Box>
  );
}
