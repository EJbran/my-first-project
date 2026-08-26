import { Button, MenuItem, Stack, TextField } from "@mui/material";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormDrawer } from "../../components/FormDrawer";

const schema = z.object({
  displayName: z.string().min(2, "Display name is required"),
  username: z.string().min(2, "Username is required"),
  email: z.string().email("Email must be valid"),
  authProvider: z.enum(["MICROSOFT", "LOCAL"]),
  password: z.string().optional()
});

type UserFormValues = z.infer<typeof schema>;

interface UserFormDrawerProps {
  open: boolean;
  mode: "create" | "edit";
  onClose: () => void;
}

export const UserFormDrawer = ({ open, mode, onClose }: UserFormDrawerProps) => {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors }
  } = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      authProvider: "MICROSOFT"
    }
  });

  const authProvider = watch("authProvider");

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  return (
    <FormDrawer open={open} onClose={onClose} title={mode === "create" ? "Create User" : "Edit User"}>
      <Stack component="form" spacing={2} onSubmit={handleSubmit(() => onClose())}>
        <TextField label="Display Name" size="small" {...register("displayName")} error={Boolean(errors.displayName)} helperText={errors.displayName?.message} />
        <TextField label="Username" size="small" {...register("username")} error={Boolean(errors.username)} helperText={errors.username?.message} />
        <TextField label="Email" size="small" {...register("email")} error={Boolean(errors.email)} helperText={errors.email?.message} />
        <TextField label="Auth Provider" size="small" select {...register("authProvider")}>
          <MenuItem value="MICROSOFT">Microsoft / Entra ID</MenuItem>
          <MenuItem value="LOCAL">Local</MenuItem>
        </TextField>
        {mode === "create" && authProvider === "LOCAL" ? (
          <TextField label="Password" size="small" type="password" {...register("password")} />
        ) : null}
        <Button type="submit" variant="contained">
          Save
        </Button>
      </Stack>
    </FormDrawer>
  );
};
