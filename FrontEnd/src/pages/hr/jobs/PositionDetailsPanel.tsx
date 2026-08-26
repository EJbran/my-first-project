import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import WorkOutlineRoundedIcon from "@mui/icons-material/WorkOutlineRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Typography
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Link as RouterLink } from "react-router-dom";
import { positionsApi } from "../../../api/positions.api";

type PositionDetailsPanelProps = {
  positionId: number;
  onClose: () => void;
};

const displayValue = (value: unknown): string => {
  if (value === null || value === undefined || String(value).trim() === "") return "Not recorded";
  return String(value);
};

const Detail = ({ label, value, rtl = false }: { label: string; value: unknown; rtl?: boolean }) => (
  <Box minWidth={0}>
    <Typography sx={{ color: "var(--hr-muted)", fontSize: 10.25, fontWeight: 750, mb: 0.45 }}>{label}</Typography>
    <Typography dir={rtl ? "rtl" : undefined} sx={{ color: "var(--hr-row-text)", fontSize: 12, fontWeight: 700, lineHeight: 1.5, textAlign: rtl ? "left" : undefined, overflowWrap: "anywhere" }}>
      {displayValue(value)}
    </Typography>
  </Box>
);

export const PositionDetailsPanel = ({ positionId, onClose }: PositionDetailsPanelProps) => {
  const detailQuery = useQuery({
    queryKey: ["hr", "positions", "detail", positionId],
    queryFn: () => positionsApi.getById(positionId),
    enabled: Number.isSafeInteger(positionId) && positionId > 0,
    staleTime: 30_000
  });
  const result = detailQuery.data;
  const position = result?.success ? result.data : null;
  const errorMessage = result && !result.success
    ? result.errors?.join(". ") || result.message
    : detailQuery.isError
      ? "Position details could not be loaded."
      : null;
  const employeeName = position?.EmployeeName_EN?.trim() || position?.EmployeeName_AR?.trim() || null;

  return (
    <Card component="section" variant="outlined" aria-label="Selected position details" sx={{ mt: 1.25, overflow: "hidden", borderColor: "var(--hr-accent-border)", borderRadius: "12px", bgcolor: "var(--hr-surface)", boxShadow: "var(--hr-shadow)" }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: { xs: 1.6, md: 2 }, py: 1.25, borderBottom: "1px solid var(--hr-border)" }}>
        <Stack direction="row" alignItems="center" spacing={1} minWidth={0}>
          <Box sx={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: "8px", color: "var(--hr-accent)", bgcolor: "var(--hr-selected)" }}><WorkOutlineRoundedIcon sx={{ fontSize: 18 }} /></Box>
          <Box minWidth={0}>
            <Typography sx={{ color: "var(--hr-accent)", fontSize: 13, fontWeight: 900 }}>Position Details</Typography>
            {position ? <Typography sx={{ color: "var(--hr-muted)", fontSize: 10.5 }}>POS-{String(position.PositionId).padStart(6, "0")}</Typography> : null}
          </Box>
        </Stack>
        <IconButton size="small" aria-label="Close position details" onClick={onClose}><CloseRoundedIcon fontSize="small" /></IconButton>
      </Stack>

      {detailQuery.isLoading ? (
        <Box sx={{ minHeight: 180, display: "grid", placeItems: "center" }}><CircularProgress size={26} /></Box>
      ) : errorMessage ? (
        <Alert severity="error" sx={{ m: 2 }}>{errorMessage}</Alert>
      ) : position ? (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" }, gap: 2, px: { xs: 1.6, md: 2 }, py: 1.8 }}>
          <Detail label="Position ID" value={`POS-${String(position.PositionId).padStart(6, "0")}`} />
          <Detail label="Position number" value={position.Position_Number} />
          <Detail label="Job (English)" value={position.Job_Name_EN} />
          <Detail label="Job (Arabic)" value={position.Job_Name_AR} rtl />
          <Detail label="Job family" value={position.Job_Family} />
          <Detail label="Position type" value={position.Position_Type} />
          <Detail label="Level" value={position.PositionLevel} />
          <Detail label="Degree" value={position.Position_Degree} />
          <Detail label="Line level (English)" value={position.LineLevelName_EN} />
          <Detail label="Line level (Arabic)" value={position.LineLevelName_AR} rtl />
          <Detail label="Created" value={position.Position_DateCreation} />
          <Box>
            <Typography sx={{ color: "var(--hr-muted)", fontSize: 10.25, fontWeight: 750, mb: 0.55 }}>Occupancy</Typography>
            <Chip size="small" label={position.EmployeeId ? "Occupied" : "Vacant"} sx={{ height: 22, color: position.EmployeeId ? "var(--hr-success-text)" : "var(--hr-accent)", bgcolor: position.EmployeeId ? "var(--hr-success-bg)" : "var(--hr-selected)", fontSize: 9.5, fontWeight: 850 }} />
          </Box>
          <Detail label="Employee" value={employeeName} />
          <Box>
            <Typography sx={{ color: "var(--hr-muted)", fontSize: 10.25, fontWeight: 750, mb: 0.55 }}>Status</Typography>
            <Chip size="small" label={displayValue(position.Status)} sx={{ height: 22, color: "var(--hr-success-text)", bgcolor: "var(--hr-success-bg)", fontSize: 9.5, fontWeight: 850 }} />
          </Box>
          {position.EmployeeId ? (
            <Button component={RouterLink} to={`/human-resources/employees/employee-profile/${position.EmployeeId}`} variant="outlined" endIcon={<OpenInNewRoundedIcon />} sx={{ alignSelf: "end", justifySelf: "start", height: 34, borderColor: "var(--hr-accent-border)", color: "var(--hr-accent)", fontSize: 10.5, fontWeight: 800, textTransform: "none" }}>
              View Employee Profile
            </Button>
          ) : null}
        </Box>
      ) : null}
    </Card>
  );
};
