export type TimesheetDayCell = {
  dayIndex: number;
  date: string;
  label: string;
  weekday: number;
  code: string | null;
  afeId: number | null;
  source: "saved" | "vacation" | "holiday" | "weekend" | "empty" | "edited";
  isWeekendOrHoliday: boolean;
};

export type TimesheetDayHeader = {
  dayIndex: number;
  date: string;
  label: string;
  weekday: number;
  isWeekendOrHoliday: boolean;
};

export type TimesheetMonthRow = {
  Id: number | null;
  ID_Employee: number;
  EmployeeNo: string | null;
  EmployeeName: string | null;
  EmployeeName_En: string | null;
  Job_Name: string | null;
  Job_Name_AR: string | null;
  Job_Name_EN: string | null;
  LineLevelId: number | null;
  LineLevelSort: number | null;
  LineLevelName_AR: string | null;
  LineLevelName_EN: string | null;
  DATE_JS: string;
  IS_Approved: boolean | null;
  days: TimesheetDayCell[];
};

export type TimesheetMonthResult = {
  success: boolean;
  message?: string;
  data: TimesheetMonthRow[];
  period: {
    year: number;
    month: number;
    dateJs: string;
    start: string;
    end: string;
    dayHeaders: TimesheetDayHeader[];
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type TimesheetSavePayload = {
  year: number;
  month: number;
  rows: Array<{
    ID_Employee: number;
    Job_Name?: string | null;
    days: Array<{ dayIndex: number; code: string | null; afeId?: number | null }>;
  }>;
};

export type TimesheetSaveResult = {
  success: boolean;
  message?: string;
  year: number;
  month: number;
  dateJs: string;
  saved: number;
  created: number;
  updated: number;
  skippedApproved: number;
  skippedInvalid: number;
};

export type TimesheetSaveAllPayload = {
  year: number;
  month: number;
  search?: string;
  activeOnly?: boolean;
  page: number;
  pageSize: number;
};

export type TimesheetSaveAllResult = TimesheetSaveResult & {
  page: number;
  pageSize: number;
  total: number;
  processed: number;
  done: boolean;
};
