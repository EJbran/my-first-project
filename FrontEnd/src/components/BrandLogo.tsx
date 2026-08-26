import { Box, Typography } from "@mui/material";

interface BrandLogoProps {
  compact?: boolean;
}

export const BrandLogo = ({ compact = false }: BrandLogoProps) => (
  <Box display="flex" alignItems="center" gap={1.5}>
    <Box component="img" src="/logo.png" alt="IMS Logo" sx={{ width: compact ? 28 : 40, height: compact ? 28 : 40 }} />
    {!compact && (
      <Box>
        <Typography variant="h6" sx={{ lineHeight: 1 }}>
          IMS
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Integrated Management System
        </Typography>
      </Box>
    )}
  </Box>
);
