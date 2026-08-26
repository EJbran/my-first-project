require("dotenv").config();
require("ts-node/register/transpile-only");

const { QueryTypes } = require("sequelize");
const { sequelize } = require("../src/config/database");
const {
  searchEmployees,
  getEmployeeSearchOptions,
  getEmployeeById
} = require("../src/controllers/HR/employee.controller.ts");
const { getEmployeeDashboard } = require("../src/controllers/HR/employeeDashboard.controller.ts");
const {
  getMonthlySeniorityAwardReport
} = require("../src/controllers/HR/seniorityAwardReport.controller.ts");
const {
  getCurrentEmployeePosition,
  listVacantPositions
} = require("../src/controllers/HR/position.controller.ts");

const invoke = (handler, request) => new Promise((resolve, reject) => {
  let statusCode = 200;
  const response = {
    status(code) {
      statusCode = code;
      return response;
    },
    json(payload) {
      resolve({ statusCode, payload });
      return payload;
    }
  };
  Promise.resolve(handler(request, response, reject)).catch(reject);
});

const assertSuccess = (name, result, expectedStatus = 200) => {
  if (result.statusCode !== expectedStatus || result.payload?.success !== true) {
    throw new Error(`${name} failed with HTTP ${result.statusCode}: ${JSON.stringify(result.payload)}`);
  }
};

const main = async () => {
  const aggregateRows = await sequelize.query(
    `
      SELECT
        COUNT_BIG(*) AS [TotalPositions],
        SUM(CASE WHEN [EmployeeId] IS NULL THEN 1 ELSE 0 END) AS [VacantPositions],
        SUM(CASE WHEN [EmployeeId] IS NOT NULL THEN 1 ELSE 0 END) AS [OccupiedPositions],
        COUNT_BIG(DISTINCT CASE WHEN [EmployeeId] IS NOT NULL THEN [EmployeeId] END) AS [AssignedEmployees]
      FROM [dbo].[Position];
    `,
    { type: QueryTypes.SELECT, raw: true }
  );
  const aggregate = Object.fromEntries(
    Object.entries(aggregateRows[0]).map(([key, value]) => [key, Number(value ?? 0)])
  );
  if (aggregate.OccupiedPositions < 1 || aggregate.VacantPositions < 1) {
    throw new Error(`Position read-path fixtures are unavailable: ${JSON.stringify(aggregate)}`);
  }

  const employeeRows = await sequelize.query(
    `
      SELECT TOP (1) position.[EmployeeId]
      FROM [dbo].[Position] AS position
      JOIN [dbo].[employee] AS employee
        ON employee.[ID_Employee] = position.[EmployeeId]
      WHERE position.[EmployeeId] IS NOT NULL
      ORDER BY
        CASE WHEN employee.[Department_Id] IS NULL THEN 1 ELSE 0 END,
        position.[EmployeeId];
    `,
    { type: QueryTypes.SELECT, raw: true }
  );
  const employeeId = Number(employeeRows[0]?.EmployeeId);
  if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
    throw new Error("No occupied position is available for read-path smoke testing.");
  }

  const employeeSearch = await invoke(searchEmployees, {
    query: { page: "1", pageSize: "10", status: "employee" }
  });
  assertSuccess("employee search", employeeSearch);

  const vacancySearch = await invoke(searchEmployees, {
    query: { page: "1", pageSize: "10", status: "vacancy" }
  });
  assertSuccess("vacancy search", vacancySearch);

  const searchOptions = await invoke(getEmployeeSearchOptions, { query: {} });
  assertSuccess("employee search options", searchOptions);

  const employeeProfile = await invoke(getEmployeeById, {
    params: { id: String(employeeId) }
  });
  assertSuccess("employee profile", employeeProfile);

  const currentPosition = await invoke(getCurrentEmployeePosition, {
    params: { employeeId: String(employeeId) }
  });
  assertSuccess("current position", currentPosition);

  const vacancies = await invoke(listVacantPositions, {
    query: { page: "1", pageSize: "10" }
  });
  assertSuccess("vacant position API", vacancies);

  const dashboard = await invoke(getEmployeeDashboard, {
    query: { asOf: "2026-07-22" }
  });
  assertSuccess("HR dashboard", dashboard);

  const seniorityReport = await invoke(getMonthlySeniorityAwardReport, {
    query: { month: "2026-07", page: "1", pageSize: "10" },
    user: { id: 0, username: "position-smoke-test" }
  });
  assertSuccess("seniority award report", seniorityReport);

  const directoryVacancies = Number(vacancySearch.payload?.pagination?.total);
  const apiVacancies = Number(vacancies.payload?.pagination?.total);
  const dashboardVacancies = Number(dashboard.payload?.data?.kpis?.vacancies);
  if (
    directoryVacancies !== aggregate.VacantPositions
    || apiVacancies !== aggregate.VacantPositions
    || dashboardVacancies !== aggregate.VacantPositions
  ) {
    throw new Error(`Vacancy read paths disagree: ${JSON.stringify({
      database: aggregate.VacantPositions,
      directory: directoryVacancies,
      api: apiVacancies,
      dashboard: dashboardVacancies
    })}`);
  }

  const current = currentPosition.payload?.data ?? {};
  const profile = employeeProfile.payload?.data ?? {};
  const searchOptionData = searchOptions.payload?.data ?? {};
  const forbiddenAssignmentFields = [
    "PositionAssignmentId",
    "AssignmentTypeCode",
    "EffectiveFrom",
    "EffectiveTo",
    "RowVersion"
  ];
  if (!Number.isSafeInteger(Number(current.PositionId))) {
    throw new Error("Current-position API did not return a PositionId.");
  }
  if (!Number.isSafeInteger(Number(profile.CurrentPositionId))) {
    throw new Error("Employee profile did not return CurrentPositionId.");
  }
  if (!Number.isSafeInteger(Number(current.LineLevelId))) {
    throw new Error("Current-position API did not return a LineLevelId.");
  }
  if (!Number.isSafeInteger(Number(profile.CurrentLineLevelId))) {
    throw new Error("Employee profile did not return CurrentLineLevelId.");
  }
  if (Number(current.LineLevelId) !== Number(profile.CurrentLineLevelId)) {
    throw new Error("Current-position and employee-profile LineLevel IDs disagree.");
  }
  if (
    typeof current.LineLevelName_EN !== "string"
    || current.LineLevelName_EN.trim().length === 0
    || typeof profile.CurrentLineLevelName_EN !== "string"
    || profile.CurrentLineLevelName_EN.trim().length === 0
  ) {
    throw new Error("LineLevel English descriptions are missing from a position read path.");
  }
  if (forbiddenAssignmentFields.some((field) => Object.prototype.hasOwnProperty.call(current, field))) {
    throw new Error("Current-position API still exposes assignment-model fields.");
  }
  if (!Array.isArray(searchOptionData.departments)) {
    throw new Error("Employee search options did not return a departments group.");
  }
  if (!searchOptionData.departments.some((option) => option?.value === "unassigned")) {
    throw new Error("Employee department search options did not include Unassigned.");
  }
  const vacancyRows = Array.isArray(vacancySearch.payload?.data)
    ? vacancySearch.payload.data
    : [];
  if (vacancyRows.some((row) =>
    row.Department_Id !== null
    || row.ResolvedDepartmentId !== null
    || row.DepartmentName_English !== null
    || row.DepartmentName_Arabic !== null
    || row.ParentDepartmentId !== null
    || row.ParentDepartmentName_English !== null
    || row.ParentDepartmentName_Arabic !== null
    || row.ParentDepartmentType !== null
  )) {
    throw new Error("Vacancy search returned employee department data.");
  }

  const profileDepartmentId = Number(profile.Department_Id);
  let departmentFilterMatched = false;
  let departmentNameSearchesPassed = 0;
  if (Number.isSafeInteger(profileDepartmentId) && profileDepartmentId > 0) {
    if (Number(profile.ResolvedDepartmentId) !== profileDepartmentId) {
      throw new Error("Employee profile did not resolve its Department_Id.");
    }
    if (
      !String(profile.DepartmentName_English ?? "").trim()
      && !String(profile.DepartmentName_Arabic ?? "").trim()
    ) {
      throw new Error("Employee profile department names are missing.");
    }
    for (const field of [
      "ParentDepartmentId",
      "ParentDepartmentName_English",
      "ParentDepartmentName_Arabic",
      "ParentDepartmentType"
    ]) {
      if (!Object.prototype.hasOwnProperty.call(profile, field)) {
        throw new Error(`Employee profile is missing ${field}.`);
      }
    }
    if (profile.ParentDepartmentId !== null) {
      if (!Number.isSafeInteger(Number(profile.ParentDepartmentId))) {
        throw new Error("Employee profile returned an invalid ParentDepartmentId.");
      }
      if (String(profile.ParentDepartmentType ?? "").trim().toLowerCase() !== "manager") {
        throw new Error("Employee profile parent department is not a Manager hierarchy node.");
      }
      if (
        !String(profile.ParentDepartmentName_English ?? "").trim()
        && !String(profile.ParentDepartmentName_Arabic ?? "").trim()
      ) {
        throw new Error("Employee profile parent department names are missing.");
      }
    }

    const departmentSearch = await invoke(searchEmployees, {
      query: {
        page: "1",
        pageSize: "10",
        status: "employee",
        departmentId: String(profileDepartmentId)
      }
    });
    assertSuccess("employee department filter", departmentSearch);
    departmentFilterMatched = Number(departmentSearch.payload?.pagination?.total ?? 0) > 0;
    if (!departmentFilterMatched) {
      throw new Error("Employee department filter did not match the selected department.");
    }

    for (const departmentName of [
      profile.DepartmentName_English,
      profile.DepartmentName_Arabic
    ]) {
      const search = String(departmentName ?? "").trim();
      if (!search) continue;
      const departmentNameSearch = await invoke(searchEmployees, {
        query: { page: "1", pageSize: "10", status: "employee", search }
      });
      assertSuccess("employee department name search", departmentNameSearch);
      if (Number(departmentNameSearch.payload?.pagination?.total ?? 0) < 1) {
        throw new Error(`Department name search did not match: ${search}`);
      }
      departmentNameSearchesPassed += 1;
    }
  }

  const senioritySummary = seniorityReport.payload?.data?.summary ?? {};
  console.log(JSON.stringify({
    status: "passed",
    databaseAggregates: aggregate,
    checks: {
      employeeSearchRows: Number(employeeSearch.payload?.data?.length ?? 0),
      vacancyDirectoryTotal: directoryVacancies,
      vacancyApiTotal: apiVacancies,
      vacancyDashboardTotal: dashboardVacancies,
      searchOptionGroups: Object.keys(searchOptions.payload?.data ?? {}).length,
      employeeProfileHasCurrentPosition: Boolean(profile.CurrentPositionId),
      currentPositionApiResolved: Boolean(current.PositionId),
      currentPositionHasJobCatalogJoin: Object.prototype.hasOwnProperty.call(current, "JobId"),
      currentPositionHasLineLevel: Boolean(current.LineLevelId),
      employeeProfileHasLineLevel: Boolean(profile.CurrentLineLevelId),
      lineLevelReadPathsAgree: true,
      departmentOptionsAvailable: true,
      employeeProfileHasDepartment: Number.isSafeInteger(profileDepartmentId)
        && profileDepartmentId > 0,
      departmentFilterMatched,
      departmentNameSearchesPassed,
      vacanciesHaveNoEmployeeDepartment: true,
      assignmentModelFieldsExposed: false,
      dashboardLoaded: Boolean(dashboard.payload?.data),
      seniorityReportLoaded: Boolean(seniorityReport.payload?.data),
      seniorityAwardsDue: Number(senioritySummary.awardsDue ?? 0)
    },
    privacy: "Only aggregate counts and booleans are printed."
  }, null, 2));
};

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
