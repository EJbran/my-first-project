import { Box, TextField } from "@mui/material";
import type { ReactNode } from "react";

interface DataGridToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchExtra?: ReactNode;
  actions?: ReactNode;
}

export const DataGridToolbar = ({ search, onSearchChange, searchExtra, actions }: DataGridToolbarProps) => (
  <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} mb={1}>
    <Box display="flex" alignItems="center" gap={1}>
      <TextField
        size="small"
        placeholder="Search..."
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      {searchExtra}
    </Box>
    {actions}
  </Box>
);
