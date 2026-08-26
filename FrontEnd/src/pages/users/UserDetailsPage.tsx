import { Grid, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import { DetailCard } from "../../components/DetailCard";

export default function UserDetailsPage() {
  const { id } = useParams();

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <DetailCard title="User Summary">
          <Typography>User ID: {id}</Typography>
          <Typography color="text.secondary">Detailed profile, roles, sessions and devices are shown here.</Typography>
        </DetailCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <DetailCard title="Security State">
          <Typography>Last sign-in, lock status, and policy compliance indicators.</Typography>
        </DetailCard>
      </Grid>
    </Grid>
  );
}
