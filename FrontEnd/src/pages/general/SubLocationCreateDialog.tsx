import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { subLocationsApi } from "../../api/subLocations.api";

const schema = z.object({
  name: z.string().trim().min(1, "Sub location name is required"),
  type: z.string().trim().optional()
});

type SubLocationFormValues = z.infer<typeof schema>;

interface SubLocationCreateDialogProps {
  open: boolean;
  locationId: number | null;
  locationName: string;
  onClose: () => void;
  onSaved: () => void;
}

const emptyValues: SubLocationFormValues = {
  name: "",
  type: ""
};

export const SubLocationCreateDialog = ({
  open,
  locationId,
  locationName,
  onClose,
  onSaved
}: SubLocationCreateDialogProps) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<SubLocationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(emptyValues);
    setSubmitError(null);
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!locationId) {
      setSubmitError("Location is required");
      return;
    }

    setSaving(true);
    setSubmitError(null);

    try {
      const response = await subLocationsApi.create({
        Name: values.name,
        Type: values.type?.trim() || null,
        LocationId: locationId
      });

      const result = response.data as { success?: boolean; message?: string; errors?: string[] };
      if (!result.success) {
        setSubmitError(result.errors?.join(", ") || result.message || "Failed to create sub location");
        return;
      }

      onSaved();
      onClose();
    } catch {
      setSubmitError("Failed to create sub location");
    } finally {
      setSaving(false);
    }
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>New Sub Location</DialogTitle>
      <DialogContent>
        <Stack component="form" spacing={2} mt={1} onSubmit={onSubmit}>
          {submitError ? <Alert severity="error">{submitError}</Alert> : null}
          <Box>
            <Typography variant="body2" color="text.secondary">
              Location
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {locationName || "-"}
            </Typography>
          </Box>
          <TextField
            label="Sub Location Name"
            size="small"
            {...register("name")}
            error={Boolean(errors.name)}
            helperText={errors.name?.message}
          />
          <TextField
            label="Type"
            size="small"
            {...register("type")}
            error={Boolean(errors.type)}
            helperText={errors.type?.message}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onSubmit} disabled={saving}>
          {saving ? "Saving..." : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
