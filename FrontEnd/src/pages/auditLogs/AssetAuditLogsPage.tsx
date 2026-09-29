import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Alert, Box, Drawer, IconButton, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { auditLogsApi, type AssetAuditLog } from "../../api/auditLogs.api";
import { PageHeader } from "../../components/PageHeader";

const initialFilters = { assetId: "", assetCode: "", user: "", action: "", dateFrom: "", dateTo: "" };

const formatDetails = (value: unknown): string => {
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value) as unknown, null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value ?? null, null, 2);
};

export default function AssetAuditLogsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [selectedLog, setSelectedLog] = useState<AssetAuditLog | null>(null);
  const logsQuery = useQuery({
    queryKey: ["audit-logs", "Asset", filters, pagination],
    queryFn: () => auditLogsApi.list({ ...filters, page: pagination.page, pageSize: pagination.pageSize })
  });
  const rows = Array.isArray(logsQuery.data?.data) ? logsQuery.data.data : [];
  const total = Number(logsQuery.data?.pagination?.total ?? 0);
  const updateFilter = (key: keyof typeof initialFilters, value: string) => {
    setPagination((current) => ({ ...current, page: 0 }));
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const columns: GridColDef<AssetAuditLog>[] = [
    { field: "Id", headerName: "Log ID", width: 90 },
    { field: "EntityId", headerName: "Asset ID", width: 110 },
    { field: "AssetCode", headerName: "Asset Code", flex: 1, minWidth: 130, valueGetter: (_value, row) => {
      const data = row.NewData ?? row.OldData;
      return data && typeof data === "object" && "AssetCode" in data ? String(data.AssetCode ?? "") : "";
    } },
    { field: "ActorUserName", headerName: "User", flex: 1, minWidth: 160, valueGetter: (_value, row) => row.ActorUserName || (row.ActorUserId === null ? "Unknown user" : `User ${row.ActorUserId}`) },
    { field: "Action", headerName: "Action", width: 120 },
    { field: "CreatedAt", headerName: "Date", flex: 1, minWidth: 175, valueFormatter: (value) => value ? new Date(String(value)).toLocaleString() : "" },
    { field: "details", headerName: "Details", width: 90, sortable: false, filterable: false, renderCell: (params) => <Tooltip title="View details"><IconButton size="small" aria-label={`View audit log ${params.row.Id}`} onClick={() => setSelectedLog(params.row)}><InfoOutlinedIcon fontSize="small" /></IconButton></Tooltip> }
  ];

  return <Stack gap={2}>
    <PageHeader title="Asset Audit Logs" subtitle="Asset change history" />
    <Box display="grid" gap={2} gridTemplateColumns={{ xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" }}>
      <TextField label="Asset ID" size="small" value={filters.assetId} onChange={(event) => updateFilter("assetId", event.target.value)} />
      <TextField label="Asset Code" size="small" value={filters.assetCode} onChange={(event) => updateFilter("assetCode", event.target.value)} />
      <TextField label="User" size="small" value={filters.user} onChange={(event) => updateFilter("user", event.target.value)} />
      <TextField label="Action" size="small" value={filters.action} onChange={(event) => updateFilter("action", event.target.value)} />
      <TextField label="Date From" type="date" size="small" value={filters.dateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      <TextField label="Date To" type="date" size="small" value={filters.dateTo} onChange={(event) => updateFilter("dateTo", event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
    </Box>
    {logsQuery.isError ? <Alert severity="error">Asset audit logs could not be loaded.</Alert> : null}
    {!logsQuery.isLoading && !logsQuery.isError && rows.length === 0 ? <Typography>No audit logs found</Typography> : null}
    <DataGrid
      autoHeight
      rows={rows}
      getRowId={(row) => row.Id}
      columns={columns}
      loading={logsQuery.isLoading || logsQuery.isFetching}
      rowCount={total}
      paginationMode="server"
      paginationModel={pagination}
      onPaginationModelChange={setPagination}
      pageSizeOptions={[10, 20, 50]}
      disableRowSelectionOnClick
    />
    <Drawer anchor="right" open={Boolean(selectedLog)} onClose={() => setSelectedLog(null)}>
      {selectedLog ? <Box width={{ xs: "100vw", sm: 520 }} p={3}>
        <Typography variant="h6">Asset audit details</Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>{selectedLog.Action} · Asset {selectedLog.EntityId} · {selectedLog.ActorUserName || `User ${selectedLog.ActorUserId ?? "unknown"}`}</Typography>
        <Stack spacing={2} mt={3}>
          <Box><Typography variant="subtitle2">OldValue</Typography><Box component="pre" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 13 }}>{formatDetails(selectedLog.OldData)}</Box></Box>
          <Box><Typography variant="subtitle2">NewValue</Typography><Box component="pre" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 13 }}>{formatDetails(selectedLog.NewData)}</Box></Box>
        </Stack>
      </Box> : null}
    </Drawer>
  </Stack>;
}