import AddRoundedIcon from "@mui/icons-material/AddRounded";
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
  IconButton,
  Stack,
  Typography
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useCallback, useEffect, useMemo, useState } from "react";
import { bankSerialChecksApi } from "../../../api/bankSerialChecks.api";
import type { BankSerialCheck } from "../../../types/bankSerialCheck.types";
import {
  BankSerialCheckEditDialog,
  type BankSerialCheckEditTarget
} from "./BankSerialCheckEditDialog";

export interface BankSerialChecksBankTarget {
  id: number;
  bankName: string;
  branch: string;
}

interface BankSerialChecksDialogProps {
  open: boolean;
  bank: BankSerialChecksBankTarget | null;
  onClose: () => void;
}

type SerialRow = BankSerialCheckEditTarget;

const formatDate = (value: string | null) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const toRow = (item: BankSerialCheck): SerialRow => ({
  id: item.ID_BANK_SERIAL_CHECKS,
  fromCheck: item.From_Check ?? "",
  toCheck: item.To_Check ?? "",
  creationDate: item.Creation_date ?? "",
  bankId: item.BANKID
});

export const BankSerialChecksDialog = ({ open, bank, onClose }: BankSerialChecksDialogProps) => {
  const [rows, setRows] = useState<SerialRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editMode, setEditMode] = useState<"create" | "edit">("create");
  const [editTarget, setEditTarget] = useState<SerialRow | null>(null);

  const loadRows = useCallback(async () => {
    if (!bank) {
      setRows([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await bankSerialChecksApi.list({ bankId: bank.id });
      if (!response.success) {
        setError(response.message || "Failed to load serial checks");
        setRows([]);
        return;
      }

      setRows(response.data.map(toRow));
    } catch {
      setError("Failed to load serial checks");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [bank]);

  useEffect(() => {
    if (!open || !bank) {
      return;
    }

    void loadRows();
  }, [bank, loadRows, open]);

  const openCreate = () => {
    setEditMode("create");
    setEditTarget(null);
    setEditOpen(true);
  };

  const openEdit = (row: SerialRow) => {
    setEditMode("edit");
    setEditTarget(row);
    setEditOpen(true);
  };

  const columns = useMemo<GridColDef<SerialRow>[]>(
    () => [
      { field: "id", headerName: "ID", width: 90 },
      { field: "fromCheck", headerName: "From Check", minWidth: 140, flex: 1 },
      { field: "toCheck", headerName: "To Check", minWidth: 140, flex: 1 },
      {
        field: "creationDate",
        headerName: "Creation Date",
        minWidth: 180,
        flex: 1,
        valueFormatter: (value: string) => formatDate(value)
      },
      {
        field: "actions",
        headerName: "Actions",
        width: 90,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <IconButton size="small" aria-label="Edit serial check" onClick={() => openEdit(params.row)}>
            <EditRoundedIcon fontSize="small" />
          </IconButton>
        )
      }
    ],
    []
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>
          Serial Checks
          {bank ? (
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              {bank.bankName}
              {bank.branch ? ` · ${bank.branch}` : ""}
            </Typography>
          ) : null}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Box display="flex" justifyContent="flex-end">
              <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate} disabled={!bank}>
                New Serial Check
              </Button>
            </Box>

            {error ? <Alert severity="error">{error}</Alert> : null}

            {loading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <DataGrid
                autoHeight
                rows={rows}
                columns={columns}
                pageSizeOptions={[10, 50, 100]}
                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                disableRowSelectionOnClick
                sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      <BankSerialCheckEditDialog
        open={editOpen}
        mode={editMode}
        serialCheck={editTarget}
        fixedBankId={bank?.id ?? null}
        onClose={() => {
          setEditOpen(false);
          setEditTarget(null);
        }}
        onSaved={() => void loadRows()}
      />
    </>
  );
};
