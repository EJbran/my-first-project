import { useState } from "react";
import { type GridColDef } from "@mui/x-data-grid";
import { SimpleGridPage, type SimpleRow } from "../shared/SimpleGridPage";
import { AccessRequestFormDrawer } from "./AccessRequestFormDrawer";

const columns: GridColDef<SimpleRow>[] = [
  { field: "id", headerName: "Id", width: 90 },
  { field: "userId", headerName: "UserId", flex: 1 },
  { field: "roleId", headerName: "RoleId", flex: 1 },
  { field: "permissionId", headerName: "PermissionId", flex: 1 },
  { field: "status", headerName: "Status", width: 140 },
  { field: "createdAt", headerName: "CreatedAt", flex: 1 }
];

const rows: SimpleRow[] = [{ id: 1, userId: "1", roleId: "SEC_ADMIN", permissionId: "", status: "PENDING", createdAt: "2026-07-07" }];

export default function AccessRequestsPage() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <SimpleGridPage
        title="Access Requests"
        subtitle="Create and track access requests; approve or reject with proper permissions"
        columns={columns}
        rows={rows}
        action={{ label: "Create access request", onClick: () => setOpen(true) }}
      />
      <AccessRequestFormDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
