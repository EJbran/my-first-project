import { zodResolver } from "@hookform/resolvers/zod";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import BusinessCenterOutlinedIcon from "@mui/icons-material/BusinessCenterOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import WorkOutlineRoundedIcon from "@mui/icons-material/WorkOutlineRounded";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  createFilterOptions,
  useMediaQuery
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { employeesApi } from "../../../api/employees.api";
import { positionsApi } from "../../../api/positions.api";
import type {
  EmployeeCreatePayload,
  EmployeeDatabaseValue,
  EmployeeRecord,
  EmployeeUpdatePayload
} from "../../../types/employee.types";
import type { VacantPosition } from "../../../types/position.types";
import { getHrThemeVars } from "../jobs/Theme";

const optionalEmail = z
  .string()
  .trim()
  .max(150, "Email must be 150 characters or fewer")
  .refine(
    (value) => !value || z.email().safeParse(value).success,
    "Enter a valid email address"
  );

const employeeFormSchema = z.object({
  employeeNumber: z
    .string()
    .trim()
    .min(1, "Employee number is required")
    .max(50, "Employee number must be 50 characters or fewer")
    .refine((value) => !Number.isFinite(Number(value)) || Number(value) !== 0, {
      message: "Employee number 0 is reserved for vacancies"
    }),
  nameEnglish: z
    .string()
    .trim()
    .min(1, "English name is required")
    .max(100, "English name must be 100 characters or fewer"),
  nameArabic: z.string().trim().max(100, "Arabic name must be 100 characters or fewer"),
  email: optionalEmail,
  phone: z.string().trim().max(50, "Phone must be 50 characters or fewer"),
  gender: z.string().trim().max(20, "Gender must be 20 characters or fewer"),
  dateOfBirth: z.string(),
  departmentId: z.string().refine(
    (value) => !value || (Number.isSafeInteger(Number(value)) && Number(value) > 0),
    "Select a valid department"
  ),
  locationId: z.string().refine(
    (value) => !value || (Number.isSafeInteger(Number(value)) && Number(value) > 0),
    "Select a valid work location"
  ),
  employeeType: z.string().trim().max(100, "Employee type must be 100 characters or fewer"),
  contractType: z.string().trim().max(100, "Contract type must be 100 characters or fewer"),
  contractStartDate: z.string(),
  status: z.enum(["active", "inactive"])
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;
export type EmployeeFormMode = "create" | "edit";

export interface EmployeeLocationOption {
  id: string;
  label: string;
}

export interface EmployeeDepartmentOption {
  id: string;
  label: string;
  englishName: string;
  arabicName: string;
  type: string;
}

interface EmployeeFormDrawerProps {
  open: boolean;
  mode: EmployeeFormMode;
  employeeId?: string | number | null;
  departments: EmployeeDepartmentOption[];
  departmentsLoading?: boolean;
  departmentsError?: string | null;
  locations: EmployeeLocationOption[];
  onClose: () => void;
  onSaved: (employee: EmployeeRecord, mode: EmployeeFormMode) => void;
}

interface FormSectionCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}

const EMPLOYEE_FORM_ID = "hr-employee-form";
const EMPLOYEE_FORM_TITLE_ID = "hr-employee-form-title";
const EMPLOYEE_FORM_DESCRIPTION_ID = "hr-employee-form-description";
const formatPositionNumber = (value: number | string | null): string =>
  value === null || String(value).trim() === "" ? "Not numbered" : String(value);

const getVacantPositionJob = (position: VacantPosition): { english: string; arabic: string | null } => ({
  english: position.Job_Name_EN?.trim() || position.Job_Name_AR?.trim() || "Job not classified",
  arabic: position.Job_Name_AR?.trim() || null
});

const vacantPositionLabel = (position: VacantPosition): string =>
  `Position ${formatPositionNumber(position.Position_Number)} · ${getVacantPositionJob(position).english}`;

const filterVacantPositions = createFilterOptions<VacantPosition>({
  stringify: (position) => [
    position.Position_Number,
    position.Job_Name_EN,
    position.Job_Name_AR,
    position.PositionLevel,
    position.Position_Degree,
    position.Position_Type
  ].filter((value) => value !== null && value !== undefined).join(" ")
});

const FormSectionCard = ({ title, description, icon, children }: FormSectionCardProps) => (
  <Box
    component="section"
    sx={{
      minWidth: 0,
      height: "100%",
      p: { xs: 2, md: 2.5 },
      border: "1px solid var(--hr-border)",
      borderRadius: "12px",
      bgcolor: "var(--hr-surface)"
    }}
  >
    <Stack direction="row" spacing={1.4} alignItems="flex-start" sx={{ mb: 2.25 }}>
      <Box
        aria-hidden="true"
        sx={{
          width: 38,
          height: 38,
          flex: "0 0 auto",
          display: "grid",
          placeItems: "center",
          borderRadius: "10px",
          color: "var(--hr-accent)",
          bgcolor: "var(--hr-selected)",
          "& .MuiSvgIcon-root": { fontSize: 21 }
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ color: "var(--hr-text)", fontSize: 16, lineHeight: 1.3, fontWeight: 800 }}>
          {title}
        </Typography>
        <Typography sx={{ mt: 0.35, color: "var(--hr-muted)", fontSize: 12.5, lineHeight: 1.45 }}>
          {description}
        </Typography>
      </Box>
    </Stack>
    {children}
  </Box>
);

const emptyValues: EmployeeFormValues = {
  employeeNumber: "",
  nameEnglish: "",
  nameArabic: "",
  email: "",
  phone: "",
  gender: "",
  dateOfBirth: "",
  departmentId: "",
  locationId: "",
  employeeType: "",
  contractType: "",
  contractStartDate: "",
  status: "active"
};

type EditFieldKind = "text" | "date" | "number" | "boolean" | "multiline" | "readonly";

type EditFieldDefinition = {
  key: string;
  label: string;
  kind?: EditFieldKind;
  wide?: boolean;
};

type EditSection = {
  title: string;
  fields: EditFieldDefinition[];
};

const editFieldGroups: Array<{ title: string; sections: EditSection[] }> = [
  {
    title: "Overview",
    sections: [
      {
        title: "Employee & Contact Information",
        fields: [
          { key: "ID_Employee", label: "Employee ID", kind: "readonly" },
          { key: "Address", label: "Current Residential Address", wide: true },
          { key: "Notes", label: "Notes", kind: "multiline", wide: true }
        ]
      },
      {
        title: "Personal Information",
        fields: [
          { key: "Marital_Status", label: "Marital Status" },
          { key: "Nationality", label: "Nationality" },
          { key: "MotherName", label: "Mother's Name" },
          { key: "PlaceOFBirth", label: "Place of Birth" },
          { key: "Blood_type", label: "Blood Type" },
          { key: "Children_Number", label: "Number of Children", kind: "number" },
          { key: "IS_FOREINGHT", label: "Foreign Employee", kind: "boolean" }
        ]
      },
      {
        title: "National & Civil ID Information",
        fields: [
          { key: "NationalNumber", label: "National Number" },
          { key: "Registration_Num", label: "Registration Number" },
          { key: "FamilyBook_No", label: "Family Book Number" },
          { key: "FamilyBook_Issuer", label: "Family Book Issuer" },
          { key: "FamilyPage_Num", label: "Family Record Number" },
          { key: "FamilyPageBook_Num", label: "Family Book Page Number" },
          { key: "IdentityCard_Num", label: "Identity Card Number" },
          { key: "IdentityCard_Issuer", label: "Identity Card Issuer" }
        ]
      },
      {
        title: "Travel & License Information",
        fields: [
          { key: "Passport_Num", label: "Passport Number" },
          { key: "PassportExpiryDate", label: "Passport Expiry Date", kind: "date" },
          { key: "Passport_Issuer", label: "Passport Issuer" },
          { key: "DateVisa_End", label: "Residence Permit Expiry Date", kind: "date" },
          { key: "IS_DrivingLicense", label: "Has Driving License", kind: "boolean" },
          { key: "DrivingLicense_Num", label: "Driving License Number" }
        ]
      }
    ]
  },
  {
    title: "Administrative Information",
    sections: [
      {
        title: "Employment & Contract",
        fields: [
          { key: "End_of_contrat", label: "Contract End Date", kind: "date" },
          { key: "Period_Contract", label: "Contract Duration" },
          { key: "WorkSystem", label: "Work System" },
          { key: "WorkSystem_Description", label: "Work and Employment System", wide: true },
          { key: "Time_Start", label: "Work Start Time" },
          { key: "Time_End", label: "Work End Time" }
        ]
      },
      {
        title: "Position & Job Classification",
        fields: [
          { key: "ResolvedJobName", label: "Current Job", kind: "readonly", wide: true },
          { key: "CurrentPositionNumber", label: "Current Position Number", kind: "readonly" },
          { key: "CurrentPositionType", label: "Position Type", kind: "readonly" },
          { key: "CurrentPositionLevel", label: "Position Level", kind: "readonly" },
          { key: "Degree_Employee", label: "Employee Grade" },
          { key: "IS_OK_POUR_MALAK", label: "Show in Staffing Structure", kind: "boolean" },
          { key: "SecondedPositionDegree", label: "Seconded Position Grade" }
        ]
      },
      {
        title: "Appointment & Company Decisions",
        fields: [
          { key: "AppointmentDecision_Number", label: "Appointment Decision Number" },
          { key: "AppointmentDecision_Date", label: "Appointment Decision Date", kind: "date" },
          { key: "AppointmentDecision_Issuer", label: "Appointment Decision Issuer" },
          { key: "CompanyDecision_Number", label: "Company Decision Number" },
          { key: "CompanyDecision_Date", label: "Company Decision Date", kind: "date" },
          { key: "AppointmentType", label: "Appointment Decision Type" },
          { key: "Type_END_CONTRACT", label: "End-of-Contract Procedure Type" }
        ]
      },
      {
        title: "Finance & Social Insurance",
        fields: [
          { key: "ResolvedBankBranch", label: "Bank Name", kind: "readonly", wide: true },
          { key: "Finance_Num", label: "Financial Number" },
          { key: "INAS_Type", label: "Social Insurance Type" },
          { key: "INAS_Number", label: "Social Insurance Number" },
          { key: "BankAccount_Number", label: "Bank Account Number" },
          { key: "Base_Salary", label: "Basic Salary", kind: "number" },
          { key: "FieldAllowance", label: "Field Allowance", kind: "number" }
        ]
      },
      {
        title: "Qualifications",
        fields: [
          { key: "EducationalQualification_AsHiring", label: "Qualification at Appointment", wide: true },
          { key: "AcademicQualification_AsTime", label: "Current Academic Qualification", wide: true },
          { key: "GraduationDate", label: "Graduation Date (legacy text)" },
          { key: "Specialization", label: "Specialization" },
          { key: "CurrentQualification_Date", label: "Current Qualification Date (legacy text)" }
        ]
      },
      {
        title: "Leave Balance & Service",
        fields: [
          { key: "VacationTransfer_Date", label: "Vacation Balance Transfer Date", kind: "date" },
          { key: "Vacation_balance", label: "Transferred Vacation Balance" },
          { key: "Year_suppliment_Day", label: "Added Service Days", kind: "number" },
          { key: "DateYear_Suppliment", label: "Service Inclusion Date", kind: "date" },
          { key: "YearSuppliment_YEAR", label: "Added Service Years", kind: "number" },
          { key: "YearSuppliment_MONTH", label: "Added Service Months", kind: "number" },
          { key: "PracticeLicense_Start", label: "Professional Practice Start", kind: "date" },
          { key: "PracticeLicense_End", label: "Professional Practice End", kind: "date" }
        ]
      },
      {
        title: "Workforce Controls & Honorarium",
        fields: [
          { key: "ZONNE", label: "Foreign Employee Zone" },
          { key: "IS_EMPRENTED", label: "Fingerprint Attendance Required", kind: "boolean" },
          { key: "TYPE_TRAVAIL_WARDIA", label: "Work Shift" },
          { key: "Stop_takrim", label: "Stop Honorarium", kind: "boolean" },
          { key: "Notes_Stop_takrim", label: "Honorarium Stop Reason", kind: "multiline", wide: true },
          { key: "Percent_takrim", label: "Honorarium Payment Percentage", kind: "number" },
          { key: "Date_urgent_takrim", label: "Honorarium Payment Date", kind: "date" }
        ]
      },
      {
        title: "Previous Employee & Job Records",
        fields: [
          { key: "OLD_EMP_NUM2", label: "Previous Employee Number 2" },
          { key: "OLD_EMP_NUM3", label: "Previous Employee Number 3" },
          { key: "OLD_EMP_NUM4", label: "Previous Employee Number 4" },
          { key: "OLD_EMP_NUM5", label: "Previous Employee Number 5" },
          { key: "OLD_JobId3", label: "Previous Job 1", kind: "number" },
          { key: "OLD_JobDEGREE_3", label: "Previous Job 1 Grade" },
          { key: "OLD_JobNum3", label: "Previous Job 1 Number" },
          { key: "OLD_JobId4", label: "Previous Job 2" },
          { key: "OLD_JobDEGREE_4", label: "Previous Job 2 Grade" },
          { key: "OLD_JobNum4", label: "Previous Job 2 Number" },
          { key: "OLD_JobId5", label: "Previous Job 3" },
          { key: "OLD_JobDEGREE_5", label: "Previous Job 3 Grade" },
          { key: "OLD_JobNum5", label: "Previous Job 3 Number" },
          { key: "Tadawul_No", label: "Circulation Number" }
        ]
      },
      {
        title: "Health, Equipment & Comments",
        fields: [
          { key: "MedicalSymptoms", label: "Medical Conditions / Symptoms", kind: "multiline", wide: true },
          { key: "SuitNumber", label: "Uniform Number" },
          { key: "ShoesNumber", label: "Shoe Size" },
          { key: "Comment_one", label: "Employee-Specific Comment", kind: "multiline", wide: true }
        ]
      }
    ]
  }
];

const allEditFields = editFieldGroups.flatMap((group) =>
  group.sections.flatMap((section) => section.fields)
);

const normalizeRecordKey = (key: string): string => key.trim().toLowerCase();

const toFormText = (value: EmployeeDatabaseValue | undefined): string =>
  value === null || value === undefined ? "" : String(value).trim();

const emptyValuePlaceholders = new Set([
  "-",
  "—",
  "n/a",
  "null",
  "none",
  "no email",
  "not available",
  "لايوجد",
  "لا يوجد"
]);

const toEmailInputValue = (value: EmployeeDatabaseValue | undefined): string => {
  const text = toFormText(value);
  return emptyValuePlaceholders.has(text.toLocaleLowerCase().replace(/\s+/g, " "))
    ? ""
    : text;
};

const toEditText = (value: EmployeeDatabaseValue | undefined): string => toFormText(value);

const toDateInputValue = (value: EmployeeDatabaseValue | undefined): string => {
  const text = toEditText(value);
  if (!text) return "";

  const datePrefix = /^\d{4}-\d{2}-\d{2}/.exec(text)?.[0];
  if (datePrefix) return datePrefix;

  const parsedDate = new Date(text);
  return Number.isNaN(parsedDate.getTime()) ? "" : parsedDate.toISOString().slice(0, 10);
};

const toBooleanInputValue = (value: EmployeeDatabaseValue | undefined): string => {
  if (value === true || value === 1) return "true";
  if (value === false || value === 0) return "false";
  const normalized = toEditText(value).toLowerCase();
  if (["1", "true", "yes", "active"].includes(normalized)) return "true";
  if (["0", "false", "no", "inactive", "archived"].includes(normalized)) return "false";
  return "";
};

const toFormStatus = (value: EmployeeDatabaseValue | undefined): EmployeeFormValues["status"] => {
  if (value === false || value === 0) return "inactive";
  if (value === true || value === 1) return "active";

  const normalized = toFormText(value).toLowerCase();
  return ["0", "false", "inactive", "archived", "stopped", "no"].includes(normalized)
    ? "inactive"
    : "active";
};

const toEmployeeFormValues = (employee: EmployeeRecord): EmployeeFormValues => {
  const record = new Map(
    Object.entries(employee).map(([key, value]) => [normalizeRecordKey(key), value])
  );
  const read = (...keys: string[]): EmployeeDatabaseValue | undefined => {
    for (const key of keys) {
      const normalizedKey = normalizeRecordKey(key);
      if (record.has(normalizedKey)) return record.get(normalizedKey);
    }
    return undefined;
  };

  return {
    employeeNumber: toFormText(read("Ref_Employee")),
    nameEnglish: toEditText(read("EmployeeName_En")),
    nameArabic: toEditText(read("EmployeeName")),
    email: toEmailInputValue(read("Email")),
    phone: toEditText(read("Phone")),
    gender: toEditText(read("Gender")),
    dateOfBirth: toDateInputValue(read("DateOFBirth")),
    departmentId: toEditText(read("Department_Id", "ResolvedDepartmentId")),
    locationId: toEditText(read("Location_Id", "location_id", "ResolvedLocationId")),
    employeeType: toEditText(read("Type_Employee")),
    contractType: toEditText(read("Contract_Type")),
    contractStartDate: toDateInputValue(read("Start_of_Contract")),
    status: toFormStatus(read("State"))
  };
};

const editFieldAliases: Record<string, string[]> = {
  Marital_Status: ["Marital_Status "],
  Registration_Num: ["Registration_ Num"],
  AppointmentType: ["TYPE_KARAR/AppointmentType", "TYPE_KARAR"]
};

const toEmployeeEditValues = (employee: EmployeeRecord): Record<string, string> => {
  const record = new Map(
    Object.entries(employee).map(([key, value]) => [normalizeRecordKey(key), value])
  );
  const read = (key: string): EmployeeDatabaseValue | undefined => {
    const candidates = [key, ...(editFieldAliases[key] ?? [])];
    for (const candidate of candidates) {
      const normalizedKey = normalizeRecordKey(candidate);
      if (record.has(normalizedKey)) return record.get(normalizedKey);
    }
    return undefined;
  };

  return Object.fromEntries(allEditFields.map((field) => {
    const value = read(field.key);
    if (field.kind === "date") return [field.key, toDateInputValue(value)];
    if (field.kind === "boolean") return [field.key, toBooleanInputValue(value)];
    return [field.key, toEditText(value)];
  }));
};

const toNullableText = (value: string | undefined): string | null => {
  const text = value?.trim() ?? "";
  return text || null;
};

const toNullableNumber = (value: string | undefined): number | null => {
  const text = value?.trim() ?? "";
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
};

const toNullableBoolean = (value: string | undefined): boolean | null => {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
};

const toEmployeeUpdatePayload = (
  core: EmployeeCreatePayload,
  values: Record<string, string>
): EmployeeUpdatePayload => ({
  ...core,
  Address: toNullableText(values.Address),
  Notes: toNullableText(values.Notes),
  Marital_Status: toNullableText(values.Marital_Status),
  Nationality: toNullableText(values.Nationality),
  MotherName: toNullableText(values.MotherName),
  PlaceOFBirth: toNullableText(values.PlaceOFBirth),
  Blood_type: toNullableText(values.Blood_type),
  Children_Number: toNullableNumber(values.Children_Number),
  IS_FOREINGHT: toNullableBoolean(values.IS_FOREINGHT),
  NationalNumber: toNullableText(values.NationalNumber),
  Registration_Num: toNullableText(values.Registration_Num),
  FamilyBook_No: toNullableText(values.FamilyBook_No),
  FamilyBook_Issuer: toNullableText(values.FamilyBook_Issuer),
  FamilyPage_Num: toNullableText(values.FamilyPage_Num),
  FamilyPageBook_Num: toNullableText(values.FamilyPageBook_Num),
  IdentityCard_Num: toNullableText(values.IdentityCard_Num),
  IdentityCard_Issuer: toNullableText(values.IdentityCard_Issuer),
  Passport_Num: toNullableText(values.Passport_Num),
  PassportExpiryDate: toNullableText(values.PassportExpiryDate),
  Passport_Issuer: toNullableText(values.Passport_Issuer),
  DateVisa_End: toNullableText(values.DateVisa_End),
  IS_DrivingLicense: toNullableBoolean(values.IS_DrivingLicense),
  DrivingLicense_Num: toNullableText(values.DrivingLicense_Num),
  End_of_contrat: toNullableText(values.End_of_contrat),
  Period_Contract: toNullableText(values.Period_Contract),
  WorkSystem: toNullableText(values.WorkSystem),
  WorkSystem_Description: toNullableText(values.WorkSystem_Description),
  Time_Start: toNullableText(values.Time_Start),
  Time_End: toNullableText(values.Time_End),
  Degree_Employee: toNullableText(values.Degree_Employee),
  IS_OK_POUR_MALAK: toNullableBoolean(values.IS_OK_POUR_MALAK),
  AssignedPosition_Id: toNullableNumber(values.AssignedPosition_Id),
  AssignedPositionDegree: toNullableText(values.AssignedPositionDegree),
  AssignedPositionNum: toNullableText(values.AssignedPositionNum),
  SecondedPosition_Id: toNullableNumber(values.SecondedPosition_Id),
  SecondedPositionDegree: toNullableText(values.SecondedPositionDegree),
  SecondedPositionNum: toNullableNumber(values.SecondedPositionNum),
  AppointmentDecision_Number: toNullableText(values.AppointmentDecision_Number),
  AppointmentDecision_Date: toNullableText(values.AppointmentDecision_Date),
  AppointmentDecision_Issuer: toNullableText(values.AppointmentDecision_Issuer),
  CompanyDecision_Number: toNullableText(values.CompanyDecision_Number),
  CompanyDecision_Date: toNullableText(values.CompanyDecision_Date),
  AppointmentType: toNullableText(values.AppointmentType),
  Type_END_CONTRACT: toNullableText(values.Type_END_CONTRACT),
  Finance_Num: toNullableText(values.Finance_Num),
  INAS_Type: toNullableText(values.INAS_Type),
  INAS_Number: toNullableText(values.INAS_Number),
  BankAccount_Number: toNullableText(values.BankAccount_Number),
  Base_Salary: toNullableNumber(values.Base_Salary),
  FieldAllowance: toNullableNumber(values.FieldAllowance),
  EducationalQualification_AsHiring: toNullableText(values.EducationalQualification_AsHiring),
  AcademicQualification_AsTime: toNullableText(values.AcademicQualification_AsTime),
  GraduationDate: toNullableText(values.GraduationDate),
  Specialization: toNullableText(values.Specialization),
  CurrentQualification_Date: toNullableText(values.CurrentQualification_Date),
  VacationTransfer_Date: toNullableText(values.VacationTransfer_Date),
  Vacation_balance: toNullableText(values.Vacation_balance),
  Year_suppliment_Day: toNullableNumber(values.Year_suppliment_Day),
  DateYear_Suppliment: toNullableText(values.DateYear_Suppliment),
  YearSuppliment_YEAR: toNullableNumber(values.YearSuppliment_YEAR),
  YearSuppliment_MONTH: toNullableNumber(values.YearSuppliment_MONTH),
  PracticeLicense_Start: toNullableText(values.PracticeLicense_Start),
  PracticeLicense_End: toNullableText(values.PracticeLicense_End),
  ZONNE: toNullableText(values.ZONNE),
  IS_EMPRENTED: toNullableBoolean(values.IS_EMPRENTED),
  TYPE_TRAVAIL_WARDIA: toNullableText(values.TYPE_TRAVAIL_WARDIA),
  Stop_takrim: toNullableBoolean(values.Stop_takrim),
  Notes_Stop_takrim: toNullableText(values.Notes_Stop_takrim),
  Percent_takrim: toNullableNumber(values.Percent_takrim),
  Date_urgent_takrim: toNullableText(values.Date_urgent_takrim),
  OLD_EMP_NUM2: toNullableText(values.OLD_EMP_NUM2),
  OLD_EMP_NUM3: toNullableText(values.OLD_EMP_NUM3),
  OLD_EMP_NUM4: toNullableText(values.OLD_EMP_NUM4),
  OLD_EMP_NUM5: toNullableText(values.OLD_EMP_NUM5),
  OLD_JobId3: toNullableNumber(values.OLD_JobId3),
  OLD_JobDEGREE_3: toNullableText(values.OLD_JobDEGREE_3),
  OLD_JobNum3: toNullableText(values.OLD_JobNum3),
  OLD_JobId4: toNullableText(values.OLD_JobId4),
  OLD_JobDEGREE_4: toNullableText(values.OLD_JobDEGREE_4),
  OLD_JobNum4: toNullableText(values.OLD_JobNum4),
  OLD_JobId5: toNullableText(values.OLD_JobId5),
  OLD_JobDEGREE_5: toNullableText(values.OLD_JobDEGREE_5),
  OLD_JobNum5: toNullableText(values.OLD_JobNum5),
  Tadawul_No: toNullableText(values.Tadawul_No),
  MedicalSymptoms: toNullableText(values.MedicalSymptoms),
  SuitNumber: toNullableText(values.SuitNumber),
  ShoesNumber: toNullableText(values.ShoesNumber),
  Comment_one: toNullableText(values.Comment_one)
});

const getRequestErrorMessage = (error: unknown, mode: EmployeeFormMode): string => {
  const fallback = mode === "create" ? "Failed to create employee" : "Failed to update employee";
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : fallback;
  }

  const payload = error.response?.data as { message?: string; errors?: string[] } | undefined;
  return payload?.errors?.join(". ") || payload?.message || error.message || fallback;
};

type SaveEmployeeVariables =
  | { mode: "create"; payload: EmployeeCreatePayload }
  | { mode: "edit"; employeeId: string; payload: EmployeeUpdatePayload };

export const EmployeeFormDrawer = ({
  open,
  mode,
  employeeId,
  departments,
  departmentsLoading = false,
  departmentsError = null,
  locations,
  onClose,
  onSaved
}: EmployeeFormDrawerProps) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const queryClient = useQueryClient();
  const initializedEmployeeId = useRef<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [selectedInitialPosition, setSelectedInitialPosition] = useState<VacantPosition | null>(null);
  const [vacancyPickerActivated, setVacancyPickerActivated] = useState(false);
  const [activeSection, setActiveSection] = useState<"overview" | "administrative">("overview");
  const normalizedEmployeeId = employeeId === null || employeeId === undefined
    ? null
    : String(employeeId);
  const hasValidEmployeeId = normalizedEmployeeId !== null
    && Number.isSafeInteger(Number(normalizedEmployeeId))
    && Number(normalizedEmployeeId) > 0;
  const isEditing = mode === "edit";

  const employeeQuery = useQuery({
    queryKey: ["employees", normalizedEmployeeId],
    queryFn: () => employeesApi.getById(normalizedEmployeeId as string),
    enabled: open && isEditing && hasValidEmployeeId,
    staleTime: 60_000
  });
  const vacantPositionsQuery = useQuery({
    queryKey: ["positions", "vacant", "all"],
    queryFn: positionsApi.allVacant,
    enabled: open && !isEditing && vacancyPickerActivated,
    staleTime: 60_000
  });
  const loadedEmployee = employeeQuery.data?.success ? employeeQuery.data.data : undefined;
  const employeeLoadError = !hasValidEmployeeId && isEditing
    ? "A valid employee ID is required"
    : employeeQuery.data && !employeeQuery.data.success
      ? employeeQuery.data.message
      : employeeQuery.error instanceof Error
        ? employeeQuery.error.message
        : null;

  const {
    isPending,
    mutateAsync: saveEmployee,
    reset: resetSaveEmployee
  } = useMutation({
    mutationFn: (variables: SaveEmployeeVariables) => {
      if (variables.mode === "edit") {
        return employeesApi.update(variables.employeeId, variables.payload);
      }
      return employeesApi.create(variables.payload);
    }
  });
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: emptyValues
  });
  useEffect(() => {
    if (!open) {
      initializedEmployeeId.current = null;
      setVacancyPickerActivated(false);
      return;
    }

    reset(emptyValues);
    setEditValues({});
    setSelectedInitialPosition(null);
    setVacancyPickerActivated(false);
    resetSaveEmployee();
    setSubmitError(null);
    setActiveSection("overview");
    initializedEmployeeId.current = mode === "create" ? "create" : null;
  }, [mode, normalizedEmployeeId, open, reset, resetSaveEmployee]);

  useEffect(() => {
    if (
      !open
      || !isEditing
      || normalizedEmployeeId === null
      || !loadedEmployee
      || initializedEmployeeId.current === normalizedEmployeeId
    ) {
      return;
    }

    reset(toEmployeeFormValues(loadedEmployee));
    setEditValues(toEmployeeEditValues(loadedEmployee));
    initializedEmployeeId.current = normalizedEmployeeId;
  }, [isEditing, loadedEmployee, normalizedEmployeeId, open, reset]);

  const vacantPositions = vacantPositionsQuery.data?.success
    ? vacantPositionsQuery.data.data
    : [];
  const vacantPositionsError = vacantPositionsQuery.data && !vacantPositionsQuery.data.success
    ? vacantPositionsQuery.data.errors?.join(". ") || vacantPositionsQuery.data.message
    : vacantPositionsQuery.error instanceof Error
      ? vacantPositionsQuery.error.message
      : null;
  const selectedInitialJob = selectedInitialPosition
    ? getVacantPositionJob(selectedInitialPosition)
    : null;

  const closeDialog = () => {
    if (!isPending) onClose();
  };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    const corePayload: EmployeeCreatePayload = {
      Ref_Employee: values.employeeNumber,
      EmployeeName: values.nameArabic || null,
      EmployeeName_En: values.nameEnglish,
      Gender: values.gender || null,
      DateOFBirth: values.dateOfBirth || null,
      Phone: values.phone || null,
      Email: values.email || null,
      State: values.status === "active",
      Contract_Type: values.contractType || null,
      Start_of_Contract: values.contractStartDate || null,
      Type_Employee: values.employeeType || null,
      Department_Id: values.departmentId ? Number(values.departmentId) : null,
      Location_Id: values.locationId ? Number(values.locationId) : null
    };

    try {
      if (isEditing && (!hasValidEmployeeId || normalizedEmployeeId === null)) {
        throw new Error("A valid employee ID is required");
      }
      const createPayload: EmployeeCreatePayload = selectedInitialPosition
        ? {
            ...corePayload,
            positionAssignment: {
              positionId: selectedInitialPosition.PositionId
            }
          }
        : corePayload;
      const variables: SaveEmployeeVariables = isEditing
        ? {
            mode: "edit",
            employeeId: normalizedEmployeeId as string,
            payload: toEmployeeUpdatePayload(corePayload, editValues)
          }
        : { mode: "create", payload: createPayload };
      const result = await saveEmployee(variables);
      if (!result.success) {
        setSubmitError(result.errors?.join(". ") || result.message);
        return;
      }

      const invalidations = [
        queryClient.invalidateQueries({ queryKey: ["employees"] }),
        queryClient.invalidateQueries({ queryKey: ["hr", "hr-dashboard"] })
      ];
      if (!isEditing && selectedInitialPosition) {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: ["positions", "vacant"] })
        );
      }
      await Promise.all(invalidations);
      onSaved(result.data, mode);
      onClose();
    } catch (error) {
      setSubmitError(getRequestErrorMessage(error, mode));
    }
  });

  const updateEditValue = (key: string, value: string) => {
    setEditValues((current) => ({ ...current, [key]: value }));
  };

  const renderEditField = (field: EditFieldDefinition) => {
    const value = editValues[field.key] ?? "";
    const commonSx = field.wide ? { gridColumn: { sm: "1 / -1" } } : undefined;

    if (field.kind === "boolean") {
      return (
        <TextField
          key={field.key}
          label={field.label}
          size="small"
          select
          value={value}
          disabled={isPending}
          onChange={(event) => updateEditValue(field.key, event.target.value)}
          sx={commonSx}
        >
          <MenuItem value="">Not specified</MenuItem>
          <MenuItem value="true">Yes</MenuItem>
          <MenuItem value="false">No</MenuItem>
        </TextField>
      );
    }

    return (
      <TextField
        key={field.key}
        label={field.label}
        size="small"
        value={value}
        disabled={isPending || field.kind === "readonly"}
        type={field.kind === "date" || field.kind === "number"
          ? field.kind
          : "text"}
        multiline={field.kind === "multiline"}
        minRows={field.kind === "multiline" ? 2 : undefined}
        InputLabelProps={field.kind === "date" ? { shrink: true } : undefined}
        inputProps={field.kind === "number" ? { step: "any" } : undefined}
        onChange={(event) => updateEditValue(field.key, event.target.value)}
        sx={commonSx}
      />
    );
  };

  const renderEditSections = (sections: EditSection[]) => sections.map((section, sectionIndex) => (
    <Accordion
      key={section.title}
      defaultExpanded={sectionIndex === 0}
      disableGutters
      variant="outlined"
      sx={{
        alignSelf: "start",
        overflow: "hidden",
        borderColor: "var(--hr-border)",
        borderRadius: "10px !important",
        bgcolor: "var(--hr-surface)",
        boxShadow: "none",
        "&::before": { display: "none" }
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreRoundedIcon />}
        sx={{
          minHeight: 52,
          px: 2,
          bgcolor: "var(--hr-surface-soft)",
          "& .MuiAccordionSummary-content": { my: 1.25 },
          "&.Mui-expanded": { minHeight: 52 }
        }}
      >
        <Typography sx={{ color: "var(--hr-text)", fontSize: 13.5, fontWeight: 800 }}>
          {section.title}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 2 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" },
            gap: 1.5
          }}
        >
          {section.fields.map(renderEditField)}
        </Box>
      </AccordionDetails>
    </Accordion>
  ));

  const personalInformationFields = (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
        gap: 1.6
      }}
    >
      <TextField
        label="Employee Number"
        size="small"
        autoFocus={!isEditing}
        required
        fullWidth
        {...register("employeeNumber")}
        error={Boolean(errors.employeeNumber)}
        helperText={errors.employeeNumber?.message}
      />
      <TextField
        label="Date of Birth"
        size="small"
        type="date"
        fullWidth
        InputLabelProps={{ shrink: true }}
        {...register("dateOfBirth")}
      />
      <TextField
        label="Employee Name (English)"
        size="small"
        required
        fullWidth
        {...register("nameEnglish")}
        error={Boolean(errors.nameEnglish)}
        helperText={errors.nameEnglish?.message}
      />
      <TextField
        label="Employee Name (Arabic)"
        size="small"
        dir="rtl"
        fullWidth
        {...register("nameArabic")}
        error={Boolean(errors.nameArabic)}
        helperText={errors.nameArabic?.message}
      />
      <Controller
        name="gender"
        control={control}
        render={({ field }) => (
          <TextField {...field} label="Gender" size="small" select fullWidth>
            <MenuItem value="">Not specified</MenuItem>
            <MenuItem value="Male">Male</MenuItem>
            <MenuItem value="Female">Female</MenuItem>
            {field.value && !["Male", "Female"].includes(field.value) ? (
              <MenuItem value={field.value}>{field.value}</MenuItem>
            ) : null}
          </TextField>
        )}
      />
      <TextField
        label="Phone"
        size="small"
        fullWidth
        {...register("phone")}
        error={Boolean(errors.phone)}
        helperText={errors.phone?.message}
      />
      <TextField
        label="Email"
        size="small"
        type="email"
        fullWidth
        {...register("email")}
        error={Boolean(errors.email)}
        helperText={errors.email?.message}
        sx={{ gridColumn: { sm: "1 / -1" } }}
      />
    </Box>
  );

  const employmentInformationFields = (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
        gap: 1.6
      }}
    >
      <Controller
        name="departmentId"
        control={control}
        render={({ field }) => {
          const selectedDepartment = departments.find(
            (department) => department.id === field.value
          ) ?? null;

          return (
            <Autocomplete
              options={departments}
              value={selectedDepartment}
              loading={departmentsLoading}
              getOptionLabel={(department) => department.label}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onChange={(_event, department) => field.onChange(department?.id ?? "")}
              noOptionsText={departmentsError
                ? "Departments could not be loaded"
                : departmentsLoading
                  ? "Loading departments..."
                  : "No matching departments"}
              renderOption={(props, department) => (
                <li {...props}>
                  <Box minWidth={0} py={0.25}>
                    <Typography sx={{ color: "var(--hr-text)", fontSize: 12.5, fontWeight: 800 }}>
                      {department.englishName || department.arabicName || `Department #${department.id}`}
                    </Typography>
                    {department.arabicName ? (
                      <Typography dir="rtl" sx={{ color: "var(--hr-muted)", fontSize: 11.5, textAlign: "left" }}>
                        {department.arabicName}
                      </Typography>
                    ) : null}
                    {department.type ? (
                      <Typography sx={{ color: "var(--hr-muted)", fontSize: 10.5 }}>
                        {department.type}
                      </Typography>
                    ) : null}
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Department"
                  size="small"
                  error={Boolean(errors.departmentId) || Boolean(departmentsError)}
                  helperText={errors.departmentId?.message ?? departmentsError ?? "Optional — type to search English or Arabic names"}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {departmentsLoading ? <CircularProgress color="inherit" size={17} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    )
                  }}
                />
              )}
              sx={{ gridColumn: { sm: "1 / -1" } }}
            />
          );
        }}
      />
      <Controller
        name="locationId"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label="Work Location"
            size="small"
            select
            fullWidth
            error={Boolean(errors.locationId)}
            helperText={errors.locationId?.message}
            sx={{ gridColumn: { sm: "1 / -1" } }}
          >
            <MenuItem value="">Not assigned</MenuItem>
            {locations.map((location) => (
              <MenuItem key={location.id} value={location.id}>{location.label}</MenuItem>
            ))}
          </TextField>
        )}
      />
      <TextField
        label="Employee Type"
        size="small"
        fullWidth
        {...register("employeeType")}
        error={Boolean(errors.employeeType)}
        helperText={errors.employeeType?.message}
      />
      <TextField
        label="Contract Type"
        size="small"
        fullWidth
        {...register("contractType")}
        error={Boolean(errors.contractType)}
        helperText={errors.contractType?.message}
      />
      <TextField
        label="Contract Start Date"
        size="small"
        type="date"
        fullWidth
        InputLabelProps={{ shrink: true }}
        {...register("contractStartDate")}
      />
      <Controller
        name="status"
        control={control}
        render={({ field }) => (
          <TextField {...field} label="Status" size="small" select fullWidth>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </TextField>
        )}
      />
    </Box>
  );

  const initialPositionFields = (
    <Stack spacing={1.6}>
      <Autocomplete
        options={vacantPositions}
        value={selectedInitialPosition}
        onOpen={() => setVacancyPickerActivated(true)}
        onChange={(_event, position) => setSelectedInitialPosition(position)}
        getOptionLabel={vacantPositionLabel}
        filterOptions={filterVacantPositions}
        isOptionEqualToValue={(option, value) => option.PositionId === value.PositionId}
        loading={vacantPositionsQuery.isFetching}
        disabled={isPending || Boolean(vacantPositionsError)}
        noOptionsText={!vacancyPickerActivated
          ? "Open to load vacant positions"
          : vacantPositionsQuery.isFetching
            ? "Loading vacant positions…"
            : "No matching vacant positions"}
        renderOption={(props, position) => {
          const job = getVacantPositionJob(position);
          return (
            <li {...props}>
              <Box minWidth={0} py={0.35}>
                <Typography sx={{ color: "var(--hr-text)", fontSize: 12.5, fontWeight: 800 }}>
                  Position {formatPositionNumber(position.Position_Number)}
                </Typography>
                <Typography sx={{ color: "var(--hr-strong-muted)", fontSize: 11.5 }}>
                  {job.english}
                </Typography>
                {job.arabic ? (
                  <Typography dir="rtl" sx={{ color: "var(--hr-muted)", fontSize: 11, textAlign: "left" }}>
                    {job.arabic}
                  </Typography>
                ) : null}
                {position.Position_Degree ? (
                  <Typography sx={{ color: "var(--hr-muted)", fontSize: 10, mt: 0.25 }}>
                    Degree {position.Position_Degree}
                  </Typography>
                ) : null}
              </Box>
            </li>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Initial position"
            placeholder="Search by position number or Arabic / English job name"
            helperText={vacantPositionsQuery.data?.success
              ? `${vacantPositions.length.toLocaleString()} vacant positions available`
              : "Optional — open the list to load vacant positions"}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {vacantPositionsQuery.isFetching ? <CircularProgress color="inherit" size={17} /> : null}
                  {params.InputProps.endAdornment}
                </>
              )
            }}
          />
        )}
      />

      {vacantPositionsError ? (
        <Alert
          severity="error"
          action={<Button color="inherit" size="small" onClick={() => void vacantPositionsQuery.refetch()}>Retry</Button>}
        >
          Vacant positions could not be loaded. {vacantPositionsError}
        </Alert>
      ) : null}

      {selectedInitialPosition && selectedInitialJob ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
            gap: 1.5,
            p: { xs: 1.5, md: 1.8 },
            border: "1px solid var(--hr-accent-border)",
            borderRadius: "10px",
            bgcolor: "var(--hr-selected)"
          }}
        >
          <Box>
            <Typography sx={{ color: "var(--hr-muted)", fontSize: 10.5, fontWeight: 750 }}>Position number</Typography>
            <Typography sx={{ color: "var(--hr-text)", fontSize: 12.5, fontWeight: 850, mt: 0.35 }}>
              {formatPositionNumber(selectedInitialPosition.Position_Number)}
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ color: "var(--hr-muted)", fontSize: 10.5, fontWeight: 750 }}>Job name</Typography>
            <Typography sx={{ color: "var(--hr-text)", fontSize: 12.5, fontWeight: 800, mt: 0.35 }}>
              {selectedInitialJob.english}
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ color: "var(--hr-muted)", fontSize: 10.5, fontWeight: 750 }}>Job name (Arabic)</Typography>
            <Typography dir="rtl" sx={{ color: "var(--hr-text)", fontSize: 12.5, fontWeight: 800, textAlign: "left", mt: 0.35 }}>
              {selectedInitialJob.arabic || "—"}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap sx={{ gridColumn: { sm: "1 / -1" }, alignItems: "center" }}>
            {selectedInitialPosition.Position_Degree ? <Chip label={`Degree ${selectedInitialPosition.Position_Degree}`} size="small" variant="outlined" /> : null}
            {selectedInitialPosition.Position_Type ? <Chip label={selectedInitialPosition.Position_Type} size="small" variant="outlined" /> : null}
          </Stack>
          <Stack direction="row" spacing={0.7} alignItems="flex-start" sx={{ gridColumn: { sm: "1 / -1" }, color: "var(--hr-muted)" }}>
            <LockOutlinedIcon sx={{ fontSize: 15, mt: 0.1 }} />
            <Typography sx={{ fontSize: 10.5, lineHeight: 1.45 }}>
              Job details come from the selected Position row and cannot be edited here. The employee number will be saved on that position.
            </Typography>
          </Stack>
        </Box>
      ) : (
        <Typography sx={{ color: "var(--hr-muted)", fontSize: 11.5 }}>
          Leave this empty to create the employee without a position. A position can be selected later from the employee profile.
        </Typography>
      )}
    </Stack>
  );

  const showEditLoader = isEditing && employeeQuery.isPending;
  const showEditForm = !isEditing || Boolean(loadedEmployee);

  return (
    <Dialog
      open={open}
      onClose={closeDialog}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="xl"
      scroll="paper"
      disableEscapeKeyDown={isPending}
      aria-labelledby={EMPLOYEE_FORM_TITLE_ID}
      aria-describedby={EMPLOYEE_FORM_DESCRIPTION_ID}
      sx={(dialogTheme) => ({
        ...getHrThemeVars(dialogTheme),
        "& .MuiDialog-paper": {
          width: { sm: "calc(100% - 32px)", lg: 1180 },
          maxWidth: 1180,
          maxHeight: { sm: "calc(100dvh - 32px)" },
          m: { xs: 0, sm: 2 },
          overflow: "hidden",
          border: { sm: "1px solid var(--hr-border)" },
          borderRadius: { xs: 0, sm: "14px" },
          bgcolor: "var(--hr-surface)",
          boxShadow: "0 24px 70px rgba(7, 28, 89, 0.22)"
        }
      })}
    >
      <DialogTitle
        component="div"
        sx={{
          px: { xs: 2, md: 3 },
          py: { xs: 1.75, md: 2.25 },
          borderBottom: "1px solid var(--hr-border)",
          bgcolor: "var(--hr-surface)"
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
            <Box
              aria-hidden="true"
              sx={{
                width: 44,
                height: 44,
                flex: "0 0 auto",
                display: "grid",
                placeItems: "center",
                color: "var(--hr-accent)",
                bgcolor: "var(--hr-selected)",
                borderRadius: "11px",
                "& .MuiSvgIcon-root": { fontSize: 23 }
              }}
            >
              {isEditing ? <EditRoundedIcon /> : <PersonAddAltRoundedIcon />}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                id={EMPLOYEE_FORM_TITLE_ID}
                sx={{ color: "var(--hr-text)", fontSize: { xs: 19, md: 22 }, lineHeight: 1.25, fontWeight: 850 }}
              >
                {isEditing ? "Edit Employee" : "New Employee"}
              </Typography>
              <Typography
                id={EMPLOYEE_FORM_DESCRIPTION_ID}
                sx={{ mt: 0.35, color: "var(--hr-muted)", fontSize: { xs: 11.5, md: 12.5 }, lineHeight: 1.4 }}
              >
                {isEditing
                  ? "Review and update personal, contact, and administrative information."
                  : "Add the employee's personal and employment information. Required fields are marked *."}
              </Typography>
            </Box>
          </Stack>
          <IconButton
            aria-label="Close employee form"
            onClick={closeDialog}
            disabled={isPending}
            sx={{ flex: "0 0 auto", color: "var(--hr-strong-muted)" }}
          >
            <CloseRoundedIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent
        sx={{
          minHeight: 0,
          p: { xs: 2, md: 3 },
          bgcolor: "var(--hr-surface-soft)"
        }}
      >
      {showEditLoader ? (
        <Box sx={{ minHeight: 420, display: "grid", placeItems: "center" }}>
          <Stack alignItems="center" spacing={1.5}>
            <CircularProgress size={30} />
            <Typography color="text.secondary">Loading employee details...</Typography>
          </Stack>
        </Box>
      ) : employeeLoadError ? (
        <Alert
          severity="error"
          action={hasValidEmployeeId ? (
            <Button color="inherit" size="small" onClick={() => void employeeQuery.refetch()}>
              Retry
            </Button>
          ) : undefined}
        >
          {employeeLoadError}
        </Alert>
      ) : showEditForm ? (
        <Box
          id={EMPLOYEE_FORM_ID}
          component="form"
          noValidate
          onSubmit={onSubmit}
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: isEditing ? "1fr" : "repeat(2, minmax(0, 1fr))" },
            gap: 2.25,
            minHeight: 0
          }}
        >
          {submitError ? (
            <Alert severity="error" role="alert" sx={{ gridColumn: "1 / -1" }}>
              {submitError}
            </Alert>
          ) : null}

          {isEditing ? (
            <Tabs
              value={activeSection}
              onChange={(_event, value: "overview" | "administrative") => setActiveSection(value)}
              aria-label="Employee form sections"
              variant="fullWidth"
              sx={{
                gridColumn: "1 / -1",
                minHeight: 46,
                p: 0.5,
                border: "1px solid var(--hr-border)",
                borderRadius: "10px",
                bgcolor: "var(--hr-surface)",
                "& .MuiTab-root": { minHeight: 38, borderRadius: "7px", fontSize: 13, fontWeight: 800, textTransform: "none" },
                "& .Mui-selected": { bgcolor: "var(--hr-selected)" },
                "& .MuiTabs-indicator": { display: "none" }
              }}
            >
              <Tab value="overview" label="Overview & personal" />
              <Tab value="administrative" label="Administrative & employment" />
            </Tabs>
          ) : null}

          <Box
            role="tabpanel"
            aria-label="Overview and personal information"
            hidden={isEditing && activeSection !== "overview"}
            sx={{ minWidth: 0 }}
          >
            <Stack spacing={2.25}>
              <FormSectionCard
                title="Identity & contact"
                description="Basic employee details and the best way to contact them."
                icon={<BadgeOutlinedIcon />}
              >
                {personalInformationFields}
              </FormSectionCard>

              {isEditing ? (
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "repeat(2, minmax(0, 1fr))" }, gap: 1.5 }}>
                  {renderEditSections(editFieldGroups[0].sections)}
                </Box>
              ) : null}
            </Stack>
          </Box>

          <Box
            role="tabpanel"
            aria-label="Administrative and employment information"
            hidden={isEditing && activeSection !== "administrative"}
            sx={{ minWidth: 0 }}
          >
            <Stack spacing={2.25}>
              <FormSectionCard
                title="Employment & contract"
                description="Work location, employee classification, contract, and current status."
                icon={<BusinessCenterOutlinedIcon />}
              >
                {employmentInformationFields}
              </FormSectionCard>

              {isEditing ? (
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "repeat(2, minmax(0, 1fr))" }, gap: 1.5 }}>
                  {renderEditSections(editFieldGroups[1].sections)}
                </Box>
              ) : null}
            </Stack>
          </Box>

          {!isEditing ? (
            <Box sx={{ gridColumn: "1 / -1", minWidth: 0 }}>
              <FormSectionCard
                title="Initial position"
                description="Optionally place this employee in a vacant position as part of the same create operation."
                icon={<WorkOutlineRoundedIcon />}
              >
                {initialPositionFields}
              </FormSectionCard>
            </Box>
          ) : null}

          <DialogActions
            sx={{
              gridColumn: "1 / -1",
              position: "sticky",
              zIndex: 2,
              bottom: { xs: -16, md: -24 },
              mx: { xs: -2, md: -3 },
              mb: { xs: -2, md: -3 },
              mt: 0.5,
              px: { xs: 2, md: 3 },
              py: 1.75,
              borderTop: "1px solid var(--hr-border)",
              bgcolor: "var(--hr-surface)",
              boxShadow: "0 -8px 22px rgba(7, 28, 89, 0.06)"
            }}
          >
            <Typography sx={{ mr: "auto", color: "var(--hr-muted)", fontSize: 12, display: { xs: "none", sm: "block" } }}>
              Required fields are marked with *
            </Typography>
            <Button onClick={closeDialog} disabled={isPending} sx={{ minWidth: 92, textTransform: "none", fontWeight: 700 }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isPending}
              sx={{
                minWidth: { xs: 138, sm: 164 },
                borderRadius: "8px",
                color: "var(--hr-on-accent)",
                bgcolor: "var(--hr-primary-button)",
                boxShadow: "none",
                textTransform: "none",
                fontWeight: 800,
                "&:hover": { bgcolor: "var(--hr-primary-button-hover)", boxShadow: "none" }
              }}
            >
              {isPending
                ? isEditing ? "Saving..." : "Creating..."
                : isEditing ? "Save Changes" : "Create Employee"}
            </Button>
          </DialogActions>
        </Box>
      ) : null}
      </DialogContent>
    </Dialog>
  );
};
