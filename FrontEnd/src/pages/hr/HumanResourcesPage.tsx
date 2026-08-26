import { Box, Typography } from "@mui/material";

export default function HumanResourcesPage() {
  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 800 }}>
        Human Resources
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Select a Human Resources module from the sidebar to get started.
      </Typography>
    </Box>
  );
}
