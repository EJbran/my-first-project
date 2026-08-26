import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import type { PropsWithChildren } from "react";

export const PublicLayout = ({ children }: PropsWithChildren) => {
  const theme = useTheme();

  return (
    <Box minHeight="100vh" bgcolor={theme.palette.background.default} color="text.primary">
      {children}
    </Box>
  );
};
