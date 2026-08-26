import { Grid, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import { DetailCard } from "../../components/DetailCard";
import { RolePermissionsPanel } from "./RolePermissionsPanel";

export default function RoleDetailsPage() {
  const { id } = useParams();

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <DetailCard title="Role Details">
          <Typography>Role ID: {id}</Typography>
          <Typography color="text.secondary">Role members and metadata will be shown here.</Typography>
        </DetailCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <RolePermissionsPanel permissions={["security.users.read", "security.roles.read"]} />
      </Grid>
    </Grid>
  );
}
