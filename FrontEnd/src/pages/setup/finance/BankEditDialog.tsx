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
import { banksApi } from "../../../api/banks.api";
import { bankGeneralsApi } from "../../../api/bankGenerals.api";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import type { BankGeneral } from "../../../types/bankGeneral.types";

const optionalInt = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  return value;
}, z.union([z.coerce.number().int(), z.null()]));

const schema = z.object({
  bankId: z.string().optional(),
  branch: z.string().trim().max(100).optional(),
  serialNumId: optionalInt,
  glCreditAccount: z.string().trim().max(50).optional()
});

type BankFormInput = z.input<typeof schema>;
type BankFormValues = z.output<typeof schema>;

export interface BankEditTarget {
  id: number;
  bankId: number | null;
  bankName: string;
  branch: string;
  serialNumId: number | null;
  glCreditAccount: string;
}

interface BankEditDialogProps {
  open: boolean;
  mode: "create" | "edit";
  bank: BankEditTarget | null;
  onClose: () => void;
  onSaved: () => void;
}

type BankLookupOption = {
  id: number;
  label: string;
};

const emptyValues: BankFormValues = {
  bankId: "",
  branch: "",
  serialNumId: null,
  glCreditAccount: ""
};

export const BankEditDialog = ({ open, mode, bank, onClose, onSaved }: BankEditDialogProps) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [lookupOptions, setLookupOptions] = useState<BankLookupOption[]>([]);
  const [loadingLookup, setLoadingLookup] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<BankFormInput, unknown, BankFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(
      mode === "edit" && bank
        ? {
            bankId: bank.bankId == null ? "" : String(bank.bankId),
            branch: bank.branch,
            serialNumId: bank.serialNumId,
            glCreditAccount: bank.glCreditAccount
          }
        : emptyValues
    );
    setSubmitError(null);
    setConfirmDeleteOpen(false);
  }, [bank, mode, open, reset]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const loadLookup = async () => {
      setLoadingLookup(true);

      try {
        const response = await bankGeneralsApi.list();
        if (cancelled) {
          return;
        }

        if (!response.success) {
          setLookupOptions([]);
          return;
        }

        const options = response.data
          .map((item: BankGeneral) => ({
            id: item.Id,
            label: item.BackName?.trim() || `Bank ${item.Id}`
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
  }, [open]);

  const selectedBankOption = useMemo(() => {
    if (!bank?.bankId) {
      return null;
    }

    return (
      lookupOptions.find((option) => option.id === bank.bankId) || {
        id: bank.bankId,
        label: bank.bankName || `Bank ${bank.bankId}`
      }
    );
  }, [bank, lookupOptions]);

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    setSubmitError(null);

    const payload = {
      BankId: values.bankId ? Number(values.bankId) : null,
      Branch: values.branch?.trim() || null,
      SerialNum_Id: values.serialNumId,
      GLCreditAccount: values.glCreditAccount?.trim() || null
    };

    try {
      const response =
        mode === "create"
          ? await banksApi.create(payload)
          : await banksApi.update(String(bank?.id), payload);

      const result = response.data as { success?: boolean; message?: string; errors?: string[] };

      if (!result.success) {
        setSubmitError(
          result.errors?.join(", ") ||
            result.message ||
            `Failed to ${mode === "create" ? "create" : "update"} bank`
        );
        return;
      }

      onSaved();
      onClose();
    } catch {
      setSubmitError(`Failed to ${mode === "create" ? "create" : "update"} bank`);
    } finally {
      setSaving(false);
    }
  });

  const handleDelete = async () => {
    if (!bank) {
      return;
    }

    setDeleting(true);
    setSubmitError(null);

    try {
      const response = await banksApi.remove(String(bank.id));
      const result = response.data as { success?: boolean; message?: string; errors?: string[] };

      if (result.success === false) {
        setSubmitError(result.errors?.join(", ") || result.message || "Failed to delete bank");
        setConfirmDeleteOpen(false);
        return;
      }

      setConfirmDeleteOpen(false);
      onSaved();
      onClose();
    } catch {
      setSubmitError("Failed to delete bank");
      setConfirmDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const busy = saving || deleting;

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>{mode === "create" ? "New Bank" : "Edit Bank"}</DialogTitle>
        <DialogContent>
          <Stack component="form" spacing={2} mt={1} onSubmit={onSubmit}>
            {submitError ? <Alert severity="error">{submitError}</Alert> : null}
            <Controller
              name="bankId"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  options={lookupOptions}
                  loading={loadingLookup}
                  value={
                    field.value
                      ? lookupOptions.find((option) => String(option.id) === field.value) ||
                        selectedBankOption
                      : null
                  }
                  onChange={(_event, option) => field.onChange(option ? String(option.id) : "")}
                  getOptionLabel={(option) => option.label}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  renderInput={(params) => (
                    <TextField {...params} label="Bank" size="small" />
                  )}
                />
              )}
            />
            <TextField
              label="Branch"
              size="small"
              {...register("branch")}
              error={Boolean(errors.branch)}
              helperText={errors.branch?.message}
            />
            <TextField
              label="Serial Number Id"
              size="small"
              type="number"
              {...register("serialNumId")}
              error={Boolean(errors.serialNumId)}
              helperText={errors.serialNumId?.message as string | undefined}
            />
            <TextField
              label="GL Credit Account"
              size="small"
              {...register("glCreditAccount")}
              error={Boolean(errors.glCreditAccount)}
              helperText={errors.glCreditAccount?.message}
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
        title="Delete Bank"
        description={`Are you sure you want to delete "${bank?.bankName || bank?.branch || "this bank"}"? This action cannot be undone.`}
        confirmText={deleting ? "Deleting..." : "Delete"}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
};
