import { Button, MenuItem, Stack, TextField } from "@mui/material";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormDrawer } from "../../components/FormDrawer";

const schema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
  isActive: z.enum(["true", "false"])
});

type SecurityPolicyFormValues = z.infer<typeof schema>;

interface SecurityPolicyFormDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const SecurityPolicyFormDrawer = ({ open, onClose }: SecurityPolicyFormDrawerProps) => {
  const { register, handleSubmit } = useForm<SecurityPolicyFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { isActive: "true" }
  });

  return (
    <FormDrawer open={open} onClose={onClose} title="Security Policy">
      <Stack spacing={2} component="form" onSubmit={handleSubmit(() => onClose())}>
        <TextField label="Policy Key" size="small" {...register("key")} />
        <TextField label="Policy Value" size="small" {...register("value")} />
        <TextField label="Status" size="small" select {...register("isActive")}>
          <MenuItem value="true">Active</MenuItem>
          <MenuItem value="false">Inactive</MenuItem>
        </TextField>
        <Button variant="contained" type="submit">Save policy</Button>
      </Stack>
    </FormDrawer>
  );
};
