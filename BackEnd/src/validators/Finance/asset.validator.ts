export interface AssetPayload {
  AssetID?: number | null;
  AssetCode?: string | null;
  AssetDescription?: string | null;
  CategoryID?: number | null;
  SubLocationID?: number | null;
  DepartmentID?: number | null;
  PurchaseDate?: string | null;
  InsertedDate?: string | null;
  PurchaseCost?: number | string | null;
  BookValue?: number | string | null;
  OpeningBalanceBookValue?: number | string | null;
  DepreciationValue?: number | string | null;
  NetValue?: number | string | null;
  ResponsibleID?: number | null;
  ResponsibleNote?: string | null;
  Status?: string | null;
}

const toOptionalInt = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);
  return Number.isInteger(numericValue) ? numericValue : null;
};

const toOptionalDecimal = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const toOptionalString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value).trim() || null;
};

const isValidDate = (value: string | null): boolean => {
  if (!value) {
    return false;
  }

  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
};

export const normalizeAssetPayload = (payload: AssetPayload): AssetPayload => ({
  AssetID: toOptionalInt(payload.AssetID),
  AssetCode: toOptionalString(payload.AssetCode),
  AssetDescription: toOptionalString(payload.AssetDescription),
  CategoryID: toOptionalInt(payload.CategoryID),
  SubLocationID: toOptionalInt(payload.SubLocationID),
  DepartmentID: toOptionalInt(payload.DepartmentID),
  PurchaseDate: toOptionalString(payload.PurchaseDate),
  InsertedDate: toOptionalString(payload.InsertedDate),
  PurchaseCost: toOptionalDecimal(payload.PurchaseCost),
  BookValue: toOptionalDecimal(payload.BookValue),
  OpeningBalanceBookValue: toOptionalDecimal(payload.OpeningBalanceBookValue),
  DepreciationValue: toOptionalDecimal(payload.DepreciationValue),
  NetValue: toOptionalDecimal(payload.NetValue),
  ResponsibleID: toOptionalInt(payload.ResponsibleID),
  ResponsibleNote: toOptionalString(payload.ResponsibleNote),
  Status: toOptionalString(payload.Status)
});

export const validateAssetPayload = (payload: AssetPayload): string[] => {
  const errors: string[] = [];

  if (payload.AssetCode === null || payload.AssetCode === undefined || !payload.AssetCode) {
    errors.push("AssetCode is required");
  } else if (payload.AssetCode.length > 50) {
    errors.push("AssetCode must be at most 50 characters");
  }

  if (payload.AssetDescription === null || payload.AssetDescription === undefined || !payload.AssetDescription) {
    errors.push("AssetDescription is required");
  } else if (payload.AssetDescription.length > 200) {
    errors.push("AssetDescription must be at most 200 characters");
  }

  if (payload.CategoryID === null || payload.CategoryID === undefined) {
    errors.push("CategoryID is required");
  }

  if (payload.SubLocationID === null || payload.SubLocationID === undefined) {
    errors.push("SubLocationID is required");
  }

  if (payload.DepartmentID === null || payload.DepartmentID === undefined) {
    errors.push("DepartmentID is required");
  }

  if (!isValidDate(payload.PurchaseDate ?? null)) {
    errors.push("PurchaseDate must be a valid date");
  }

  if (!isValidDate(payload.InsertedDate ?? null)) {
    errors.push("InsertedDate must be a valid date");
  }

  if (payload.PurchaseCost === null || payload.PurchaseCost === undefined || !Number.isFinite(Number(payload.PurchaseCost))) {
    errors.push("PurchaseCost is required and must be a valid number");
  }

  if (payload.BookValue === null || payload.BookValue === undefined || !Number.isFinite(Number(payload.BookValue))) {
    errors.push("BookValue is required and must be a valid number");
  }

  if (
    payload.OpeningBalanceBookValue === null ||
    payload.OpeningBalanceBookValue === undefined ||
    !Number.isFinite(Number(payload.OpeningBalanceBookValue))
  ) {
    errors.push("OpeningBalanceBookValue is required and must be a valid number");
  }

  if (
    payload.DepreciationValue === null ||
    payload.DepreciationValue === undefined ||
    !Number.isFinite(Number(payload.DepreciationValue))
  ) {
    errors.push("DepreciationValue is required and must be a valid number");
  }

  if (payload.NetValue === null || payload.NetValue === undefined || !Number.isFinite(Number(payload.NetValue))) {
    errors.push("NetValue is required and must be a valid number");
  }

  if (payload.ResponsibleID === null || payload.ResponsibleID === undefined) {
    errors.push("ResponsibleID is required");
  }

  if (payload.ResponsibleNote && payload.ResponsibleNote.length > 50) {
    errors.push("ResponsibleNote must be at most 50 characters");
  }

  if (payload.Status === null || payload.Status === undefined || !payload.Status) {
    errors.push("Status is required");
  } else if (payload.Status.length > 50) {
    errors.push("Status must be at most 50 characters");
  }

  return errors;
};
