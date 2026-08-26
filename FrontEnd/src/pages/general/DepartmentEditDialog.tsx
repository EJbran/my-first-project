import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { departmentsApi } from "../../api/departments.api";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import type { Department } from "../../types/department.types";

const schema = z.object({
  departmentNameArabic: z.string().trim().min(1, "Arabic name is required"),
  departmentNameEnglish: z.string().trim().min(1, "English name is required"),
  departmentType: z.enum(
    [
      "Coordinator",
      "Manager",
      "Member",
      "Division",
      "Top management",
      "Section",
      "Unit"
    ],
    {
      error: "Department type is required"
    }
  ),
  attachedNumber: z.string().optional(),
  departmentAddress: z.string().optional(),
  departmentPhone: z.string().optional(),
  departmentExtenstion: z.string().optional()
});

type DepartmentFormValues = z.infer<typeof schema>;

export interface DepartmentEditTarget {
  id: number;
  departmentNameArabic: string;
  departmentNameEnglish: string;
  departmentType:
    | "Coordinator"
    | "Manager"
    | "Member"
    | "Division"
    | "Top management"
    | "Section"
    | "Unit";
  attachedNumber: string;
  departmentAddress: string;
  departmentPhone: string;
  departmentExtenstion: string;
}

interface DepartmentEditDialogProps {
  open: boolean;
  mode: "create" | "edit";
  department: DepartmentEditTarget | null;
  onClose: () => void;
  onSaved: () => void;
}

type DepartmentLookupOption = {
  id: number;
  label: string;
};

const emptyValues: DepartmentFormValues = {
  departmentNameArabic: "",
  departmentNameEnglish: "",
  departmentType: "Manager",
  attachedNumber: "",
  departmentAddress: "",
  departmentPhone: "",
  departmentExtenstion: ""
};

export const DepartmentEditDialog = ({
  open,
  mode,
  department,
  onClose,
  onSaved
}: DepartmentEditDialogProps) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [lookupOptions, setLookupOptions] = useState<DepartmentLookupOption[]>([]);
  const [loadingLookup, setLoadingLookup] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<DepartmentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(
      mode === "edit" && department
        ? {
            departmentNameArabic: department.departmentNameArabic,
            departmentNameEnglish: department.departmentNameEnglish,
            departmentType: department.departmentType || "Manager",
            attachedNumber: department.attachedNumber,
            departmentAddress: department.departmentAddress,
            departmentPhone: department.departmentPhone,
            departmentExtenstion: department.departmentExtenstion
          }
        : emptyValues
    );
    setSubmitError(null);
    setConfirmDeleteOpen(false);
  }, [department, mode, open, reset]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const loadLookup = async () => {
      setLoadingLookup(true);

      try {
        const response = await departmentsApi.list();
        if (cancelled) {
          return;
        }

        if (!response.success) {
          setLookupOptions([]);
          return;
        }

        const options = response.data
          .filter((item: Department) => mode !== "edit" || item.Id !== department?.id)
          .map((item: Department) => ({
            id: item.Id,
            label:
              item.DepartmentName_English?.trim() ||
              item.DepartmentName_Arabic?.trim() ||
              `Department ${item.Id}`
          }))
          .sort((a, b) => a.label.localeCompare(b.label));

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
  }, [department?.id, mode, open]);

  const optionsById = useMemo(() => {
    const map = new Map<number, DepartmentLookupOption>();
    lookupOptions.forEach((option) => map.set(option.id, option));
    return map;
  }, [lookupOptions]);

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    setSubmitError(null);

    const attachedNumber =
      values.attachedNumber?.trim() === "" ? null : Number(values.attachedNumber);

    const payload = {
      DepartmentName_Arabic: values.departmentNameArabic,
      DepartmentName_English: values.departmentNameEnglish,
      DepartmentType: values.departmentType,
      AttachedNumber: Number.isNaN(attachedNumber) ? null : attachedNumber,
      DepartmentAddress: values.departmentAddress?.trim() ?? "",
      DepartmentPhone: values.departmentPhone?.trim() ?? "",
      DepartmentExtenstion: values.departmentExtenstion?.trim() ?? ""
    };

    try {
      const response =
        mode === "create"
          ? await departmentsApi.create(payload)
          : await departmentsApi.update(String(department?.id), payload);

      const result = response.data as { success?: boolean; message?: string; errors?: string[] };

      if (!result.success) {
        setSubmitError(
          result.errors?.join(", ") ||
            result.message ||
            `Failed to ${mode === "create" ? "create" : "update"} department`
        );
        return;
      }

      onSaved();
      onClose();
    } catch {
      setSubmitError(`Failed to ${mode === "create" ? "create" : "update"} department`);
    } finally {
      setSaving(false);
    }
  });

  const handleDelete = async () => {
    if (!department) {
      return;
    }

    setDeleting(true);
    setSubmitError(null);

    try {
      const response = await departmentsApi.remove(String(department.id));
      const result = response.data as { success?: boolean; message?: string; errors?: string[] };

      if (result.success === false) {
        setSubmitError(
          result.errors?.join(", ") || result.message || "Failed to delete department"
        );
        setConfirmDeleteOpen(false);
        return;
      }

      setConfirmDeleteOpen(false);
      onSaved();
      onClose();
    } catch {
      setSubmitError("Failed to delete department");
      setConfirmDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const busy = saving || deleting;

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>{mode === "create" ? "New Department" : "Edit Department"}</DialogTitle>
        <DialogContent>
          <Stack component="form" spacing={2} mt={1} onSubmit={onSubmit}>
            {submitError ? <Alert severity="error">{submitError}</Alert> : null}
            <TextField
              label="Department Name (EN)"
              size="small"
              {...register("departmentNameEnglish")}
              error={Boolean(errors.departmentNameEnglish)}
              helperText={errors.departmentNameEnglish?.message}
            />
            <TextField
              label="Department Name (AR)"
              size="small"
              {...register("departmentNameArabic")}
              error={Boolean(errors.departmentNameArabic)}
              helperText={errors.departmentNameArabic?.message}
            />
            <TextField
              label="Department Type"
              size="small"
              select
              SelectProps={{ native: true }}
              {...register("departmentType")}
              error={Boolean(errors.departmentType)}
              helperText={errors.departmentType?.message}
            >
              <option value="Manager">Manager</option>
              <option value="Member">Member</option>
              <option value="Top management">Top management</option>
              <option value="Division">Division</option>
              <option value="Coordinator">Coordinator</option>
              <option value="Section">Section</option>
              <option value="Unit">Unit</option>
            </TextField>
            <Controller
              name="attachedNumber"
              control={control}
              render={({ field }) => {
                const selectedId = Number(field.value);
                const matchedOption =
                  field.value && Number.isFinite(selectedId)
                    ? (optionsById.get(selectedId) ?? null)
                    : null;
                const selectedOption =
                  matchedOption ??
                  (field.value && Number.isFinite(selectedId)
                    ? { id: selectedId, label: `Department ${selectedId}` }
                    : null);
                const options =
                  selectedOption && !optionsById.has(selectedOption.id)
                    ? [selectedOption, ...lookupOptions]
                    : lookupOptions;

                return (
                  <Autocomplete
                    options={options}
                    loading={loadingLookup}
                    value={selectedOption}
                    onChange={(_event, option) => {
                      field.onChange(option ? String(option.id) : "");
                    }}
                    getOptionLabel={(option) => option.label}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderOption={(props, option) => (
                      <li {...props} key={option.id}>
                        {option.label}
                      </li>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Reports To"
                        size="small"
                        error={Boolean(errors.attachedNumber)}
                        helperText={
                          errors.attachedNumber?.message ||
                          "Select parent department (saves department ID)"
                        }
                      />
                    )}
                  />
                );
              }}
            />
            <TextField
              label="Address"
              size="small"
              {...register("departmentAddress")}
              error={Boolean(errors.departmentAddress)}
              helperText={errors.departmentAddress?.message}
            />
            <TextField
              label="Phone"
              size="small"
              {...register("departmentPhone")}
              error={Boolean(errors.departmentPhone)}
              helperText={errors.departmentPhone?.message}
            />
            <TextField
              label="Extension"
              size="small"
              {...register("departmentExtenstion")}
              error={Boolean(errors.departmentExtenstion)}
              helperText={errors.departmentExtenstion?.message}
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
        title="Delete Department"
        description={`Are you sure you want to delete "${department?.departmentNameEnglish || department?.departmentNameArabic || "this department"}"? This action cannot be undone.`}
        confirmText={deleting ? "Deleting..." : "Delete"}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
};
