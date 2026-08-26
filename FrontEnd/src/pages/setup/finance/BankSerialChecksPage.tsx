import EditRoundedIcon from "@mui/icons-material/EditRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import { Alert, Box, Button, CircularProgress, IconButton, Stack } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useCallback, useEffect, useMemo, useState } from "react";
import { bankSerialChecksApi } from "../../../api/bankSerialChecks.api";
import { DataGridToolbar } from "../../../components/DataGridToolbar";
import type { BankSerialCheck } from "../../../types/bankSerialCheck.types";
import { exportToExcel } from "../../../utils/exportExcel";
import {
  BankSerialCheckEditDialog,
  type BankSerialCheckEditTarget
} from "./BankSerialCheckEditDialog";

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

type SerialRow = BankSerialCheckEditTarget & {
  bankLabel: string;
};

const formatDate = (value: string) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const toRow = (item: BankSerialCheck): SerialRow => ({
  id: item.ID_BANK_SERIAL_CHECKS,
  fromCheck: item.From_Check ?? "",
  toCheck: item.To_Check ?? "",
  creationDate: item.Creation_date ?? "",
  bankId: item.BANKID,
  bankLabel:
    item.Bank?.Branch?.trim() ||
    (item.BANKID != null ? `Bank #${item.BANKID}` : "")
});

export default function BankSerialChecksPage() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<SerialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("edit");
  const [editTarget, setEditTarget] = useState<SerialRow | null>(null);

  const openCreateDialog = () => {
    setDialogMode("create");
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEditDialog = (row: SerialRow) => {
    setDialogMode("edit");
    setEditTarget(row);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditTarget(null);
  };

  const loadRows = useCallback(async (searchValue: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await bankSerialChecksApi.list(
        searchValue.trim() ? { search: searchValue.trim() } : undefined
      );

      if (!response.success) {
        setError(response.message || "Failed to load serial checks");
        setRows([]);
        return;
      }

      setRows(response.data.map(toRow));
    } catch {
      setError("Failed to load serial checks");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRows(search);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [loadRows, search]);

  const handleExport = () => {
    exportToExcel(
      "bank-serial-checks",
      [
        { header: "ID", value: (row) => row.id },
        { header: "Bank ID", value: (row) => row.bankId ?? "" },
        { header: "Bank", value: (row) => row.bankLabel },
        { header: "From Check", value: (row) => row.fromCheck },
        { header: "To Check", value: (row) => row.toCheck },
        { header: "Creation Date", value: (row) => formatDate(row.creationDate) }
      ],
      rows
    );
  };

  const columns = useMemo<GridColDef<SerialRow>[]>(
    () => [
      { field: "id", headerName: "ID", width: 90 },
      { field: "bankId", headerName: "Bank ID", width: 100 },
      { field: "bankLabel", headerName: "Bank / Branch", minWidth: 180, flex: 1 },
      { field: "fromCheck", headerName: "From Check", minWidth: 140, flex: 1 },
      { field: "toCheck", headerName: "To Check", minWidth: 140, flex: 1 },
      {
        field: "creationDate",
        headerName: "Creation Date",
        minWidth: 180,
        flex: 1,
        valueFormatter: (value: string) => formatDate(value)
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
            aria-label="Edit serial check"
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
              New Serial Check
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
            pageSizeOptions={[10, 50, 100, { value: -1, label: "All" }]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            disableRowSelectionOnClick
            sx={dataGridSx}
          />
        </Box>
      )}

      <BankSerialCheckEditDialog
        open={dialogOpen}
        mode={dialogMode}
        serialCheck={editTarget}
        onClose={closeDialog}
        onSaved={() => void loadRows(search)}
      />
    </Box>
  );
}
