import { Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import { DetailCard } from "../../components/DetailCard";

export default function AccessRequestDetailsPage() {
  const { id } = useParams();

  return (
    <DetailCard title="Access Request Details">
      <Typography>Request ID: {id}</Typography>
      <Typography color="text.secondary">Approval chain and decision log will be displayed here.</Typography>
    </DetailCard>
  );
}
