import { Box, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

type HrPageHeaderProps = {
  title: string;
  subtitle: string;
  actions: ReactNode;
  compact?: boolean;
};

export const HrPageHeader = ({ title, subtitle, actions, compact = false }: HrPageHeaderProps) => (
  <Box
    sx={{
      position: "sticky",
      top: 0,
      zIndex: 30,
      minHeight: { md: "var(--app-sidebar-header-height, 82px)" },
      mx: { md: -3 },
      px: { md: 3 },
      py: { xs: 1.25, md: 0 },
      mb: compact ? 1.5 : 2.2,
      display: "flex",
      alignItems: "center",
      bgcolor: "background.paper",
      borderBottom: "1px solid",
      borderColor: "divider",
      boxShadow: "none"
    }}
  >
    <Stack
      direction={{ xs: "column", lg: "row" }}
      justifyContent="space-between"
      alignItems={{ xs: "stretch", lg: "center" }}
      gap={2}
      sx={{ width: "100%" }}
    >
      <Box sx={{ minWidth: 0, flex: "0 0 auto" }}>
        <Typography
          component="h1"
          sx={{
            color: "var(--hr-text)",
            fontSize: compact ? { xs: 26, md: 28 } : { xs: 28, md: 34 },
            lineHeight: 1.1,
            fontWeight: 850,
            letterSpacing: "-0.025em"
          }}
        >
          {title}
        </Typography>
        <Typography sx={{ color: "var(--hr-muted)", fontSize: compact ? 11.5 : 13, mt: compact ? 0.45 : 0.75 }}>
          {subtitle}
        </Typography>
      </Box>

      {actions}
    </Stack>
  </Box>
);
