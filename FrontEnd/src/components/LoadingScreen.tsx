import { Box, CircularProgress, Typography } from "@mui/material";

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen = ({ message = "Loading..." }: LoadingScreenProps) => (
  <Box minHeight="60vh" display="flex" alignItems="center" justifyContent="center" flexDirection="column" gap={2}>
    <CircularProgress />
    <Typography color="text.secondary">{message}</Typography>
  </Box>
);
