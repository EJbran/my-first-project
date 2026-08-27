import { zodResolver } from "@hookform/resolvers/zod";
import AddBusinessRoundedIcon from "@mui/icons-material/AddBusinessRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
  useMediaQuery
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useSnackbar } from "notistack";
import { z } from "zod";
import { jobsApi } from "../../../api/jobs.api";
import { positionsApi } from "../../../api/positions.api";
import type { JobOption } from "../../../types/job.types";
import type { CreatePositionPayload, PositionRecord, PositionResponse, UpdatePositionPayload } from "../../../types/position.types";
import { getHrThemeVars } from "./Theme";

type PositionFormDialogProps = {
  open: boolean;
  onClose: () => void;
  position?: PositionRecord | null;
  onSaved: (position: PositionRecord) => void;
};

const schema = z.object({
  positionNumber: z.string().trim().regex(/^[1-9]\d*$/, "Position number must be a positive whole number"),
  positionType: z.string().trim().min(1, "Position type is required"),
  positionLevel: z.string().trim().min(1, "Position level is required"),
  positionDegree: z.string().trim().min(1, "Position degree is required"),
  positionDateCreation: z.string().trim().min(1, "Creation date is required"),
  status: z.string().trim().min(1, "Status is required"),
  jobId: z.string().trim().regex(/^[1-9]\d*$/, "Select a job from the catalog")
});

type PositionFormValues = z.infer<typeof schema>;

const today = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

const emptyValues = (): PositionFormValues => ({
  positionNumber: "",
  positionType: "",
  positionLevel: "",
  positionDegree: "",
  positionDateCreation: today(),
  status: "Active",
  jobId: ""
});

const getRequestError = (error: unknown): string => {
  if (error && typeof error === "object") {
    const payload = (error as { response?: { data?: { message?: string; errors?: string[] } } }).response?.data;
    if (payload?.errors?.length) return payload.errors.join(". ");
    if (payload?.message) return payload.message;
  }
  return error instanceof Error ? error.message : "The position could not be created.";
};

const jobLabel = (job: JobOption): string => `${job.Job_Name_EN} · JOB-${String(job.JobId).padStart(6, "0")}`;

export default function PositionFormDialog({ open, onClose, position, onSaved }: PositionFormDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [jobSearchDraft, setJobSearchDraft] = useState("");
  const [jobSearch, setJobSearch] = useState("");
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<PositionFormValues>({ resolver: zodResolver(schema), defaultValues: emptyValues() });
  const isEditing = Boolean(position);

  useEffect(() => {
    const timer = window.setTimeout(() => setJobSearch(jobSearchDraft.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [jobSearchDraft]);

  useEffect(() => {
    if (!open) return;
    reset(position ? {
      positionNumber: String(position.Position_Number ?? ""),
      positionType: String(position.Position_Type ?? ""),
      positionLevel: String(position.PositionLevel ?? ""),
      positionDegree: String(position.Position_Degree ?? ""),
      positionDateCreation: String(position.Position_DateCreation ?? today()).slice(0, 10),
      status: String(position.Status ?? "Active"),
      jobId: String(position.JobId ?? "")
    } : emptyValues());
    setSubmitError(null);
    const initialJobSearch = position?.JobId
      ? jobLabel({ JobId: position.JobId, Job_Name_EN: position.Job_Name_EN ?? "", Job_Name_AR: position.Job_Name_AR ?? "", Job_Family: position.Job_Family ?? "" })
      : "";
    setJobSearchDraft(initialJobSearch);
    setJobSearch(initialJobSearch);
  }, [open, position, reset]);

  const [positionOptionsQuery, jobOptionsQuery] = [
    useQuery({
      queryKey: ["hr", "positions", "options", "form"],
      queryFn: positionsApi.options,
      enabled: open,
      staleTime: 5 * 60_000
    }),
    useQuery({
      queryKey: ["hr", "jobs", "options", "position-form", jobSearch],
      queryFn: () => jobsApi.options({ search: jobSearch || undefined, limit: 30 }),
      enabled: open,
      staleTime: 60_000
    })
  ];

  const mutation = useMutation<PositionResponse<PositionRecord>, unknown, { id?: number; payload: CreatePositionPayload | UpdatePositionPayload }>({
    mutationFn: ({ id, payload }) => id ? positionsApi.update(id, payload) : positionsApi.create(payload)
  });

  const positionOptions = positionOptionsQuery.data?.success ? positionOptionsQuery.data.data : null;
  const jobs = jobOptionsQuery.data?.success ? jobOptionsQuery.data.data.jobs : [];

  const close = () => {
    if (!mutation.isPending) onClose();
  };

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const result = await mutation.mutateAsync({
        id: position?.PositionId,
        payload: {
          positionNumber: values.positionNumber,
          positionType: values.positionType,
          positionLevel: values.positionLevel,
          positionDegree: values.positionDegree,
          positionDateCreation: values.positionDateCreation,
          status: values.status,
          jobId: Number(values.jobId)
        }
      });
      if (!result.success) {
        setSubmitError(result.errors?.join(". ") || result.message);
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["hr", "positions", "list"] }),
        queryClient.invalidateQueries({ queryKey: ["hr", "positions", "options"] }),
        queryClient.invalidateQueries({ queryKey: ["hr", "jobs"] }),
        queryClient.invalidateQueries({ queryKey: ["positions", "vacant"] }),
        queryClient.invalidateQueries({ queryKey: ["hr", "hr-dashboard"] })
      ]);
      enqueueSnackbar(result.message || "Position created successfully", { variant: "success" });
      onSaved(result.data);
      onClose();
    } catch (error) {
      setSubmitError(getRequestError(error));
    }
  });

  const freeSoloField = (
    name: "positionType" | "positionLevel" | "positionDegree" | "status",
    label: string,
    options: string[]
  ) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Autocomplete
          freeSolo
          options={options}
          value={field.value}
          onChange={(_event, value) => field.onChange(value ?? "")}
          onInputChange={(_event, value) => field.onChange(value)}
          renderInput={(params) => (
            <TextField {...params} label={label} required size="small" error={Boolean(errors[name])} helperText={errors[name]?.message} />
          )}
        />
      )}
    />
  );

  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      maxWidth="md"
      fullScreen={fullScreen}
      aria-labelledby="add-position-dialog-title"
      sx={(muiTheme) => ({
        ...getHrThemeVars(muiTheme),
        "& .MuiDialog-paper": { borderRadius: { xs: 0, sm: "14px" }, border: { sm: "1px solid var(--hr-border)" }, bgcolor: "var(--hr-surface)", backgroundImage: "none", boxShadow: "0 28px 85px rgba(7, 28, 89, 0.24)" }
      })}
    >
      <DialogTitle id="add-position-dialog-title" component="div" sx={{ px: { xs: 2, md: 3 }, py: 2 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Stack direction="row" spacing={1.4} minWidth={0}>
            <Box sx={{ width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: "11px", color: "var(--hr-accent)", bgcolor: "var(--hr-selected)" }}><AddBusinessRoundedIcon /></Box>
            <Box minWidth={0}>
              <Typography sx={{ color: "var(--hr-text)", fontSize: 18, fontWeight: 900 }}>{isEditing ? "Edit Position" : "Add New Position"}</Typography>
              <Typography sx={{ mt: 0.3, color: "var(--hr-muted)", fontSize: 11.5 }}>{isEditing ? "Update the position record and its official job profile." : "Create an organizational slot connected to its official job profile."}</Typography>
            </Box>
          </Stack>
          <IconButton aria-label="Close add position dialog" onClick={close} disabled={mutation.isPending}><CloseRoundedIcon /></IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, md: 3 }, bgcolor: "var(--hr-surface-soft)", borderTop: "1px solid var(--hr-border)" }}>
        {submitError ? <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert> : null}
        {positionOptionsQuery.isError ? <Alert severity="warning" sx={{ mb: 2 }}>Saved position values are unavailable. You can enter the official values manually.</Alert> : null}
        <Box component="form" id="hr-position-form" onSubmit={submit} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 2, p: { xs: 1.5, md: 2 }, border: "1px solid var(--hr-border)", borderRadius: "11px", bgcolor: "var(--hr-surface)" }}>
          <TextField label="Position Number" required size="small" inputMode="numeric" {...register("positionNumber")} error={Boolean(errors.positionNumber)} helperText={errors.positionNumber?.message} />
          {freeSoloField("positionDegree", "Position Degree", positionOptions?.positionDegrees ?? [])}
          {freeSoloField("positionType", "Position Type", positionOptions?.positionTypes ?? [])}
          <TextField label="Creation Date" required size="small" type="date" {...register("positionDateCreation")} error={Boolean(errors.positionDateCreation)} helperText={errors.positionDateCreation?.message} slotProps={{ inputLabel: { shrink: true } }} />
          <Controller
            name="jobId"
            control={control}
            render={({ field }) => {
              const selected = jobs.find((job) => String(job.JobId) === field.value) ?? null;
              return (
                <Autocomplete
                  options={jobs}
                  value={selected}
                  loading={jobOptionsQuery.isFetching}
                  getOptionLabel={jobLabel}
                  isOptionEqualToValue={(option, value) => option.JobId === value.JobId}
                  onChange={(_event, value) => field.onChange(value ? String(value.JobId) : "")}
                  onInputChange={(_event, value, reason) => { if (reason === "input") setJobSearchDraft(value); }}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} key={option.JobId} sx={{ display: "block !important" }}>
                      <Typography sx={{ fontSize: 11.5, fontWeight: 800 }}>{option.Job_Name_EN}</Typography>
                      <Typography dir="rtl" sx={{ color: "text.secondary", fontSize: 10.5, textAlign: "left" }}>{option.Job_Name_AR}</Typography>
                    </Box>
                  )}
                  renderInput={(params) => <TextField {...params} label="Job" placeholder="Search job catalog" required size="small" error={Boolean(errors.jobId)} helperText={errors.jobId?.message} />}
                />
              );
            }}
          />
          {freeSoloField("status", "Status", positionOptions?.statuses ?? [])}
          {freeSoloField("positionLevel", "Position Level", positionOptions?.positionLevels ?? [])}
          <Box sx={{ gridColumn: { sm: "1 / -1" }, display: "flex", alignItems: "flex-start", gap: 1, p: 1.25, border: "1px solid var(--hr-accent-border)", borderRadius: "9px", color: "var(--hr-accent)", bgcolor: "var(--hr-selected)" }}>
            <InfoOutlinedIcon sx={{ mt: 0.1, fontSize: 18 }} />
            <Typography sx={{ color: "var(--hr-strong-muted)", fontSize: 10.5, lineHeight: 1.5 }}>
              {isEditing ? "Employee assignment is preserved while position details are updated." : "A new position is vacant by default. Assign it later from an employee profile, where occupancy checks are applied safely."}
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: { xs: 2, md: 3 }, py: 2, borderTop: "1px solid var(--hr-border)" }}>
        <Button onClick={close} disabled={mutation.isPending} sx={{ textTransform: "none" }}>Cancel</Button>
        <Button type="submit" form="hr-position-form" variant="contained" disabled={mutation.isPending} startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : <AddBusinessRoundedIcon />} sx={{ minWidth: 145, bgcolor: "var(--hr-primary-button)", color: "var(--hr-on-accent)", textTransform: "none" }}>
          {mutation.isPending ? (isEditing ? "Saving..." : "Creating...") : (isEditing ? "Save Changes" : "Create Position")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
