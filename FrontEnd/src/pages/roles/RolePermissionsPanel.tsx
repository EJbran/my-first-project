import { Card, CardContent, Chip, Stack, Typography } from "@mui/material";

interface RolePermissionsPanelProps {
  permissions: string[];
}

export const RolePermissionsPanel = ({ permissions }: RolePermissionsPanelProps) => (
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        Role permissions
      </Typography>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        {permissions.length > 0 ? permissions.map((permission) => <Chip key={permission} label={permission} />) : <Typography color="text.secondary">No permissions assigned</Typography>}
      </Stack>
    </CardContent>
  </Card>
);
