import { Op } from "sequelize";
import {
  Employee,
  Holiday,
  Job,
  LineLevel,
  Position,
  sequelize,
  TimeSheet,
  TimeSheetCode,
  Vacation
} from "../../model/HR";

export type TimesheetMonthQuery = {
  year?: string;
  month?: string;
  page?: string;
  pageSize?: string;
  search?: string;
  activeOnly?: string;
  departmentId?: number;
};

export type TimesheetDayCell = {
  dayIndex: number;
  date: string;
  label: string;
  weekday: number;
  code: string | null;
  afeId: number | null;
  source: "saved" | "vacation" | "holiday" | "weekend" | "empty";
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

const HOLIDAY_DISPLAY_CODE = "H";
const WEEKEND_DAYS = new Set([5, 6]); // Friday=5, Saturday=6 (Sunday is a normal work day)

const isRealEmployeeNo = (value: string | number | null | undefined): boolean => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed === "0") {
    return false;
  }
  const asNumber = Number(trimmed);
  return Number.isNaN(asNumber) || asNumber !== 0;
};

const pad2 = (value: number) => String(value).padStart(2, "0");

const toDateOnly = (value: Date): string => {
  const y = value.getUTCFullYear();
  const m = pad2(value.getUTCMonth() + 1);
  const d = pad2(value.getUTCDate());
  return `${y}-${m}-${d}`;
};

const parseDateOnly = (value: string | Date | null | undefined): Date | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
    );
  }

  const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return null;
  }

  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
};

/**
 * Timesheet cycle for DATE_JS month (second month):
 * from day 9 of previous month through day 10 of DATE_JS month.
 */
export const buildTimesheetPeriod = (year: number, month: number) => {
  const periodEnd = new Date(Date.UTC(year, month - 1, 10));
  const periodStart = new Date(Date.UTC(year, month - 2, 9));
  const dateJs = `${year}-${pad2(month)}-01`;

  const days: Array<{ dayIndex: number; date: Date; dateOnly: string }> = [];
  const cursor = new Date(periodStart);
  let dayIndex = 1;

  while (cursor.getTime() <= periodEnd.getTime()) {
    days.push({
      dayIndex,
      date: new Date(cursor),
      dateOnly: toDateOnly(cursor)
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    dayIndex += 1;
  }

  return { periodStart, periodEnd, dateJs, days };
};

const monthDayKey = (date: Date) =>
  `${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;

const isHolidayDate = (
  date: Date,
  holidays: Array<{ HolidayDate: string | Date; IsFixedDate: boolean }>
): boolean => {
  const exact = toDateOnly(date);
  const md = monthDayKey(date);

  return holidays.some((holiday) => {
    const holidayDate = parseDateOnly(holiday.HolidayDate);
    if (!holidayDate) {
      return false;
    }

    if (holiday.IsFixedDate) {
      return monthDayKey(holidayDate) === md;
    }

    return toDateOnly(holidayDate) === exact;
  });
};

const normalizeAfeId = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(String(value).trim());
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const isDateInMonth = (
  value: string | Date | null | undefined,
  year: number,
  month: number
): boolean => {
  const parsed = parseDateOnly(value);
  if (!parsed) {
    return false;
  }

  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() + 1 === month;
};

type EmployeePositionSnapshot = {
  jobNameAr: string | null;
  jobNameEn: string | null;
  jobNameDisplay: string | null;
  lineLevelId: number | null;
  lineLevelSort: number | null;
  lineLevelNameAr: string | null;
  lineLevelNameEn: string | null;
};

const normalizeText = (value: unknown): string | null => {
  if (value == null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized || null;
};

const buildEmployeePositionMap = async (
  employeeIds: number[]
): Promise<Map<number, EmployeePositionSnapshot>> => {
  if (!employeeIds.length) {
    return new Map<number, EmployeePositionSnapshot>();
  }

  const positions = await Position.findAll({
    where: {
      EmployeeId: { [Op.in]: employeeIds }
    },
    attributes: ["Id", "EmployeeId", "Job_ID", "LineLevelId"],
    include: [
      {
        model: Job,
        as: "Job",
        attributes: ["Job_Name_AR", "Job_Name_EN"],
        required: false
      },
      {
        model: LineLevel,
        as: "LineLevel",
        attributes: ["Line_ID", "SortLine", "ArabicDescription", "EnglishDescription"],
        required: false
      }
    ],
    order: [["EmployeeId", "ASC"], ["Id", "DESC"]]
  });

  const byEmployee = new Map<number, EmployeePositionSnapshot>();

  for (const position of positions) {
    const employeeId = Number(position.getDataValue("EmployeeId"));
    if (!Number.isFinite(employeeId) || employeeId <= 0 || byEmployee.has(employeeId)) {
      continue;
    }

    const plain = position.get({ plain: true }) as {
      LineLevelId?: number | null;
      Job?: { Job_Name_AR?: string | null; Job_Name_EN?: string | null };
      LineLevel?: {
        SortLine?: number | null;
        ArabicDescription?: string | null;
        EnglishDescription?: string | null;
      };
    };

    const jobNameAr = normalizeText(plain.Job?.Job_Name_AR);
    const jobNameEn = normalizeText(plain.Job?.Job_Name_EN);
    const lineLevelNameAr = normalizeText(plain.LineLevel?.ArabicDescription);
    const lineLevelNameEn = normalizeText(plain.LineLevel?.EnglishDescription);

    byEmployee.set(employeeId, {
      jobNameAr,
      jobNameEn,
      jobNameDisplay: jobNameEn || jobNameAr,
      lineLevelId: plain.LineLevelId ?? null,
      lineLevelSort: plain.LineLevel?.SortLine ?? null,
      lineLevelNameAr,
      lineLevelNameEn
    });
  }

  return byEmployee;
};

export const listTimesheetsByMonth = async (
  query: TimesheetMonthQuery,
  departmentId?: number
) => {
  const now = new Date();
  const year = Math.max(1970, Number(query.year) || now.getFullYear());
  const month = Math.min(12, Math.max(1, Number(query.month) || now.getMonth() + 1));
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(query.pageSize) || 50));
  const search = query.search?.trim() || "";
  const activeOnly = query.activeOnly !== "false";

  const { periodStart, periodEnd, dateJs, days } = buildTimesheetPeriod(year, month);
  const periodStartText = toDateOnly(periodStart);
  const periodEndText = toDateOnly(periodEnd);

  const employeeWhere: Record<string, unknown>[] = [
    sequelize.literal(`
      [Employee].[Ref_Employee] IS NOT NULL
      AND LTRIM(RTRIM(CAST([Employee].[Ref_Employee] AS NVARCHAR(50)))) NOT IN (N'', N'0')
      AND ISNULL(
        TRY_CAST(LTRIM(RTRIM(CAST([Employee].[Ref_Employee] AS NVARCHAR(50)))) AS INT),
        -1
      ) <> 0
    `)
  ];
  if (activeOnly) {
    employeeWhere.push({ State: true });
  }
  if (Number.isFinite(Number(departmentId)) && Number(departmentId) > 0) {
    employeeWhere.push({ Department_Id: Number(departmentId) });
  }
  if (search) {
    employeeWhere.push({
      [Op.or]: [
        { Ref_Employee: { [Op.like]: `%${search}%` } },
        { EmployeeName: { [Op.like]: `%${search}%` } },
        { EmployeeName_En: { [Op.like]: `%${search}%` } }
      ]
    });
  }

  const employeeWhereClause = employeeWhere.length
    ? { [Op.and]: employeeWhere }
    : undefined;

  const { rows: employeeRows, count } = await Employee.findAndCountAll({
    where: employeeWhereClause,
    attributes: [
      "ID_Employee",
      "Ref_Employee",
      "EmployeeName",
      "EmployeeName_En",
      "Department_Id",
      "State"
    ],
    order: [
      ["Ref_Employee", "ASC"],
      ["ID_Employee", "ASC"]
    ],
    offset: (page - 1) * pageSize,
    limit: pageSize
  });

  // Safety net if DB values still slip through (whitespace / odd casts)
  const employees = employeeRows.filter((row) => isRealEmployeeNo(row.Ref_Employee));

  const employeeIds = employees.map((row) => row.ID_Employee);
  const employeeNos = employees
    .map((row) => row.Ref_Employee?.trim())
    .filter((value): value is string => Boolean(value) && isRealEmployeeNo(value));

  const [timesheets, holidays, vacations, codes, positionByEmployee] = await Promise.all([
    employeeIds.length
      ? TimeSheet.findAll({
          where: {
            ID_Employee: { [Op.in]: employeeIds }
          },
          order: [["ID_Employee", "ASC"], ["Id", "DESC"]]
        })
      : Promise.resolve([]),
    Holiday.findAll({
      where: { IsActive: true },
      attributes: ["HolidayDate", "IsFixedDate", "HolidayNameEn", "HolidayNameAr"]
    }),
    employeeNos.length
      ? Vacation.findAll({
          where: {
            ID_Employee: { [Op.in]: employeeNos }
          },
          attributes: [
            "ID_Employee",
            "Id_CodeTimeSheet",
            "VacationDate_Start",
            "VacationDate_End",
            "State"
          ]
        })
      : Promise.resolve([]),
    TimeSheetCode.findAll({
      attributes: ["ID", "Code", "Code_Description"]
    }),
    buildEmployeePositionMap(employeeIds)
  ]);

  const codeById = new Map(
    codes.map((row) => {
      const plain = row.get({ plain: true }) as {
        ID: number;
        Code: string | null;
        Code_Description: string | null;
      };
      return [plain.ID, plain] as const;
    })
  );

  const timesheetByEmployee = new Map<number, Record<string, unknown>>();
  for (const row of timesheets) {
    const plain = row.get({ plain: true }) as Record<string, unknown>;
    const employeeId = Number(plain.ID_Employee);
    if (timesheetByEmployee.has(employeeId)) {
      continue;
    }
    if (!isDateInMonth(plain.DATE_JS as string | Date | null | undefined, year, month)) {
      continue;
    }
    timesheetByEmployee.set(employeeId, plain);
  }

  const timesheetsToSync = timesheets.filter((row) => {
    const employeeId = Number(row.getDataValue("ID_Employee"));
    const snapshot = positionByEmployee.get(employeeId);
    const derivedJobName = snapshot?.jobNameDisplay || null;
    const currentJobName = normalizeText(row.getDataValue("Job_Name"));
    return currentJobName !== derivedJobName;
  });

  if (timesheetsToSync.length) {
    await Promise.all(
      timesheetsToSync.map(async (row) => {
        const employeeId = Number(row.getDataValue("ID_Employee"));
        const snapshot = positionByEmployee.get(employeeId);
        const derivedJobName = snapshot?.jobNameDisplay || null;
        await row.update({ Job_Name: derivedJobName });

        const cached = timesheetByEmployee.get(employeeId);
        if (cached) {
          cached.Job_Name = derivedJobName;
        }
      })
    );
  }

  type VacationRow = {
    ID_Employee: string | null;
    Id_CodeTimeSheet: number | null;
    VacationDate_Start: string | Date | null;
    VacationDate_End: string | Date | null;
    State: string | null;
  };

  const vacationRows = vacations.map((row) =>
    row.get({ plain: true }) as VacationRow
  );

  const vacationsByEmployeeNo = new Map<string, VacationRow[]>();
  vacationRows.forEach((row) => {
    const key = String(row.ID_Employee || "").trim();
    if (!key) {
      return;
    }
    const bucket = vacationsByEmployeeNo.get(key) || [];
    bucket.push(row);
    vacationsByEmployeeNo.set(key, bucket);
  });

  const holidayPlain = holidays.map(
    (row) =>
      row.get({ plain: true }) as {
        HolidayDate: string | Date;
        IsFixedDate: boolean;
      }
  );

  const data: TimesheetMonthRow[] = employees.map((employee) => {
    const emp = employee.get({ plain: true }) as {
      ID_Employee: number;
      Ref_Employee: string | null;
      EmployeeName: string | null;
      EmployeeName_En: string | null;
    };

    const saved = timesheetByEmployee.get(emp.ID_Employee) || null;
    const positionSnapshot = positionByEmployee.get(emp.ID_Employee);
    const derivedJobName = positionSnapshot?.jobNameDisplay || null;
    const employeeVacations = vacationsByEmployeeNo.get(emp.Ref_Employee?.trim() || "") || [];

    const dayCells: TimesheetDayCell[] = days.map(({ dayIndex, date, dateOnly }) => {
      const weekday = date.getUTCDay();
      const savedCodeRaw =
        dayIndex <= 31 ? saved?.[`j_${dayIndex}`] : null;
      const savedAfeRaw =
        dayIndex <= 31 ? saved?.[`AFE${dayIndex}`] : null;
      const savedCode =
        savedCodeRaw === null || savedCodeRaw === undefined
          ? null
          : String(savedCodeRaw).trim() || null;
      const savedAfeId = normalizeAfeId(savedAfeRaw);

      if (savedCode) {
        return {
          dayIndex,
          date: dateOnly,
          label: `${date.getUTCDate()}/${date.getUTCMonth() + 1}`,
          weekday,
          code: savedCode,
          afeId: savedAfeId,
          source: "saved" as const,
          isWeekendOrHoliday:
            WEEKEND_DAYS.has(weekday) || isHolidayDate(date, holidayPlain)
        };
      }

      for (const vacation of employeeVacations) {
        const start = parseDateOnly(vacation.VacationDate_Start);
        const end = parseDateOnly(vacation.VacationDate_End);
        if (!start || !end) {
          continue;
        }

        if (date >= start && date <= end) {
          const code =
            vacation.Id_CodeTimeSheet != null
              ? codeById.get(Number(vacation.Id_CodeTimeSheet))?.Code?.trim() || null
              : null;

          return {
            dayIndex,
            date: dateOnly,
            label: `${date.getUTCDate()}/${date.getUTCMonth() + 1}`,
            weekday,
            code,
            afeId: savedAfeId,
            source: "vacation" as const,
            isWeekendOrHoliday: false
          };
        }
      }

      const weekend = WEEKEND_DAYS.has(weekday);
      const holiday = isHolidayDate(date, holidayPlain);
      if (weekend || holiday) {
        return {
          dayIndex,
          date: dateOnly,
          label: `${date.getUTCDate()}/${date.getUTCMonth() + 1}`,
          weekday,
          code: HOLIDAY_DISPLAY_CODE,
          afeId: savedAfeId,
          source: weekend ? ("weekend" as const) : ("holiday" as const),
          isWeekendOrHoliday: true
        };
      }

      return {
        dayIndex,
        date: dateOnly,
        label: `${date.getUTCDate()}/${date.getUTCMonth() + 1}`,
        weekday,
        code: null,
        afeId: savedAfeId,
        source: "empty" as const,
        isWeekendOrHoliday: false
      };
    });

    return {
      Id: saved?.Id != null ? Number(saved.Id) : null,
      ID_Employee: emp.ID_Employee,
      EmployeeNo: emp.Ref_Employee?.trim() || null,
      EmployeeName: emp.EmployeeName,
      EmployeeName_En: emp.EmployeeName_En,
      Job_Name: derivedJobName,
      Job_Name_AR: positionSnapshot?.jobNameAr || null,
      Job_Name_EN: positionSnapshot?.jobNameEn || null,
      LineLevelId: positionSnapshot?.lineLevelId || null,
      LineLevelSort: positionSnapshot?.lineLevelSort || null,
      LineLevelName_AR: positionSnapshot?.lineLevelNameAr || null,
      LineLevelName_EN: positionSnapshot?.lineLevelNameEn || null,
      DATE_JS: dateJs,
      IS_Approved:
        saved?.IS_Approved === null || saved?.IS_Approved === undefined
          ? null
          : Boolean(saved.IS_Approved),
      days: dayCells
    };
  });

  return {
    data,
    period: {
      year,
      month,
      dateJs,
      start: periodStartText,
      end: periodEndText,
      dayHeaders: days.map((day) => ({
        dayIndex: day.dayIndex,
        date: day.dateOnly,
        label: `${day.date.getUTCDate()}/${day.date.getUTCMonth() + 1}`,
        weekday: day.date.getUTCDay(),
        isWeekendOrHoliday:
          WEEKEND_DAYS.has(day.date.getUTCDay()) || isHolidayDate(day.date, holidayPlain)
      }))
    },
    pagination: {
      page,
      pageSize,
      total: count,
      totalPages: Math.max(1, Math.ceil(count / pageSize))
    }
  };
};

export type SaveTimesheetRowInput = {
  ID_Employee: number;
  Job_Name?: string | null;
  days: Array<{ dayIndex: number; code?: string | null; afeId?: number | null }>;
};

export type SaveTimesheetsPayload = {
  year?: number | string;
  month?: number | string;
  rows?: SaveTimesheetRowInput[];
  saveAll?: boolean;
  search?: string;
  activeOnly?: string | boolean;
  page?: number | string;
  pageSize?: number | string;
  departmentId?: number;
};

const buildDayCodeFields = (
  days: Array<{ dayIndex: number; code?: string | null; afeId?: number | null }>
): Record<string, string | null> => {
  const fields: Record<string, string | null> = {};
  for (let day = 1; day <= 31; day += 1) {
    fields[`j_${day}`] = null;
    fields[`AFE${day}`] = null;
  }

  days.forEach((day) => {
    if (day.dayIndex < 1 || day.dayIndex > 31) {
      return;
    }
    const code =
      day.code === null || day.code === undefined
        ? null
        : String(day.code).trim() || null;
    const afeId = normalizeAfeId(day.afeId);
    fields[`j_${day.dayIndex}`] = code;
    fields[`AFE${day.dayIndex}`] = afeId == null ? null : String(afeId);
  });

  return fields;
};

/**
 * Upsert TimeSheet rows for the selected DATE_JS month.
 * Saves j_1..j_31 from the provided day codes (typically the grid values).
 * Skips rows that are already approved.
 */
export const saveTimesheetsByMonth = async (payload: SaveTimesheetsPayload) => {
  const now = new Date();
  const year = Math.max(1970, Number(payload.year) || now.getFullYear());
  const month = Math.min(12, Math.max(1, Number(payload.month) || now.getMonth() + 1));
  const { dateJs } = buildTimesheetPeriod(year, month);
  const rows = Array.isArray(payload.rows) ? payload.rows : [];

  if (!rows.length) {
    return {
      year,
      month,
      dateJs,
      saved: 0,
      created: 0,
      updated: 0,
      skippedApproved: 0,
      skippedInvalid: 0
    };
  }

  const employeeIds = [
    ...new Set(
      rows
        .map((row) => Number(row.ID_Employee))
        .filter((id) => Number.isFinite(id) && id > 0)
    )
  ];

  const positionByEmployee = await buildEmployeePositionMap(employeeIds);

  const existingRows = employeeIds.length
    ? await TimeSheet.findAll({
        where: {
          ID_Employee: { [Op.in]: employeeIds }
        },
        order: [["ID_Employee", "ASC"], ["Id", "DESC"]]
      })
    : [];

  const existingByEmployee = new Map<number, TimeSheet>();
  for (const row of existingRows) {
    const plain = row.get({ plain: true }) as {
      ID_Employee: number;
      DATE_JS: string | Date | null;
    };
    const employeeId = Number(plain.ID_Employee);
    if (existingByEmployee.has(employeeId)) {
      continue;
    }
    if (!isDateInMonth(plain.DATE_JS, year, month)) {
      continue;
    }
    existingByEmployee.set(employeeId, row);
  }

  let created = 0;
  let updated = 0;
  let skippedApproved = 0;
  let skippedInvalid = 0;

  const transaction = await sequelize.transaction();

  try {
    for (const row of rows) {
      const employeeId = Number(row.ID_Employee);
      if (!Number.isFinite(employeeId) || employeeId <= 0) {
        skippedInvalid += 1;
        continue;
      }

      const dayFields = buildDayCodeFields(row.days || []);
      const existing = existingByEmployee.get(employeeId);

      if (existing) {
        const approved = Boolean(existing.getDataValue("IS_Approved"));
        if (approved) {
          skippedApproved += 1;
          continue;
        }

        await existing.update(
          {
            ...dayFields,
            DATE_JS: dateJs,
            Job_Name: positionByEmployee.get(employeeId)?.jobNameDisplay || null
          },
          { transaction }
        );
        updated += 1;
        continue;
      }

      await TimeSheet.create(
        {
          ID_Employee: employeeId,
          Job_Name: positionByEmployee.get(employeeId)?.jobNameDisplay || null,
          DATE_JS: dateJs,
          IS_Approved: false,
          Id_Approved: null,
          ...dayFields
        },
        { transaction }
      );
      created += 1;
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  return {
    year,
    month,
    dateJs,
    saved: created + updated,
    created,
    updated,
    skippedApproved,
    skippedInvalid
  };
};

/**
 * Save one page/batch of all matching employees for the month.
 * Computes day codes server-side (vacation / weekend / holiday / existing).
 */
export const saveAllTimesheetsBatch = async (payload: SaveTimesheetsPayload) => {
  const page = Math.max(1, Number(payload.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(payload.pageSize) || 50));
  const activeOnly =
    payload.activeOnly === false || payload.activeOnly === "false" ? "false" : "true";

  const listed = await listTimesheetsByMonth({
    year: payload.year != null ? String(payload.year) : undefined,
    month: payload.month != null ? String(payload.month) : undefined,
    page: String(page),
    pageSize: String(pageSize),
    search: payload.search,
    activeOnly
  }, payload.departmentId);

  const saveResult = await saveTimesheetsByMonth({
    year: listed.period.year,
    month: listed.period.month,
    rows: listed.data.map((row) => ({
      ID_Employee: row.ID_Employee,
      Job_Name: row.Job_Name,
      days: row.days.map((day) => ({
        dayIndex: day.dayIndex,
          code: day.code,
          afeId: day.afeId
      }))
    }))
  });

  const total = listed.pagination.total;
  const processed = Math.min(page * pageSize, total);

  return {
    ...saveResult,
    page,
    pageSize,
    total,
    processed,
    done: processed >= total || listed.data.length === 0
  };
};
