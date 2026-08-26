import { Alert, Box } from "@mui/material";

interface ErrorStateProps {
  message: string;
}

export const ErrorState = ({ message }: ErrorStateProps) => (
  <Box p={2}>
    <Alert severity="error">{message}</Alert>
  </Box>
);
