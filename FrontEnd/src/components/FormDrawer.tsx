import { Box, Drawer, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { ReactNode } from "react";

interface FormDrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export const FormDrawer = ({ open, title, onClose, children }: FormDrawerProps) => (
  <Drawer anchor="right" open={open} onClose={onClose}>
    <Box width={{ xs: 320, sm: 520 }} p={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">{title}</Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      {children}
    </Box>
  </Drawer>
);
