import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
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
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import { getHrThemeVars } from "../jobs/Theme";

export interface EmployeeDeleteTarget {
  id: number;
  employeeNumber: string;
  name: string;
}

interface EmployeeDeleteDialogProps {
  open: boolean;
  employee: EmployeeDeleteTarget | null;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (employeeId: number) => void;
}

const DELETE_DIALOG_TITLE_ID = "employee-delete-dialog-title";
const DELETE_DIALOG_DESCRIPTION_ID = "employee-delete-dialog-description";
const DELETE_DIALOG_CONFIRMATION_ID = "employee-delete-dialog-confirmation-instruction";

export const EmployeeDeleteDialog = ({
  open,
  employee,
  pending,
  error,
  onClose,
  onConfirm
}: EmployeeDeleteDialogProps) => {
  const [confirmationValue, setConfirmationValue] = useState("");

  useEffect(() => {
    if (open) setConfirmationValue("");
  }, [employee?.id, open]);

  const expectedEmployeeNumber = employee?.employeeNumber ?? "";
  const canDelete = Boolean(employee)
    && confirmationValue.trim() === expectedEmployeeNumber
    && !pending;

  const closeDialog = () => {
    if (!pending) onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={closeDialog}
      disableEscapeKeyDown={pending}
      fullWidth
      maxWidth="sm"
      aria-labelledby={DELETE_DIALOG_TITLE_ID}
      aria-describedby={DELETE_DIALOG_DESCRIPTION_ID}
      sx={(theme) => ({
        ...getHrThemeVars(theme),
        "& .MuiDialog-paper": {
          border: "1px solid var(--hr-border)",
          borderRadius: "14px",
          bgcolor: "var(--hr-surface)",
          boxShadow: "0 24px 70px rgba(7, 28, 89, 0.24)"
        }
      })}
    >
      <Box
        component="form"
        aria-busy={pending}
        onSubmit={(event) => {
          event.preventDefault();
          if (employee && canDelete) onConfirm(employee.id);
        }}
      >
        <DialogTitle component="div" sx={{ px: 3, pt: 3, pb: 1.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              aria-hidden="true"
              sx={{
                width: 46,
                height: 46,
                flex: "0 0 auto",
                display: "grid",
                placeItems: "center",
                borderRadius: "12px",
                color: "#b42318",
                bgcolor: "#fef3f2",
                border: "1px solid #fecdca"
              }}
            >
              <WarningAmberRoundedIcon />
            </Box>
            <Box>
              <Typography id={DELETE_DIALOG_TITLE_ID} component="h2" sx={{ color: "var(--hr-text)", fontSize: 21, fontWeight: 850 }}>
                Archive employee?
              </Typography>
              <Typography sx={{ mt: 0.25, color: "var(--hr-muted)", fontSize: 12.5 }}>
                The employee record and HR history will be preserved.
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ px: 3, pt: "8px !important", pb: 2 }}>
          <Typography id={DELETE_DIALOG_DESCRIPTION_ID} sx={{ color: "var(--hr-row-text)", fontSize: 14, lineHeight: 1.65 }}>
            You are about to archive <strong>{employee?.name ?? "this employee"}</strong> and release their current position.
          </Typography>

          <Box
            sx={{
              mt: 2,
              p: 1.75,
              border: "1px solid var(--hr-border)",
              borderRadius: "10px",
              bgcolor: "var(--hr-surface-soft)"
            }}
          >
            <Typography sx={{ color: "var(--hr-muted)", fontSize: 12 }}>Employee number</Typography>
            <Typography sx={{ mt: 0.25, color: "var(--hr-text)", fontSize: 16, fontWeight: 800 }}>
              {expectedEmployeeNumber || "Not recorded"}
            </Typography>
          </Box>

          <Typography
            id={DELETE_DIALOG_CONFIRMATION_ID}
            sx={{ mt: 2, mb: 0.75, color: "var(--hr-row-text)", fontSize: 13 }}
          >
            Type <strong>{expectedEmployeeNumber}</strong> to confirm archival.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Confirm employee number"
            value={confirmationValue}
            disabled={pending}
            autoComplete="off"
            onChange={(event) => setConfirmationValue(event.target.value)}
            inputProps={{ "aria-describedby": DELETE_DIALOG_CONFIRMATION_ID }}
          />

          <Typography sx={{ mt: 1.25, color: "var(--hr-muted)", fontSize: 12, lineHeight: 1.5 }}>
            Attendance and reporting data will not be deleted. The employee's Position row will become vacant.
          </Typography>

          {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1, borderTop: "1px solid var(--hr-border)" }}>
          <Button onClick={closeDialog} disabled={pending} sx={{ textTransform: "none", fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="error"
            startIcon={pending ? <CircularProgress size={16} color="inherit" /> : <DeleteOutlineRoundedIcon />}
            disabled={!canDelete}
            sx={{ minWidth: 160, textTransform: "none", fontWeight: 800 }}
          >
            {pending ? "Archiving..." : "Archive employee"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};
