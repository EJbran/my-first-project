export interface DepartmentPayload {
  DepartmentName_Arabic?: string;
  DepartmentName_English?: string;
  DepartmentType?: string | null;
  AttachedNumber?: number | null;
  DepartmentAddress?: string;
  DepartmentPhone?: string;
  DepartmentExtenstion?: string;
}

const allowedDepartmentTypes = new Set([
  "Coordinator",
  "Manager",
  "Member",
  "Division",
  "Top management",
  "Section",
  "Unit"
]);

export const validateDepartmentPayload = (payload: DepartmentPayload): string[] => {
  const errors: string[] = [];

  if (!payload.DepartmentName_Arabic?.trim()) {
    errors.push("DepartmentName_Arabic is required");
  }

  if (!payload.DepartmentName_English?.trim()) {
    errors.push("DepartmentName_English is required");
  }

  if (!payload.DepartmentType?.trim()) {
    errors.push("DepartmentType is required");
  } else if (!allowedDepartmentTypes.has(payload.DepartmentType.trim())) {
    errors.push("DepartmentType is invalid");
  }

  return errors;
};

export const normalizeDepartmentPayload = (payload: DepartmentPayload): DepartmentPayload => ({
  DepartmentName_Arabic: payload.DepartmentName_Arabic?.trim(),
  DepartmentName_English: payload.DepartmentName_English?.trim(),
  DepartmentType: payload.DepartmentType?.trim() ?? null,
  AttachedNumber:
    payload.AttachedNumber === null || payload.AttachedNumber === undefined
      ? null
      : Number(payload.AttachedNumber),
  DepartmentAddress: payload.DepartmentAddress?.trim() ?? "",
  DepartmentPhone: payload.DepartmentPhone?.trim() ?? "",
  DepartmentExtenstion: payload.DepartmentExtenstion?.trim() ?? ""
});
