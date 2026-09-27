export interface CategoryAttributesPayload {
  CategoryDetails?: Record<string, unknown> | null;
}

const toOptionalJson = (value: unknown): Record<string, unknown> | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return null;
    }
  }

  return null;
};

export const normalizeCategoryAttributesPayload = (
  payload: CategoryAttributesPayload
): CategoryAttributesPayload => ({
  CategoryDetails: toOptionalJson(payload.CategoryDetails)
});

export const validateCategoryAttributesPayload = (payload: CategoryAttributesPayload): string[] => {
  const errors: string[] = [];

  if (payload.CategoryDetails !== null && payload.CategoryDetails !== undefined) {
    if (typeof payload.CategoryDetails !== "object" || Array.isArray(payload.CategoryDetails)) {
      errors.push("CategoryDetails must be a valid JSON object");
    }
  }

  return errors;
};
