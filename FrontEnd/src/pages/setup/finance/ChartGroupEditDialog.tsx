import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField
} from "@mui/material";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { chartGroupsApi } from "../../../api/chartGroups.api";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import {
  ACCOUNT_CLASS_OPTIONS,
  ANALYTIC_TEMPLATE_OPTIONS,
  SUGGESTED_MODULE_OPTIONS
} from "../../../types/chartGroup.types";

const schema = z.object({
  accountClassCode: z.string().refine((value) => ACCOUNT_CLASS_OPTIONS.some((item) => item.code === value), {
    message: "Select a valid account class"
  }),
  accountGroupCode: z
    .string()
    .trim()
    .regex(/^\d{3}$/, "Account group code must be exactly 3 digits"),
  accountGroupName: z.string().trim().min(1, "Account group name is required").max(200),
  defaultSuggestedModule: z.string().trim().max(100).optional(),
  defaultAnalyticTemplate: z.union([z.enum(ANALYTIC_TEMPLATE_OPTIONS), z.literal("")]).optional(),
  allowedAnalyticTemplates: z.array(z.enum(ANALYTIC_TEMPLATE_OPTIONS)).optional(),
  isActive: z.boolean()
});

type ChartGroupFormValues = z.infer<typeof schema>;

export interface ChartGroupEditTarget {
  id: number;
  accountClassCode: string;
  accountClassName: string;
  accountGroupCode: string;
  accountGroupName: string;
  defaultSuggestedModule: string;
  defaultAnalyticTemplate: string;
  allowedAnalyticTemplates: string;
  isActive: boolean;
}

interface ChartGroupEditDialogProps {
  open: boolean;
  mode: "create" | "edit";
  chartGroup: ChartGroupEditTarget | null;
  onClose: () => void;
  onSaved: () => void;
}

const emptyValues: ChartGroupFormValues = {
  accountClassCode: "1",
  accountGroupCode: "",
  accountGroupName: "",
  defaultSuggestedModule: "",
  defaultAnalyticTemplate: "",
  allowedAnalyticTemplates: [],
  isActive: true
};

const parseAllowedTemplates = (value: string | null | undefined): ChartGroupFormValues["allowedAnalyticTemplates"] => {
  if (!value) {
    return [];
  }

  return value
    .split(/[,;|]/)
    .map((item) => item.trim().toUpperCase())
    .filter((item): item is (typeof ANALYTIC_TEMPLATE_OPTIONS)[number] =>
      ANALYTIC_TEMPLATE_OPTIONS.includes(item as (typeof ANALYTIC_TEMPLATE_OPTIONS)[number])
    );
};

export const ChartGroupEditDialog = ({
  open,
  mode,
  chartGroup,
  onClose,
  onSaved
}: ChartGroupEditDialogProps) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<ChartGroupFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues
  });

  const accountClassCode = watch("accountClassCode");
  const accountClassName =
    ACCOUNT_CLASS_OPTIONS.find((item) => item.code === accountClassCode)?.name || "";

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(
      mode === "edit" && chartGroup
        ? {
            accountClassCode: chartGroup.accountClassCode,
            accountGroupCode: chartGroup.accountGroupCode,
            accountGroupName: chartGroup.accountGroupName,
            defaultSuggestedModule: chartGroup.defaultSuggestedModule,
            defaultAnalyticTemplate: (chartGroup.defaultAnalyticTemplate ||
              "") as ChartGroupFormValues["defaultAnalyticTemplate"],
            allowedAnalyticTemplates: parseAllowedTemplates(chartGroup.allowedAnalyticTemplates),
            isActive: chartGroup.isActive
          }
        : emptyValues
    );
    setSubmitError(null);
    setConfirmDeleteOpen(false);
  }, [chartGroup, mode, open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    setSubmitError(null);

    const className =
      ACCOUNT_CLASS_OPTIONS.find((item) => item.code === values.accountClassCode)?.name || "";

    const payload = {
      AccountClassCode: values.accountClassCode,
      AccountClassName: className,
      AccountGroupCode: values.accountGroupCode.trim(),
      AccountGroupName: values.accountGroupName.trim(),
      DefaultSuggestedModule: values.defaultSuggestedModule?.trim() || null,
      DefaultAnalyticTemplate: values.defaultAnalyticTemplate || null,
      AllowedAnalyticTemplates: values.allowedAnalyticTemplates?.length
        ? values.allowedAnalyticTemplates.join(",")
        : null,
      IsActive: values.isActive
    };

    try {
      const response =
        mode === "create"
          ? await chartGroupsApi.create(payload)
          : await chartGroupsApi.update(String(chartGroup?.id), payload);

      const result = response.data as { success?: boolean; message?: string; errors?: string[] };

      if (!result.success) {
        setSubmitError(
          result.errors?.join(", ") ||
            result.message ||
            `Failed to ${mode === "create" ? "create" : "update"} account group`
        );
        return;
      }

      onSaved();
      onClose();
    } catch {
      setSubmitError(`Failed to ${mode === "create" ? "create" : "update"} account group`);
    } finally {
      setSaving(false);
    }
  });

  const handleDelete = async () => {
    if (!chartGroup) {
      return;
    }

    setDeleting(true);
    setSubmitError(null);

    try {
      const response = await chartGroupsApi.remove(String(chartGroup.id));
      const result = response.data as { success?: boolean; message?: string; errors?: string[] };

      if (result.success === false) {
        setSubmitError(
          result.errors?.join(", ") || result.message || "Failed to delete account group"
        );
        setConfirmDeleteOpen(false);
        return;
      }

      setConfirmDeleteOpen(false);
      onSaved();
      onClose();
    } catch {
      setSubmitError("Failed to delete account group");
      setConfirmDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const busy = saving || deleting;

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>{mode === "create" ? "New Account Group" : "Edit Account Group"}</DialogTitle>
        <DialogContent>
          <Stack component="form" spacing={2} mt={1} onSubmit={onSubmit}>
            {submitError ? <Alert severity="error">{submitError}</Alert> : null}

            <Controller
              name="accountClassCode"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Account Class"
                  size="small"
                  error={Boolean(errors.accountClassCode)}
                  helperText={errors.accountClassCode?.message || accountClassName}
                >
                  {ACCOUNT_CLASS_OPTIONS.map((option) => (
                    <MenuItem key={option.code} value={option.code}>
                      {option.code} — {option.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            <TextField
              label="Account Group Code"
              size="small"
              {...register("accountGroupCode")}
              error={Boolean(errors.accountGroupCode)}
              helperText={errors.accountGroupCode?.message || "Exactly 3 digits, e.g. 101"}
            />

            <TextField
              label="Account Group Name"
              size="small"
              {...register("accountGroupName")}
              error={Boolean(errors.accountGroupName)}
              helperText={errors.accountGroupName?.message}
            />

            <Controller
              name="defaultSuggestedModule"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  freeSolo
                  options={[...SUGGESTED_MODULE_OPTIONS]}
                  value={field.value || ""}
                  onChange={(_event, value) => field.onChange(value || "")}
                  onInputChange={(_event, value) => field.onChange(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Default Suggested Module"
                      size="small"
                      error={Boolean(errors.defaultSuggestedModule)}
                      helperText={errors.defaultSuggestedModule?.message}
                    />
                  )}
                />
              )}
            />

            <Controller
              name="defaultAnalyticTemplate"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Default Analytic Template"
                  size="small"
                  error={Boolean(errors.defaultAnalyticTemplate)}
                  helperText={errors.defaultAnalyticTemplate?.message}
                >
                  <MenuItem value="">None</MenuItem>
                  {ANALYTIC_TEMPLATE_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            <Controller
              name="allowedAnalyticTemplates"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  multiple
                  options={[...ANALYTIC_TEMPLATE_OPTIONS]}
                  value={field.value || []}
                  onChange={(_event, value) => field.onChange(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Allowed Analytic Templates"
                      size="small"
                      error={Boolean(errors.allowedAnalyticTemplates)}
                      helperText={
                        errors.allowedAnalyticTemplates?.message ||
                        "Optional list of templates allowed for accounts in this group"
                      }
                    />
                  )}
                />
              )}
            />

            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(_event, checked) => field.onChange(checked)}
                    />
                  }
                  label="Active"
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
          <Box>
            {mode === "edit" ? (
              <Button color="error" onClick={() => setConfirmDeleteOpen(true)} disabled={busy}>
                Delete
              </Button>
            ) : null}
          </Box>
          <Box display="flex" gap={1}>
            <Button onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button variant="contained" onClick={onSubmit} disabled={busy}>
              {saving ? "Saving..." : mode === "create" ? "Create" : "Save"}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete Account Group"
        description={`Delete "${chartGroup?.accountGroupName || "this account group"}"? If accounts exist under it, the group will be deactivated instead.`}
        confirmText={deleting ? "Deleting..." : "Delete"}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
};
