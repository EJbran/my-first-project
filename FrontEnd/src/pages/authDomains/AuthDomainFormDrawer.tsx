import { Alert, Button, MenuItem, Stack, TextField } from "@mui/material";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormDrawer } from "../../components/FormDrawer";

const schema = z
  .object({
    name: z.string().min(2),
    type: z.enum(["OIDC", "ADFS", "LDAP", "LDAPS", "KERBEROS"]),
    tenantId: z.string().optional(),
    clientId: z.string().optional(),
    authorityUrl: z.string().url("Authority URL must be valid").optional().or(z.literal("")),
    ldapServer: z.string().optional(),
    ldapPort: z.string().optional(),
    baseDn: z.string().optional()
  })
  .superRefine((value, context) => {
    if (value.type === "OIDC") {
      if (!value.tenantId) {
        context.addIssue({ code: "custom", path: ["tenantId"], message: "TenantId is required for OIDC" });
      }
      if (!value.clientId) {
        context.addIssue({ code: "custom", path: ["clientId"], message: "ClientId is required for OIDC" });
      }
      if (!value.authorityUrl) {
        context.addIssue({ code: "custom", path: ["authorityUrl"], message: "AuthorityUrl is required for OIDC" });
      }
    }
    if (value.type === "LDAPS") {
      if (!value.ldapServer) {
        context.addIssue({ code: "custom", path: ["ldapServer"], message: "LdapServer is required for LDAPS" });
      }
      if (!value.ldapPort) {
        context.addIssue({ code: "custom", path: ["ldapPort"], message: "LdapPort is required for LDAPS" });
      } else if (!Number.isFinite(Number(value.ldapPort))) {
        context.addIssue({ code: "custom", path: ["ldapPort"], message: "LdapPort must be numeric" });
      }
      if (!value.baseDn) {
        context.addIssue({ code: "custom", path: ["baseDn"], message: "BaseDn is required for LDAPS" });
      }
    }
  });

type AuthDomainFormValues = z.infer<typeof schema>;

interface AuthDomainFormDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const AuthDomainFormDrawer = ({ open, onClose }: AuthDomainFormDrawerProps) => {
  const { register, handleSubmit, watch } = useForm<AuthDomainFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "OIDC" }
  });

  const type = watch("type");

  return (
    <FormDrawer open={open} onClose={onClose} title="Authentication Domain">
      <Stack spacing={2} component="form" onSubmit={handleSubmit(() => onClose())}>
        <TextField label="Name" size="small" {...register("name")} />
        <TextField label="Domain Type" size="small" select {...register("type")}>
          {(["OIDC", "ADFS", "LDAP", "LDAPS", "KERBEROS"] as const).map((option) => (
            <MenuItem key={option} value={option}>{option}</MenuItem>
          ))}
        </TextField>
        {type === "OIDC" ? (
          <>
            <Alert severity="info">OIDC requires TenantId, ClientId, and AuthorityUrl.</Alert>
            <TextField label="TenantId" size="small" {...register("tenantId")} />
            <TextField label="ClientId" size="small" {...register("clientId")} />
            <TextField label="AuthorityUrl" size="small" {...register("authorityUrl")} />
          </>
        ) : null}
        {type === "LDAPS" ? (
          <>
            <TextField label="LdapServer" size="small" {...register("ldapServer")} />
            <TextField label="LdapPort" size="small" type="number" {...register("ldapPort")} />
            <TextField label="BaseDn" size="small" {...register("baseDn")} />
          </>
        ) : null}
        <Button type="submit" variant="contained">Save</Button>
      </Stack>
    </FormDrawer>
  );
};
