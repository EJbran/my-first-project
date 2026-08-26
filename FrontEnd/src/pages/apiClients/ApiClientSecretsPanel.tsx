import { Alert, Card, CardContent, List, ListItem, Typography } from "@mui/material";

interface ApiClientSecretsPanelProps {
  showSecret?: string;
}

export const ApiClientSecretsPanel = ({ showSecret }: ApiClientSecretsPanelProps) => (
  <Card>
    <CardContent>
      <Typography variant="h6">API Client Secrets</Typography>
      {showSecret ? (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Secret generated. Copy it now; it is shown only once: {showSecret}
        </Alert>
      ) : null}
      <List>
        <ListItem>Secrets are masked. SecretHash is never shown in this UI.</ListItem>
      </List>
    </CardContent>
  </Card>
);
