export interface SubLocationPayload {
  Name?: string;
  Type?: string | null;
  LocationId?: number;
}

const toOptionalInt = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

export const validateSubLocationPayload = (payload: SubLocationPayload): string[] => {
  const errors: string[] = [];

  if (!payload.Name?.trim()) {
    errors.push("Name is required");
  }

  if (!payload.LocationId || !Number.isInteger(payload.LocationId) || payload.LocationId <= 0) {
    errors.push("LocationId must be a positive integer");
  }

  return errors;
};

export const normalizeSubLocationPayload = (payload: SubLocationPayload): SubLocationPayload => ({
  Name: payload.Name?.trim(),
  Type: payload.Type?.trim() || null,
  LocationId: toOptionalInt(payload.LocationId) ?? undefined
});
