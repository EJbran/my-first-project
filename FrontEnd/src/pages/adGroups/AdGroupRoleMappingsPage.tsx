import { useState } from "react";
import { type GridColDef } from "@mui/x-data-grid";
import { SimpleGridPage, type SimpleRow } from "../shared/SimpleGridPage";
import { AdGroupRoleMappingFormDrawer } from "./AdGroupRoleMappingFormDrawer";

const columns: GridColDef<SimpleRow>[] = [
  { field: "id", headerName: "Id", width: 90 },
  { field: "authDomainId", headerName: "AuthDomainId", flex: 1 },
  { field: "entraGroupObjectId", headerName: "EntraGroupObjectId", flex: 1.3 },
  { field: "adGroupSid", headerName: "AdGroupSid", flex: 1.2 },
  { field: "adGroupName", headerName: "AdGroupName", flex: 1.2 },
  { field: "roleId", headerName: "RoleId", flex: 1 },
  { field: "isActive", headerName: "Status", width: 120 }
];

const rows: SimpleRow[] = [
  {
    id: 1,
    authDomainId: "1",
    entraGroupObjectId: "8b9808d0-82bf-43f6-86f5-bf5f49d5d322",
    adGroupSid: "",
    adGroupName: "IMS Security Admins",
    roleId: "SEC_ADMIN",
    isActive: "Active"
  }
];

export default function AdGroupRoleMappingsPage() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <SimpleGridPage
        title="AD / Entra Group Role Mappings"
        subtitle="Map Entra group object IDs and AD groups to application roles"
        helperText="For Microsoft 365/Entra ID, use Entra Group Object ID."
        columns={columns}
        rows={rows}
        action={{ label: "Create mapping", onClick: () => setOpen(true) }}
      />
      <AdGroupRoleMappingFormDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
