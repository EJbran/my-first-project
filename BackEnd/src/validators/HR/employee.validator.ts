export interface EmployeeCreatePayload {
  Ref_Employee: string;
  EmployeeName: string | null;
  EmployeeName_En: string;
  Gender: string | null;
  DateOFBirth: string | null;
  Phone: string | null;
  Email: string | null;
  State: boolean | null;
  Contract_Type: string | null;
  Start_of_Contract: string | null;
  Type_Employee: string | null;
  Location_Id: number | null;
  Department_Id: number | null;
}

type EmployeeUpdateTextFieldDefinition = {
  kind: "text";
  maximum?: number;
};

type EmployeeUpdateNumberFieldDefinition = {
  kind: "integer" | "decimal";
  minimum?: number;
};

type EmployeeUpdateDateFieldDefinition = {
  kind: "date";
};

type EmployeeUpdateBooleanFieldDefinition = {
  kind: "boolean";
};

type EmployeeUpdateFieldDefinition =
  | EmployeeUpdateTextFieldDefinition
  | EmployeeUpdateNumberFieldDefinition
  | EmployeeUpdateDateFieldDefinition
  | EmployeeUpdateBooleanFieldDefinition;

export const employeeExtendedUpdateFieldDefinitions = {
  Address: { kind: "text", maximum: 500 },
  Notes: { kind: "text" },
  Marital_Status: { kind: "text", maximum: 50 },
  Nationality: { kind: "text", maximum: 100 },
  MotherName: { kind: "text", maximum: 100 },
  PlaceOFBirth: { kind: "text", maximum: 100 },
  Blood_type: { kind: "text", maximum: 10 },
  Children_Number: { kind: "integer", minimum: 0 },
  IS_FOREINGHT: { kind: "boolean" },
  NationalNumber: { kind: "text", maximum: 100 },
  Registration_Num: { kind: "text", maximum: 50 },
  FamilyBook_No: { kind: "text", maximum: 50 },
  FamilyBook_Issuer: { kind: "text", maximum: 150 },
  FamilyPage_Num: { kind: "text", maximum: 50 },
  FamilyPageBook_Num: { kind: "text", maximum: 50 },
  IdentityCard_Num: { kind: "text", maximum: 50 },
  IdentityCard_Issuer: { kind: "text", maximum: 150 },
  Passport_Num: { kind: "text", maximum: 50 },
  PassportExpiryDate: { kind: "date" },
  Passport_Issuer: { kind: "text", maximum: 150 },
  DateVisa_End: { kind: "date" },
  IS_DrivingLicense: { kind: "boolean" },
  DrivingLicense_Num: { kind: "text", maximum: 50 },
  End_of_contrat: { kind: "date" },
  Period_Contract: { kind: "text", maximum: 50 },
  WorkSystem: { kind: "text", maximum: 100 },
  WorkSystem_Description: { kind: "text" },
  Time_Start: { kind: "text", maximum: 50 },
  Time_End: { kind: "text", maximum: 50 },
  Degree_Employee: { kind: "text", maximum: 100 },
  IS_OK_POUR_MALAK: { kind: "boolean" },
  AssignedPosition_Id: { kind: "integer", minimum: 1 },
  AssignedPositionDegree: { kind: "text", maximum: 100 },
  AssignedPositionNum: { kind: "text", maximum: 100 },
  SecondedPosition_Id: { kind: "integer", minimum: 1 },
  SecondedPositionDegree: { kind: "text", maximum: 100 },
  SecondedPositionNum: { kind: "integer", minimum: 1 },
  AppointmentDecision_Number: { kind: "text", maximum: 500 },
  AppointmentDecision_Date: { kind: "date" },
  AppointmentDecision_Issuer: { kind: "text", maximum: 500 },
  CompanyDecision_Number: { kind: "text", maximum: 500 },
  CompanyDecision_Date: { kind: "date" },
  AppointmentType: { kind: "text", maximum: 100 },
  Type_END_CONTRACT: { kind: "text", maximum: 150 },
  Finance_Num: { kind: "text", maximum: 50 },
  INAS_Type: { kind: "text", maximum: 100 },
  INAS_Number: { kind: "text" },
  BankAccount_Number: { kind: "text", maximum: 150 },
  Base_Salary: { kind: "decimal", minimum: 0 },
  FieldAllowance: { kind: "integer", minimum: 0 },
  EducationalQualification_AsHiring: { kind: "text", maximum: 200 },
  AcademicQualification_AsTime: { kind: "text", maximum: 200 },
  GraduationDate: { kind: "text", maximum: 100 },
  Specialization: { kind: "text", maximum: 200 },
  CurrentQualification_Date: { kind: "text", maximum: 50 },
  VacationTransfer_Date: { kind: "date" },
  Vacation_balance: { kind: "text", maximum: 100 },
  Year_suppliment_Day: { kind: "integer", minimum: 0 },
  DateYear_Suppliment: { kind: "date" },
  YearSuppliment_YEAR: { kind: "integer", minimum: 0 },
  YearSuppliment_MONTH: { kind: "integer", minimum: 0 },
  PracticeLicense_Start: { kind: "date" },
  PracticeLicense_End: { kind: "date" },
  ZONNE: { kind: "text", maximum: 100 },
  IS_EMPRENTED: { kind: "boolean" },
  TYPE_TRAVAIL_WARDIA: { kind: "text", maximum: 100 },
  Stop_takrim: { kind: "boolean" },
  Notes_Stop_takrim: { kind: "text" },
  Percent_takrim: { kind: "decimal", minimum: 0 },
  Date_urgent_takrim: { kind: "date" },
  OLD_EMP_NUM2: { kind: "text", maximum: 50 },
  OLD_EMP_NUM3: { kind: "text", maximum: 50 },
  OLD_EMP_NUM4: { kind: "text", maximum: 50 },
  OLD_EMP_NUM5: { kind: "text", maximum: 50 },
  OLD_JobId3: { kind: "integer", minimum: 1 },
  OLD_JobDEGREE_3: { kind: "text", maximum: 100 },
  OLD_JobNum3: { kind: "text", maximum: 100 },
  OLD_JobId4: { kind: "text", maximum: 200 },
  OLD_JobDEGREE_4: { kind: "text", maximum: 100 },
  OLD_JobNum4: { kind: "text", maximum: 50 },
  OLD_JobId5: { kind: "text", maximum: 200 },
  OLD_JobDEGREE_5: { kind: "text", maximum: 100 },
  OLD_JobNum5: { kind: "text", maximum: 50 },
  Tadawul_No: { kind: "text", maximum: 50 },
  MedicalSymptoms: { kind: "text" },
  SuitNumber: { kind: "text", maximum: 50 },
  ShoesNumber: { kind: "text", maximum: 50 },
  Comment_one: { kind: "text" }
} as const satisfies Record<string, EmployeeUpdateFieldDefinition>;

export type EmployeeExtendedUpdateField = keyof typeof employeeExtendedUpdateFieldDefinitions;

type NormalizedEmployeeUpdateValue<
  Definition extends EmployeeUpdateFieldDefinition
> = Definition["kind"] extends "integer" | "decimal"
  ? number | null
  : Definition["kind"] extends "boolean"
    ? boolean | null
    : string | null;

export type EmployeeUpdatePayload = EmployeeCreatePayload & {
  [Field in EmployeeExtendedUpdateField]?: NormalizedEmployeeUpdateValue<
    (typeof employeeExtendedUpdateFieldDefinitions)[Field]
  >;
};

const normalizeText = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
};

const normalizeOptionalInteger = (value: unknown): number | null => {
  const text = normalizeText(value);
  return text === null ? null : Number(text);
};

const hasOwn = (source: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(source, key);

const normalizeState = (value: unknown, defaultValue?: boolean): boolean | null => {
  if (value === undefined && defaultValue !== undefined) return defaultValue;
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0") return false;
  return null;
};

const isValidIsoDate = (value: string): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
};

const validateLength = (
  errors: string[],
  field: string,
  value: string | null,
  maximum: number
) => {
  if (value && value.length > maximum) {
    errors.push(`${field} must be ${maximum} characters or fewer`);
  }
};

export const normalizeEmployeeCreatePayload = (
  source: Record<string, unknown>
): EmployeeCreatePayload => ({
  Ref_Employee: normalizeText(source.Ref_Employee) ?? "",
  EmployeeName: normalizeText(source.EmployeeName),
  EmployeeName_En: normalizeText(source.EmployeeName_En) ?? "",
  Gender: normalizeText(source.Gender),
  DateOFBirth: normalizeText(source.DateOFBirth),
  Phone: normalizeText(source.Phone),
  Email: normalizeText(source.Email)?.toLowerCase() ?? null,
  State: normalizeState(source.State, true),
  Contract_Type: normalizeText(source.Contract_Type),
  Start_of_Contract: normalizeText(source.Start_of_Contract),
  Type_Employee: normalizeText(source.Type_Employee),
  Location_Id: normalizeOptionalInteger(source.Location_Id),
  Department_Id: normalizeOptionalInteger(source.Department_Id)
});

export const validateEmployeeCreatePayload = (payload: EmployeeCreatePayload): string[] => {
  const errors: string[] = [];

  if (!payload.Ref_Employee) {
    errors.push("Ref_Employee is required");
  } else if (Number(payload.Ref_Employee) === 0) {
    errors.push("Ref_Employee 0 is reserved for vacancy records");
  }

  if (!payload.EmployeeName_En) {
    errors.push("EmployeeName_En is required");
  }

  validateLength(errors, "Ref_Employee", payload.Ref_Employee, 50);
  validateLength(errors, "EmployeeName", payload.EmployeeName, 100);
  validateLength(errors, "EmployeeName_En", payload.EmployeeName_En, 100);
  validateLength(errors, "Gender", payload.Gender, 20);
  validateLength(errors, "Phone", payload.Phone, 50);
  validateLength(errors, "Email", payload.Email, 150);
  validateLength(errors, "Contract_Type", payload.Contract_Type, 100);
  validateLength(errors, "Type_Employee", payload.Type_Employee, 100);

  if (payload.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.Email)) {
    errors.push("Email must be valid");
  }

  if (payload.DateOFBirth && !isValidIsoDate(payload.DateOFBirth)) {
    errors.push("DateOFBirth must be a valid YYYY-MM-DD date");
  }

  if (payload.Start_of_Contract && !isValidIsoDate(payload.Start_of_Contract)) {
    errors.push("Start_of_Contract must be a valid YYYY-MM-DD date");
  }

  if (typeof payload.State !== "boolean") {
    errors.push("State must be a boolean");
  }

  if (
    payload.Location_Id !== null
    && (!Number.isSafeInteger(payload.Location_Id) || payload.Location_Id <= 0)
  ) {
    errors.push("Location_Id must be a positive integer");
  }

  if (
    payload.Department_Id !== null
    && (!Number.isSafeInteger(payload.Department_Id) || payload.Department_Id <= 0)
  ) {
    errors.push("Department_Id must be a positive integer");
  }

  return errors;
};

export const normalizeEmployeeUpdatePayload = (
  source: Record<string, unknown>
): EmployeeUpdatePayload => {
  const extendedPayload: Partial<Record<EmployeeExtendedUpdateField, string | number | boolean | null>> = {};

  for (const [field, definition] of Object.entries(employeeExtendedUpdateFieldDefinitions) as Array<
    [EmployeeExtendedUpdateField, EmployeeUpdateFieldDefinition]
  >) {
    if (!hasOwn(source, field)) continue;

    if (definition.kind === "boolean") {
      extendedPayload[field] = normalizeState(source[field]);
    } else if (definition.kind === "integer" || definition.kind === "decimal") {
      extendedPayload[field] = normalizeOptionalInteger(source[field]);
    } else {
      extendedPayload[field] = normalizeText(source[field]);
    }
  }

  return {
    ...normalizeEmployeeCreatePayload(source),
    State: normalizeState(source.State),
    ...extendedPayload
  } as EmployeeUpdatePayload;
};

export const validateEmployeeUpdatePayload = (payload: EmployeeUpdatePayload): string[] => {
  const errors = validateEmployeeCreatePayload(payload);
  const payloadRecord = payload as unknown as Record<string, unknown>;

  for (const [field, definition] of Object.entries(employeeExtendedUpdateFieldDefinitions) as Array<
    [EmployeeExtendedUpdateField, EmployeeUpdateFieldDefinition]
  >) {
    if (!hasOwn(payloadRecord, field)) continue;
    const value = payload[field];
    if (value === null) continue;

    if (definition.kind === "text") {
      if (typeof value !== "string") {
        errors.push(`${field} must be text or null`);
      } else if (definition.maximum !== undefined && value.length > definition.maximum) {
        errors.push(`${field} must be ${definition.maximum} characters or fewer`);
      }
      continue;
    }

    if (definition.kind === "date") {
      if (typeof value !== "string" || !isValidIsoDate(value)) {
        errors.push(`${field} must be a valid YYYY-MM-DD date`);
      }
      continue;
    }

    if (definition.kind === "boolean") {
      if (typeof value !== "boolean") {
        errors.push(`${field} must be a boolean or null`);
      }
      continue;
    }

    if (typeof value !== "number" || !Number.isFinite(value)) {
      errors.push(`${field} must be a number or null`);
      continue;
    }

    if (definition.kind === "integer" && !Number.isSafeInteger(value)) {
      errors.push(`${field} must be an integer or null`);
      continue;
    }

    if (definition.minimum !== undefined && value < definition.minimum) {
      errors.push(`${field} must be ${definition.minimum} or greater`);
    }
  }

  return errors;
};
