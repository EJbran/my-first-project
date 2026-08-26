import { Button, MenuItem, Stack, TextField } from "@mui/material";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormDrawer } from "../../components/FormDrawer";

const schema = z.object({
  code: z.string().min(3),
  module: z.string().min(2),
  actionName: z.string().min(2),
  description: z.string().optional(),
  isActive: z.enum(["true", "false"])
});

type PermissionFormValues = z.infer<typeof schema>;

interface PermissionFormDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const PermissionFormDrawer = ({ open, onClose }: PermissionFormDrawerProps) => {
  const { register, handleSubmit } = useForm<PermissionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { isActive: "true" }
  });

  return (
    <FormDrawer open={open} onClose={onClose} title="Permission">
      <Stack spacing={2} component="form" onSubmit={handleSubmit(() => onClose())}>
        <TextField label="Code" size="small" {...register("code")} />
        <TextField label="Module" size="small" {...register("module")} />
        <TextField label="Action Name" size="small" {...register("actionName")} />
        <TextField label="Description" size="small" multiline minRows={2} {...register("description")} />
        <TextField label="Status" size="small" select {...register("isActive")}>
          <MenuItem value="true">Active</MenuItem>
          <MenuItem value="false">Inactive</MenuItem>
        </TextField>
        <Button variant="contained" type="submit">Save</Button>
      </Stack>
    </FormDrawer>
  );
};
