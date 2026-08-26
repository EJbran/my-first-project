import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Stack,
  TextField
} from "@mui/material";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { epsasApi } from "../../api/epsas.api";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { EPSA_TYPES } from "../../types/epsa.types";

const optionalPercentage = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }
    return value;
  },
  z.union([
    z.coerce
      .number({ error: "Enter a valid percentage" })
      .min(0, "Must be between 0 and 100")
      .max(100, "Must be between 0 and 100"),
    z.null()
  ])
);

const schema = z.object({
  interstName: z.string().trim().min(1, "Interest name is required").max(50),
  noc: optionalPercentage,
  pc: optionalPercentage,
  epsaType: z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.union([z.enum(["Opex", "Capex", "Temp"]), z.null()])
  )
});

type EpsaFormInput = z.input<typeof schema>;
type EpsaFormValues = z.output<typeof schema>;

export interface EpsaEditTarget {
  id: number;
  interstName: string;
  noc: number | null;
  pc: number | null;
  epsaType: string | null;
}

interface EpsaEditDialogProps {
  open: boolean;
  mode: "create" | "edit";
  epsa: EpsaEditTarget | null;
  onClose: () => void;
  onSaved: () => void;
}

const emptyValues: EpsaFormValues = {
  interstName: "",
  noc: null,
  pc: null,
  epsaType: null
};

export const EpsaEditDialog = ({
  open,
  mode,
  epsa,
  onClose,
  onSaved
}: EpsaEditDialogProps) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<EpsaFormInput, unknown, EpsaFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(
      mode === "edit" && epsa
        ? {
            interstName: epsa.interstName,
            noc: epsa.noc,
            pc: epsa.pc,
            epsaType:
              epsa.epsaType === "Opex" || epsa.epsaType === "Capex" || epsa.epsaType === "Temp"
                ? epsa.epsaType
                : null
          }
        : emptyValues
    );
    setSubmitError(null);
    setConfirmDeleteOpen(false);
  }, [epsa, mode, open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    setSubmitError(null);

    const payload = {
      InterstName: values.interstName,
      NOC: values.noc,
      PC: values.pc,
      EPSAType: values.epsaType
    };

    try {
      const response =
        mode === "create"
          ? await epsasApi.create(payload)
          : await epsasApi.update(String(epsa?.id), payload);

      const result = response.data as { success?: boolean; message?: string; errors?: string[] };

      if (!result.success) {
        setSubmitError(
          result.errors?.join(", ") ||
            result.message ||
            `Failed to ${mode === "create" ? "create" : "update"} EPSA`
        );
        return;
      }

      onSaved();
      onClose();
    } catch {
      setSubmitError(`Failed to ${mode === "create" ? "create" : "update"} EPSA`);
    } finally {
      setSaving(false);
    }
  });

  const handleDelete = async () => {
    if (!epsa) {
      return;
    }

    setDeleting(true);
    setSubmitError(null);

    try {
      const response = await epsasApi.remove(String(epsa.id));
      const result = response.data as { success?: boolean; message?: string; errors?: string[] };

      if (result.success === false) {
        setSubmitError(result.errors?.join(", ") || result.message || "Failed to delete EPSA");
        setConfirmDeleteOpen(false);
        return;
      }

      setConfirmDeleteOpen(false);
      onSaved();
      onClose();
    } catch {
      setSubmitError("Failed to delete EPSA");
      setConfirmDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const busy = saving || deleting;

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>{mode === "create" ? "New EPSA" : "Edit EPSA"}</DialogTitle>
        <DialogContent>
          <Stack component="form" spacing={2} mt={1} onSubmit={onSubmit}>
            {submitError ? <Alert severity="error">{submitError}</Alert> : null}
            <TextField
              label="Interest Name"
              size="small"
              {...register("interstName")}
              error={Boolean(errors.interstName)}
              helperText={errors.interstName?.message}
            />
            <Controller
              name="epsaType"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  label="EPSA Type"
                  size="small"
                  value={field.value ?? ""}
                  onChange={(event) => field.onChange(event.target.value || null)}
                  error={Boolean(errors.epsaType)}
                  helperText={errors.epsaType?.message as string | undefined}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {EPSA_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField
              label="NOC"
              size="small"
              type="number"
              inputProps={{ step: "any", min: 0, max: 100 }}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>
              }}
              {...register("noc")}
              error={Boolean(errors.noc)}
              helperText={errors.noc?.message as string | undefined}
            />
            <TextField
              label="PC"
              size="small"
              type="number"
              inputProps={{ step: "any", min: 0, max: 100 }}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>
              }}
              {...register("pc")}
              error={Boolean(errors.pc)}
              helperText={errors.pc?.message as string | undefined}
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
        title="Delete EPSA"
        description={`Are you sure you want to delete "${epsa?.interstName || "this EPSA"}"? This action cannot be undone.`}
        confirmText={deleting ? "Deleting..." : "Delete"}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
};
