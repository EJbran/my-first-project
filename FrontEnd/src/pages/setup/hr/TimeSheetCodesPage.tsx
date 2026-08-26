import EditRoundedIcon from "@mui/icons-material/EditRounded";
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
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useCallback, useEffect, useMemo, useState } from "react";
import { timeSheetCodesApi } from "../../../api/timeSheetCodes.api";
import { DataGridToolbar } from "../../../components/DataGridToolbar";
import type { TimeSheetCode } from "../../../types/timeSheetCode.types";
import { exportToExcel } from "../../../utils/exportExcel";
import {
  TimeSheetCodeEditDialog,
  type TimeSheetCodeEditTarget
} from "./TimeSheetCodeEditDialog";

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

type TimeSheetCodeRow = TimeSheetCodeEditTarget;

const toRow = (item: TimeSheetCode): TimeSheetCodeRow => ({
  id: item.ID,
  code: item.Code ?? "",
  codeDescription: item.Code_Description ?? ""
});

export default function TimeSheetCodesPage() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<TimeSheetCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("edit");
  const [editTarget, setEditTarget] = useState<TimeSheetCodeRow | null>(null);

  const openCreateDialog = () => {
    setDialogMode("create");
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEditDialog = (row: TimeSheetCodeRow) => {
    setDialogMode("edit");
    setEditTarget(row);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditTarget(null);
  };

  const loadTimeSheetCodes = useCallback(async (searchValue: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await timeSheetCodesApi.list(
        searchValue.trim() ? { search: searchValue.trim() } : undefined
      );

      if (!response.success) {
        setError(response.message || "Failed to load time sheet codes");
        setRows([]);
        return;
      }

      setRows(response.data.map(toRow));
    } catch {
      setError("Failed to load time sheet codes");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTimeSheetCodes(search);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [loadTimeSheetCodes, search]);

  const handleExport = () => {
    exportToExcel(
      "time-sheet-codes",
      [
        { header: "ID", value: (row) => row.id },
        { header: "Code", value: (row) => row.code },
        { header: "Code Description", value: (row) => row.codeDescription }
      ],
      rows
    );
  };

  const columns = useMemo<GridColDef<TimeSheetCodeRow>[]>(
    () => [
      { field: "id", headerName: "ID", width: 90 },
      {
        field: "code",
        headerName: "Code",
        width: 140,
        renderCell: (params) => (
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {params.row.code || "—"}
          </Typography>
        )
      },
      {
        field: "codeDescription",
        headerName: "Code Description",
        minWidth: 260,
        flex: 1,
        renderCell: (params) => (
          <Typography variant="body2">{params.row.codeDescription || "—"}</Typography>
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
            aria-label="Edit time sheet code"
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
              New Time Sheet Code
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

      <TimeSheetCodeEditDialog
        open={dialogOpen}
        mode={dialogMode}
        timeSheetCode={editTarget}
        onClose={closeDialog}
        onSaved={() => void loadTimeSheetCodes(search)}
      />
    </Box>
  );
}
