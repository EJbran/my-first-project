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
import { bankSerialChecksApi } from "../../../api/bankSerialChecks.api";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import type { Bank } from "../../../types/bank.types";

const compareCheckRange = (fromCheck: string, toCheck: string): number => {
  const fromNum = Number(fromCheck);
  const toNum = Number(toCheck);

  if (
    fromCheck !== "" &&
    toCheck !== "" &&
    Number.isFinite(fromNum) &&
    Number.isFinite(toNum)
  ) {
    return fromNum - toNum;
  }

  return fromCheck.localeCompare(toCheck, undefined, { numeric: true, sensitivity: "base" });
};

const pad2 = (value: number) => String(value).padStart(2, "0");

/** SQL Server DATETIME-safe local stamp: YYYY-MM-DD HH:mm:ss */
const formatSqlServerDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
};

const schema = z
  .object({
    bankId: z.string().optional(),
    fromCheck: z.string().trim().min(1, "From Check is required").max(50),
    toCheck: z.string().trim().min(1, "To Check is required").max(50),
    creationDate: z.string().optional()
  })
  .refine((values) => compareCheckRange(values.fromCheck, values.toCheck) < 0, {
    message: "From Check must be less than To Check",
    path: ["toCheck"]
  });

type BankSerialCheckFormValues = z.infer<typeof schema>;

export interface BankSerialCheckEditTarget {
  id: number;
  fromCheck: string;
  toCheck: string;
  creationDate: string;
  bankId: number | null;
}

interface BankSerialCheckEditDialogProps {
  open: boolean;
  mode: "create" | "edit";
  serialCheck: BankSerialCheckEditTarget | null;
  fixedBankId?: number | null;
  onClose: () => void;
  onSaved: () => void;
}

type BankLookupOption = {
  id: number;
  label: string;
};

const emptyValues: BankSerialCheckFormValues = {
  bankId: "",
  fromCheck: "",
  toCheck: "",
  creationDate: ""
};

const toDateInputValue = (value: string) => {
  if (!value) {
    return "";
  }

  const normalized =
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value) ? value.replace(" ", "T") : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
};

export const BankSerialCheckEditDialog = ({
  open,
  mode,
  serialCheck,
  fixedBankId,
  onClose,
  onSaved
}: BankSerialCheckEditDialogProps) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [lookupOptions, setLookupOptions] = useState<BankLookupOption[]>([]);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const showBankPicker = fixedBankId == null;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<BankSerialCheckFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    const defaultBankId =
      fixedBankId != null
        ? String(fixedBankId)
        : serialCheck?.bankId != null
          ? String(serialCheck.bankId)
          : "";

    reset(
      mode === "edit" && serialCheck
        ? {
            bankId: defaultBankId,
            fromCheck: serialCheck.fromCheck,
            toCheck: serialCheck.toCheck,
            creationDate: toDateInputValue(serialCheck.creationDate)
          }
        : {
            ...emptyValues,
            bankId: defaultBankId,
            creationDate: toDateInputValue(new Date().toISOString())
          }
    );
    setSubmitError(null);
    setConfirmDeleteOpen(false);
  }, [fixedBankId, mode, open, reset, serialCheck]);

  useEffect(() => {
    if (!open || !showBankPicker) {
      return;
    }

    let cancelled = false;

    const loadLookup = async () => {
      setLoadingLookup(true);

      try {
        const response = await banksApi.list();
        if (cancelled) {
          return;
        }

        if (!response.success) {
          setLookupOptions([]);
          return;
        }

        const options = response.data.map((item: Bank) => {
          const bankName =
            item.BankGeneral?.BackName?.trim() ||
            (item.BankId != null ? `Bank ${item.BankId}` : "Unassigned");
          const branch = item.Branch?.trim();
          return {
            id: item.Id,
            label: branch ? `${bankName} · ${branch} (#${item.Id})` : `${bankName} (#${item.Id})`
          };
        });

        setLookupOptions(options.sort((a, b) => a.label.localeCompare(b.label)));
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
  }, [open, showBankPicker]);

  const selectedBankOption = useMemo(() => {
    const bankId = fixedBankId ?? serialCheck?.bankId;
    if (bankId == null) {
      return null;
    }

    return (
      lookupOptions.find((option) => option.id === bankId) || {
        id: bankId,
        label: `Bank #${bankId}`
      }
    );
  }, [fixedBankId, lookupOptions, serialCheck?.bankId]);

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    setSubmitError(null);

    const creationDate = values.creationDate
      ? formatSqlServerDateTime(values.creationDate)
      : formatSqlServerDateTime(new Date().toISOString());

    if (values.creationDate && !creationDate) {
      setSubmitError("Creation date must be a valid date");
      setSaving(false);
      return;
    }

    const payload = {
      From_Check: values.fromCheck?.trim() || null,
      To_Check: values.toCheck?.trim() || null,
      Creation_date: creationDate,
      BANKID:
        fixedBankId != null
          ? fixedBankId
          : values.bankId
            ? Number(values.bankId)
            : null
    };

    try {
      const response =
        mode === "create"
          ? await bankSerialChecksApi.create(payload)
          : await bankSerialChecksApi.update(String(serialCheck?.id), payload);

      const result = response.data as { success?: boolean; message?: string; errors?: string[] };

      if (!result.success) {
        setSubmitError(
          result.errors?.join(", ") ||
            result.message ||
            `Failed to ${mode === "create" ? "create" : "update"} serial check`
        );
        return;
      }

      onSaved();
      onClose();
    } catch {
      setSubmitError(`Failed to ${mode === "create" ? "create" : "update"} serial check`);
    } finally {
      setSaving(false);
    }
  });

  const handleDelete = async () => {
    if (!serialCheck) {
      return;
    }

    setDeleting(true);
    setSubmitError(null);

    try {
      const response = await bankSerialChecksApi.remove(String(serialCheck.id));
      const result = response.data as { success?: boolean; message?: string; errors?: string[] };

      if (result.success === false) {
        setSubmitError(result.errors?.join(", ") || result.message || "Failed to delete serial check");
        setConfirmDeleteOpen(false);
        return;
      }

      setConfirmDeleteOpen(false);
      onSaved();
      onClose();
    } catch {
      setSubmitError("Failed to delete serial check");
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
          {mode === "create" ? "New Serial Check" : "Edit Serial Check"}
        </DialogTitle>
        <DialogContent>
          <Stack component="form" spacing={2} mt={1} onSubmit={onSubmit}>
            {submitError ? <Alert severity="error">{submitError}</Alert> : null}
            {showBankPicker ? (
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
            ) : null}
            <TextField
              label="From Check"
              size="small"
              {...register("fromCheck")}
              error={Boolean(errors.fromCheck)}
              helperText={errors.fromCheck?.message}
            />
            <TextField
              label="To Check"
              size="small"
              {...register("toCheck")}
              error={Boolean(errors.toCheck)}
              helperText={errors.toCheck?.message}
            />
            <TextField
              label="Creation Date"
              size="small"
              type="datetime-local"
              InputLabelProps={{ shrink: true }}
              {...register("creationDate")}
              error={Boolean(errors.creationDate)}
              helperText={errors.creationDate?.message}
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
        title="Delete Serial Check"
        description={`Are you sure you want to delete serial check "${serialCheck?.fromCheck || serialCheck?.toCheck || serialCheck?.id}"? This action cannot be undone.`}
        confirmText={deleting ? "Deleting..." : "Delete"}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
};
