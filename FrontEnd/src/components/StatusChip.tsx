import { Chip } from "@mui/material";

interface StatusChipProps {
  active?: boolean;
  label?: string;
}

export const StatusChip = ({ active, label }: StatusChipProps) => {
  if (label) {
    return <Chip size="small" label={label} />;
  }
  return <Chip size="small" color={active ? "success" : "default"} label={active ? "Active" : "Inactive"} />;
};
