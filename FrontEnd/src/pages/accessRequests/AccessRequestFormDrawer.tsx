import { Button, Stack, TextField } from "@mui/material";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormDrawer } from "../../components/FormDrawer";

const schema = z
  .object({
    roleId: z.string().optional(),
    permissionId: z.string().optional(),
    reason: z.string().min(3, "Reason is required")
  })
  .superRefine((value, context) => {
    if (!value.roleId && !value.permissionId) {
      context.addIssue({ code: "custom", path: ["roleId"], message: "RoleId or PermissionId is required" });
    }
    if (value.roleId && value.permissionId) {
      context.addIssue({ code: "custom", path: ["permissionId"], message: "Provide RoleId or PermissionId, not both" });
    }
  });

type AccessRequestFormValues = z.infer<typeof schema>;

interface AccessRequestFormDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const AccessRequestFormDrawer = ({ open, onClose }: AccessRequestFormDrawerProps) => {
  const { register, handleSubmit } = useForm<AccessRequestFormValues>({ resolver: zodResolver(schema) });

  return (
    <FormDrawer open={open} onClose={onClose} title="Create Access Request">
      <Stack spacing={2} component="form" onSubmit={handleSubmit(() => onClose())}>
        <TextField label="RoleId" size="small" {...register("roleId")} />
        <TextField label="PermissionId" size="small" {...register("permissionId")} />
        <TextField label="Reason" size="small" multiline minRows={3} {...register("reason")} />
        <Button variant="contained" type="submit">Submit request</Button>
      </Stack>
    </FormDrawer>
  );
};
