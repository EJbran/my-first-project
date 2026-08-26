import { type GridColDef } from "@mui/x-data-grid";
import { SimpleGridPage, type SimpleRow } from "../shared/SimpleGridPage";

const columns: GridColDef<SimpleRow>[] = [
  { field: "id", headerName: "SessionId", flex: 1 },
  { field: "userId", headerName: "UserId", flex: 1 },
  { field: "isActive", headerName: "Active", width: 120 },
  { field: "createdAt", headerName: "CreatedAt", flex: 1 },
  { field: "expiresAt", headerName: "ExpiresAt", flex: 1 }
];

const rows: SimpleRow[] = [{ id: "S-1001", userId: "1", isActive: "Yes", createdAt: "2026-07-07 08:00", expiresAt: "2026-07-07 16:00" }];

export default function UserSessionsPage() {
  return (
    <SimpleGridPage
      title="User Sessions"
      subtitle="Track and revoke active sessions"
      columns={columns}
      rows={rows}
      action={{
        label: "Revoke all for user",
        onClick: () => {
          void 0;
        }
      }}
      helperText="Use row-level actions in production to revoke individual sessions."
    />
  );
}
