import { Box, Button, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <Box minHeight="60vh" display="flex" alignItems="center" justifyContent="center">
      <Stack spacing={2} alignItems="center">
        <Typography variant="h3">404</Typography>
        <Typography variant="h6">Page not found</Typography>
        <Button component={RouterLink} to="/dashboard" variant="contained">
          Back to dashboard
        </Button>
      </Stack>
    </Box>
  );
}
