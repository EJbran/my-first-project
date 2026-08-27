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
import { assetCategoriesApi } from "../../../api/assetCategories.api";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import type { AssetCategory, AssetCategoryPayload } from "../../../types/assetCategory.types";

const schema = z.object({
  categoryName: z.string().trim().min(1, "Category name is required").max(30, "Category name must be at most 30 characters"),
  percentage: z.coerce.number().min(0, "Percentage must be between 0 and 100").max(100, "Percentage must be between 0 and 100"),
  depAccountId: z.coerce.number().int("Depreciation account must be a whole number").positive("Depreciation account is required"),
  creditAccountId: z.coerce.number().int("Credit account must be a whole number").positive("Credit account is required"),
  description: z.string().trim().min(1, "Description is required").max(200, "Description must be at most 200 characters")
});

type FormValues = z.infer<typeof schema>;

interface AssetCategoryEditDialogProps {
  open: boolean;
  mode: "create" | "edit";
  category: AssetCategory | null;
  onClose: () => void;
  onSaved: () => void;
}

const emptyValues: FormValues = {
  categoryName: "",
  percentage: 0,
  depAccountId: 0,
  creditAccountId: 0,
  description: ""
};

const responseError = (result: { message?: string; errors?: string[] }, fallback: string) =>
  result.errors?.join(", ") || result.message || fallback;

export const AssetCategoryEditDialog = ({ open, mode, category, onClose, onSaved }: AssetCategoryEditDialogProps) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyValues });

  useEffect(() => {
    if (!open) return;
    reset(mode === "edit" && category ? {
      categoryName: category.CategoryName,
      percentage: Number(category.Percentage),
      depAccountId: category.DepAccountID,
      creditAccountId: category.CreditAccountID,
      description: category.Description
    } : emptyValues);
    setSubmitError(null);
    setConfirmDeleteOpen(false);
  }, [category, mode, open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    setSubmitError(null);
    const payload: AssetCategoryPayload = {
      CategoryName: values.categoryName.trim(),
      Percentage: values.percentage,
      DepAccountID: values.depAccountId,
      CreditAccountID: values.creditAccountId,
      Description: values.description.trim()
    };
    try {
      const response = mode === "create"
        ? await assetCategoriesApi.create(payload)
        : await assetCategoriesApi.update(String(category?.CategoryID), payload);
      const result = response.data;
      if (!result.success) {
        setSubmitError(responseError(result, `Failed to ${mode === "create" ? "create" : "update"} asset category`));
        return;
      }
      onSaved();
      onClose();
    } catch {
      setSubmitError(`Failed to ${mode === "create" ? "create" : "update"} asset category`);
    } finally {
      setSaving(false);
    }
  });

  const handleDelete = async () => {
    if (!category) return;
    setDeleting(true);
    setSubmitError(null);
    try {
      const response = await assetCategoriesApi.remove(category.CategoryID);
      const result = response.data;
      if (!result.success) {
        setSubmitError(responseError(result, "Failed to delete asset category"));
        setConfirmDeleteOpen(false);
        return;
      }
      setConfirmDeleteOpen(false);
      onSaved();
      onClose();
    } catch {
      setSubmitError("Failed to delete asset category");
      setConfirmDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const busy = saving || deleting;
  return (
    <>
      <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
        <DialogTitle>{mode === "create" ? "New Asset Category" : "Edit Asset Category"}</DialogTitle>
        <DialogContent>
          <Stack component="form" spacing={2} mt={1} onSubmit={onSubmit}>
            {submitError ? <Alert severity="error">{submitError}</Alert> : null}
            <TextField label="Category Name" size="small" required {...register("categoryName")} error={Boolean(errors.categoryName)} helperText={errors.categoryName?.message} />
            <TextField label="Depreciation Percentage" size="small" required type="number" inputProps={{ min: 0, max: 100, step: "0.01" }} {...register("percentage")} error={Boolean(errors.percentage)} helperText={errors.percentage?.message} />
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <TextField label="Depreciation Account ID" size="small" required type="number" inputProps={{ min: 1, step: 1 }} {...register("depAccountId")} error={Boolean(errors.depAccountId)} helperText={errors.depAccountId?.message} />
              <TextField label="Credit Account ID" size="small" required type="number" inputProps={{ min: 1, step: 1 }} {...register("creditAccountId")} error={Boolean(errors.creditAccountId)} helperText={errors.creditAccountId?.message} />
            </Box>
            <TextField label="Description" size="small" required multiline minRows={3} {...register("description")} error={Boolean(errors.description)} helperText={errors.description?.message} />
          </Stack>
        </DialogContent>
        <DialogActions>
          {mode === "edit" ? <Button color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => setConfirmDeleteOpen(true)} disabled={busy}>Delete</Button> : null}
          <Box sx={{ flex: 1 }} />
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="contained" onClick={onSubmit} disabled={busy} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : mode === "create" ? <AddRoundedIcon /> : <EditRoundedIcon />}>
            {saving ? "Saving..." : mode === "create" ? "Create Category" : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog open={confirmDeleteOpen} title="Delete asset category" description={`Delete ${category?.CategoryName || "this asset category"}? This action cannot be undone.`} onClose={() => setConfirmDeleteOpen(false)} onConfirm={() => void handleDelete()} confirmText={deleting ? "Deleting..." : "Delete"} />
    </>
  );
};
