import { type GridColDef } from "@mui/x-data-grid";
import { SimpleGridPage, type SimpleRow } from "../shared/SimpleGridPage";

const columns: GridColDef<SimpleRow>[] = [
  { field: "id", headerName: "Id", width: 90 },
  { field: "username", headerName: "Username", flex: 1 },
  { field: "email", headerName: "Email", flex: 1 },
  { field: "authProvider", headerName: "AuthProvider", flex: 1 },
  { field: "isSuccessful", headerName: "Successful", width: 130 },
  { field: "createdAt", headerName: "Time", flex: 1 }
];

const rows: SimpleRow[] = [{ id: 1, username: "john.doe", email: "john.doe@company.com", authProvider: "MICROSOFT", isSuccessful: "Yes", createdAt: "2026-07-07 09:10" }];

export default function LoginAttemptsPage() {
  return (
    <SimpleGridPage
      title="Login Attempts"
      subtitle="Read-only visibility into authentication attempts"
      columns={columns}
      rows={rows}
      filters={[
        { key: "username", label: "Username" },
        { key: "email", label: "Email" },
        { key: "isSuccessful", label: "Successful", type: "select", options: [{ label: "Yes", value: "true" }, { label: "No", value: "false" }] },
        { key: "authProvider", label: "Auth Provider", type: "select", options: [{ label: "MICROSOFT", value: "MICROSOFT" }, { label: "LOCAL", value: "LOCAL" }] },
        { key: "fromDate", label: "From Date", type: "date" },
        { key: "toDate", label: "To Date", type: "date" }
      ]}
    />
  );
}
