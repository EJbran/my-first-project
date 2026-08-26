import { useState } from "react";
import { type GridColDef } from "@mui/x-data-grid";
import { SimpleGridPage, type SimpleRow } from "../shared/SimpleGridPage";
import { SecurityPolicyFormDrawer } from "./SecurityPolicyFormDrawer";

const columns: GridColDef<SimpleRow>[] = [
  { field: "id", headerName: "Id", width: 90 },
  { field: "key", headerName: "Key", flex: 1 },
  { field: "value", headerName: "Value", flex: 1 },
  { field: "isActive", headerName: "Status", width: 130 }
];

const rows: SimpleRow[] = [{ id: 1, key: "password.max_age_days", value: "90", isActive: "Active" }];

export default function SecurityPoliciesPage() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SimpleGridPage
        title="Security Policies"
        subtitle="Configure enterprise security policy values"
        columns={columns}
        rows={rows}
        action={{ label: "Edit policy", onClick: () => setOpen(true) }}
      />
      <SecurityPolicyFormDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
