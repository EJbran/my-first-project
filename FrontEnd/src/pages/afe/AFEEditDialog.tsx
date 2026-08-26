import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { afesApi } from "../../api/afes.api";
import {
  AFE_PRIORITIES,
  AFE_PROJECT_NATURES,
  AFE_STATUSES,
  AFE_TYPES,
  type AFE
} from "../../types/afe.types";
import {
  afeFormSchema,
  type AFEFormValues
} from "../../validators/afe.validator";

export type AFEDialogMode = "create" | "edit" | "view";

interface AFEEditDialogProps {
  open: boolean;
  mode: AFEDialogMode;
  afe: AFE | null;
  onClose: () => void;
  onSaved: () => void;
}

const emptyValues: AFEFormValues = {
  SourceLineNo: null,
  ImportBatchNo: "",
  AFENo: "",
  LegacyDescription: "",
  LegacyLocationCode: "",
  LegacyDepartmentCode: "",
  LegacyDepartmentName: "",
  AFEDescription: "",
  AFEDescriptionArabic: "",
  AFEType: "GENERAL",
  AFECategory: "",
  ProjectNature: "",
  Priority: "",
  Status: "ACTIVE",
  EPSAId: null,
  DepartmentId: null,
  LocationId: null,
  DefaultChartAccountId: null,
  CurrencyCode: "LYD",
  EstimatedBudget: null,
  ApprovedBudget: null,
  CommittedAmount: 0,
  ActualAmount: 0,
  StartDate: "",
  EndDate: "",
  PlannedStartDate: "",
  PlannedEndDate: "",
  IsBudgetControlled: false,
  IsCapitalizable: null,
  RequiresAFEOnTransaction: true,
  IsActive: true,
  Notes: ""
};

const toFormValues = (afe: AFE | null): AFEFormValues => {
  if (!afe) {
    return emptyValues;
  }

  return {
    SourceLineNo: afe.SourceLineNo,
    ImportBatchNo: afe.ImportBatchNo ?? "",
    AFENo: afe.AFENo ?? "",
    LegacyDescription: afe.LegacyDescription ?? "",
    LegacyLocationCode: afe.LegacyLocationCode ?? "",
    LegacyDepartmentCode: afe.LegacyDepartmentCode ?? "",
    LegacyDepartmentName: afe.LegacyDepartmentName ?? "",
    AFEDescription: afe.AFEDescription ?? "",
    AFEDescriptionArabic: afe.AFEDescriptionArabic ?? "",
    AFEType: (AFE_TYPES.includes(afe.AFEType as never)
      ? afe.AFEType
      : "GENERAL") as AFEFormValues["AFEType"],
    AFECategory: afe.AFECategory ?? "",
    ProjectNature: (afe.ProjectNature ?? "") as AFEFormValues["ProjectNature"],
    Priority: (afe.Priority ?? "") as AFEFormValues["Priority"],
    Status: (AFE_STATUSES.includes(afe.Status as never)
      ? afe.Status
      : "ACTIVE") as AFEFormValues["Status"],
    EPSAId: afe.EPSAId,
    DepartmentId: afe.DepartmentId,
    LocationId: afe.LocationId,
    DefaultChartAccountId: afe.DefaultChartAccountId,
    CurrencyCode: afe.CurrencyCode || "LYD",
    EstimatedBudget: afe.EstimatedBudget,
    ApprovedBudget: afe.ApprovedBudget,
    CommittedAmount: afe.CommittedAmount ?? 0,
    ActualAmount: afe.ActualAmount ?? 0,
    StartDate: afe.StartDate ? String(afe.StartDate).slice(0, 10) : "",
    EndDate: afe.EndDate ? String(afe.EndDate).slice(0, 10) : "",
    PlannedStartDate: afe.PlannedStartDate
      ? String(afe.PlannedStartDate).slice(0, 10)
      : "",
    PlannedEndDate: afe.PlannedEndDate ? String(afe.PlannedEndDate).slice(0, 10) : "",
    IsBudgetControlled: Boolean(afe.IsBudgetControlled),
    IsCapitalizable:
      afe.IsCapitalizable === null || afe.IsCapitalizable === undefined
        ? null
        : Boolean(afe.IsCapitalizable),
    RequiresAFEOnTransaction: afe.RequiresAFEOnTransaction !== false,
    IsActive: afe.IsActive !== false,
    Notes: afe.Notes ?? ""
  };
};

const SectionTitle = ({ children }: { children: string }) => (
  <Typography variant="subtitle2" sx={{ mt: 1.5, mb: 0.75, fontWeight: 800 }}>
    {children}
  </Typography>
);

export const AFEEditDialog = ({
  open,
  mode,
  afe,
  onClose,
  onSaved
}: AFEEditDialogProps) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const readOnly = mode === "view";

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<AFEFormValues>({
    resolver: zodResolver(afeFormSchema) as Resolver<AFEFormValues>,
    defaultValues: emptyValues
  });

  const approvedBudget = useWatch({ control, name: "ApprovedBudget" });
  const committedAmount = useWatch({ control, name: "CommittedAmount" });
  const actualAmount = useWatch({ control, name: "ActualAmount" });

  const remainingBudget = useMemo(() => {
    if (approvedBudget === null || approvedBudget === undefined) {
      return null;
    }

    return Number(
      (
        Number(approvedBudget) -
        Number(committedAmount ?? 0) -
        Number(actualAmount ?? 0)
      ).toFixed(2)
    );
  }, [approvedBudget, committedAmount, actualAmount]);

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(toFormValues(afe));
    setSubmitError(null);
  }, [afe, open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (readOnly) {
      return;
    }

    setSaving(true);
    setSubmitError(null);

    const payload = {
      SourceLineNo: values.SourceLineNo,
      ImportBatchNo: values.ImportBatchNo || null,
      AFENo: values.AFENo.trim(),
      LegacyDescription: values.LegacyDescription || null,
      LegacyLocationCode: values.LegacyLocationCode || null,
      LegacyDepartmentCode: values.LegacyDepartmentCode || null,
      LegacyDepartmentName: values.LegacyDepartmentName || null,
      AFEDescription: values.AFEDescription.trim(),
      AFEDescriptionArabic: values.AFEDescriptionArabic || null,
      AFEType: values.AFEType,
      AFECategory: values.AFECategory || null,
      ProjectNature: values.ProjectNature || null,
      Priority: values.Priority || null,
      Status: values.Status,
      EPSAId: values.EPSAId,
      DepartmentId: values.DepartmentId,
      LocationId: values.LocationId,
      DefaultChartAccountId: values.DefaultChartAccountId,
      CurrencyCode: values.CurrencyCode.trim().toUpperCase(),
      EstimatedBudget: values.EstimatedBudget,
      ApprovedBudget: values.ApprovedBudget,
      CommittedAmount: values.CommittedAmount ?? 0,
      ActualAmount: values.ActualAmount ?? 0,
      StartDate: values.StartDate || null,
      EndDate: values.EndDate || null,
      PlannedStartDate: values.PlannedStartDate || null,
      PlannedEndDate: values.PlannedEndDate || null,
      IsBudgetControlled: values.IsBudgetControlled,
      IsCapitalizable: values.IsCapitalizable,
      RequiresAFEOnTransaction: values.RequiresAFEOnTransaction,
      IsActive: values.IsActive,
      Notes: values.Notes || null
    };

    try {
      const response =
        mode === "create"
          ? await afesApi.create(payload)
          : await afesApi.update(String(afe?.Id), payload);

      const result = response.data as {
        success?: boolean;
        message?: string;
        errors?: string[];
      };

      if (!result.success) {
        setSubmitError(
          result.errors?.join(", ") ||
            result.message ||
            `Failed to ${mode === "create" ? "create" : "update"} AFE`
        );
        return;
      }

      onSaved();
      onClose();
    } catch {
      setSubmitError(`Failed to ${mode === "create" ? "create" : "update"} AFE`);
    } finally {
      setSaving(false);
    }
  });

  const title =
    mode === "create" ? "New AFE" : mode === "view" ? "View AFE" : "Edit AFE";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      PaperProps={{
        sx: {
          width: "min(96vw, 1400px)",
          maxWidth: "96vw",
          m: 1
        }
      }}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.25} component="form" id="afe-form" onSubmit={onSubmit}>
          {submitError ? <Alert severity="error">{submitError}</Alert> : null}

          <SectionTitle>1. Source / Legacy Trace</SectionTitle>
          <Box
            sx={{
              display: "grid",
              gap: 1.25,
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }
            }}
          >
            <TextField
              label="Source Line No"
              type="number"
              disabled={readOnly}
              {...register("SourceLineNo")}
              error={Boolean(errors.SourceLineNo)}
              helperText={errors.SourceLineNo?.message as string}
            />
            <TextField
              label="Import Batch No"
              disabled={readOnly}
              {...register("ImportBatchNo")}
            />
            <TextField
              label="AFE No (legacy, not unique)"
              required
              disabled={readOnly}
              {...register("AFENo")}
              error={Boolean(errors.AFENo)}
              helperText={errors.AFENo?.message}
            />
            <TextField
              label="Legacy Location Code"
              disabled={readOnly}
              {...register("LegacyLocationCode")}
            />
            <TextField
              label="Legacy Department Code"
              disabled={readOnly}
              {...register("LegacyDepartmentCode")}
            />
            <TextField
              label="Legacy Department Name"
              disabled={readOnly}
              {...register("LegacyDepartmentName")}
            />
            <TextField
              label="Original Legacy Description"
              disabled={readOnly}
              multiline
              minRows={2}
              sx={{ gridColumn: "1 / -1" }}
              {...register("LegacyDescription")}
              error={Boolean(errors.LegacyDescription)}
              helperText={errors.LegacyDescription?.message}
            />
          </Box>

          <Divider />
          <SectionTitle>2. Corrected Names</SectionTitle>
          <TextField
            label="AFE Description (English)"
            required
            disabled={readOnly}
            fullWidth
            {...register("AFEDescription")}
            error={Boolean(errors.AFEDescription)}
            helperText={errors.AFEDescription?.message}
          />
          <TextField
            label="AFE Description (Arabic)"
            disabled={readOnly}
            fullWidth
            dir="rtl"
            {...register("AFEDescriptionArabic")}
            error={Boolean(errors.AFEDescriptionArabic)}
            helperText={errors.AFEDescriptionArabic?.message}
          />

          <Divider />
          <SectionTitle>3. Classification</SectionTitle>
          <Box
            sx={{
              display: "grid",
              gap: 1.25,
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }
            }}
          >
            <TextField
              select
              label="AFE Type"
              required
              disabled={readOnly}
              defaultValue="GENERAL"
              {...register("AFEType")}
              error={Boolean(errors.AFEType)}
              helperText={errors.AFEType?.message}
            >
              {AFE_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="AFE Category"
              disabled={readOnly}
              {...register("AFECategory")}
            />
            <TextField
              select
              label="Project Nature"
              disabled={readOnly}
              defaultValue=""
              {...register("ProjectNature")}
            >
              <MenuItem value="">—</MenuItem>
              {AFE_PROJECT_NATURES.map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Priority"
              disabled={readOnly}
              defaultValue=""
              {...register("Priority")}
            >
              <MenuItem value="">—</MenuItem>
              {AFE_PRIORITIES.map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Status"
              required
              disabled={readOnly}
              defaultValue="ACTIVE"
              {...register("Status")}
              error={Boolean(errors.Status)}
              helperText={errors.Status?.message}
            >
              {AFE_STATUSES.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Divider />
          <SectionTitle>4. Linked Department & Location</SectionTitle>
          <Typography variant="caption" color="text.secondary">
            Displayed from Departments.DepartmentName_English /
            DepartmentName_Arabic and Location.LocationName_en / LocationName_ar.
          </Typography>
          <Box
            sx={{
              display: "grid",
              gap: 1.25,
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }
            }}
          >
            <TextField
              label="DepartmentName_English"
              value={
                afe?.DepartmentName ||
                afe?.Department?.DepartmentName_English ||
                ""
              }
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="DepartmentName_Arabic"
              value={
                afe?.DepartmentNameArabic ||
                afe?.Department?.DepartmentName_Arabic ||
                ""
              }
              InputProps={{ readOnly: true }}
              dir="rtl"
            />
            <TextField
              label="LocationName_en"
              value={afe?.LocationName || afe?.Location?.LocationName_en || ""}
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="LocationName_ar"
              value={
                afe?.LocationNameArabic || afe?.Location?.LocationName_ar || ""
              }
              InputProps={{ readOnly: true }}
              dir="rtl"
            />
            <TextField
              label="EPSA Id"
              type="number"
              disabled={readOnly}
              {...register("EPSAId")}
            />
            <TextField
              label="Default Chart Account Id"
              type="number"
              disabled={readOnly}
              {...register("DefaultChartAccountId")}
            />
          </Box>
          {/* Keep IDs in form state for update payload; not shown in UI */}
          <input type="hidden" {...register("DepartmentId")} />
          <input type="hidden" {...register("LocationId")} />

          <Divider />
          <SectionTitle>5. Budget</SectionTitle>
          <Box
            sx={{
              display: "grid",
              gap: 1.25,
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }
            }}
          >
            <TextField
              label="Currency Code"
              required
              disabled={readOnly}
              {...register("CurrencyCode")}
              error={Boolean(errors.CurrencyCode)}
              helperText={errors.CurrencyCode?.message}
            />
            <TextField
              label="Remaining Budget"
              value={remainingBudget ?? ""}
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Estimated Budget"
              type="number"
              disabled={readOnly}
              {...register("EstimatedBudget")}
              error={Boolean(errors.EstimatedBudget)}
              helperText={errors.EstimatedBudget?.message as string}
            />
            <TextField
              label="Approved Budget"
              type="number"
              disabled={readOnly}
              {...register("ApprovedBudget")}
              error={Boolean(errors.ApprovedBudget)}
              helperText={errors.ApprovedBudget?.message as string}
            />
            <TextField
              label="Committed Amount"
              type="number"
              disabled={readOnly}
              {...register("CommittedAmount")}
              error={Boolean(errors.CommittedAmount)}
              helperText={errors.CommittedAmount?.message as string}
            />
            <TextField
              label="Actual Amount"
              type="number"
              disabled={readOnly}
              {...register("ActualAmount")}
              error={Boolean(errors.ActualAmount)}
              helperText={errors.ActualAmount?.message as string}
            />
            <TextField
              label="Start Date"
              type="date"
              disabled={readOnly}
              InputLabelProps={{ shrink: true }}
              {...register("StartDate")}
            />
            <TextField
              label="End Date"
              type="date"
              disabled={readOnly}
              InputLabelProps={{ shrink: true }}
              {...register("EndDate")}
              error={Boolean(errors.EndDate)}
              helperText={errors.EndDate?.message as string}
            />
            <TextField
              label="Planned Start Date"
              type="date"
              disabled={readOnly}
              InputLabelProps={{ shrink: true }}
              {...register("PlannedStartDate")}
            />
            <TextField
              label="Planned End Date"
              type="date"
              disabled={readOnly}
              InputLabelProps={{ shrink: true }}
              {...register("PlannedEndDate")}
              error={Boolean(errors.PlannedEndDate)}
              helperText={errors.PlannedEndDate?.message as string}
            />
          </Box>

          <Divider />
          <SectionTitle>6. Controls</SectionTitle>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
            <Controller
              name="IsBudgetControlled"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(field.value)}
                      onChange={(event) => field.onChange(event.target.checked)}
                      disabled={readOnly}
                    />
                  }
                  label="Budget Controlled"
                />
              )}
            />
            <Controller
              name="RequiresAFEOnTransaction"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(field.value)}
                      onChange={(event) => field.onChange(event.target.checked)}
                      disabled={readOnly}
                    />
                  }
                  label="Requires AFE On Transaction"
                />
              )}
            />
            <Controller
              name="IsActive"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(field.value)}
                      onChange={(event) => field.onChange(event.target.checked)}
                      disabled={readOnly}
                    />
                  }
                  label="Active"
                />
              )}
            />
            <Controller
              name="IsCapitalizable"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(field.value)}
                      indeterminate={field.value === null}
                      onChange={(event) => field.onChange(event.target.checked)}
                      disabled={readOnly}
                    />
                  }
                  label="Capitalizable"
                />
              )}
            />
          </Stack>
          <TextField
            label="Notes"
            disabled={readOnly}
            fullWidth
            multiline
            minRows={3}
            {...register("Notes")}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          {readOnly ? "Close" : "Cancel"}
        </Button>
        {!readOnly ? (
          <Button type="submit" form="afe-form" variant="contained" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
};
