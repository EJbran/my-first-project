export interface LocationPayload {
  LocationName_ar?: string | null;
  LocationName_en?: string;
  LocationCode?: string;
  LocationInMap?: Buffer | null;
}

export const validateLocationPayload = (payload: LocationPayload): string[] => {
  const errors: string[] = [];

  if (!payload.LocationName_en?.trim()) {
    errors.push("LocationName_en is required");
  }

  if (!payload.LocationCode?.trim()) {
    errors.push("LocationCode is required");
  }

  return errors;
};

export const normalizeLocationPayload = (payload: LocationPayload): LocationPayload => ({
  LocationName_ar: payload.LocationName_ar?.trim() || null,
  LocationName_en: payload.LocationName_en?.trim(),
  LocationCode: payload.LocationCode?.trim(),
  LocationInMap: payload.LocationInMap ?? null
});
