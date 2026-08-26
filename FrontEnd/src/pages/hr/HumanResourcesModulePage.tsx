import { Box, Typography } from "@mui/material";

interface HumanResourcesModulePageProps {
  title: string;
  description?: string;
}

export default function HumanResourcesModulePage({
  title,
  description = "This Human Resources module will be available soon."
}: HumanResourcesModulePageProps) {
  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 800 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {description}
      </Typography>
    </Box>
  );
}
