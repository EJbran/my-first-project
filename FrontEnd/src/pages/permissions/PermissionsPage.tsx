import { useState } from "react";
import { type GridColDef } from "@mui/x-data-grid";
import { SimpleGridPage, type SimpleRow } from "../shared/SimpleGridPage";
import { PermissionFormDrawer } from "./PermissionFormDrawer";

const columns: GridColDef<SimpleRow>[] = [
  { field: "id", headerName: "Id", width: 100 },
  { field: "code", headerName: "Code", flex: 1 },
  { field: "module", headerName: "Module", flex: 1 },
  { field: "actionName", headerName: "Action Name", flex: 1 },
  { field: "isActive", headerName: "Status", width: 120 }
];

const rows: SimpleRow[] = [{ id: 1, code: "security.users.read", module: "security", actionName: "read", isActive: "Active" }];

export default function PermissionsPage() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <SimpleGridPage
        title="Permissions"
        subtitle="Manage permission policies by module and action"
        columns={columns}
        rows={rows}
        filters={[
          { key: "module", label: "Module" },
          { key: "actionName", label: "Action" },
          { key: "isActive", label: "Status", type: "select", options: [{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }] }
        ]}
        action={{ label: "Create permission", onClick: () => setOpen(true) }}
      />
      <PermissionFormDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
