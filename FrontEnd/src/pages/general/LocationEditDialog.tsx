import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField
} from "@mui/material";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { locationsApi } from "../../api/locations.api";
import { ConfirmDialog } from "../../components/ConfirmDialog";

const schema = z.object({
  locationCode: z.string().trim().min(1, "Location code is required"),
  locationNameEn: z.string().trim().min(1, "English name is required"),
  locationNameAr: z.string().optional()
});

type LocationFormValues = z.infer<typeof schema>;

export interface LocationEditTarget {
  id: number;
  locationCode: string;
  locationNameEn: string;
  locationNameAr: string;
}

interface LocationEditDialogProps {
  open: boolean;
  mode: "create" | "edit";
  location: LocationEditTarget | null;
  onClose: () => void;
  onSaved: () => void;
}

const emptyValues: LocationFormValues = {
  locationCode: "",
  locationNameEn: "",
  locationNameAr: ""
};

export const LocationEditDialog = ({
  open,
  mode,
  location,
  onClose,
  onSaved
}: LocationEditDialogProps) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<LocationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(
      mode === "edit" && location
        ? {
            locationCode: location.locationCode,
            locationNameEn: location.locationNameEn,
            locationNameAr: location.locationNameAr
          }
        : emptyValues
    );
    setSubmitError(null);
    setConfirmDeleteOpen(false);
  }, [location, mode, open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    setSubmitError(null);

    const payload = {
      LocationCode: values.locationCode,
      LocationName_en: values.locationNameEn,
      LocationName_ar: values.locationNameAr?.trim() || null
    };

    try {
      const response =
        mode === "create"
          ? await locationsApi.create(payload)
          : await locationsApi.update(String(location?.id), payload);

      const result = response.data as { success?: boolean; message?: string; errors?: string[] };

      if (!result.success) {
        setSubmitError(
          result.errors?.join(", ") ||
            result.message ||
            `Failed to ${mode === "create" ? "create" : "update"} location`
        );
        return;
      }

      onSaved();
      onClose();
    } catch {
      setSubmitError(`Failed to ${mode === "create" ? "create" : "update"} location`);
    } finally {
      setSaving(false);
    }
  });

  const handleDelete = async () => {
    if (!location) {
      return;
    }

    setDeleting(true);
    setSubmitError(null);

    try {
      const response = await locationsApi.remove(String(location.id));
      const result = response.data as { success?: boolean; message?: string; errors?: string[] };

      if (result.success === false) {
        setSubmitError(result.errors?.join(", ") || result.message || "Failed to delete location");
        setConfirmDeleteOpen(false);
        return;
      }

      setConfirmDeleteOpen(false);
      onSaved();
      onClose();
    } catch {
      setSubmitError("Failed to delete location");
      setConfirmDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const busy = saving || deleting;

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>{mode === "create" ? "New Location" : "Edit Location"}</DialogTitle>
        <DialogContent>
          <Stack component="form" spacing={2} mt={1} onSubmit={onSubmit}>
            {submitError ? <Alert severity="error">{submitError}</Alert> : null}
            <TextField
              label="Location Code"
              size="small"
              {...register("locationCode")}
              error={Boolean(errors.locationCode)}
              helperText={errors.locationCode?.message}
            />
            <TextField
              label="Location Name (EN)"
              size="small"
              {...register("locationNameEn")}
              error={Boolean(errors.locationNameEn)}
              helperText={errors.locationNameEn?.message}
            />
            <TextField
              label="Location Name (AR)"
              size="small"
              {...register("locationNameAr")}
              error={Boolean(errors.locationNameAr)}
              helperText={errors.locationNameAr?.message}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
          <Box>
            {mode === "edit" ? (
              <Button
                color="error"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={busy}
              >
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
        title="Delete Location"
        description={`Are you sure you want to delete "${location?.locationNameEn || location?.locationCode || "this location"}"? This action cannot be undone.`}
        confirmText={deleting ? "Deleting..." : "Delete"}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
};
