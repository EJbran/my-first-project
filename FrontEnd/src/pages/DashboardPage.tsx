import { Card, CardContent, Grid, Typography } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";

const auditColumns: GridColDef[] = [
  { field: "module", headerName: "Module", flex: 1 },
  { field: "action", headerName: "Action", flex: 1 },
  { field: "status", headerName: "Status", width: 130 },
  { field: "createdAt", headerName: "Time", flex: 1 }
];

const loginAttemptColumns: GridColDef[] = [
  { field: "username", headerName: "Username", flex: 1 },
  { field: "authProvider", headerName: "Auth Provider", flex: 1 },
  { field: "isSuccessful", headerName: "Success", width: 120 },
  { field: "createdAt", headerName: "Time", flex: 1 }
];

const sampleAuditRows = [
  { id: 1, module: "Users", action: "CREATE", status: "SUCCESS", createdAt: "2026-07-07 09:20" },
  { id: 2, module: "Roles", action: "UPDATE", status: "SUCCESS", createdAt: "2026-07-07 09:35" }
];

const sampleLoginRows = [
  { id: 1, username: "john.doe", authProvider: "MICROSOFT", isSuccessful: "Yes", createdAt: "2026-07-07 08:10" },
  { id: 2, username: "ops.admin", authProvider: "LOCAL", isSuccessful: "No", createdAt: "2026-07-07 08:25" }
];

export default function DashboardPage() {
  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <PageHeader
          title="Operations Dashboard"
          subtitle="Enterprise identity, access, security and governance overview"
        />
      </Grid>
      <Grid size={{ xs: 12, md: 3 }}>
        <StatCard label="Active Users" value={248} />
      </Grid>
      <Grid size={{ xs: 12, md: 3 }}>
        <StatCard label="Active Sessions" value={317} />
      </Grid>
      <Grid size={{ xs: 12, md: 3 }}>
        <StatCard label="Failed Logins Today" value={9} />
      </Grid>
      <Grid size={{ xs: 12, md: 3 }}>
        <StatCard label="Pending Access Requests" value={14} />
      </Grid>
      <Grid size={{ xs: 12, md: 7 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Audit Logs
            </Typography>
            <DataGrid autoHeight rows={sampleAuditRows} columns={auditColumns} hideFooter />
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Login Attempts
            </Typography>
            <DataGrid autoHeight rows={sampleLoginRows} columns={loginAttemptColumns} hideFooter />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
