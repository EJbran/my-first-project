import { type GridColDef } from "@mui/x-data-grid";
import { SimpleGridPage, type SimpleRow } from "../shared/SimpleGridPage";

const columns: GridColDef<SimpleRow>[] = [
  { field: "id", headerName: "DeviceId", flex: 1 },
  { field: "userId", headerName: "UserId", flex: 1 },
  { field: "name", headerName: "Device", flex: 1 },
  { field: "isTrusted", headerName: "Trusted", width: 130 },
  { field: "isActive", headerName: "Active", width: 130 }
];

const rows: SimpleRow[] = [{ id: "D-01", userId: "1", name: "Laptop-OPS-44", isTrusted: "Yes", isActive: "Yes" }];

export default function UserDevicesPage() {
  return <SimpleGridPage title="User Devices" subtitle="Trust, untrust, activate and deactivate devices" columns={columns} rows={rows} />;
}
