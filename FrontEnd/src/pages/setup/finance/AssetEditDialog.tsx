import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
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
import { assetsApi } from "../../../api/assets.api";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import type { Asset, AssetPayload } from "../../../types/asset.types";

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");
const requiredInteger = (label: string) => z.coerce.number().int(`${label} must be a whole number`).positive(`${label} is required`);
const moneyField = (label: string) => z.coerce.number().finite(`${label} must be a valid number`);

const schema = z.object({
  assetCode: z.string().trim().min(1, "Asset code is required").max(50, "Asset code must be at most 50 characters"),
  assetDescription: z.string().trim().min(1, "Asset description is required").max(200, "Asset description must be at most 200 characters"),
  categoryId: requiredInteger("Category ID"),
  subLocationId: requiredInteger("Sub-location ID"),
  departmentId: requiredInteger("Department ID"),
  purchaseDate: dateField,
  insertedDate: dateField,
  purchaseCost: moneyField("Purchase cost"),
  bookValue: moneyField("Book value"),
  openingBalanceBookValue: moneyField("Opening balance book value"),
  depreciationValue: moneyField("Depreciation value"),
  netValue: moneyField("Net value"),
  responsibleId: requiredInteger("Responsible ID"),
  responsibleNote: z.string().trim().max(50, "Responsible note must be at most 50 characters").optional(),
  status: z.string().trim().min(1, "Status is required").max(50, "Status must be at most 50 characters")
});

type FormValues = z.infer<typeof schema>;
interface AssetEditDialogProps {
  open: boolean;
  mode: "create" | "edit";
  asset: Asset | null;
  onClose: () => void;
  onSaved: () => void;
}

const emptyValues: FormValues = {
  assetCode: "", assetDescription: "", categoryId: 0, subLocationId: 0, departmentId: 0,
  purchaseDate: "", insertedDate: "", purchaseCost: 0, bookValue: 0, openingBalanceBookValue: 0,
  depreciationValue: 0, netValue: 0, responsibleId: 0, responsibleNote: "", status: "Active"
};

const fromAsset = (asset: Asset): FormValues => ({
  assetCode: asset.AssetCode,
  assetDescription: asset.AssetDescription,
  categoryId: asset.CategoryID,
  subLocationId: asset.SubLocationID,
  departmentId: asset.DepartmentID,
  purchaseDate: String(asset.PurchaseDate).slice(0, 10),
  insertedDate: String(asset.InsertedDate).slice(0, 10),
  purchaseCost: Number(asset.PurchaseCost),
  bookValue: Number(asset.BookValue),
  openingBalanceBookValue: Number(asset.OpeningBalanceBookValue),
  depreciationValue: Number(asset.DepreciationValue),
  netValue: Number(asset.NetValue),
  responsibleId: asset.ResponsibleID,
  responsibleNote: asset.ResponsibleNote ?? "",
  status: asset.Status
});

const errorText = (result: { message?: string; errors?: string[] }, fallback: string) => result.errors?.join(", ") || result.message || fallback;

export const AssetEditDialog = ({ open, mode, asset, onClose, onSaved }: AssetEditDialogProps) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.input<typeof schema>, unknown, FormValues>({ resolver: zodResolver(schema), defaultValues: emptyValues });

  useEffect(() => {
    if (!open) return;
    reset(mode === "edit" && asset ? fromAsset(asset) : emptyValues);
    setSubmitError(null);
    setConfirmDeleteOpen(false);
  }, [asset, mode, open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    setSubmitError(null);
    const payload: AssetPayload = {
      AssetCode: values.assetCode.trim(), AssetDescription: values.assetDescription.trim(), CategoryID: values.categoryId,
      SubLocationID: values.subLocationId, DepartmentID: values.departmentId, PurchaseDate: values.purchaseDate,
      InsertedDate: values.insertedDate, PurchaseCost: values.purchaseCost, BookValue: values.bookValue,
      OpeningBalanceBookValue: values.openingBalanceBookValue, DepreciationValue: values.depreciationValue,
      NetValue: values.netValue, ResponsibleID: values.responsibleId, ResponsibleNote: values.responsibleNote?.trim() || null,
      Status: values.status.trim()
    };
    try {
      const response = mode === "create" ? await assetsApi.create(payload) : await assetsApi.update(String(asset?.AssetID), payload);
      if (!response.data.success) {
        setSubmitError(errorText(response.data, `Failed to ${mode === "create" ? "create" : "update"} asset`));
        return;
      }
      onSaved();
      onClose();
    } catch {
      setSubmitError(`Failed to ${mode === "create" ? "create" : "update"} asset`);
    } finally {
      setSaving(false);
    }
  });

  const handleDelete = async () => {
    if (!asset) return;
    setDeleting(true);
    setSubmitError(null);
    try {
      const response = await assetsApi.remove(asset.AssetID);
      if (!response.data.success) {
        setSubmitError(errorText(response.data, "Failed to delete asset"));
        setConfirmDeleteOpen(false);
        return;
      }
      setConfirmDeleteOpen(false);
      onSaved();
      onClose();
    } catch {
      setSubmitError("Failed to delete asset");
      setConfirmDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const busy = saving || deleting;
  const field = (name: keyof FormValues, label: string, type = "text", extra: Record<string, unknown> = {}) => (
    <TextField label={label} size="small" required={name !== "responsibleNote"} type={type} {...extra} {...register(name)} error={Boolean(errors[name])} helperText={errors[name]?.message as string | undefined} />
  );

  return <>
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>{mode === "create" ? "New Asset" : "Edit Asset"}</DialogTitle>
      <DialogContent>
        <Stack component="form" spacing={2} mt={1} onSubmit={onSubmit}>
          {submitError ? <Alert severity="error">{submitError}</Alert> : null}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            {field("assetCode", "Asset Code")}
            {field("status", "Status")}
            {field("assetDescription", "Asset Description")}
            {field("responsibleNote", "Responsible Note")}
            {field("categoryId", "Category ID", "number", { inputProps: { min: 1, step: 1 } })}
            {field("subLocationId", "Sub-location ID", "number", { inputProps: { min: 1, step: 1 } })}
            {field("departmentId", "Department ID", "number", { inputProps: { min: 1, step: 1 } })}
            {field("responsibleId", "Responsible ID", "number", { inputProps: { min: 1, step: 1 } })}
            {field("purchaseDate", "Purchase Date", "date", { slotProps: { inputLabel: { shrink: true } } })}
            {field("insertedDate", "Inserted Date", "date", { slotProps: { inputLabel: { shrink: true } } })}
            {field("purchaseCost", "Purchase Cost", "number", { inputProps: { step: "0.01" } })}
            {field("bookValue", "Book Value", "number", { inputProps: { step: "0.01" } })}
            {field("openingBalanceBookValue", "Opening Balance Book Value", "number", { inputProps: { step: "0.01" } })}
            {field("depreciationValue", "Depreciation Value", "number", { inputProps: { step: "0.01" } })}
            {field("netValue", "Net Value", "number", { inputProps: { step: "0.01" } })}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        {mode === "edit" ? <Button color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => setConfirmDeleteOpen(true)} disabled={busy}>Delete</Button> : null}
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={onSubmit} disabled={busy} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : mode === "create" ? <AddRoundedIcon /> : <EditRoundedIcon />}>
          {saving ? "Saving..." : mode === "create" ? "Create Asset" : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
    <ConfirmDialog open={confirmDeleteOpen} title="Delete asset" description={`Delete ${asset?.AssetCode || "this asset"}? This action cannot be undone.`} onClose={() => setConfirmDeleteOpen(false)} onConfirm={() => void handleDelete()} confirmText={deleting ? "Deleting..." : "Delete"} />
  </>;
};
