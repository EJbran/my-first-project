import { Box, Drawer, Stack, Typography } from "@mui/material";
import { type GridColDef } from "@mui/x-data-grid";
import { useState } from "react";
import { SimpleGridPage, type SimpleRow } from "../shared/SimpleGridPage";

const columns: GridColDef<SimpleRow>[] = [
  { field: "id", headerName: "Id", width: 80 },
  { field: "actorUserId", headerName: "Actor", flex: 1 },
  { field: "module", headerName: "Module", flex: 1 },
  { field: "action", headerName: "Action", flex: 1 },
  { field: "entityName", headerName: "Entity", flex: 1 },
  { field: "status", headerName: "Status", width: 120 },
  { field: "createdAt", headerName: "Time", flex: 1 }
];

const rows: SimpleRow[] = [{ id: 1, actorUserId: "1", module: "users", action: "update", entityName: "User", status: "SUCCESS", createdAt: "2026-07-07 10:00" }];

export default function AuditLogsPage() {
  const [open] = useState(false);
  const sampleJson = {
    oldData: { isActive: false },
    newData: { isActive: true }
  };

  return (
    <>
      <SimpleGridPage
        title="Audit Logs"
        subtitle="Read-only enterprise audit trail"
        columns={columns}
        rows={rows}
        filters={[
          { key: "actorUserId", label: "Actor User ID" },
          { key: "module", label: "Module" },
          { key: "action", label: "Action" },
          { key: "entityName", label: "Entity" },
          { key: "status", label: "Status" },
          { key: "fromDate", label: "From Date", type: "date" },
          { key: "toDate", label: "To Date", type: "date" }
        ]}
      />
      <Drawer anchor="right" open={open} onClose={() => undefined}>
        <Box width={520} p={2}>
          <Typography variant="h6">Audit Details</Typography>
          <Stack spacing={2} mt={2}>
            <Box>
              <Typography variant="subtitle2">OldData</Typography>
              <pre>{JSON.stringify(sampleJson.oldData, null, 2)}</pre>
            </Box>
            <Box>
              <Typography variant="subtitle2">NewData</Typography>
              <pre>{JSON.stringify(sampleJson.newData, null, 2)}</pre>
            </Box>
          </Stack>
        </Box>
      </Drawer>
    </>
  );
}
