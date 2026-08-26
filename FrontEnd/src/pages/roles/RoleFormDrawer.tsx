import { Button, Stack, TextField } from "@mui/material";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormDrawer } from "../../components/FormDrawer";

const schema = z.object({
  code: z.string().min(2, "Role code is required"),
  name: z.string().min(2, "Role name is required"),
  description: z.string().optional()
});

type RoleFormValues = z.infer<typeof schema>;

interface RoleFormDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const RoleFormDrawer = ({ open, onClose }: RoleFormDrawerProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RoleFormValues>({ resolver: zodResolver(schema) });

  return (
    <FormDrawer open={open} onClose={onClose} title="Role">
      <Stack spacing={2} component="form" onSubmit={handleSubmit(() => onClose())}>
        <TextField label="Code" size="small" {...register("code")} error={Boolean(errors.code)} helperText={errors.code?.message} />
        <TextField label="Name" size="small" {...register("name")} error={Boolean(errors.name)} helperText={errors.name?.message} />
        <TextField label="Description" size="small" multiline minRows={3} {...register("description")} />
        <Button type="submit" variant="contained">Save</Button>
      </Stack>
    </FormDrawer>
  );
};
