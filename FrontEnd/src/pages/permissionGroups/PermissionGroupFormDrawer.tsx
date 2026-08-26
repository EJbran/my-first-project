import { Button, Stack, TextField } from "@mui/material";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormDrawer } from "../../components/FormDrawer";

const schema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional()
});

type PermissionGroupValues = z.infer<typeof schema>;

interface PermissionGroupFormDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const PermissionGroupFormDrawer = ({ open, onClose }: PermissionGroupFormDrawerProps) => {
  const { register, handleSubmit } = useForm<PermissionGroupValues>({ resolver: zodResolver(schema) });

  return (
    <FormDrawer open={open} onClose={onClose} title="Permission Group">
      <Stack spacing={2} component="form" onSubmit={handleSubmit(() => onClose())}>
        <TextField label="Code" size="small" {...register("code")} />
        <TextField label="Name" size="small" {...register("name")} />
        <TextField label="Description" size="small" multiline minRows={3} {...register("description")} />
        <Button variant="contained" type="submit">Save group</Button>
      </Stack>
    </FormDrawer>
  );
};
