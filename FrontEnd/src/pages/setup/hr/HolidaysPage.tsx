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
  MenuItem,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useCallback, useEffect, useMemo, useState } from "react";
import { holidaysApi } from "../../../api/holidays.api";
import { DataGridToolbar } from "../../../components/DataGridToolbar";
import { HOLIDAY_TYPES, type Holiday } from "../../../types/holiday.types";
import { exportToExcel } from "../../../utils/exportExcel";
import { HolidayEditDialog, type HolidayEditTarget } from "./HolidayEditDialog";

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
  "& .MuiDataGrid-cell": {
    display: "flex",
    alignItems: "center",
    py: 0.75
  },
  "[data-toolpad-color-scheme='light'] &": {
    bgcolor: "#ffffff",
    "& .MuiDataGrid-columnHeaders, & .MuiDataGrid-footerContainer, & .MuiDataGrid-overlay": {
      bgcolor: "#ffffff"
    }
  }
};

type HolidayRow = HolidayEditTarget;

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
] as const;

const formatHolidayDate = (dateValue: string, isFixedDate: boolean): string => {
  const raw = String(dateValue || "").trim();
  if (!raw) {
    return "—";
  }

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return raw;
  }

  const [, , month, day] = match;
  if (isFixedDate) {
    const monthIndex = Number(month) - 1;
    const monthLabel = MONTH_NAMES[monthIndex] || month;
    return `${day} ${monthLabel}`;
  }

  return `${match[1]}-${month}-${day}`;
};

const toRow = (item: Holiday): HolidayRow => ({
  id: item.HolidayId,
  holidayCode: item.HolidayCode ?? "",
  holidayNameAr: item.HolidayNameAr ?? "",
  holidayNameEn: item.HolidayNameEn ?? "",
  holidayType: item.HolidayType ?? "",
  holidayDate: item.HolidayDate ? String(item.HolidayDate).slice(0, 10) : "",
  isFixedDate: Boolean(item.IsFixedDate),
  isActive: Boolean(item.IsActive),
  description: item.Description ?? ""
});

export default function HolidaysPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [rows, setRows] = useState<HolidayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("edit");
  const [editTarget, setEditTarget] = useState<HolidayRow | null>(null);

  const openCreateDialog = () => {
    setDialogMode("create");
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEditDialog = (row: HolidayRow) => {
    setDialogMode("edit");
    setEditTarget(row);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditTarget(null);
  };

  const loadHolidays = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await holidaysApi.list({
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(typeFilter ? { HolidayType: typeFilter } : {}),
        ...(activeFilter ? { IsActive: activeFilter } : {})
      });

      if (!response.success) {
        setError(response.message || "Failed to load holidays");
        setRows([]);
        return;
      }

      setRows(response.data.map(toRow));
    } catch {
      setError("Failed to load holidays");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, search, typeFilter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadHolidays();
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [loadHolidays]);

  const handleExport = () => {
    exportToExcel(
      "holidays",
      [
        { header: "HolidayId", value: (row) => row.id },
        { header: "HolidayCode", value: (row) => row.holidayCode },
        { header: "HolidayNameEn", value: (row) => row.holidayNameEn },
        { header: "HolidayNameAr", value: (row) => row.holidayNameAr },
        { header: "HolidayType", value: (row) => row.holidayType },
        { header: "HolidayDate", value: (row) => formatHolidayDate(row.holidayDate, row.isFixedDate) },
        { header: "IsFixedDate", value: (row) => (row.isFixedDate ? "Yes" : "No") },
        { header: "IsActive", value: (row) => (row.isActive ? "Yes" : "No") },
        { header: "Description", value: (row) => row.description }
      ],
      rows
    );
  };

  const columns = useMemo<GridColDef<HolidayRow>[]>(
    () => [
      { field: "id", headerName: "ID", width: 80 },
      {
        field: "holidayCode",
        headerName: "Code",
        width: 170,
        renderCell: (params) => (
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {params.row.holidayCode || "—"}
          </Typography>
        )
      },
      {
        field: "holidayNameEn",
        headerName: "Name (EN / AR)",
        minWidth: 240,
        flex: 1,
        renderCell: (params) => (
          <Stack sx={{ py: 0.5, lineHeight: 1.25 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {params.row.holidayNameEn || "—"}
            </Typography>
            {params.row.holidayNameAr ? (
              <Typography variant="caption" color="text.secondary" dir="rtl">
                {params.row.holidayNameAr}
              </Typography>
            ) : null}
          </Stack>
        )
      },
      {
        field: "holidayType",
        headerName: "Type",
        width: 130,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.row.holidayType || "—"}
            color={params.row.holidayType === "NATIONAL" ? "primary" : "secondary"}
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
        )
      },
      {
        field: "holidayDate",
        headerName: "Date",
        width: 130,
        valueGetter: (_value, row) => formatHolidayDate(row.holidayDate, row.isFixedDate),
        renderCell: (params) => (
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {formatHolidayDate(params.row.holidayDate, params.row.isFixedDate)}
          </Typography>
        )
      },
      {
        field: "isFixedDate",
        headerName: "Fixed",
        width: 100,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.row.isFixedDate ? "Yes" : "No"}
            color={params.row.isFixedDate ? "info" : "default"}
            variant="outlined"
          />
        )
      },
      {
        field: "isActive",
        headerName: "Active",
        width: 110,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.row.isActive ? "Active" : "Inactive"}
            color={params.row.isActive ? "success" : "default"}
            variant="outlined"
            sx={{ fontWeight: 700 }}
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
            aria-label="Edit holiday"
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
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <TextField
              select
              size="small"
              label="Type"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="">All</MenuItem>
              {HOLIDAY_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Active"
              value={activeFilter}
              onChange={(event) => setActiveFilter(event.target.value)}
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="true">Active</MenuItem>
              <MenuItem value="false">Inactive</MenuItem>
            </TextField>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateDialog}>
              New Holiday
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
            getRowHeight={() => "auto"}
            pageSizeOptions={[10, 50, { value: -1, label: "All" }]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } }
            }}
            disableRowSelectionOnClick
            sx={dataGridSx}
          />
        </Box>
      )}

      <HolidayEditDialog
        open={dialogOpen}
        mode={dialogMode}
        holiday={editTarget}
        onClose={closeDialog}
        onSaved={() => void loadHolidays()}
      />
    </Box>
  );
}
