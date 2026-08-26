export interface TimeSheetCodePayload {
  Code_Description?: string | null;
  Code?: string | null;
}

export const validateTimeSheetCodePayload = (payload: TimeSheetCodePayload): string[] => {
  const errors: string[] = [];

  if (!payload.Code?.trim()) {
    errors.push("Code is required");
  }

  if (payload.Code && payload.Code.trim().length > 20) {
    errors.push("Code must be at most 20 characters");
  }

  if (payload.Code_Description && payload.Code_Description.trim().length > 50) {
    errors.push("Code_Description must be at most 50 characters");
  }

  return errors;
};

export const normalizeTimeSheetCodePayload = (
  payload: TimeSheetCodePayload
): TimeSheetCodePayload => ({
  Code_Description: payload.Code_Description?.trim() || null,
  Code: payload.Code?.trim() || null
});
