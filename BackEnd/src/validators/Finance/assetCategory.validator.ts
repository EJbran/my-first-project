export interface AssetCategoryPayload {
  CategoryName?: string | null;
  Percentage?: number | string | null;
  DepAccountID?: number | string | null;
  CreditAccountID?: number | string | null;
  Description?: string | null;
}

const toOptionalInt = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

const toOptionalDecimal = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toOptionalString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value).trim() || null;
};

export const normalizeAssetCategoryPayload = (
  payload: AssetCategoryPayload
): AssetCategoryPayload => ({
  CategoryName: toOptionalString(payload.CategoryName),
  Percentage: toOptionalDecimal(payload.Percentage),
  DepAccountID: toOptionalInt(payload.DepAccountID),
  CreditAccountID: toOptionalInt(payload.CreditAccountID),
  Description: toOptionalString(payload.Description)
});

export const validateAssetCategoryPayload = (payload: AssetCategoryPayload): string[] => {
  const errors: string[] = [];

  if (!payload.CategoryName) {
    errors.push("CategoryName is required");
  } else if (payload.CategoryName.length > 30) {
    errors.push("CategoryName must be at most 30 characters");
  }

  if (payload.Percentage === null || payload.Percentage === undefined) {
    errors.push("Percentage is required");
  } else if (
    !Number.isFinite(Number(payload.Percentage)) ||
    Number(payload.Percentage) < 0 ||
    Number(payload.Percentage) > 100
  ) {
    errors.push("Percentage must be a number between 0 and 100");
  }

  if (payload.DepAccountID === null || payload.DepAccountID === undefined) {
    errors.push("DepAccountID is required");
  }

  if (payload.CreditAccountID === null || payload.CreditAccountID === undefined) {
    errors.push("CreditAccountID is required");
  }

  if (!payload.Description) {
    errors.push("Description is required");
  } else if (payload.Description.length > 200) {
    errors.push("Description must be at most 200 characters");
  }

  return errors;
};
