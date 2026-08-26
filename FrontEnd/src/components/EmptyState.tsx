import { Box, Typography } from "@mui/material";

interface EmptyStateProps {
  title: string;
  description: string;
}

export const EmptyState = ({ title, description }: EmptyStateProps) => (
  <Box p={4} textAlign="center">
    <Typography variant="h6">{title}</Typography>
    <Typography color="text.secondary">{description}</Typography>
  </Box>
);
