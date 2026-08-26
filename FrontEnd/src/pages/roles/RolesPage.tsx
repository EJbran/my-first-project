import { Box, Button } from "@mui/material";
import { type GridColDef } from "@mui/x-data-grid";
import { useState } from "react";
import { SimpleGridPage, type SimpleRow } from "../shared/SimpleGridPage";
import { RoleFormDrawer } from "./RoleFormDrawer";

const columns: GridColDef<SimpleRow>[] = [
  { field: "id", headerName: "Id", width: 100 },
  { field: "code", headerName: "Code", flex: 1 },
  { field: "name", headerName: "Name", flex: 1 },
  { field: "isActive", headerName: "Status", flex: 1 }
];

const rows: SimpleRow[] = [{ id: 1, code: "SEC_ADMIN", name: "Security Admin", isActive: "Active" }];

export default function RolesPage() {
  const [open, setOpen] = useState(false);

  return (
    <Box>
      <SimpleGridPage
        title="Roles"
        subtitle="Create, update and activate role catalog"
        columns={columns}
        rows={rows}
        action={{ label: "Create role", onClick: () => setOpen(true) }}
      />
      <RoleFormDrawer open={open} onClose={() => setOpen(false)} />
      <Box mt={1}>
        <Button variant="text" size="small">Add/remove role permissions from role details.</Button>
      </Box>
    </Box>
  );
}
