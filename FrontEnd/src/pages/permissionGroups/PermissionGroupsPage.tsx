import { useState } from "react";
import { type GridColDef } from "@mui/x-data-grid";
import { SimpleGridPage, type SimpleRow } from "../shared/SimpleGridPage";
import { PermissionGroupFormDrawer } from "./PermissionGroupFormDrawer";

const columns: GridColDef<SimpleRow>[] = [
  { field: "id", headerName: "Id", width: 90 },
  { field: "code", headerName: "Code", flex: 1 },
  { field: "name", headerName: "Name", flex: 1 }
];

const rows: SimpleRow[] = [{ id: 1, code: "SEC_CORE", name: "Security Core" }];

export default function PermissionGroupsPage() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <SimpleGridPage
        title="Permission Groups"
        subtitle="Manage grouped permission bundles"
        columns={columns}
        rows={rows}
        action={{ label: "Create group", onClick: () => setOpen(true) }}
      />
      <PermissionGroupFormDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
