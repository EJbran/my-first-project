import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField
} from "@mui/material";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { holidaysApi } from "../../../api/holidays.api";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { HOLIDAY_TYPES } from "../../../types/holiday.types";

const FIXED_DATE_YEAR = "2000";

const MONTH_OPTIONS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" }
] as const;

const daysInMonth = (month: string): number => {
  const monthNumber = Number(month);
  if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    return 31;
  }

  return new Date(Number(FIXED_DATE_YEAR), monthNumber, 0).getDate();
};

const parseDateParts = (value: string) => {
  const match = String(value || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return { year: FIXED_DATE_YEAR, month: "01", day: "01" };
  }

  return { year: match[1], month: match[2], day: match[3] };
};

const buildDateValue = (year: string, month: string, day: string): string => {
  const maxDay = daysInMonth(month);
  const dayNumber = Math.min(Math.max(Number(day) || 1, 1), maxDay);
  return `${year}-${month}-${String(dayNumber).padStart(2, "0")}`;
};
const schema = z.object({
  holidayCode: z.string().trim().max(50, "Code must be at most 50 characters").optional(),
  holidayNameAr: z
    .string()
    .trim()
    .min(1, "Arabic name is required")
    .max(200, "Arabic name must be at most 200 characters"),
  holidayNameEn: z
    .string()
    .trim()
    .max(200, "English name must be at most 200 characters")
    .optional(),
  holidayType: z.string().trim().min(1, "Holiday type is required").max(30),
  holidayDate: z.string().trim().min(1, "Holiday date is required"),
  isFixedDate: z.boolean(),
  isActive: z.boolean(),
  description: z
    .string()
    .trim()
    .max(1000, "Description must be at most 1000 characters")
    .optional()
});

type HolidayFormValues = z.infer<typeof schema>;

export interface HolidayEditTarget {
  id: number;
  holidayCode: string;
  holidayNameAr: string;
  holidayNameEn: string;
  holidayType: string;
  holidayDate: string;
  isFixedDate: boolean;
  isActive: boolean;
  description: string;
}

interface HolidayEditDialogProps {
  open: boolean;
  mode: "create" | "edit";
  holiday: HolidayEditTarget | null;
  onClose: () => void;
  onSaved: () => void;
}

const emptyValues: HolidayFormValues = {
  holidayCode: "",
  holidayNameAr: "",
  holidayNameEn: "",
  holidayType: "NATIONAL",
  holidayDate: "",
  isFixedDate: true,
  isActive: true,
  description: ""
};

export const HolidayEditDialog = ({
  open,
  mode,
  holiday,
  onClose,
  onSaved
}: HolidayEditDialogProps) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors }
  } = useForm<HolidayFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues
  });

  const isFixedDate = useWatch({ control, name: "isFixedDate" });
  const holidayDate = useWatch({ control, name: "holidayDate" });
  const dateParts = parseDateParts(holidayDate || "");
  const dayOptions = Array.from({ length: daysInMonth(dateParts.month) }, (_, index) =>
    String(index + 1).padStart(2, "0")
  );
  useEffect(() => {
    if (!open) {
      return;
    }

    reset(
      mode === "edit" && holiday
        ? {
            holidayCode: holiday.holidayCode,
            holidayNameAr: holiday.holidayNameAr,
            holidayNameEn: holiday.holidayNameEn,
            holidayType: holiday.holidayType || "NATIONAL",
            holidayDate: holiday.holidayDate,
            isFixedDate: holiday.isFixedDate,
            isActive: holiday.isActive,
            description: holiday.description
          }
        : emptyValues
    );
    setSubmitError(null);
    setConfirmDeleteOpen(false);
  }, [holiday, mode, open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    setSubmitError(null);

    const dateParts = parseDateParts(values.holidayDate);
    const payload = {
      HolidayCode: values.holidayCode?.trim() || null,
      HolidayNameAr: values.holidayNameAr.trim(),
      HolidayNameEn: values.holidayNameEn?.trim() || null,
      HolidayType: values.holidayType.trim(),
      HolidayDate: values.isFixedDate
        ? buildDateValue(FIXED_DATE_YEAR, dateParts.month, dateParts.day)
        : values.holidayDate,
      IsFixedDate: values.isFixedDate,
      IsActive: values.isActive,
      Description: values.description?.trim() || null
    };

    try {
      const response =
        mode === "create"
          ? await holidaysApi.create(payload)
          : await holidaysApi.update(String(holiday?.id), payload);

      const result = response.data as { success?: boolean; message?: string; errors?: string[] };

      if (!result.success) {
        setSubmitError(
          result.errors?.join(", ") ||
            result.message ||
            `Failed to ${mode === "create" ? "create" : "update"} holiday`
        );
        return;
      }

      onSaved();
      onClose();
    } catch {
      setSubmitError(`Failed to ${mode === "create" ? "create" : "update"} holiday`);
    } finally {
      setSaving(false);
    }
  });

  const handleDelete = async () => {
    if (!holiday) {
      return;
    }

    setDeleting(true);
    setSubmitError(null);

    try {
      const response = await holidaysApi.remove(String(holiday.id));
      const result = response.data as { success?: boolean; message?: string; errors?: string[] };

      if (result.success === false) {
        setSubmitError(result.errors?.join(", ") || result.message || "Failed to delete holiday");
        setConfirmDeleteOpen(false);
        return;
      }

      setConfirmDeleteOpen(false);
      onSaved();
      onClose();
    } catch {
      setSubmitError("Failed to delete holiday");
      setConfirmDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const busy = saving || deleting;

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>{mode === "create" ? "New Holiday" : "Edit Holiday"}</DialogTitle>
        <DialogContent>
          <Stack component="form" spacing={2} mt={1} onSubmit={onSubmit}>
            {submitError ? <Alert severity="error">{submitError}</Alert> : null}

            <Box
              sx={{
                display: "grid",
                gap: 1.5,
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }
              }}
            >
              <TextField
                label="Holiday Code"
                size="small"
                {...register("holidayCode")}
                error={Boolean(errors.holidayCode)}
                helperText={errors.holidayCode?.message}
              />
              <TextField
                select
                label="Holiday Type"
                size="small"
                required
                {...register("holidayType")}
                error={Boolean(errors.holidayType)}
                helperText={errors.holidayType?.message}
              >
                {HOLIDAY_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Holiday Name (English)"
                size="small"
                {...register("holidayNameEn")}
                error={Boolean(errors.holidayNameEn)}
                helperText={errors.holidayNameEn?.message}
              />
              <TextField
                label="Holiday Name (Arabic)"
                size="small"
                required
                dir="rtl"
                {...register("holidayNameAr")}
                error={Boolean(errors.holidayNameAr)}
                helperText={errors.holidayNameAr?.message}
              />
              {isFixedDate ? (
                <>
                  <TextField
                    select
                    label="Month"
                    size="small"
                    required
                    value={dateParts.month}
                    onChange={(event) => {
                      setValue(
                        "holidayDate",
                        buildDateValue(FIXED_DATE_YEAR, event.target.value, dateParts.day),
                        { shouldValidate: true, shouldDirty: true }
                      );
                    }}
                    error={Boolean(errors.holidayDate)}
                    helperText={errors.holidayDate?.message || "Year is not used for fixed dates"}
                  >
                    {MONTH_OPTIONS.map((month) => (
                      <MenuItem key={month.value} value={month.value}>
                        {month.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Day"
                    size="small"
                    required
                    value={dateParts.day}
                    onChange={(event) => {
                      setValue(
                        "holidayDate",
                        buildDateValue(FIXED_DATE_YEAR, dateParts.month, event.target.value),
                        { shouldValidate: true, shouldDirty: true }
                      );
                    }}
                    error={Boolean(errors.holidayDate)}
                  >
                    {dayOptions.map((day) => (
                      <MenuItem key={day} value={day}>
                        {Number(day)}
                      </MenuItem>
                    ))}
                  </TextField>
                </>
              ) : (
                <TextField
                  label="Holiday Date"
                  type="date"
                  size="small"
                  required
                  InputLabelProps={{ shrink: true }}
                  {...register("holidayDate")}
                  error={Boolean(errors.holidayDate)}
                  helperText={errors.holidayDate?.message}
                />
              )}
              <TextField
                label="Description"
                size="small"
                {...register("description")}
                error={Boolean(errors.description)}
                helperText={errors.description?.message}
              />
            </Box>

            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Controller
                name="isFixedDate"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={field.value}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          field.onChange(checked);
                          if (checked) {
                            const parts = parseDateParts(holidayDate || "");
                            setValue(
                              "holidayDate",
                              buildDateValue(FIXED_DATE_YEAR, parts.month, parts.day),
                              { shouldValidate: true }
                            );
                          }
                        }}
                      />
                    }
                    label="Fixed date"
                  />
                )}
              />              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={field.value}
                        onChange={(event) => field.onChange(event.target.checked)}
                      />
                    }
                    label="Active"
                  />
                )}
              />
            </Stack>
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
        title="Delete Holiday"
        description={`Are you sure you want to delete "${holiday?.holidayNameEn || holiday?.holidayNameAr || "this holiday"}"? This action cannot be undone.`}
        confirmText={deleting ? "Deleting..." : "Delete"}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
};
