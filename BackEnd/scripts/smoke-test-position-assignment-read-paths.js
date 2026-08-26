require("dotenv").config();
require("ts-node/register/transpile-only");

const { QueryTypes } = require("sequelize");
const { sequelize } = require("../src/config/database");
const {
  searchEmployees,
  getEmployeeSearchOptions,
  getEmployeeById
} = require("../src/controllers/HR/employee.controller.ts");
const {
  getEmployeeDashboard
} = require("../src/controllers/HR/employeeDashboard.controller.ts");
const {
  getMonthlySeniorityAwardReport
} = require("../src/controllers/HR/seniorityAwardReport.controller.ts");
const {
  getCurrentEmployeePosition,
  getEmployeePositionHistory,
  listVacantPositions
} = require("../src/controllers/HR/positionAssignment.controller.ts");

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
  const employeeRows = await sequelize.query(
    `SELECT TOP (1) [EmployeeId] FROM [dbo].[vw_CurrentEmployeePosition] ORDER BY [EmployeeId];`,
    { type: QueryTypes.SELECT, raw: true }
  );
  const employeeId = Number(employeeRows[0]?.EmployeeId);
  if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
    throw new Error("No current employee assignment is available for smoke testing.");
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

  const currentAssignment = await invoke(getCurrentEmployeePosition, {
    params: { employeeId: String(employeeId) }
  });
  assertSuccess("current assignment", currentAssignment);

  const assignmentHistory = await invoke(getEmployeePositionHistory, {
    params: { employeeId: String(employeeId) },
    query: { page: "1", pageSize: "10" }
  });
  assertSuccess("assignment history", assignmentHistory);

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
    user: { id: 0, username: "migration-smoke-test" }
  });
  assertSuccess("seniority award report", seniorityReport);

  const vacancyTotal = Number(vacancySearch.payload?.pagination?.total);
  const positionVacancyTotal = Number(vacancies.payload?.pagination?.total);
  if (vacancyTotal !== 1026 || positionVacancyTotal !== 1026) {
    throw new Error(`Vacancy read paths disagree with the verified total (directory=${vacancyTotal}, API=${positionVacancyTotal}).`);
  }

  console.log(JSON.stringify({
    status: "passed",
    checks: {
      employeeSearch: employeeSearch.payload.data.length,
      vacancySearchTotal: vacancyTotal,
      searchOptions: Object.keys(searchOptions.payload.data ?? {}).length,
      employeeProfile: Boolean(employeeProfile.payload.data),
      currentAssignment: Boolean(currentAssignment.payload.data),
      assignmentHistoryRows: assignmentHistory.payload.data.length,
      vacantPositionApiTotal: positionVacancyTotal,
      dashboard: Boolean(dashboard.payload.data),
      seniorityReport: Boolean(seniorityReport.payload.data)
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
