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
import { timeSheetCodesApi } from "../../../api/timeSheetCodes.api";
import { ConfirmDialog } from "../../../components/ConfirmDialog";

const schema = z.object({
  code: z.string().trim().min(1, "Code is required").max(20, "Code must be at most 20 characters"),
  codeDescription: z
    .string()
    .trim()
    .max(50, "Description must be at most 50 characters")
    .optional()
});

type TimeSheetCodeFormValues = z.infer<typeof schema>;

export interface TimeSheetCodeEditTarget {
  id: number;
  code: string;
  codeDescription: string;
}

interface TimeSheetCodeEditDialogProps {
  open: boolean;
  mode: "create" | "edit";
  timeSheetCode: TimeSheetCodeEditTarget | null;
  onClose: () => void;
  onSaved: () => void;
}

const emptyValues: TimeSheetCodeFormValues = {
  code: "",
  codeDescription: ""
};

export const TimeSheetCodeEditDialog = ({
  open,
  mode,
  timeSheetCode,
  onClose,
  onSaved
}: TimeSheetCodeEditDialogProps) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<TimeSheetCodeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(
      mode === "edit" && timeSheetCode
        ? {
            code: timeSheetCode.code,
            codeDescription: timeSheetCode.codeDescription
          }
        : emptyValues
    );
    setSubmitError(null);
    setConfirmDeleteOpen(false);
  }, [mode, open, reset, timeSheetCode]);

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    setSubmitError(null);

    const payload = {
      Code: values.code.trim(),
      Code_Description: values.codeDescription?.trim() || null
    };

    try {
      const response =
        mode === "create"
          ? await timeSheetCodesApi.create(payload)
          : await timeSheetCodesApi.update(String(timeSheetCode?.id), payload);

      const result = response.data as { success?: boolean; message?: string; errors?: string[] };

      if (!result.success) {
        setSubmitError(
          result.errors?.join(", ") ||
            result.message ||
            `Failed to ${mode === "create" ? "create" : "update"} time sheet code`
        );
        return;
      }

      onSaved();
      onClose();
    } catch {
      setSubmitError(`Failed to ${mode === "create" ? "create" : "update"} time sheet code`);
    } finally {
      setSaving(false);
    }
  });

  const handleDelete = async () => {
    if (!timeSheetCode) {
      return;
    }

    setDeleting(true);
    setSubmitError(null);

    try {
      const response = await timeSheetCodesApi.remove(String(timeSheetCode.id));
      const result = response.data as { success?: boolean; message?: string; errors?: string[] };

      if (result.success === false) {
        setSubmitError(
          result.errors?.join(", ") || result.message || "Failed to delete time sheet code"
        );
        setConfirmDeleteOpen(false);
        return;
      }

      setConfirmDeleteOpen(false);
      onSaved();
      onClose();
    } catch {
      setSubmitError("Failed to delete time sheet code");
      setConfirmDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const busy = saving || deleting;

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>
          {mode === "create" ? "New Time Sheet Code" : "Edit Time Sheet Code"}
        </DialogTitle>
        <DialogContent>
          <Stack component="form" spacing={2} mt={1} onSubmit={onSubmit}>
            {submitError ? <Alert severity="error">{submitError}</Alert> : null}
            <TextField
              label="Code"
              size="small"
              required
              {...register("code")}
              error={Boolean(errors.code)}
              helperText={errors.code?.message}
            />
            <TextField
              label="Code Description"
              size="small"
              {...register("codeDescription")}
              error={Boolean(errors.codeDescription)}
              helperText={errors.codeDescription?.message}
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
        title="Delete Time Sheet Code"
        description={`Are you sure you want to delete "${timeSheetCode?.code || "this time sheet code"}"? This action cannot be undone.`}
        confirmText={deleting ? "Deleting..." : "Delete"}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
};
