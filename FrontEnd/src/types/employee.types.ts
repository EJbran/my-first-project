export type EmployeeDatabaseValue = string | number | boolean | null;

export interface EmployeeListRecord {
  ID_Employee: EmployeeDatabaseValue;
  Ref_Employee: EmployeeDatabaseValue;
  EmployeeName: EmployeeDatabaseValue;
  EmployeeName_En: EmployeeDatabaseValue;
  Email: EmployeeDatabaseValue;
  Gender: EmployeeDatabaseValue;
  Nationality: EmployeeDatabaseValue;
  DateOFBirth: EmployeeDatabaseValue;
  PlaceOFBirth: EmployeeDatabaseValue;
  FamilyBook_Issuer: EmployeeDatabaseValue;
  Job_Id: EmployeeDatabaseValue;
  ResolvedJobName?: EmployeeDatabaseValue;
  ResolvedJobName_AR?: EmployeeDatabaseValue;
  CurrentPositionId?: EmployeeDatabaseValue;
  CurrentPositionNumber?: EmployeeDatabaseValue;
  CurrentPositionType?: EmployeeDatabaseValue;
  CurrentPositionLevel?: EmployeeDatabaseValue;
  CurrentPositionDegree?: EmployeeDatabaseValue;
  CurrentLineLevelId?: EmployeeDatabaseValue;
  CurrentLineLevelSort?: EmployeeDatabaseValue;
  CurrentLineLevelName_EN?: EmployeeDatabaseValue;
  CurrentLineLevelName_AR?: EmployeeDatabaseValue;
  Job_Name?: EmployeeDatabaseValue;
  Contract_Type: EmployeeDatabaseValue;
  Type_Employee: EmployeeDatabaseValue;
  State: EmployeeDatabaseValue;
  Department_Id: EmployeeDatabaseValue;
  ResolvedDepartmentId?: EmployeeDatabaseValue;
  DepartmentName_Arabic?: EmployeeDatabaseValue;
  DepartmentName_English?: EmployeeDatabaseValue;
  DepartmentType?: EmployeeDatabaseValue;
  DepartmentAttachedNumber?: EmployeeDatabaseValue;
  DepartmentAddress?: EmployeeDatabaseValue;
  DepartmentPhone?: EmployeeDatabaseValue;
  DepartmentExtenstion?: EmployeeDatabaseValue;
  ParentDepartmentId?: EmployeeDatabaseValue;
  ParentDepartmentName_Arabic?: EmployeeDatabaseValue;
  ParentDepartmentName_English?: EmployeeDatabaseValue;
  ParentDepartmentType?: EmployeeDatabaseValue;
  Location_Id: EmployeeDatabaseValue;
  LocationName_ar: EmployeeDatabaseValue;
  LocationName_en: EmployeeDatabaseValue;
  Start_of_Contract: EmployeeDatabaseValue;
  End_of_contrat: EmployeeDatabaseValue;
  YearSuppliment_YEAR: EmployeeDatabaseValue;
  YearSuppliment_MONTH: EmployeeDatabaseValue;
  Year_suppliment_Day: EmployeeDatabaseValue;
}

export interface EmployeeSearchOption {
  value: string;
  label: string;
}

export interface EmployeeSearchOptions {
  jobs: EmployeeSearchOption[];
  departments: EmployeeSearchOption[];
  workLocations: EmployeeSearchOption[];
  genders: EmployeeSearchOption[];
  nationalities: EmployeeSearchOption[];
  employeeTypes: EmployeeSearchOption[];
  contractTypes: EmployeeSearchOption[];
  placesOfBirth: EmployeeSearchOption[];
  familyBookIssuers: EmployeeSearchOption[];
}

export interface EmployeeSearchFilters {
  search?: string;
  employeeNumber?: string;
  status?: string;
  departmentId?: string;
  locationId?: string;
  jobId?: string;
  gender?: string;
  nationality?: string;
  employeeType?: string;
  contractType?: string;
  placeOfBirth?: string;
  familyBookIssuer?: string;
  ageMin?: number;
  ageMax?: number;
  contractStartFrom?: string;
  contractStartTo?: string;
  contractEndFrom?: string;
  contractEndTo?: string;
  ageBand?: string;
  contractRisk?: string;
  seniorityMilestone?: string;
  missingField?: string;
  asOf?: string;
}

export interface EmployeeSearchRequest extends EmployeeSearchFilters {
  page: number;
  pageSize: number;
}

export interface EmployeeDeleteResult {
  id: number;
  employeeNumber: EmployeeDatabaseValue;
  employeeName: EmployeeDatabaseValue;
}

export type EmployeeRecord = EmployeeListRecord & Record<string, EmployeeDatabaseValue>;

export interface EmployeeCreatePayload {
  Ref_Employee: string;
  EmployeeName: string | null;
  EmployeeName_En: string;
  Gender: string | null;
  DateOFBirth: string | null;
  Phone: string | null;
  Email: string | null;
  State: boolean;
  Contract_Type: string | null;
  Start_of_Contract: string | null;
  Type_Employee: string | null;
  Department_Id: number | null;
  Location_Id: number | null;
  positionAssignment?: { positionId: number };
}

export interface EmployeeUpdatePayload extends EmployeeCreatePayload {
  Address: string | null;
  Notes: string | null;
  Marital_Status: string | null;
  Nationality: string | null;
  MotherName: string | null;
  PlaceOFBirth: string | null;
  Blood_type: string | null;
  Children_Number: number | null;
  IS_FOREINGHT: boolean | null;
  NationalNumber: string | null;
  Registration_Num: string | null;
  FamilyBook_No: string | null;
  FamilyBook_Issuer: string | null;
  FamilyPage_Num: string | null;
  FamilyPageBook_Num: string | null;
  IdentityCard_Num: string | null;
  IdentityCard_Issuer: string | null;
  Passport_Num: string | null;
  PassportExpiryDate: string | null;
  Passport_Issuer: string | null;
  DateVisa_End: string | null;
  IS_DrivingLicense: boolean | null;
  DrivingLicense_Num: string | null;
  End_of_contrat: string | null;
  Period_Contract: string | null;
  WorkSystem: string | null;
  WorkSystem_Description: string | null;
  Time_Start: string | null;
  Time_End: string | null;
  Degree_Employee: string | null;
  IS_OK_POUR_MALAK: boolean | null;
  AssignedPosition_Id: number | null;
  AssignedPositionDegree: string | null;
  AssignedPositionNum: string | null;
  SecondedPosition_Id: number | null;
  SecondedPositionDegree: string | null;
  SecondedPositionNum: number | null;
  AppointmentDecision_Number: string | null;
  AppointmentDecision_Date: string | null;
  AppointmentDecision_Issuer: string | null;
  CompanyDecision_Number: string | null;
  CompanyDecision_Date: string | null;
  AppointmentType: string | null;
  Type_END_CONTRACT: string | null;
  Finance_Num: string | null;
  INAS_Type: string | null;
  INAS_Number: string | null;
  BankAccount_Number: string | null;
  Base_Salary: number | null;
  FieldAllowance: number | null;
  EducationalQualification_AsHiring: string | null;
  AcademicQualification_AsTime: string | null;
  GraduationDate: string | null;
  Specialization: string | null;
  CurrentQualification_Date: string | null;
  VacationTransfer_Date: string | null;
  Vacation_balance: string | null;
  Year_suppliment_Day: number | null;
  DateYear_Suppliment: string | null;
  YearSuppliment_YEAR: number | null;
  YearSuppliment_MONTH: number | null;
  PracticeLicense_Start: string | null;
  PracticeLicense_End: string | null;
  ZONNE: string | null;
  IS_EMPRENTED: boolean | null;
  TYPE_TRAVAIL_WARDIA: string | null;
  Stop_takrim: boolean | null;
  Notes_Stop_takrim: string | null;
  Percent_takrim: number | null;
  Date_urgent_takrim: string | null;
  OLD_EMP_NUM2: string | null;
  OLD_EMP_NUM3: string | null;
  OLD_EMP_NUM4: string | null;
  OLD_EMP_NUM5: string | null;
  OLD_JobId3: number | null;
  OLD_JobDEGREE_3: string | null;
  OLD_JobNum3: string | null;
  OLD_JobId4: string | null;
  OLD_JobDEGREE_4: string | null;
  OLD_JobNum4: string | null;
  OLD_JobId5: string | null;
  OLD_JobDEGREE_5: string | null;
  OLD_JobNum5: string | null;
  Tadawul_No: string | null;
  MedicalSymptoms: string | null;
  SuitNumber: string | null;
  ShoesNumber: string | null;
  Comment_one: string | null;
}
