import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { Alert, Box, Button, IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { transactionTypesApi } from "../../api/transactionTypes.api";
import { PageHeader } from "../../components/PageHeader";
import type { TransactionType } from "../../types/transactionType.types";

export default function MahaSassiPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<TransactionType[]>([]);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (term = "") => {
    setLoading(true);
    setError(null);

    try {
      const response = await transactionTypesApi.list({ search: term });
      if ("success" in response && response.success) {
        setRows((response as { data?: TransactionType[] }).data ?? []);
      } else {
        setError("Failed to load transaction types");
        setRows([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transaction types");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    void loadData(debouncedSearch);
  }, [debouncedSearch]);

  const filteredRows = useMemo(() => {
    const term = searchText.trim().toLowerCase();

    if (!term) {
      return rows;
    }

    return rows.filter((row) => row.TypeName.toLowerCase().includes(term));
  }, [rows, searchText]);

  return (
    <Box>
      <PageHeader
        title="Transaction Types"
        subtitle="List of transaction types"
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => navigate("/setup/general/workflow-config/transaction-types/new")}
            >
              Add
            </Button>
          </Stack>
        }
      />

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} mb={3} alignItems={{ xs: "stretch", md: "center" }}>
          <TextField
            label="Search"
            size="small"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            sx={{ minWidth: 260 }}
          />
        </Stack>

        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>TransactionType_ID</TableCell>
                <TableCell>TypeName</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} align="center">Loading...</TableCell>
                </TableRow>
              ) : filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center">No transaction types found.</TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => (
                  <TableRow key={row.TransactionType_ID} hover>
                    <TableCell>{row.TransactionType_ID}</TableCell>
                    <TableCell>{row.TypeName}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        aria-label="Edit transaction type"
                        onClick={() => navigate(`/setup/general/workflow-config/transaction-types/${row.TransactionType_ID}/edit`)}
                      >
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
