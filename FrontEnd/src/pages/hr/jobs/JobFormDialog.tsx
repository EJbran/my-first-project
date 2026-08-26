import { zodResolver } from "@hookform/resolvers/zod";
import AddBusinessRoundedIcon from "@mui/icons-material/AddBusinessRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm, type FieldErrors, type FieldPath } from "react-hook-form";
import { useSnackbar } from "notistack";
import { z } from "zod";
import { jobsApi } from "../../../api/jobs.api";
import type { JobCreatePayload, JobRecord, JobResponse } from "../../../types/job.types";
import { getHrThemeVars } from "./Theme";

type JobFormDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (job: JobRecord) => void;
};

const requiredText = (label: string) => z.string().trim().min(1, `${label} is required`);

const schema = z.object({
  Job_ID: z.string().trim().refine(
    (value) => value === "" || /^[1-9]\d*$/.test(value),
    "Job ID must be a positive whole number"
  ),
  Job_Name_AR: requiredText("Arabic job name"),
  Job_Name_EN: requiredText("English job name"),
  Job_Family: requiredText("Job family"),
  Career_Level: requiredText("Career level"),
  Role_Criticality: requiredText("Role criticality"),
  Role_Purpose: requiredText("Role purpose"),
  Key_Accountabilities: requiredText("Key accountabilities"),
  Typical_Deliverables: requiredText("Typical deliverables"),
  Minimum_Education_Benchmark: requiredText("Minimum education benchmark"),
  Preferred_Qualifications: requiredText("Preferred qualifications"),
  Minimum_Experience_Benchmark: requiredText("Minimum experience benchmark"),
  Technical_Competencies: requiredText("Technical competencies"),
  Behavioral_Competencies: requiredText("Behavioral competencies"),
  HSE_Process_Safety_Accountabilities: requiredText("HSE and process safety accountabilities"),
  Mandatory_Training_Licences_Benchmark: requiredText("Mandatory training and licences"),
  Applicable_Standards_Procedures: requiredText("Applicable standards and procedures"),
  Decision_Authority: requiredText("Decision authority"),
  Supervisory_Scope: requiredText("Supervisory scope"),
  Key_Interfaces: requiredText("Key interfaces"),
  Work_Environment_and_Schedule: requiredText("Work environment and schedule"),
  Physical_Medical_Fitness: requiredText("Physical and medical fitness"),
  Competency_Assurance_Method: requiredText("Competency assurance method"),
  KPI_Benchmark: requiredText("KPI benchmark"),
  Required_Languages: requiredText("Required languages"),
  Language_Level_CEFR: requiredText("Language level"),
  Job_Type: requiredText("Job type"),
  Profile_Validation_Owner: requiredText("Profile validation owner")
});

type JobFormValues = z.infer<typeof schema>;
type JobField = FieldPath<JobFormValues>;

type FieldDefinition = {
  name: JobField;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  minRows?: number;
  wide?: boolean;
  rtl?: boolean;
  list?: "job-families" | "career-levels" | "job-types" | "role-criticalities";
};

const emptyValues: JobFormValues = {
  Job_ID: "",
  Job_Name_AR: "",
  Job_Name_EN: "",
  Job_Family: "",
  Career_Level: "",
  Role_Criticality: "",
  Role_Purpose: "",
  Key_Accountabilities: "",
  Typical_Deliverables: "",
  Minimum_Education_Benchmark: "",
  Preferred_Qualifications: "",
  Minimum_Experience_Benchmark: "",
  Technical_Competencies: "",
  Behavioral_Competencies: "",
  HSE_Process_Safety_Accountabilities: "",
  Mandatory_Training_Licences_Benchmark: "",
  Applicable_Standards_Procedures: "",
  Decision_Authority: "",
  Supervisory_Scope: "",
  Key_Interfaces: "",
  Work_Environment_and_Schedule: "",
  Physical_Medical_Fitness: "",
  Competency_Assurance_Method: "",
  KPI_Benchmark: "",
  Required_Languages: "",
  Language_Level_CEFR: "",
  Job_Type: "",
  Profile_Validation_Owner: ""
};

const tabFields: FieldDefinition[][] = [
  [
    { name: "Job_ID", label: "Job ID (Optional)", placeholder: "Leave blank to generate the next ID" },
    { name: "Job_Name_EN", label: "Job Name (English)", placeholder: "Enter the official English job name" },
    { name: "Job_Name_AR", label: "Job Name (Arabic)", placeholder: "أدخل المسمى الوظيفي الرسمي", rtl: true, wide: true },
    { name: "Job_Family", label: "Job Family", placeholder: "e.g. Engineering", list: "job-families" },
    { name: "Career_Level", label: "Career Level", placeholder: "e.g. Professional", list: "career-levels" },
    { name: "Job_Type", label: "Job Type", placeholder: "e.g. Technical", list: "job-types" },
    { name: "Role_Criticality", label: "Role Criticality", placeholder: "e.g. High", list: "role-criticalities" }
  ],
  [
    { name: "Minimum_Education_Benchmark", label: "Minimum Education Benchmark", multiline: true, minRows: 2 },
    { name: "Preferred_Qualifications", label: "Preferred Qualifications", multiline: true, minRows: 2 },
    { name: "Minimum_Experience_Benchmark", label: "Minimum Experience Benchmark", multiline: true, minRows: 2 },
    { name: "Required_Languages", label: "Required Languages", multiline: true, minRows: 2 },
    { name: "Language_Level_CEFR", label: "Language Level (CEFR)", multiline: true, minRows: 2 },
    { name: "Physical_Medical_Fitness", label: "Physical / Medical Fitness", multiline: true, minRows: 2 }
  ],
  [
    { name: "Role_Purpose", label: "Role Purpose", multiline: true, minRows: 3, wide: true },
    { name: "Key_Accountabilities", label: "Key Accountabilities", multiline: true, minRows: 3 },
    { name: "Typical_Deliverables", label: "Typical Deliverables", multiline: true, minRows: 3 },
    { name: "Decision_Authority", label: "Decision Authority", multiline: true, minRows: 2 },
    { name: "Supervisory_Scope", label: "Supervisory Scope", multiline: true, minRows: 2 },
    { name: "Key_Interfaces", label: "Key Interfaces", multiline: true, minRows: 2 },
    { name: "Work_Environment_and_Schedule", label: "Work Environment and Schedule", multiline: true, minRows: 2 }
  ],
  [
    { name: "Technical_Competencies", label: "Technical Competencies", multiline: true, minRows: 3 },
    { name: "Behavioral_Competencies", label: "Behavioral Competencies", multiline: true, minRows: 3 },
    { name: "HSE_Process_Safety_Accountabilities", label: "HSE / Process Safety Accountabilities", multiline: true, minRows: 3 },
    { name: "Mandatory_Training_Licences_Benchmark", label: "Mandatory Training / Licences", multiline: true, minRows: 3 },
    { name: "Applicable_Standards_Procedures", label: "Applicable Standards / Procedures", multiline: true, minRows: 3 },
    { name: "Competency_Assurance_Method", label: "Competency Assurance Method", multiline: true, minRows: 2 },
    { name: "KPI_Benchmark", label: "KPI Benchmark", multiline: true, minRows: 2 },
    { name: "Profile_Validation_Owner", label: "Profile Validation Owner", multiline: true, minRows: 2 }
  ]
];

const tabLabels = ["Basic Information", "Qualifications", "Role Profile", "Requirements & Assurance"];

const getRequestError = (error: unknown): string => {
  if (error && typeof error === "object") {
    const payload = (error as { response?: { data?: { message?: string; errors?: string[] } } }).response?.data;
    if (payload?.errors?.length) return payload.errors.join(". ");
    if (payload?.message) return payload.message;
  }
  return error instanceof Error ? error.message : "The job could not be created.";
};

const firstErrorTab = (errors: FieldErrors<JobFormValues>): number => {
  const names = new Set(Object.keys(errors));
  const index = tabFields.findIndex((fields) => fields.some((field) => names.has(field.name)));
  return index < 0 ? 0 : index;
};

export default function JobFormDialog({ open, onClose, onCreated }: JobFormDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<JobFormValues>({ resolver: zodResolver(schema), defaultValues: emptyValues });

  const optionsQuery = useQuery({
    queryKey: ["hr", "jobs", "options", "form"],
    queryFn: () => jobsApi.options({ limit: 50 }),
    enabled: open,
    staleTime: 5 * 60_000
  });

  const {
    isPending,
    mutateAsync,
    reset: resetMutation
  } = useMutation<JobResponse<JobRecord>, unknown, JobCreatePayload>({
    mutationFn: jobsApi.create
  });

  useEffect(() => {
    if (!open) return;
    reset(emptyValues);
    setTab(0);
    setSubmitError(null);
    resetMutation();
  }, [open, reset, resetMutation]);

  const optionData = optionsQuery.data?.success ? optionsQuery.data.data : null;
  const optionLists: Record<NonNullable<FieldDefinition["list"]>, string[]> = {
    "job-families": optionData?.jobFamilies ?? [],
    "career-levels": optionData?.careerLevels ?? [],
    "job-types": optionData?.jobTypes ?? [],
    "role-criticalities": optionData?.roleCriticalities ?? []
  };

  const close = () => {
    if (!isPending) onClose();
  };

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    const { Job_ID, ...profile } = values;
    try {
      const result = await mutateAsync({
        ...profile,
        ...(Job_ID ? { Job_ID: Number(Job_ID) } : {})
      });
      if (!result.success) {
        setSubmitError(result.errors?.join(". ") || result.message);
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["hr", "jobs", "list"] }),
        queryClient.invalidateQueries({ queryKey: ["hr", "jobs", "options"] }),
        queryClient.invalidateQueries({ queryKey: ["hr", "positions"] })
      ]);
      enqueueSnackbar(result.message || "Job created successfully", { variant: "success" });
      onCreated(result.data);
      onClose();
    } catch (error) {
      setSubmitError(getRequestError(error));
    }
  }, (validationErrors) => setTab(firstErrorTab(validationErrors)));

  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      maxWidth="lg"
      fullScreen={fullScreen}
      aria-labelledby="add-job-dialog-title"
      sx={(muiTheme) => ({
        ...getHrThemeVars(muiTheme),
        "& .MuiDialog-paper": {
          minHeight: { sm: "min(760px, calc(100vh - 48px))" },
          borderRadius: { xs: 0, sm: "14px" },
          border: { sm: "1px solid var(--hr-border)" },
          bgcolor: "var(--hr-surface)",
          backgroundImage: "none",
          boxShadow: "0 28px 85px rgba(7, 28, 89, 0.24)"
        }
      })}
    >
      <DialogTitle id="add-job-dialog-title" component="div" sx={{ px: { xs: 2, md: 3 }, py: 2 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Stack direction="row" spacing={1.4} minWidth={0}>
            <Box sx={{ width: 40, height: 40, flex: "0 0 auto", display: "grid", placeItems: "center", borderRadius: "11px", color: "var(--hr-accent)", bgcolor: "var(--hr-selected)" }}>
              <AddBusinessRoundedIcon />
            </Box>
            <Box minWidth={0}>
              <Typography sx={{ color: "var(--hr-text)", fontSize: 18, fontWeight: 900 }}>Add New Job</Typography>
              <Typography sx={{ mt: 0.3, color: "var(--hr-muted)", fontSize: 11.5 }}>
                Create a complete, official role profile in the organizational job catalog.
              </Typography>
            </Box>
          </Stack>
          <IconButton aria-label="Close add job dialog" onClick={close} disabled={isPending}>
            <CloseRoundedIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Tabs
        value={tab}
        onChange={(_event, value: number) => setTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ px: { xs: 1, md: 2.2 }, minHeight: 46, borderTop: "1px solid var(--hr-border)", borderBottom: "1px solid var(--hr-border)", bgcolor: "var(--hr-surface-soft)", "& .MuiTab-root": { minHeight: 46, fontSize: 11, fontWeight: 850, textTransform: "none" } }}
      >
        {tabLabels.map((label, index) => (
          <Tab key={label} label={`${index + 1}. ${label}`} />
        ))}
      </Tabs>

      <DialogContent sx={{ p: { xs: 2, md: 3 }, bgcolor: "var(--hr-surface)" }}>
        {submitError ? <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert> : null}
        {optionsQuery.isError && tab === 0 ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Suggested classifications are unavailable. You can still enter the official values manually.
          </Alert>
        ) : null}
        <Box
          component="form"
          id="hr-job-form"
          onSubmit={submit}
          sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}
        >
          {tabFields[tab].map((field) => (
            <TextField
              key={field.name}
              label={field.label}
              placeholder={field.placeholder}
              required={field.name !== "Job_ID"}
              size="small"
              fullWidth
              multiline={field.multiline}
              minRows={field.minRows}
              dir={field.rtl ? "rtl" : undefined}
              {...register(field.name)}
              error={Boolean(errors[field.name])}
              helperText={errors[field.name]?.message}
              slotProps={{ htmlInput: field.list ? { list: field.list } : undefined }}
              sx={{ gridColumn: { md: field.wide ? "1 / -1" : "auto" }, "& .MuiInputBase-root": { alignItems: field.multiline ? "flex-start" : "center", fontSize: 12 } }}
            />
          ))}
          {Object.entries(optionLists).map(([id, options]) => (
            <datalist key={id} id={id}>
              {options.map((option) => <option key={option} value={option} />)}
            </datalist>
          ))}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, md: 3 }, py: 2, borderTop: "1px solid var(--hr-border)", justifyContent: "space-between" }}>
        <Button onClick={close} disabled={isPending} sx={{ textTransform: "none" }}>Cancel</Button>
        <Stack direction="row" spacing={1}>
          {tab > 0 ? <Button variant="outlined" onClick={() => setTab((value) => value - 1)} disabled={isPending} sx={{ textTransform: "none" }}>Back</Button> : null}
          {tab < tabLabels.length - 1 ? (
            <Button variant="contained" onClick={() => setTab((value) => value + 1)} sx={{ minWidth: 110, bgcolor: "var(--hr-primary-button)", color: "var(--hr-on-accent)", textTransform: "none" }}>Continue</Button>
          ) : (
            <Button type="submit" form="hr-job-form" variant="contained" disabled={isPending} startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : <AddBusinessRoundedIcon />} sx={{ minWidth: 130, bgcolor: "var(--hr-primary-button)", color: "var(--hr-on-accent)", textTransform: "none" }}>
              {isPending ? "Creating..." : "Create Job"}
            </Button>
          )}
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
