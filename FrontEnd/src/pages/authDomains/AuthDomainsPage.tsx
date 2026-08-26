import { useState } from "react";
import { type GridColDef } from "@mui/x-data-grid";
import { SimpleGridPage, type SimpleRow } from "../shared/SimpleGridPage";
import { AuthDomainFormDrawer } from "./AuthDomainFormDrawer";

const columns: GridColDef<SimpleRow>[] = [
  { field: "id", headerName: "Id", width: 80 },
  { field: "name", headerName: "Name", flex: 1 },
  { field: "type", headerName: "Type", flex: 1 },
  { field: "isActive", headerName: "Status", width: 120 }
];

const rows: SimpleRow[] = [{ id: 1, name: "Corporate Entra", type: "OIDC", isActive: "Active" }];

export default function AuthDomainsPage() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <SimpleGridPage
        title="Auth Domains"
        subtitle="Manage OIDC, ADFS, LDAP, LDAPS and Kerberos domain metadata"
        columns={columns}
        rows={rows}
        action={{ label: "Create domain", onClick: () => setOpen(true) }}
      />
      <AuthDomainFormDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
