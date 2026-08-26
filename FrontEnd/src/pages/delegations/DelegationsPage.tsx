import { useState } from "react";
import { type GridColDef } from "@mui/x-data-grid";
import { SimpleGridPage, type SimpleRow } from "../shared/SimpleGridPage";
import { DelegationFormDrawer } from "./DelegationFormDrawer";

const columns: GridColDef<SimpleRow>[] = [
  { field: "id", headerName: "Id", width: 90 },
  { field: "fromUserId", headerName: "FromUserId", flex: 1 },
  { field: "toUserId", headerName: "ToUserId", flex: 1 },
  { field: "startAt", headerName: "StartAt", flex: 1 },
  { field: "endAt", headerName: "EndAt", flex: 1 },
  { field: "status", headerName: "Status", width: 130 }
];

const rows: SimpleRow[] = [{ id: 1, fromUserId: "1", toUserId: "22", startAt: "2026-07-07", endAt: "2026-07-10", status: "APPROVED" }];

export default function DelegationsPage() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <SimpleGridPage
        title="Delegations"
        subtitle="Create, approve and revoke delegation assignments"
        columns={columns}
        rows={rows}
        action={{ label: "Create delegation", onClick: () => setOpen(true) }}
      />
      <DelegationFormDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
