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
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { chartGroupsApi } from "../../../api/chartGroups.api";
import { chartOfAccountsApi } from "../../../api/chartOfAccounts.api";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import {
  ANALYTIC_TEMPLATE_OPTIONS,
  SUGGESTED_MODULE_OPTIONS,
  type ChartGroup
} from "../../../types/chartGroup.types";
import { LEGACY_ACCOUNT_TYPE_OPTIONS } from "../../../types/chartOfAccounts.types";

const schema = z.object({
  accountGroupCode: z
    .string()
    .trim()
    .regex(/^\d{3}$/, "Select an account group"),
  type: z.union([z.enum(LEGACY_ACCOUNT_TYPE_OPTIONS), z.literal("")]).optional(),
  newAccountCode: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^\d-\d{3}-\d{4}$/.test(value), {
      message: "Format must be Class-Group-Sequence (e.g. 1-101-0001)"
    }),
  legacyAcct: z.string().trim().max(20).optional(),
  cleanDescription: z.string().trim().min(1, "Clean description is required").max(500),
  legacyDescription: z.string().trim().max(500).optional(),
  suggestedModule: z.string().trim().max(100).optional(),
  analyticTemplate: z.union([z.enum(ANALYTIC_TEMPLATE_OPTIONS), z.literal("")]).optional(),
  isActive: z.boolean()
});

type ChartOfAccountsFormValues = z.infer<typeof schema>;

export interface ChartOfAccountsEditTarget {
  id: number;
  newAccountCode: string;
  type: string;
  legacyAcct: string;
  cleanDescription: string;
  legacyDescription: string;
  accountClassName: string;
  accountGroupCode: string;
  accountGroupName: string;
  suggestedModule: string;
  analyticTemplate: string;
  isActive: boolean;
}

interface ChartOfAccountsEditDialogProps {
  open: boolean;
  mode: "create" | "edit";
  account: ChartOfAccountsEditTarget | null;
  onClose: () => void;
  onSaved: () => void;
}

type GroupLookupOption = {
  code: string;
  label: string;
  group: ChartGroup;
};

const emptyValues: ChartOfAccountsFormValues = {
  accountGroupCode: "",
  type: "",
  newAccountCode: "",
  legacyAcct: "",
  cleanDescription: "",
  legacyDescription: "",
  suggestedModule: "",
  analyticTemplate: "",
  isActive: true
};

const parseAllowedTemplates = (value: string | null | undefined) => {
  if (!value) {
    return [...ANALYTIC_TEMPLATE_OPTIONS];
  }

  const parsed = value
    .split(/[,;|]/)
    .map((item) => item.trim().toUpperCase())
    .filter((item): item is (typeof ANALYTIC_TEMPLATE_OPTIONS)[number] =>
      ANALYTIC_TEMPLATE_OPTIONS.includes(item as (typeof ANALYTIC_TEMPLATE_OPTIONS)[number])
    );

  return parsed.length ? parsed : [...ANALYTIC_TEMPLATE_OPTIONS];
};

export const ChartOfAccountsEditDialog = ({
  open,
  mode,
  account,
  onClose,
  onSaved
}: ChartOfAccountsEditDialogProps) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitWarning, setSubmitWarning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [lookupOptions, setLookupOptions] = useState<GroupLookupOption[]>([]);
  const [loadingLookup, setLoadingLookup] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<ChartOfAccountsFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues
  });

  const selectedGroupCode = watch("accountGroupCode");
  const selectedGroup = useMemo(
    () => lookupOptions.find((item) => item.code === selectedGroupCode)?.group || null,
    [lookupOptions, selectedGroupCode]
  );

  const analyticOptions = useMemo(
    () => parseAllowedTemplates(selectedGroup?.AllowedAnalyticTemplates),
    [selectedGroup]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(
      mode === "edit" && account
        ? {
            accountGroupCode: account.accountGroupCode,
            type: (account.type || "") as ChartOfAccountsFormValues["type"],
            newAccountCode: account.newAccountCode,
            legacyAcct: account.legacyAcct,
            cleanDescription: account.cleanDescription,
            legacyDescription: account.legacyDescription,
            suggestedModule: account.suggestedModule,
            analyticTemplate: (account.analyticTemplate ||
              "") as ChartOfAccountsFormValues["analyticTemplate"],
            isActive: account.isActive
          }
        : emptyValues
    );
    setSubmitError(null);
    setSubmitWarning(null);
    setConfirmDeleteOpen(false);
  }, [account, mode, open, reset]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const loadLookup = async () => {
      setLoadingLookup(true);

      try {
        const response = await chartGroupsApi.list(
          mode === "create" ? { activeOnly: true } : undefined
        );
        if (cancelled) {
          return;
        }

        if (!response.success) {
          setLookupOptions([]);
          return;
        }

        const options = response.data
          .filter((group) => mode === "edit" || group.IsActive)
          .map((group) => ({
            code: group.AccountGroupCode,
            label: `${group.AccountGroupCode} — ${group.AccountGroupName} (${group.AccountClassName})`,
            group
          }));

        setLookupOptions(options);
      } catch {
        if (!cancelled) {
          setLookupOptions([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingLookup(false);
        }
      }
    };

    void loadLookup();

    return () => {
      cancelled = true;
    };
  }, [mode, open]);

  useEffect(() => {
    if (!selectedGroup || mode !== "create") {
      return;
    }

    setValue("suggestedModule", selectedGroup.DefaultSuggestedModule || "");
    setValue(
      "analyticTemplate",
      (selectedGroup.DefaultAnalyticTemplate ||
        "") as ChartOfAccountsFormValues["analyticTemplate"]
    );
  }, [mode, selectedGroup, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    setSubmitError(null);
    setSubmitWarning(null);

    const group = lookupOptions.find((item) => item.code === values.accountGroupCode)?.group;
    if (!group) {
      setSubmitError("Selected account group was not found");
      setSaving(false);
      return;
    }

    if (mode === "create" && !group.IsActive) {
      setSubmitError("Inactive account groups cannot be used for new accounts");
      setSaving(false);
      return;
    }

    const payload = {
      NewAccountCode: values.newAccountCode?.trim() || undefined,
      Type: values.type || null,
      LegacyAcct: values.legacyAcct?.trim() || null,
      CleanDescription: values.cleanDescription.trim(),
      LegacyDescription: values.legacyDescription?.trim() || null,
      AccountClassName: group.AccountClassName,
      AccountGroupCode: group.AccountGroupCode,
      AccountGroupName: group.AccountGroupName,
      SuggestedModule: values.suggestedModule?.trim() || null,
      AnalyticTemplate: values.analyticTemplate || null,
      IsActive: values.isActive
    };

    try {
      const response =
        mode === "create"
          ? await chartOfAccountsApi.create(payload)
          : await chartOfAccountsApi.update(String(account?.id), payload);

      const result = response.data as {
        success?: boolean;
        message?: string;
        errors?: string[];
        warning?: string;
      };

      if (!result.success) {
        setSubmitError(
          result.errors?.join(", ") ||
            result.message ||
            `Failed to ${mode === "create" ? "create" : "update"} account`
        );
        return;
      }

      if (result.warning) {
        setSubmitWarning(result.warning);
      }

      onSaved();
      onClose();
    } catch {
      setSubmitError(`Failed to ${mode === "create" ? "create" : "update"} account`);
    } finally {
      setSaving(false);
    }
  });

  const handleDelete = async () => {
    if (!account) {
      return;
    }

    setDeleting(true);
    setSubmitError(null);

    try {
      const response = await chartOfAccountsApi.remove(String(account.id));
      const result = response.data as { success?: boolean; message?: string; errors?: string[] };

      if (result.success === false) {
        setSubmitError(
          result.errors?.join(", ") || result.message || "Failed to deactivate account"
        );
        setConfirmDeleteOpen(false);
        return;
      }

      setConfirmDeleteOpen(false);
      onSaved();
      onClose();
    } catch {
      setSubmitError("Failed to deactivate account");
      setConfirmDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const busy = saving || deleting;
  const needsReview = selectedGroup?.AccountClassName === "Needs Review";

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>
          {mode === "create" ? "New Chart of Accounts" : "Edit Chart of Accounts"}
        </DialogTitle>
        <DialogContent>
          <Stack component="form" spacing={2} mt={1} onSubmit={onSubmit}>
            {submitError ? <Alert severity="error">{submitError}</Alert> : null}
            {submitWarning ? <Alert severity="warning">{submitWarning}</Alert> : null}
            {needsReview ? (
              <Alert severity="warning">
                Accounts in Needs Review must not be used until Finance approves them.
              </Alert>
            ) : null}

            <Controller
              name="accountGroupCode"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  options={lookupOptions}
                  loading={loadingLookup}
                  value={lookupOptions.find((item) => item.code === field.value) || null}
                  onChange={(_event, value) => field.onChange(value?.code || "")}
                  getOptionLabel={(option) => option.label}
                  isOptionEqualToValue={(option, value) => option.code === value.code}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Account Group"
                      size="small"
                      error={Boolean(errors.accountGroupCode)}
                      helperText={
                        errors.accountGroupCode?.message ||
                        (selectedGroup
                          ? `${selectedGroup.AccountClassName} · defaults from group apply`
                          : "Required")
                      }
                    />
                  )}
                />
              )}
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Type"
                    size="small"
                    fullWidth
                    error={Boolean(errors.type)}
                    helperText={errors.type?.message || "A / L / R / E (optional)"}
                  >
                    <MenuItem value="">None</MenuItem>
                    {LEGACY_ACCOUNT_TYPE_OPTIONS.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />

              <TextField
                label="New Account Code"
                size="small"
                fullWidth
                {...register("newAccountCode")}
                error={Boolean(errors.newAccountCode)}
                helperText={
                  errors.newAccountCode?.message ||
                  (mode === "create"
                    ? "Leave blank to auto-generate next sequence"
                    : "Format: 1-101-0001")
                }
              />

              <TextField
                label="Legacy Account"
                size="small"
                fullWidth
                {...register("legacyAcct")}
                disabled={mode === "edit" && Boolean(account?.legacyAcct)}
                error={Boolean(errors.legacyAcct)}
                helperText={
                  errors.legacyAcct?.message ||
                  (mode === "edit" && account?.legacyAcct
                    ? "Legacy account cannot be changed"
                    : "Optional migration reference")
                }
              />
            </Stack>

            <TextField
              label="Clean Description"
              size="small"
              {...register("cleanDescription")}
              error={Boolean(errors.cleanDescription)}
              helperText={errors.cleanDescription?.message}
            />

            <TextField
              label="Legacy Description"
              size="small"
              {...register("legacyDescription")}
              disabled={mode === "edit" && Boolean(account?.legacyDescription)}
              error={Boolean(errors.legacyDescription)}
              helperText={
                errors.legacyDescription?.message ||
                (mode === "edit" && account?.legacyDescription
                  ? "Legacy description cannot be overwritten"
                  : "Original legacy text for audit")
              }
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Controller
                name="suggestedModule"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    freeSolo
                    fullWidth
                    options={[...SUGGESTED_MODULE_OPTIONS]}
                    value={field.value || ""}
                    onChange={(_event, value) => field.onChange(value || "")}
                    onInputChange={(_event, value) => field.onChange(value)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Suggested Module"
                        size="small"
                        error={Boolean(errors.suggestedModule)}
                        helperText={errors.suggestedModule?.message}
                      />
                    )}
                  />
                )}
              />

              <Controller
                name="analyticTemplate"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Analytic Template"
                    size="small"
                    fullWidth
                    error={Boolean(errors.analyticTemplate)}
                    helperText={errors.analyticTemplate?.message}
                  >
                    <MenuItem value="">None</MenuItem>
                    {analyticOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Stack>

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
                Deactivate
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
        title="Deactivate Account"
        description={`Deactivate "${account?.newAccountCode || "this account"}"? Accounts are never hard-deleted.`}
        confirmText={deleting ? "Deactivating..." : "Deactivate"}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
};
