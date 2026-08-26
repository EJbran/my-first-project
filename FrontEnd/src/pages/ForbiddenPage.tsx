import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function ForbiddenPage() {
  return (
    <Box minHeight="60vh" display="flex" alignItems="center" justifyContent="center">
      <Stack spacing={2} alignItems="center" maxWidth={520}>
        <Typography variant="h4">403</Typography>
        <Typography variant="h6">Access denied</Typography>
        <Alert severity="warning">You do not have enough permissions to open this page.</Alert>
        <Button component={RouterLink} to="/dashboard" variant="contained">
          Return to dashboard
        </Button>
      </Stack>
    </Box>
  );
}
