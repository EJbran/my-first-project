import { Box, Button, IconButton, Stack } from "@mui/material";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { StatusChip } from "../../components/StatusChip";
import { UserFormDrawer } from "./UserFormDrawer";
import { DataGridToolbar } from "../../components/DataGridToolbar";

export default function UsersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const columns = useMemo<GridColDef[]>(
    () => [
      { field: "id", headerName: "Id", width: 90 },
      { field: "displayName", headerName: "DisplayName", minWidth: 180, flex: 1 },
      { field: "username", headerName: "Username", minWidth: 150, flex: 1 },
      { field: "email", headerName: "Email", minWidth: 220, flex: 1 },
      { field: "authProvider", headerName: "AuthProvider", minWidth: 140 },
      { field: "userPrincipalName", headerName: "UserPrincipalName", minWidth: 220, flex: 1 },
      {
        field: "isActive",
        headerName: "IsActive",
        minWidth: 110,
        renderCell: (params) => <StatusChip active={Boolean(params.value)} />
      },
      {
        field: "isLocked",
        headerName: "IsLocked",
        minWidth: 110,
        renderCell: (params) => <StatusChip label={params.value ? "Locked" : "Unlocked"} />
      },
      { field: "lastLoginAt", headerName: "LastLoginAt", minWidth: 170 },
      {
        field: "actions",
        headerName: "Actions",
        minWidth: 210,
        sortable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.5}>
            <IconButton size="small" onClick={() => navigate(`/users/${params.row.id}`)}>
              <VisibilityRoundedIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => setDrawerOpen(true)}>
              <EditRoundedIcon fontSize="small" />
            </IconButton>
            <IconButton size="small">
              <LockRoundedIcon fontSize="small" />
            </IconButton>
            <IconButton size="small">
              <LockOpenRoundedIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error">
              <BlockRoundedIcon fontSize="small" />
            </IconButton>
          </Stack>
        )
      }
    ],
    [navigate]
  );

  const rows = [
    {
      id: 1,
      displayName: "John Doe",
      username: "john.doe",
      email: "john.doe@company.com",
      authProvider: "MICROSOFT",
      userPrincipalName: "john.doe@company.com",
      isActive: true,
      isLocked: false,
      lastLoginAt: "2026-07-07 08:30"
    }
  ].filter((row) => {
    const text = search.toLowerCase();
    return (
      row.displayName.toLowerCase().includes(text) ||
      row.username.toLowerCase().includes(text) ||
      row.email.toLowerCase().includes(text)
    );
  });

  return (
    <Box>
      <PageHeader
        title="Users"
        subtitle="Manage identity lifecycle, lock status, and account access"
        action={
          <Button variant="contained" onClick={() => setDrawerOpen(true)}>
            Create user
          </Button>
        }
      />
      <DataGridToolbar search={search} onSearchChange={setSearch} />
      <DataGrid autoHeight rows={rows} columns={columns} pageSizeOptions={[10, 20, 50]} disableRowSelectionOnClick />
      <UserFormDrawer open={drawerOpen} mode="create" onClose={() => setDrawerOpen(false)} />
    </Box>
  );
}
