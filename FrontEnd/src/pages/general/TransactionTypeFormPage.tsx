import { Alert, Box, Button, CircularProgress, Paper, Stack, TextField } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { transactionTypesApi } from "../../api/transactionTypes.api";
import { PageHeader } from "../../components/PageHeader";
import type { TransactionType } from "../../types/transactionType.types";

export default function TransactionTypeFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [typeName, setTypeName] = useState("");
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    let cancelled = false;

    const loadRecord = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = (await transactionTypesApi.getById(id!)) as { success?: boolean; data?: TransactionType };
        if (!cancelled && response?.success) {
          setTypeName(response.data?.TypeName ?? "");
        } else if (!cancelled) {
          setError("Failed to load transaction type");
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load transaction type");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadRecord();

    return () => {
      cancelled = true;
    };
  }, [id, isEditMode]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (isEditMode && id) {
        await transactionTypesApi.update(id, { TypeName: typeName.trim() });
      } else {
        await transactionTypesApi.create({ TypeName: typeName.trim() });
      }

      navigate("/setup/general/workflow-config/transaction-types", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save transaction type");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title={isEditMode ? "Edit Transaction Type" : "Create Transaction Type"}
        subtitle={isEditMode ? "Update the selected transaction type" : "Create a new transaction type entry"}
      />

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2} maxWidth={480}>
              <TextField
                label="Type Name"
                value={typeName}
                onChange={(event) => setTypeName(event.target.value)}
                required
                fullWidth
              />

              <Stack direction="row" spacing={1.5}>
                <Button type="submit" variant="contained" disabled={submitting || !typeName.trim()}>
                  {submitting ? "Saving..." : isEditMode ? "Save Changes" : "Create"}
                </Button>
                <Button variant="outlined" onClick={() => navigate("/setup/general/workflow-config/transaction-types", { replace: true })}>
                  Cancel
                </Button>
              </Stack>
            </Stack>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
