import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { departmentsApi } from "../../api/departments.api";
import type { Department } from "../../types/department.types";

type DepartmentOption = {
  id: number;
  label: string;
};

type InvoiceRow = {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  currency: string;
  amount: string;
  purchaseOrder: string;
  purchaseRequest: string;
  workOrder: string;
  description: string;
  remarks: string;
};

type VendorRow = {
  vendorNumber: string;
  vendorName: string;
};


const currencyOptions = ["USD", "EUR", "SAR", "AED"];

const sampleVendors: VendorRow[] = [
  { vendorNumber: "V-1001", vendorName: "Al Safa Trading Co." },
  { vendorNumber: "V-1002", vendorName: "Blue Nile Supplies" },
  { vendorNumber: "V-1003", vendorName: "Harbor Tech Solutions" },
  { vendorNumber: "V-1004", vendorName: "North Star Materials" }
];

const initialRows: InvoiceRow[] = [
  {
    id: 1,
    invoiceNumber: "INV-1001",
    invoiceDate: "2026-07-10",
    currency: "SAR",
    amount: "12500",
    purchaseOrder: "PO-2201",
    purchaseRequest: "PR-1101",
    workOrder: "WO-4501",
    description: "Material supply",
    remarks: "Urgent approval"
  },
  {
    id: 2,
    invoiceNumber: "INV-1002",
    invoiceDate: "2026-07-12",
    currency: "USD",
    amount: "3400",
    purchaseOrder: "PO-2205",
    purchaseRequest: "PR-1110",
    workOrder: "WO-4510",
    description: "Service invoice",
    remarks: "Pending review"
  }
];

export default function AddInvoicesPage() {
  const navigate = useNavigate();
  const [departmentOptions, setDepartmentOptions] = useState<DepartmentOption[]>([]);
  const [department, setDepartment] = useState<DepartmentOption | null>(null);
  const [year, setYear] = useState("2026");
  const [month, setMonth] = useState("07");
  const [sequence, setSequence] = useState("000123");
  const [receivedDate, setReceivedDate] = useState("2026-07-14");
  const [deliveryDate, setDeliveryDate] = useState("2026-07-15");
  const [vendorQuery, setVendorQuery] = useState("");
  const [vendorRows, setVendorRows] = useState<VendorRow[]>(sampleVendors);
  const [selectedVendor, setSelectedVendor] = useState<VendorRow | null>(sampleVendors[0]);
  const [rows, setRows] = useState<InvoiceRow[]>(initialRows);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const response = await departmentsApi.list();
        const departments = response?.success === true && Array.isArray(response.data) ? response.data : [];

        const mapped = departments
          .filter((item: Department) => item.DepartmentType === "Manager")
          .map((item: Department) => ({
            id: item.Id,
            label: item.DepartmentName_Arabic || item.DepartmentName_English || "Unnamed Department"
          }))
          .sort((a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" }));

        setDepartmentOptions(mapped);
        setDepartment(null);
      } catch {
        setDepartmentOptions([]);
      }
    };

    void loadDepartments();
  }, []);

  const totalAmount = useMemo(() => {
    return rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  }, [rows]);

  const filteredVendors = useMemo(() => {
    const term = vendorQuery.trim().toLowerCase();

    if (!term) {
      return vendorRows;
    }

    return vendorRows.filter((vendor) => {
      const haystack = `${vendor.vendorNumber} ${vendor.vendorName}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [vendorQuery, vendorRows]);

  const updateRow = (index: number, field: keyof InvoiceRow, value: string) => {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
  };

  const addRow = () => {
    setRows((current) => [
      ...current,
      {
        id: Date.now(),
        invoiceNumber: "",
        invoiceDate: "",
        currency: "SAR",
        amount: "",
        purchaseOrder: "",
        purchaseRequest: "",
        workOrder: "",
        description: "",
        remarks: ""
      }
    ]);
  };

  const removeSelectedRow = () => {
    if (selectedRowIndex === null) {
      return;
    }

    setRows((current) => current.filter((_, index) => index !== selectedRowIndex));
    setSelectedRowIndex(null);
  };

  const handleAddVendor = () => {
    const nextVendorNumber = `V-${1005 + vendorRows.length}`;
    const nextVendorName = vendorQuery.trim() || "New Sample Vendor";

    setVendorRows((current) => [...current, { vendorNumber: nextVendorNumber, vendorName: nextVendorName }]);
    setSelectedVendor({ vendorNumber: nextVendorNumber, vendorName: nextVendorName });
    setVendorQuery("");
  };

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, backgroundColor: "#f5f9ff", minHeight: "100%" }}>
      <PageHeader
        title="Add Invoices"
        subtitle="Register supplier invoices with a polished AP workflow experience"
        action={
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="outlined" onClick={() => navigate("/setup/general/workflow-config/transaction-types")}>Back</Button>
            <Button variant="contained" startIcon={<ReceiptLongRoundedIcon />}>Save</Button>
          </Stack>
        }
      />

      <Paper elevation={0} sx={{ border: "1px solid", borderColor: "#dbe8ff", borderRadius: 4, p: { xs: 2, md: 3 }, background: "linear-gradient(135deg, #f8fbff 0%, #ffffff 100%)", boxShadow: "0 12px 40px rgba(13, 71, 161, 0.08)" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} mb={3}>
          <Box>
            <Typography variant="h6" fontWeight={800} color="primary.main">Accounts Payable Invoice Registration</Typography>
            <Typography variant="body2" color="text.secondary">Modern ERP-style entry form for supplier invoice capture.</Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip label="Draft" color="default" sx={{ borderRadius: 2, fontWeight: 600 }} />
            <Chip label="Workflow Ready" color="primary" sx={{ borderRadius: 2, fontWeight: 600 }} />
          </Stack>
        </Stack>

        <Stack spacing={3}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <ReceiptLongRoundedIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={700} color="primary.dark">Header Information</Typography>
              </Stack>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Autocomplete
                    options={departmentOptions}
                    value={department}
                    onChange={(_, value) => setDepartment(value)}
                    getOptionLabel={(option) => option.label}
                    renderInput={(params) => <TextField {...params} label="Department" placeholder="Select department" />} 
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>Reference Number</Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "nowrap" }}>
                    <TextField
                      value={year}
                      onChange={(event) => setYear(event.target.value.replace(/\D/g, "").slice(0, 4))}
                      size="small"
                      inputProps={{ maxLength: 4, inputMode: "numeric" }}
                      sx={{ width: 70 }}
                      placeholder="YYYY"
                    />
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>/</Typography>
                    <TextField
                      value={month}
                      onChange={(event) => setMonth(event.target.value.replace(/\D/g, "").slice(0, 2))}
                      size="small"
                      inputProps={{ maxLength: 2, inputMode: "numeric" }}
                      sx={{ width: 45 }}
                      placeholder="MM"
                    />
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>/</Typography>
                    <TextField
                      value={sequence}
                      onChange={(event) => setSequence(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      size="small"
                      inputProps={{ maxLength: 6, inputMode: "numeric" }}
                      sx={{ width: 90 }}
                      placeholder="Number"
                    />
                  </Stack>

                  <TextField
                    fullWidth
                    label="Full Reference Number"
                    value={`${year}/${month}/${sequence}`}
                    size="small"
                    disabled
                    sx={{ mt: 1.25, backgroundColor: "#f7fbff" }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Received Date" type="date" value={receivedDate} onChange={(event) => setReceivedDate(event.target.value)} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Delivery Date" type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} InputLabelProps={{ shrink: true }} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2} mb={2}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <SearchRoundedIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight={700} color="primary.dark">Vendor Information</Typography>
                </Stack>
                <Button variant="contained" size="small" onClick={handleAddVendor}>Add Vendor</Button>
              </Stack>
              <TextField fullWidth label="Search Vendor" value={vendorQuery} onChange={(event) => setVendorQuery(event.target.value)} placeholder="Type vendor number or name" sx={{ mb: 2 }} />

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Vendor Number</TableCell>
                      <TableCell>Vendor Name</TableCell>
                      <TableCell align="right">Select</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredVendors.map((vendor) => (
                      <TableRow key={vendor.vendorNumber} hover>
                        <TableCell>{vendor.vendorNumber}</TableCell>
                        <TableCell>{vendor.vendorName}</TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant={selectedVendor?.vendorNumber === vendor.vendorNumber ? "contained" : "outlined"}
                            onClick={() => setSelectedVendor(vendor)}
                          >
                            Select
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider sx={{ my: 2 }} />
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, backgroundColor: "#f7fbff", borderColor: "#dbe8ff" }}>
                <Typography variant="body2" color="text.secondary" mb={0.5}>Selected Vendor</Typography>
                <Typography variant="subtitle2" fontWeight={700}>{selectedVendor?.vendorNumber ?? "—"}</Typography>
                <Typography variant="body2" color="text.secondary">{selectedVendor?.vendorName ?? "No vendor selected"}</Typography>
              </Paper>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2} mb={2}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} color="primary.dark">Invoice Details</Typography>
                  <Typography variant="body2" color="text.secondary">Multiple invoices can be captured under one transaction.</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={addRow}>Add Invoice</Button>
                  <Button variant="outlined" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={removeSelectedRow}>Delete Selected</Button>
                </Stack>
              </Stack>

              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", borderColor: "#dbe8ff" }}>
                <TableContainer sx={{ maxHeight: 420 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ minWidth: 140 }}>Invoice Number</TableCell>
                        <TableCell sx={{ minWidth: 140 }}>Invoice Date</TableCell>
                        <TableCell sx={{ minWidth: 110 }}>Currency</TableCell>
                        <TableCell sx={{ minWidth: 120 }}>Amount</TableCell>
                        <TableCell sx={{ minWidth: 140 }}>Purchase Order</TableCell>
                        <TableCell sx={{ minWidth: 140 }}>Purchase Request</TableCell>
                        <TableCell sx={{ minWidth: 120 }}>Work Order</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row, index) => (
                        <TableRow key={row.id} hover selected={selectedRowIndex === index} onClick={() => setSelectedRowIndex(index)} sx={{ cursor: "pointer" }}>
                          <TableCell>
                            <TextField value={row.invoiceNumber} onChange={(event) => updateRow(index, "invoiceNumber", event.target.value)} size="small" fullWidth />
                          </TableCell>
                          <TableCell>
                            <TextField value={row.invoiceDate} onChange={(event) => updateRow(index, "invoiceDate", event.target.value)} size="small" type="date" InputLabelProps={{ shrink: true }} fullWidth />
                          </TableCell>
                          <TableCell>
                            <TextField select value={row.currency} onChange={(event) => updateRow(index, "currency", event.target.value)} size="small" fullWidth>
                              {currencyOptions.map((currency) => (
                                <MenuItem key={currency} value={currency}>
                                  {currency}
                                </MenuItem>
                              ))}
                            </TextField>
                          </TableCell>
                          <TableCell>
                            <TextField value={row.amount} onChange={(event) => updateRow(index, "amount", event.target.value)} size="small" fullWidth />
                          </TableCell>
                          <TableCell>
                            <TextField value={row.purchaseOrder} onChange={(event) => updateRow(index, "purchaseOrder", event.target.value)} size="small" fullWidth />
                          </TableCell>
                          <TableCell>
                            <TextField value={row.purchaseRequest} onChange={(event) => updateRow(index, "purchaseRequest", event.target.value)} size="small" fullWidth />
                          </TableCell>
                          <TableCell>
                            <TextField value={row.workOrder} onChange={(event) => updateRow(index, "workOrder", event.target.value)} size="small" fullWidth />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" mt={2}>
                <Typography variant="body2" color="text.secondary">Reference Number: {year}/{month}/{sequence}</Typography>
                <Typography variant="subtitle2" fontWeight={700}>Total Amount: {totalAmount.toLocaleString()} SAR</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} mt={3} justifyContent="flex-end">
          <Button variant="outlined">Add</Button>
          <Button variant="contained">Save</Button>
          <Button variant="outlined">Update</Button>
          <Button variant="outlined">Edit</Button>
          <Button variant="outlined">Print</Button>
          <Button variant="contained" color="secondary">Send To Department</Button>
          <Button variant="outlined" onClick={() => navigate("/setup/general/workflow-config/transaction-types")}>Back</Button>
        </Stack>
      </Paper>
    </Box>
  );
}
