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
import { accountMappingsApi } from "../../../api/accountMappings.api";
import { chartOfAccountsApi } from "../../../api/chartOfAccounts.api";
import { departmentsApi } from "../../../api/departments.api";
import { epsasApi } from "../../../api/epsas.api";
import { locationsApi } from "../../../api/locations.api";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import type { Department } from "../../../types/department.types";
import type { Epsa } from "../../../types/epsa.types";
import type { ChartOfAccounts } from "../../../types/chartOfAccounts.types";
import type { Location } from "../../../types/location.types";
import {
  LOCATION_ACCESS_MODES,
  locationAccessModeLabel,
  type LocationAccessMode
} from "../../../types/accountMapping.types";

const schema = z
  .object({
    epsaId: z.string().min(1, "EPSA is required"),
    departmentId: z.string().optional(),
    chartAccountIds: z.array(z.string()).optional(),
    locationIds: z.array(z.string()).optional(),
    useAllActiveAccounts: z.boolean(),
    locationAccessMode: z.enum(["ALL", "INCLUDE", "EXCLUDE"]),
    isActive: z.boolean()
  })
  .superRefine((values, ctx) => {
    if (!values.useAllActiveAccounts && !values.departmentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["departmentId"],
        message: "Department is required"
      });
    }

    if (!values.useAllActiveAccounts && !values.chartAccountIds?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["chartAccountIds"],
        message: "Select at least one chart account"
      });
    }

    if (
      (values.locationAccessMode === "INCLUDE" || values.locationAccessMode === "EXCLUDE") &&
      !values.locationIds?.length
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["locationIds"],
        message: "Select at least one location"
      });
    }
  });

type AccountMappingFormValues = z.infer<typeof schema>;

export interface AccountMappingEditTarget {
  id: number;
  epsaId: number;
  epsaName: string;
  departmentId: number;
  departmentName: string;
  chartAccountId: number | null;
  chartAccountCode: string;
  chartAccountDescription: string;
  locationId: number | null;
  locationName: string;
  locationAccessMode: LocationAccessMode;
  isAllAccounts: boolean;
  isActive: boolean;
}

interface AccountMappingEditDialogProps {
  open: boolean;
  mode: "create" | "edit";
  mapping: AccountMappingEditTarget | null;
  onClose: () => void;
  onSaved: () => void;
}

type LookupOption = {
  id: number;
  label: string;
};

type ChartAccountOption = {
  id: number;
  label: string;
};

const emptyValues: AccountMappingFormValues = {
  epsaId: "",
  departmentId: "",
  chartAccountIds: [],
  locationIds: [],
  useAllActiveAccounts: false,
  locationAccessMode: "ALL",
  isActive: true
};

const isManagerDepartment = (department: Department): boolean =>
  (department.DepartmentType || "").trim().toLowerCase() === "manager";

export const AccountMappingEditDialog = ({
  open,
  mode,
  mapping,
  onClose,
  onSaved
}: AccountMappingEditDialogProps) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [epsaOptions, setEpsaOptions] = useState<LookupOption[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<LookupOption[]>([]);
  const [chartAccountOptions, setChartAccountOptions] = useState<ChartAccountOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<LookupOption[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm<AccountMappingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues
  });

  const useAllActiveAccounts = watch("useAllActiveAccounts");
  const locationAccessMode = watch("locationAccessMode");

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(
      mode === "edit" && mapping
        ? {
            epsaId: String(mapping.epsaId),
            departmentId: String(mapping.departmentId),
            chartAccountIds: mapping.chartAccountId ? [String(mapping.chartAccountId)] : [],
            locationIds: mapping.locationId ? [String(mapping.locationId)] : [],
            useAllActiveAccounts: mapping.isAllAccounts,
            locationAccessMode: mapping.locationAccessMode || "ALL",
            isActive: mapping.isActive
          }
        : emptyValues
    );
    setSubmitError(null);
    setConfirmDeleteOpen(false);
  }, [mapping, mode, open, reset]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const loadLookups = async () => {
      setLoadingLookups(true);

      try {
        if (mode === "create") {
          const [epsaResponse, departmentResponse, chartResponse, locationResponse] =
            await Promise.all([
              epsasApi.list(),
              departmentsApi.list(),
              chartOfAccountsApi.list({ activeOnly: true }),
              locationsApi.list()
            ]);

          if (cancelled) {
            return;
          }

          if (epsaResponse.success) {
            setEpsaOptions(
              epsaResponse.data.map((item: Epsa) => ({
                id: item.Id,
                label: item.InterstName
              }))
            );
          }

          if (departmentResponse.success) {
            setDepartmentOptions(
              departmentResponse.data
                .filter(isManagerDepartment)
                .map((item: Department) => ({
                  id: item.Id,
                  label: item.DepartmentName_English || item.DepartmentName_Arabic
                }))
            );
          }

          if (chartResponse.success) {
            setChartAccountOptions(
              chartResponse.data.map((item: ChartOfAccounts) => ({
                id: Number(item.Id),
                label: `${item.NewAccountCode} — ${item.CleanDescription}`
              }))
            );
          }

          if (locationResponse.success) {
            setLocationOptions(
              locationResponse.data.map((item: Location) => ({
                id: item.ID_Location,
                label: `${item.LocationCode} — ${item.LocationName_en}`
              }))
            );
          }
        } else {
          const locationResponse = await locationsApi.list();
          if (cancelled) {
            return;
          }
          if (locationResponse.success) {
            setLocationOptions(
              locationResponse.data.map((item: Location) => ({
                id: item.ID_Location,
                label: `${item.LocationCode} — ${item.LocationName_en}`
              }))
            );
          }
        }
      } catch {
        if (!cancelled) {
          setSubmitError("Failed to load lookup data");
        }
      } finally {
        if (!cancelled) {
          setLoadingLookups(false);
        }
      }
    };

    void loadLookups();

    return () => {
      cancelled = true;
    };
  }, [mode, open]);

  useEffect(() => {
    if (useAllActiveAccounts) {
      setValue("chartAccountIds", []);
    }
  }, [setValue, useAllActiveAccounts]);

  useEffect(() => {
    if (locationAccessMode === "ALL") {
      setValue("locationIds", []);
    }
  }, [setValue, locationAccessMode]);

  const chartAccountIds = watch("chartAccountIds");
  const locationIds = watch("locationIds");

  const selectedChartOptions = useMemo(() => {
    const selectedIds = chartAccountIds || [];
    return chartAccountOptions.filter((option) => selectedIds.includes(String(option.id)));
  }, [chartAccountIds, chartAccountOptions]);

  const selectedLocationOptions = useMemo(() => {
    const selectedIds = locationIds || [];
    return locationOptions.filter((option) => selectedIds.includes(String(option.id)));
  }, [locationIds, locationOptions]);

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    setSubmitError(null);

    try {
      if (mode === "create") {
        const response = await accountMappingsApi.create({
          EPSAId: Number(values.epsaId),
          DepartmentId: values.departmentId ? Number(values.departmentId) : null,
          ChartAccountIds: values.useAllActiveAccounts
            ? undefined
            : values.chartAccountIds?.map((id) => Number(id)),
          UseAllActiveAccounts: values.useAllActiveAccounts,
          LocationAccessMode: values.locationAccessMode,
          LocationIDs:
            values.locationAccessMode === "ALL"
              ? undefined
              : values.locationIds?.map((id) => Number(id))
        });

        const result = response.data as {
          success?: boolean;
          message?: string;
          errors?: string[];
          summary?: { created: number; reactivated: number; skipped: number };
        };

        if (!result.success) {
          setSubmitError(
            result.errors?.join(", ") || result.message || "Failed to create account mappings"
          );
          return;
        }
      } else if (mapping) {
        const response = await accountMappingsApi.update(String(mapping.id), {
          IsActive: values.isActive,
          LocationAccessMode: values.locationAccessMode,
          LocationID:
            values.locationAccessMode === "ALL"
              ? null
              : values.locationIds?.[0]
                ? Number(values.locationIds[0])
                : mapping.locationId
        });

        const result = response.data as { success?: boolean; message?: string; errors?: string[] };

        if (!result.success) {
          setSubmitError(
            result.errors?.join(", ") || result.message || "Failed to update account mapping"
          );
          return;
        }
      }

      onSaved();
      onClose();
    } catch {
      setSubmitError(`Failed to ${mode === "create" ? "create" : "update"} account mapping`);
    } finally {
      setSaving(false);
    }
  });

  const handleDelete = async () => {
    if (!mapping) {
      return;
    }

    setDeleting(true);
    setSubmitError(null);

    try {
      const response = await accountMappingsApi.remove(String(mapping.id));
      const result = response.data as { success?: boolean; message?: string; errors?: string[] };

      if (result.success === false) {
        setSubmitError(
          result.errors?.join(", ") || result.message || "Failed to deactivate account mapping"
        );
        setConfirmDeleteOpen(false);
        return;
      }

      setConfirmDeleteOpen(false);
      onSaved();
      onClose();
    } catch {
      setSubmitError("Failed to deactivate account mapping");
      setConfirmDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const busy = saving || deleting;

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>{mode === "create" ? "New Account Mapping" : "Edit Account Mapping"}</DialogTitle>
        <DialogContent>
          <Stack component="form" spacing={2} mt={1} onSubmit={onSubmit}>
            {submitError ? <Alert severity="error">{submitError}</Alert> : null}

            {mode === "create" ? (
              <>
                <Controller
                  name="epsaId"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      options={epsaOptions}
                      loading={loadingLookups}
                      value={epsaOptions.find((option) => String(option.id) === field.value) || null}
                      onChange={(_event, value) => field.onChange(value ? String(value.id) : "")}
                      getOptionLabel={(option) => option.label}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="EPSA"
                          size="small"
                          error={Boolean(errors.epsaId)}
                          helperText={errors.epsaId?.message}
                        />
                      )}
                    />
                  )}
                />

                <Controller
                  name="departmentId"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      options={departmentOptions}
                      loading={loadingLookups}
                      value={
                        departmentOptions.find((option) => String(option.id) === field.value) || null
                      }
                      onChange={(_event, value) => field.onChange(value ? String(value.id) : "")}
                      getOptionLabel={(option) => option.label}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={
                            useAllActiveAccounts
                              ? "Manager Department (optional)"
                              : "Manager Department"
                          }
                          size="small"
                          error={Boolean(errors.departmentId)}
                          helperText={
                            errors.departmentId?.message ||
                            (useAllActiveAccounts
                              ? "Leave empty to apply All Accounts to every Manager department"
                              : "Only Manager departments are available")
                          }
                        />
                      )}
                    />
                  )}
                />

                <Controller
                  name="useAllActiveAccounts"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(_event, checked) => field.onChange(checked)}
                        />
                      }
                      label="All Accounts (ChartAccountId = NULL, one row per Manager department)"
                    />
                  )}
                />

                {useAllActiveAccounts ? (
                  <Alert severity="info">
                    Creates one mapping row with ChartAccountId = NULL and IsAllAccounts = true.
                    No individual chart account rows are inserted.
                  </Alert>
                ) : (
                  <Controller
                    name="chartAccountIds"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        multiple
                        options={chartAccountOptions}
                        loading={loadingLookups}
                        value={selectedChartOptions}
                        onChange={(_event, value) =>
                          field.onChange(value.map((option) => String(option.id)))
                        }
                        getOptionLabel={(option) => option.label}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Chart Accounts"
                            size="small"
                            error={Boolean(errors.chartAccountIds)}
                            helperText={
                              errors.chartAccountIds?.message ||
                              "Select one or more chart accounts"
                            }
                          />
                        )}
                      />
                    )}
                  />
                )}

                <Controller
                  name="locationAccessMode"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      select
                      label="Location access mode"
                      size="small"
                      value={field.value}
                      onChange={(event) =>
                        field.onChange(event.target.value as LocationAccessMode)
                      }
                    >
                      {LOCATION_ACCESS_MODES.map((mode) => (
                        <MenuItem key={mode} value={mode}>
                          {mode} — {locationAccessModeLabel(mode)}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />

                <Alert
                  severity={
                    locationAccessMode === "EXCLUDE"
                      ? "warning"
                      : locationAccessMode === "INCLUDE"
                        ? "info"
                        : "success"
                  }
                >
                  {locationAccessModeLabel(locationAccessMode)}
                  {locationAccessMode === "ALL"
                    ? " (LocationID = NULL)"
                    : locationAccessMode === "EXCLUDE"
                      ? ". One row is created per excluded location."
                      : ". One row is created per included location."}
                </Alert>

                {locationAccessMode !== "ALL" ? (
                  <Controller
                    name="locationIds"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        multiple
                        options={locationOptions}
                        loading={loadingLookups}
                        value={selectedLocationOptions}
                        onChange={(_event, value) =>
                          field.onChange(value.map((option) => String(option.id)))
                        }
                        getOptionLabel={(option) => option.label}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={
                              locationAccessMode === "EXCLUDE"
                                ? "Excluded locations"
                                : "Included locations"
                            }
                            size="small"
                            error={Boolean(errors.locationIds)}
                            helperText={
                              errors.locationIds?.message ||
                              (locationAccessMode === "EXCLUDE"
                                ? "Select locations to exclude"
                                : "Select locations to include")
                            }
                          />
                        )}
                      />
                    )}
                  />
                ) : null}
              </>
            ) : mapping ? (
              <>
                <TextField label="EPSA" size="small" value={mapping.epsaName} disabled />
                <TextField label="Department" size="small" value={mapping.departmentName} disabled />
                <TextField
                  label="Coverage"
                  size="small"
                  value={
                    mapping.isAllAccounts
                      ? "All accounts"
                      : `${mapping.chartAccountCode} — ${mapping.chartAccountDescription}`
                  }
                  disabled
                />
                <Controller
                  name="locationAccessMode"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      select
                      label="Location access mode"
                      size="small"
                      value={field.value}
                      onChange={(event) =>
                        field.onChange(event.target.value as LocationAccessMode)
                      }
                    >
                      {LOCATION_ACCESS_MODES.map((modeOption) => (
                        <MenuItem key={modeOption} value={modeOption}>
                          {modeOption} — {locationAccessModeLabel(modeOption)}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
                <Alert severity="info">{locationAccessModeLabel(locationAccessMode)}</Alert>
                {locationAccessMode !== "ALL" ? (
                  <Controller
                    name="locationIds"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        options={locationOptions}
                        loading={loadingLookups}
                        value={
                          locationOptions.find((option) => String(option.id) === field.value?.[0]) ||
                          null
                        }
                        onChange={(_event, value) =>
                          field.onChange(value ? [String(value.id)] : [])
                        }
                        getOptionLabel={(option) => option.label}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Location"
                            size="small"
                            error={Boolean(errors.locationIds)}
                            helperText={errors.locationIds?.message}
                          />
                        )}
                      />
                    )}
                  />
                ) : null}
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
              </>
            ) : null}
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
        title="Deactivate Account Mapping"
        description="Deactivate this EPSA + Department mapping?"
        confirmText={deleting ? "Deactivating..." : "Deactivate"}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
};
