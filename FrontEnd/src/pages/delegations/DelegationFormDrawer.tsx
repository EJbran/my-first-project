import { Button, Stack, TextField } from "@mui/material";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormDrawer } from "../../components/FormDrawer";

const schema = z
  .object({
    fromUserId: z.string().min(1),
    toUserId: z.string().min(1),
    startAt: z.string().min(1),
    endAt: z.string().min(1)
  })
  .refine((value) => new Date(value.endAt).getTime() > new Date(value.startAt).getTime(), {
    message: "EndAt must be greater than StartAt",
    path: ["endAt"]
  });

type DelegationFormValues = z.infer<typeof schema>;

interface DelegationFormDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const DelegationFormDrawer = ({ open, onClose }: DelegationFormDrawerProps) => {
  const { register, handleSubmit } = useForm<DelegationFormValues>({ resolver: zodResolver(schema) });

  return (
    <FormDrawer open={open} onClose={onClose} title="Delegation">
      <Stack spacing={2} component="form" onSubmit={handleSubmit(() => onClose())}>
        <TextField label="FromUserId" size="small" {...register("fromUserId")} />
        <TextField label="ToUserId" size="small" {...register("toUserId")} />
        <TextField label="StartAt" size="small" type="datetime-local" InputLabelProps={{ shrink: true }} {...register("startAt")} />
        <TextField label="EndAt" size="small" type="datetime-local" InputLabelProps={{ shrink: true }} {...register("endAt")} />
        <Button variant="contained" type="submit">Save delegation</Button>
      </Stack>
    </FormDrawer>
  );
};
