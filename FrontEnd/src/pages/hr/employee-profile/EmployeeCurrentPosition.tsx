import AssignmentIndOutlinedIcon from "@mui/icons-material/AssignmentIndOutlined";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ChecklistRoundedIcon from "@mui/icons-material/ChecklistRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import GppGoodOutlinedIcon from "@mui/icons-material/GppGoodOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import TrackChangesRoundedIcon from "@mui/icons-material/TrackChangesRounded";
import WorkOffOutlinedIcon from "@mui/icons-material/WorkOffOutlined";
import WorkOutlineRoundedIcon from "@mui/icons-material/WorkOutlineRounded";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Typography,
  createFilterOptions,
  useMediaQuery,
  useTheme
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect, useState, type ReactNode } from "react";
import { useSnackbar } from "notistack";
import { Link as RouterLink } from "react-router-dom";
import { positionsApi } from "../../../api/positions.api";
import type {
  CurrentPosition,
  PositionResponse,
  ReleaseEmployeePositionResult,
  VacantPosition
} from "../../../types/position.types";

type PositionOperation = "assign" | "transfer" | "release";

export type EmployeeLinkedJobSummary = {
  family?: string | null;
  careerLevel?: string | null;
  criticality?: string | null;
  purpose?: string | null;
  accountabilities?: string | null;
};

interface EmployeeCurrentPositionProps {
  employeeId: number;
  employeeName: string;
  department?: string;
  location?: string;
  linkedJob?: EmployeeLinkedJobSummary;
}

interface PositionDialogProps extends EmployeeCurrentPositionProps {
  open: boolean;
  operation: PositionOperation;
  currentPosition: CurrentPosition | null;
  onClose: () => void;
}

interface PositionMutationVariables {
  operation: PositionOperation;
  employeeId: number;
  positionId?: number;
}

const panelSx = {
  border: "1px solid var(--hr-border)",
  borderRadius: 2,
  bgcolor: "var(--hr-surface)",
  boxShadow: "var(--hr-shadow)"
};

const emptyValue = "—";

const formatPositionNumber = (value: number | string | null): string =>
  value === null || String(value).trim() === "" ? "Not numbered" : String(value);

const getJobName = (position: CurrentPosition | VacantPosition) => ({
  english: position.Job_Name_EN?.trim() || "Job not classified",
  arabic: position.Job_Name_AR?.trim() || null
});

const getLineLevelName = (position: CurrentPosition | VacantPosition) => ({
  english: position.LineLevelName_EN?.trim() || null,
  arabic: position.LineLevelName_AR?.trim() || null
});

const displayValue = (value: number | string | null | undefined): string =>
  value === null || value === undefined || String(value).trim() === ""
    ? emptyValue
    : String(value).trim();

const splitStructuredText = (value: string | null | undefined): string[] => {
  const clean = value?.replace(/\r/g, "").trim() ?? "";
  if (!clean) return [];

  const lineItems = clean.split(/\n+/).map((item) => item.trim()).filter(Boolean);
  const candidates = lineItems.length > 1
    ? lineItems
    : clean
        .split(/(?=\s(?:\d{1,2}[.)]|[-•])\s+)/)
        .map((item) => item.trim())
        .filter(Boolean);

  return candidates
    .map((item) => item.replace(/^\s*(?:\d{1,2}[.)]|[-•])\s*/, "").trim())
    .filter(Boolean);
};

const criticalityStyle = (criticality: string | null | undefined) => {
  const value = criticality?.trim().toLowerCase() ?? "";
  if (value.includes("review")) return { color: "#6b21a8", borderColor: "#dfb9f4", bgcolor: "#fbf3ff" };
  if (value.includes("safety")) return { color: "#d92d20", borderColor: "#ffc5c0", bgcolor: "#fff3f2" };
  if (value.includes("business")) return { color: "#a15c00", borderColor: "#f4d39b", bgcolor: "#fff8e9" };
  if (value.includes("support")) return { color: "#0b55d4", borderColor: "#b9d1ff", bgcolor: "#eff5ff" };
  if (value.includes("critical")) return { color: "#087a43", borderColor: "#b6e5c8", bgcolor: "#eefaf2" };
  return {
    color: "var(--hr-strong-muted)",
    borderColor: "var(--hr-border)",
    bgcolor: "var(--hr-surface-soft)"
  };
};

const vacantPositionLabel = (position: VacantPosition): string =>
  `Position ${formatPositionNumber(position.Position_Number)} · ${getJobName(position).english}`;

const filterVacantPositions = createFilterOptions<VacantPosition>({
  stringify: (position) => [
    position.Position_Number,
    position.Job_Name_EN,
    position.Job_Name_AR,
    position.LineLevelName_EN,
    position.LineLevelName_AR,
    position.PositionLevel,
    position.Position_Degree,
    position.Position_Type
  ].filter((value) => value !== null && value !== undefined).join(" ")
});

const getRequestErrorMessage = (error: unknown, fallback: string): string => {
  if (!isAxiosError(error)) return error instanceof Error ? error.message : fallback;
  const payload = error.response?.data as { message?: string; errors?: string[] } | undefined;
  return payload?.errors?.join(". ") || payload?.message || error.message || fallback;
};

const Detail = ({ label, value, rtl = false }: { label: string; value: number | string | null | undefined; rtl?: boolean }) => (
  <Box minWidth={0}>
    <Typography sx={{ color: "var(--hr-muted)", fontSize: 10.5, fontWeight: 700, mb: 0.45 }}>
      {label}
    </Typography>
    <Typography dir={rtl ? "rtl" : undefined} sx={{ color: "var(--hr-text)", fontSize: 12.5, fontWeight: 750, textAlign: rtl ? "left" : undefined, overflowWrap: "anywhere" }}>
      {value === null || value === undefined || String(value).trim() === ""
        ? emptyValue
        : String(value)}
    </Typography>
  </Box>
);

const AssignmentDetail = ({
  label,
  value
}: {
  label: string;
  value: number | string | null | undefined;
}) => (
  <Box minWidth={0}>
    <Typography sx={{ color: "var(--hr-muted)", fontSize: 11.25, fontWeight: 700, mb: 0.55 }}>
      {label}
    </Typography>
    <Typography
      title={displayValue(value)}
      sx={{
        color: "var(--hr-text)",
        fontSize: 12.5,
        fontWeight: 700,
        lineHeight: 1.4,
        overflowWrap: "anywhere"
      }}
    >
      {displayValue(value)}
    </Typography>
  </Box>
);

const ClassificationRow = ({
  icon,
  label,
  children,
  tone = "blue"
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  tone?: "blue" | "amber";
}) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: "42px minmax(120px, 0.72fr) minmax(0, 1fr)",
      alignItems: "center",
      gap: 1.15,
      minHeight: 48,
      borderBottom: "1px solid var(--hr-divider-soft)",
      "&:last-of-type": { borderBottom: 0 }
    }}
  >
    <Box
      sx={{
        width: 38,
        height: 38,
        display: "grid",
        placeItems: "center",
        borderRadius: "9px",
        color: tone === "amber" ? "#b76b00" : "var(--hr-accent)",
        bgcolor: tone === "amber" ? "#fff6df" : "var(--hr-selected)",
        "& .MuiSvgIcon-root": { fontSize: 21 }
      }}
    >
      {icon}
    </Box>
    <Typography sx={{ color: "var(--hr-muted)", fontSize: 11.5, fontWeight: 650 }}>
      {label}
    </Typography>
    <Box sx={{ minWidth: 0, color: "var(--hr-text)", fontSize: 12.5, fontWeight: 800 }}>
      {children}
    </Box>
  </Box>
);

const Responsibilities = ({ items }: { items: string[] }) => (
  <Box component="ol" sx={{ m: 0, p: 0, listStyle: "none" }}>
    {items.length > 0 ? items.map((item, index) => (
      <Box
        component="li"
        key={`${index}-${item.slice(0, 36)}`}
        sx={{
          display: "grid",
          gridTemplateColumns: "25px minmax(0, 1fr)",
          alignItems: "start",
          gap: 1.25,
          mb: index === items.length - 1 ? 0 : 1.2
        }}
      >
        <Box
          aria-hidden="true"
          sx={{
            width: 24,
            height: 24,
            display: "grid",
            placeItems: "center",
            borderRadius: "50%",
            color: "#fff",
            bgcolor: "var(--hr-accent)",
            fontSize: 10.5,
            fontWeight: 700
          }}
        >
          {index + 1}
        </Box>
        <Typography
          title={item}
          sx={{
            color: "var(--hr-row-text)",
            fontSize: 13,
            lineHeight: 1.5,
            display: { lg: "-webkit-box" },
            overflow: { lg: "hidden" },
            WebkitBoxOrient: { lg: "vertical" },
            WebkitLineClamp: { lg: 1 }
          }}
        >
          {item}
        </Typography>
      </Box>
    )) : (
      <Typography sx={{ color: "var(--hr-muted)", fontSize: 11.5 }}>
        No key responsibilities have been recorded for this linked job.
      </Typography>
    )}
  </Box>
);

const PositionDialog = ({
  open,
  operation,
  employeeId,
  employeeName,
  currentPosition,
  onClose
}: PositionDialogProps) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [selectedPosition, setSelectedPosition] = useState<VacantPosition | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const needsVacantPosition = operation !== "release";

  const vacanciesQuery = useQuery({
    queryKey: ["positions", "vacant", "all"],
    queryFn: positionsApi.allVacant,
    enabled: open && needsVacantPosition,
    staleTime: 60_000
  });

  const {
    isPending: mutationPending,
    mutateAsync: savePosition,
    reset: resetMutation
  } = useMutation<
    PositionResponse<CurrentPosition | ReleaseEmployeePositionResult | null>,
    unknown,
    PositionMutationVariables
  >({
    mutationFn: ({ operation: requestedOperation, employeeId: targetEmployeeId, positionId }) => {
      if (requestedOperation === "release") {
        return positionsApi.release({ employeeId: targetEmployeeId });
      }
      const payload = { employeeId: targetEmployeeId, positionId: positionId as number };
      return requestedOperation === "assign"
        ? positionsApi.assign(payload)
        : positionsApi.transfer(payload);
    }
  });

  useEffect(() => {
    if (!open) return;
    setSelectedPosition(null);
    setSubmitError(null);
    resetMutation();
  }, [open, operation, resetMutation]);

  const vacancies = vacanciesQuery.data?.success ? vacanciesQuery.data.data : [];
  const vacanciesError = vacanciesQuery.data && !vacanciesQuery.data.success
    ? vacanciesQuery.data.errors?.join(". ") || vacanciesQuery.data.message
    : vacanciesQuery.error
      ? getRequestErrorMessage(vacanciesQuery.error, "Vacant positions could not be loaded")
      : null;
  const currentJob = currentPosition ? getJobName(currentPosition) : null;
  const selectedJob = selectedPosition ? getJobName(selectedPosition) : null;
  const selectedLineLevel = selectedPosition ? getLineLevelName(selectedPosition) : null;
  const title = operation === "assign"
    ? "Assign a position"
    : operation === "transfer"
      ? "Transfer to another position"
      : "Release current position";
  const submitLabel = operation === "assign"
    ? "Assign position"
    : operation === "transfer"
      ? "Transfer employee"
      : "Release position";

  const closeDialog = () => {
    if (!mutationPending) onClose();
  };

  const submit = async () => {
    setSubmitError(null);
    if (needsVacantPosition && !selectedPosition) {
      setSubmitError("Select a vacant position before continuing.");
      return;
    }
    if (operation !== "assign" && !currentPosition) {
      setSubmitError("This employee no longer occupies a position. Refresh the profile and try again.");
      return;
    }

    try {
      const result = await savePosition({
        operation,
        employeeId,
        positionId: selectedPosition?.PositionId
      });
      if (!result.success) {
        setSubmitError(result.errors?.join(". ") || result.message);
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["positions", "employee", employeeId] }),
        queryClient.invalidateQueries({ queryKey: ["positions", "vacant"] }),
        queryClient.invalidateQueries({ queryKey: ["employees"] }),
        queryClient.invalidateQueries({ queryKey: ["hr", "hr-dashboard"] })
      ]);
      enqueueSnackbar(result.message || `${submitLabel} completed successfully`, { variant: "success" });
      onClose();
    } catch (error) {
      setSubmitError(getRequestErrorMessage(error, `${submitLabel} failed`));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={closeDialog}
      fullWidth
      maxWidth="md"
      fullScreen={fullScreen}
      aria-labelledby="employee-position-dialog-title"
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: { xs: 0, sm: 2.5 },
          border: { sm: "1px solid var(--hr-border)" },
          bgcolor: "var(--hr-surface)",
          backgroundImage: "none",
          boxShadow: "0 24px 70px rgba(7, 28, 89, 0.22)"
        }
      }}
    >
      <DialogTitle id="employee-position-dialog-title" component="div" sx={{ p: { xs: 2, sm: 3 }, pb: 2 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2}>
          <Stack direction="row" spacing={1.5} minWidth={0}>
            <Box sx={{ width: 42, height: 42, flex: "0 0 auto", display: "grid", placeItems: "center", borderRadius: 1.5, color: "var(--hr-accent)", bgcolor: "var(--hr-selected)" }}>
              {operation === "assign" ? <AssignmentIndOutlinedIcon /> : operation === "transfer" ? <SwapHorizRoundedIcon /> : <WorkOffOutlinedIcon />}
            </Box>
            <Box minWidth={0}>
              <Typography sx={{ color: "var(--hr-text)", fontSize: 18, fontWeight: 850 }}>{title}</Typography>
              <Typography sx={{ color: "var(--hr-muted)", fontSize: 12, mt: 0.45 }}>
                {employeeName}
              </Typography>
            </Box>
          </Stack>
          <IconButton aria-label="Close position dialog" onClick={closeDialog} disabled={mutationPending}>
            <CloseRoundedIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Divider />
      <DialogContent sx={{ p: { xs: 2, sm: 3 }, bgcolor: "var(--hr-surface-soft)" }}>
        <Stack spacing={2}>
          {currentPosition && currentJob && operation !== "assign" ? (
            <Box sx={{ p: 1.6, border: "1px solid var(--hr-border)", borderRadius: 1.5, bgcolor: "var(--hr-surface)" }}>
              <Typography sx={{ color: "var(--hr-muted)", fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.7 }}>
                Current position
              </Typography>
              <Typography sx={{ color: "var(--hr-text)", fontSize: 14, fontWeight: 850, mt: 0.7 }}>
                {currentJob.english}
              </Typography>
              <Typography sx={{ color: "var(--hr-muted)", fontSize: 11.5, mt: 0.35 }}>
                Position {formatPositionNumber(currentPosition.Position_Number)}
              </Typography>
            </Box>
          ) : null}

          {needsVacantPosition ? (
            <Box>
              <Autocomplete
                options={vacancies}
                value={selectedPosition}
                onChange={(_event, position) => setSelectedPosition(position)}
                getOptionLabel={vacantPositionLabel}
                filterOptions={filterVacantPositions}
                isOptionEqualToValue={(option, value) => option.PositionId === value.PositionId}
                loading={vacanciesQuery.isPending}
                disabled={mutationPending || Boolean(vacanciesError)}
                noOptionsText={vacanciesQuery.isPending ? "Loading vacant positions…" : "No matching vacant positions"}
                renderOption={(props, position) => {
                  const job = getJobName(position);
                  return (
                    <li {...props}>
                      <Box minWidth={0} py={0.35}>
                        <Typography sx={{ color: "var(--hr-text)", fontSize: 12.5, fontWeight: 800 }}>
                          Position {formatPositionNumber(position.Position_Number)}
                        </Typography>
                        <Typography sx={{ color: "var(--hr-strong-muted)", fontSize: 11.5 }}>{job.english}</Typography>
                        {job.arabic ? (
                          <Typography dir="rtl" sx={{ color: "var(--hr-muted)", fontSize: 11, textAlign: "left" }}>
                            {job.arabic}
                          </Typography>
                        ) : null}
                        {position.LineLevelName_EN ? (
                          <Typography sx={{ color: "var(--hr-accent)", fontSize: 10.5, fontWeight: 750, mt: 0.2 }}>
                            Line level: {position.LineLevelName_EN}
                          </Typography>
                        ) : null}
                      </Box>
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    required
                    label={operation === "transfer" ? "New vacant position" : "Vacant position"}
                    placeholder="Search by position number or Arabic / English job name"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {vacanciesQuery.isPending ? <CircularProgress color="inherit" size={18} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      )
                    }}
                  />
                )}
              />
              {vacanciesError ? (
                <Alert severity="error" sx={{ mt: 1 }} action={<Button color="inherit" size="small" onClick={() => void vacanciesQuery.refetch()}>Retry</Button>}>
                  {vacanciesError}
                </Alert>
              ) : null}
              {!vacanciesError && vacanciesQuery.data?.success ? (
                <Typography sx={{ color: "var(--hr-muted)", fontSize: 10.5, mt: 0.75 }}>
                  {vacancies.length.toLocaleString()} vacant positions available. Search matches position number and both job names.
                </Typography>
              ) : null}
            </Box>
          ) : (
            <Alert severity="warning">
              Releasing this position removes the employee number from the Position row. The position will immediately become vacant.
            </Alert>
          )}

          {selectedPosition && selectedJob ? (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" }, gap: 1.5, p: 1.6, borderRadius: 1.5, border: "1px solid var(--hr-accent-border)", bgcolor: "var(--hr-selected)" }}>
              <Detail label="Position number" value={formatPositionNumber(selectedPosition.Position_Number)} />
              <Detail label="Job name" value={selectedJob.english} />
              <Detail label="Job name (Arabic)" value={selectedJob.arabic} rtl />
              <Detail label="Position type" value={selectedPosition.Position_Type} />
              <Detail label="Position level" value={selectedPosition.PositionLevel} />
              <Detail label="Position degree" value={selectedPosition.Position_Degree} />
              <Detail label="Line level (English)" value={selectedLineLevel?.english} />
              <Detail label="Line level (Arabic)" value={selectedLineLevel?.arabic} rtl />
              <Stack direction="row" alignItems="center" spacing={0.7} sx={{ gridColumn: { sm: "1 / -1" }, color: "var(--hr-muted)" }}>
                <LockOutlinedIcon sx={{ fontSize: 15 }} />
                <Typography sx={{ fontSize: 10.5 }}>
                  The job comes from the selected Position row and cannot be changed separately here.
                </Typography>
              </Stack>
            </Box>
          ) : null}

          {submitError ? <Alert severity="error">{submitError}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2, gap: 1, borderTop: "1px solid var(--hr-border)" }}>
        <Button onClick={closeDialog} disabled={mutationPending} sx={{ textTransform: "none", fontWeight: 750 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={operation === "release" ? "error" : "primary"}
          onClick={() => void submit()}
          disabled={mutationPending || (needsVacantPosition && vacanciesQuery.isPending)}
          startIcon={mutationPending ? <CircularProgress color="inherit" size={16} /> : operation === "transfer" ? <SwapHorizRoundedIcon /> : operation === "release" ? <WorkOffOutlinedIcon /> : <AssignmentIndOutlinedIcon />}
          sx={{ minWidth: 160, textTransform: "none", fontWeight: 800 }}
        >
          {mutationPending ? "Saving…" : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const EmployeeCurrentPosition = ({
  employeeId,
  employeeName,
  department,
  location,
  linkedJob
}: EmployeeCurrentPositionProps) => {
  const [dialogOperation, setDialogOperation] = useState<PositionOperation | null>(null);
  const currentQuery = useQuery({
    queryKey: ["positions", "employee", employeeId, "current"],
    queryFn: () => positionsApi.current(employeeId),
    staleTime: 30_000
  });

  const currentPosition = currentQuery.data?.success ? currentQuery.data.data : null;
  const currentError = currentQuery.data && !currentQuery.data.success
    ? currentQuery.data.message
    : currentQuery.error
      ? getRequestErrorMessage(currentQuery.error, "The current position could not be loaded")
      : null;
  const currentJob = currentPosition ? getJobName(currentPosition) : null;
  const currentLineLevel = currentPosition ? getLineLevelName(currentPosition) : null;
  const jobFamily = linkedJob?.family?.trim() || currentPosition?.Job_Family?.trim() || null;
  const careerLevel = linkedJob?.careerLevel?.trim() || null;
  const roleCriticality = linkedJob?.criticality?.trim() || null;
  const rolePurpose = linkedJob?.purpose?.trim() || null;
  const responsibilities = splitStructuredText(linkedJob?.accountabilities).slice(0, 3);

  return (
    <Card
      data-testid="employee-job-assignment"
      sx={{
        ...panelSx,
        overflow: "hidden",
        borderRadius: "11px",
        boxShadow: "0 5px 18px rgba(23, 50, 92, 0.055)"
      }}
    >
      <Box sx={{ px: { xs: 1.8, md: 3 }, pt: { xs: 1.8, md: 2.15 }, pb: 1.35 }}>
        <Typography component="h2" sx={{ color: "var(--hr-text)", fontSize: { xs: 18, md: 21 }, fontWeight: 700, lineHeight: 1.2 }}>
          Job Assignment
        </Typography>
        <Typography sx={{ mt: 0.45, color: "var(--hr-muted)", fontSize: { xs: 11, md: 12.25 }, lineHeight: 1.45 }}>
          Review the employee&apos;s current position, classification, and responsibilities.
        </Typography>
      </Box>

      {currentQuery.isPending ? <LinearProgress /> : null}

      <Box sx={{ px: { xs: 1.8, md: 3 }, pb: { xs: 1.8, md: 2.35 } }}>
        {currentError ? (
          <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void currentQuery.refetch()}>Retry</Button>}>
            {currentError}
          </Alert>
        ) : currentPosition && currentJob ? (
          <Stack spacing={1.5}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.82fr) minmax(350px, 1fr)" },
                gap: 2.4,
                alignItems: "stretch"
              }}
            >
              <Card
                variant="outlined"
                sx={{
                  minWidth: 0,
                  minHeight: { lg: 232 },
                  p: { xs: 1.7, md: 2.6 },
                  borderColor: "var(--hr-border)",
                  borderRadius: "11px",
                  bgcolor: "var(--hr-surface)",
                  boxShadow: "none"
                }}
              >
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "52px minmax(0, 1fr)", md: "60px minmax(0, 1fr) auto" },
                    alignItems: "start",
                    gap: { xs: 1.2, md: 1.5 }
                  }}
                >
                  <Box
                    sx={{
                      width: { xs: 50, md: 58 },
                      height: { xs: 50, md: 58 },
                      display: "grid",
                      placeItems: "center",
                      borderRadius: "11px",
                      color: "var(--hr-accent)",
                      bgcolor: "var(--hr-selected)"
                    }}
                  >
                    <WorkOutlineRoundedIcon sx={{ fontSize: { xs: 28, md: 33 } }} />
                  </Box>

                  <Box minWidth={0}>
                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                      <Typography sx={{ color: "var(--hr-text)", fontSize: 12, fontWeight: 700 }}>
                        Current Position
                      </Typography>
                      <Chip
                        label="Occupied"
                        size="small"
                        sx={{
                          height: 24,
                          color: "var(--hr-success-text)",
                          bgcolor: "var(--hr-success-bg)",
                          fontSize: 10,
                          fontWeight: 700,
                          "& .MuiChip-label": { px: 1.15 }
                        }}
                      />
                    </Stack>
                    <Typography sx={{ mt: 1, color: "var(--hr-text)", fontSize: { xs: 16, md: 17.5 }, fontWeight: 700, lineHeight: 1.25 }}>
                      {currentJob.english}
                    </Typography>
                    {currentJob.arabic ? (
                      <Typography lang="ar" dir="rtl" sx={{ mt: 0.55, color: "var(--hr-text)", fontSize: 14, textAlign: "left", lineHeight: 1.45 }}>
                        {currentJob.arabic}
                      </Typography>
                    ) : null}
                  </Box>

                  <Stack
                    direction="row"
                    spacing={1}
                    flexWrap="wrap"
                    useFlexGap
                    sx={{ gridColumn: { xs: "1 / -1", md: "auto" }, justifyContent: { xs: "flex-start", md: "flex-end" } }}
                  >
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<SwapHorizRoundedIcon />}
                      onClick={() => setDialogOperation("transfer")}
                      sx={{
                        minHeight: 39,
                        px: 1.8,
                        borderColor: "var(--hr-accent-border)",
                        borderRadius: "8px",
                        color: "var(--hr-text)",
                        fontSize: 11.5,
                        fontWeight: 800,
                        textTransform: "none"
                      }}
                    >
                      Transfer
                    </Button>
                    <Button
                      color="error"
                      variant="outlined"
                      size="small"
                      startIcon={<WorkOffOutlinedIcon />}
                      onClick={() => setDialogOperation("release")}
                      sx={{ minHeight: 39, px: 1.8, borderRadius: "8px", fontSize: 11.5, fontWeight: 800, textTransform: "none" }}
                    >
                      Release Position
                    </Button>
                  </Stack>
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" },
                    gap: { xs: 1.5, md: 2 },
                    mt: { xs: 2.2, md: 3.1 }
                  }}
                >
                  <AssignmentDetail label="Position Number" value={formatPositionNumber(currentPosition.Position_Number)} />
                  <AssignmentDetail label="Line Level" value={currentLineLevel?.english} />
                  <AssignmentDetail label="Department" value={department} />
                  <AssignmentDetail label="Location" value={location} />
                </Box>
              </Card>

              <Card
                variant="outlined"
                sx={{
                  minWidth: 0,
                  minHeight: { lg: 232 },
                  px: { xs: 1.7, md: 2.6 },
                  py: { xs: 1.55, md: 1.8 },
                  borderColor: "var(--hr-border)",
                  borderRadius: "11px",
                  bgcolor: "var(--hr-surface)",
                  boxShadow: "none"
                }}
              >
                <Typography component="h3" sx={{ color: "var(--hr-text)", fontSize: 14.25, fontWeight: 700, mb: 0.4 }}>
                  Job Classification
                </Typography>
                <ClassificationRow icon={<GroupsOutlinedIcon />} label="Job Family">
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, overflowWrap: "anywhere" }}>{displayValue(jobFamily)}</Typography>
                </ClassificationRow>
                <ClassificationRow icon={<SchoolOutlinedIcon />} label="Career Level">
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, overflowWrap: "anywhere" }}>{displayValue(careerLevel)}</Typography>
                </ClassificationRow>
                <ClassificationRow icon={<GppGoodOutlinedIcon />} label="Role Criticality" tone="amber">
                  {roleCriticality ? (
                    <Chip
                      label={roleCriticality}
                      size="small"
                      variant="outlined"
                      sx={{ height: 25, ...criticalityStyle(roleCriticality), fontSize: 10, fontWeight: 700 }}
                    />
                  ) : (
                    <Typography sx={{ color: "var(--hr-muted)", fontSize: 12.5, fontWeight: 700 }}>{emptyValue}</Typography>
                  )}
                </ClassificationRow>
                <Stack direction="row" spacing={0.8} alignItems="center" sx={{ pt: 1.15, color: "var(--hr-muted)" }}>
                  <InfoOutlinedIcon sx={{ fontSize: 16 }} />
                  <Typography sx={{ fontSize: 10.75 }}>Derived from the linked job profile.</Typography>
                </Stack>
              </Card>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "minmax(300px, 0.72fr) minmax(0, 1fr)" },
                gap: 2.1,
                alignItems: "stretch"
              }}
            >
              <Card
                variant="outlined"
                sx={{
                  minHeight: 153,
                  p: { xs: 1.7, md: 2.6 },
                  borderColor: "var(--hr-border)",
                  borderRadius: "11px",
                  bgcolor: "var(--hr-surface)",
                  boxShadow: "none"
                }}
              >
                <Stack direction="row" spacing={1.45} alignItems="flex-start">
                  <Box sx={{ width: 58, height: 58, flex: "0 0 auto", display: "grid", placeItems: "center", borderRadius: "11px", color: "var(--hr-accent)", bgcolor: "var(--hr-selected)" }}>
                    <TrackChangesRoundedIcon sx={{ fontSize: 32 }} />
                  </Box>
                  <Box minWidth={0}>
                    <Typography component="h3" sx={{ color: "var(--hr-text)", fontSize: 15, fontWeight: 700 }}>
                      Role Purpose
                    </Typography>
                    <Typography
                      title={rolePurpose || undefined}
                      sx={{
                        mt: 0.9,
                        color: rolePurpose ? "var(--hr-row-text)" : "var(--hr-muted)",
                        fontSize: 13,
                        lineHeight: 1.55,
                        whiteSpace: "pre-wrap",
                        display: { lg: "-webkit-box" },
                        overflow: { lg: "hidden" },
                        WebkitBoxOrient: { lg: "vertical" },
                        WebkitLineClamp: { lg: 3 }
                      }}
                    >
                      {rolePurpose || "No role purpose has been recorded for this linked job."}
                    </Typography>
                  </Box>
                </Stack>
              </Card>

              <Card
                variant="outlined"
                sx={{
                  minHeight: 153,
                  p: { xs: 1.7, md: 2.6 },
                  borderColor: "var(--hr-border)",
                  borderRadius: "11px",
                  bgcolor: "var(--hr-surface)",
                  boxShadow: "none"
                }}
              >
                <Stack direction="row" spacing={1.45} alignItems="flex-start">
                  <Box sx={{ width: 58, height: 58, flex: "0 0 auto", display: "grid", placeItems: "center", borderRadius: "11px", color: "var(--hr-accent)", bgcolor: "var(--hr-selected)" }}>
                    <ChecklistRoundedIcon sx={{ fontSize: 32 }} />
                  </Box>
                  <Box minWidth={0} flex={1}>
                    <Typography component="h3" sx={{ color: "var(--hr-text)", fontSize: 15, fontWeight: 700, mb: 0.85 }}>
                      Key Responsibilities
                    </Typography>
                    <Responsibilities items={responsibilities} />
                  </Box>
                </Stack>
              </Card>
            </Box>

            <Card
              variant="outlined"
              sx={{
                minHeight: 84,
                px: { xs: 1.7, md: 2.6 },
                py: 1.55,
                display: "flex",
                alignItems: { xs: "flex-start", sm: "center" },
                justifyContent: "space-between",
                flexDirection: { xs: "column", sm: "row" },
                gap: 1.5,
                borderColor: "var(--hr-border)",
                borderRadius: "11px",
                bgcolor: "var(--hr-surface)",
                boxShadow: "none"
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ width: 47, height: 47, flex: "0 0 auto", display: "grid", placeItems: "center", borderRadius: "10px", color: "var(--hr-accent)", bgcolor: "var(--hr-selected)" }}>
                  <WorkOutlineRoundedIcon sx={{ fontSize: 25 }} />
                </Box>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography sx={{ color: "var(--hr-text)", fontSize: 12.25, fontWeight: 700 }}>Linked job profile</Typography>
                    <Typography sx={{ color: "var(--hr-muted)", fontSize: 11 }}>•</Typography>
                    <Typography sx={{ color: "var(--hr-muted)", fontSize: 11.25 }}>Read-only</Typography>
                  </Stack>
                  <Typography sx={{ mt: 0.4, color: "var(--hr-muted)", fontSize: 11.25 }}>
                    Job classification and responsibilities are managed in the job library.
                  </Typography>
                </Box>
              </Stack>
              {currentPosition.JobId ? (
                <Button
                  component={RouterLink}
                  to={`/human-resources/jobs/catalog/${currentPosition.JobId}`}
                  endIcon={<ChevronRightRoundedIcon />}
                  sx={{ color: "var(--hr-accent)", fontSize: 11.5, fontWeight: 700, textTransform: "none", whiteSpace: "nowrap" }}
                >
                  View full job profile
                </Button>
              ) : (
                <Typography sx={{ color: "var(--hr-muted)", fontSize: 11.25, fontWeight: 700 }}>
                  Job profile unavailable
                </Typography>
              )}
            </Card>
          </Stack>
        ) : (
          <Card
            variant="outlined"
            sx={{
              minHeight: 230,
              display: "grid",
              placeItems: "center",
              p: 2.5,
              borderColor: "var(--hr-border)",
              borderRadius: "11px",
              bgcolor: "var(--hr-surface)",
              boxShadow: "none",
              textAlign: "center"
            }}
          >
            <Box>
              <AssignmentIndOutlinedIcon sx={{ color: "var(--hr-soft-muted)", fontSize: 42 }} />
              <Typography sx={{ color: "var(--hr-text)", fontSize: 15, fontWeight: 850, mt: 0.9 }}>
                No current position
              </Typography>
              <Typography sx={{ maxWidth: 460, color: "var(--hr-muted)", fontSize: 11.5, lineHeight: 1.55, mt: 0.45 }}>
                Assign this employee to a vacant Position row to connect their job.
              </Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<AssignmentIndOutlinedIcon />}
                onClick={() => setDialogOperation("assign")}
                disabled={currentQuery.isPending}
                sx={{ mt: 1.5, minHeight: 36, px: 1.8, borderRadius: "8px", textTransform: "none", fontWeight: 800 }}
              >
                Assign position
              </Button>
            </Box>
          </Card>
        )}
      </Box>

      <PositionDialog
        open={dialogOperation !== null}
        operation={dialogOperation ?? (currentPosition ? "transfer" : "assign")}
        employeeId={employeeId}
        employeeName={employeeName}
        currentPosition={currentPosition}
        onClose={() => setDialogOperation(null)}
      />
    </Card>
  );
};
