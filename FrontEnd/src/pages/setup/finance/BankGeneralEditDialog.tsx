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
import { bankGeneralsApi } from "../../../api/bankGenerals.api";
import { ConfirmDialog } from "../../../components/ConfirmDialog";

const schema = z.object({
  backName: z.string().trim().max(200, "Bank name must be at most 200 characters").optional()
});

type BankGeneralFormValues = z.infer<typeof schema>;

export interface BankGeneralEditTarget {
  id: number;
  backName: string;
}

interface BankGeneralEditDialogProps {
  open: boolean;
  mode: "create" | "edit";
  bankGeneral: BankGeneralEditTarget | null;
  onClose: () => void;
  onSaved: () => void;
}

const emptyValues: BankGeneralFormValues = {
  backName: ""
};

export const BankGeneralEditDialog = ({
  open,
  mode,
  bankGeneral,
  onClose,
  onSaved
}: BankGeneralEditDialogProps) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<BankGeneralFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(
      mode === "edit" && bankGeneral
        ? {
            backName: bankGeneral.backName
          }
        : emptyValues
    );
    setSubmitError(null);
    setConfirmDeleteOpen(false);
  }, [bankGeneral, mode, open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    setSubmitError(null);

    const payload = {
      BackName: values.backName?.trim() || null
    };

    try {
      const response =
        mode === "create"
          ? await bankGeneralsApi.create(payload)
          : await bankGeneralsApi.update(String(bankGeneral?.id), payload);

      const result = response.data as { success?: boolean; message?: string; errors?: string[] };

      if (!result.success) {
        setSubmitError(
          result.errors?.join(", ") ||
            result.message ||
            `Failed to ${mode === "create" ? "create" : "update"} bank general`
        );
        return;
      }

      onSaved();
      onClose();
    } catch {
      setSubmitError(`Failed to ${mode === "create" ? "create" : "update"} bank general`);
    } finally {
      setSaving(false);
    }
  });

  const handleDelete = async () => {
    if (!bankGeneral) {
      return;
    }

    setDeleting(true);
    setSubmitError(null);

    try {
      const response = await bankGeneralsApi.remove(String(bankGeneral.id));
      const result = response.data as { success?: boolean; message?: string; errors?: string[] };

      if (result.success === false) {
        setSubmitError(
          result.errors?.join(", ") || result.message || "Failed to delete bank general"
        );
        setConfirmDeleteOpen(false);
        return;
      }

      setConfirmDeleteOpen(false);
      onSaved();
      onClose();
    } catch {
      setSubmitError("Failed to delete bank general");
      setConfirmDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const busy = saving || deleting;

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>{mode === "create" ? "New Bank General" : "Edit Bank General"}</DialogTitle>
        <DialogContent>
          <Stack component="form" spacing={2} mt={1} onSubmit={onSubmit}>
            {submitError ? <Alert severity="error">{submitError}</Alert> : null}
            <TextField
              label="Bank Name"
              size="small"
              {...register("backName")}
              error={Boolean(errors.backName)}
              helperText={errors.backName?.message}
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
        title="Delete Bank General"
        description={`Are you sure you want to delete "${bankGeneral?.backName || "this bank general"}"? This action cannot be undone.`}
        confirmText={deleting ? "Deleting..." : "Delete"}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
};
