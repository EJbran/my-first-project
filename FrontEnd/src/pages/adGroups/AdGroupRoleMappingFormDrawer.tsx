import { Alert, Button, Stack, TextField } from "@mui/material";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormDrawer } from "../../components/FormDrawer";

const schema = z.object({
  authDomainId: z.string().min(1, "AuthDomainId is required"),
  entraGroupObjectId: z.string().uuid("EntraGroupObjectId must be UUID").optional().or(z.literal("")),
  adGroupSid: z.string().optional(),
  adGroupName: z.string().optional(),
  roleId: z.string().min(1, "RoleId is required")
});

type MappingFormValues = z.infer<typeof schema>;

interface AdGroupRoleMappingFormDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const AdGroupRoleMappingFormDrawer = ({ open, onClose }: AdGroupRoleMappingFormDrawerProps) => {
  const { register, handleSubmit } = useForm<MappingFormValues>({ resolver: zodResolver(schema) });

  return (
    <FormDrawer open={open} onClose={onClose} title="AD / Entra Group Role Mapping">
      <Stack spacing={2} component="form" onSubmit={handleSubmit(() => onClose())}>
        <Alert severity="info">For Microsoft 365/Entra ID, use Entra Group Object ID.</Alert>
        <TextField label="AuthDomainId" size="small" {...register("authDomainId")} />
        <TextField label="EntraGroupObjectId" size="small" {...register("entraGroupObjectId")} />
        <TextField label="AdGroupSid" size="small" {...register("adGroupSid")} />
        <TextField label="AdGroupName" size="small" {...register("adGroupName")} />
        <TextField label="RoleId" size="small" {...register("roleId")} />
        <Button variant="contained" type="submit">Save mapping</Button>
      </Stack>
    </FormDrawer>
  );
};
