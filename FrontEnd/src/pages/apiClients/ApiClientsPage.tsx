import { Grid } from "@mui/material";
import { type GridColDef } from "@mui/x-data-grid";
import { SimpleGridPage, type SimpleRow } from "../shared/SimpleGridPage";
import { ApiClientSecretsPanel } from "./ApiClientSecretsPanel";

const columns: GridColDef<SimpleRow>[] = [
  { field: "id", headerName: "Id", width: 90 },
  { field: "name", headerName: "Name", flex: 1 },
  { field: "clientId", headerName: "ClientId", flex: 1 },
  { field: "isActive", headerName: "Status", width: 120 }
];

const rows: SimpleRow[] = [{ id: 1, name: "IMS Integration Service", clientId: "ims-service", isActive: "Active" }];

export default function ApiClientsPage() {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 8 }}>
        <SimpleGridPage
          title="API Clients"
          subtitle="Manage machine-to-machine client integrations"
          columns={columns}
          rows={rows}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <ApiClientSecretsPanel showSecret="ims_secret_example_only_once" />
      </Grid>
    </Grid>
  );
}
