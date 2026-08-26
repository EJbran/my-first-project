"use strict";

require("./load-local-env");

const { QueryTypes } = require("sequelize");
const { sequelize } = require("../src/config/database");

const EXPECTED_DATABASE = "HERP_LOCAL";
const ALLOWED_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

function assertDedicatedLocalDatabase() {
  const host = String(process.env.DB_HOST || "").trim().toLowerCase();
  const database = String(process.env.DB_NAME || "").trim();

  if (!ALLOWED_HOSTS.has(host) || database.toUpperCase() !== EXPECTED_DATABASE) {
    throw new Error(
      `Safety stop: local verification is restricted to ${EXPECTED_DATABASE} on 127.0.0.1/localhost.`
    );
  }
}

async function scalar(sql, replacements = {}) {
  const rows = await sequelize.query(sql, {
    replacements,
    type: QueryTypes.SELECT
  });
  return Number(rows[0]?.value || 0);
}

async function main() {
  assertDedicatedLocalDatabase();
  await sequelize.authenticate();

  const requiredTables = [
    "Location",
    "SubLocation",
    "Departments",
    "EPSA",
    "jobs",
    "LineLevel",
    "Employee",
    "Position",
    "AFE",
    "BankGeneral",
    "Bank",
    "BANK_SERIAL_CHECKS",
    "COA_AccountGroup",
    "ChartOfAccounts",
    "EPSA_Department_ChartAccount",
    "Holidays",
    "TimeSheet",
    "TimeSheetCode",
    "Vacation",
    "Users",
    "UserSessions",
    "Roles",
    "UserRoles",
    "Permissions",
    "UserPermissions",
    "LoginAttempts",
    "AuditLogs"
  ];
  const requiredColumns = {
    SubLocation: ["Id", "Name", "LocationId"],
    EPSA: ["Id", "InterstName"],
    AFE: ["Id", "AFENo", "DepartmentId", "LocationId", "Status"],
    BankGeneral: ["Id"],
    Bank: ["Id", "BankId"],
    BANK_SERIAL_CHECKS: ["ID_BANK_SERIAL_CHECKS", "BANKID"],
    COA_AccountGroup: ["id_AccountGroupCode", "AccountGroupCode"],
    ChartOfAccounts: ["Id", "NewAccountCode", "AccountGroupCode"],
    EPSA_Department_ChartAccount: [
      "Id",
      "EPSAId",
      "DepartmentId",
      "ChartAccountId",
      "LocationID",
      "LocationAccessMode",
      "IsAllAccounts",
      "IsActive"
    ],
    Holidays: ["HolidayId", "HolidayDate", "IsActive"],
    TimeSheet: ["Id", "ID_Employee", "DATE_JS"]
  };

  const existingTables = await sequelize.query(
    `SELECT [name]
       FROM sys.tables
      WHERE [schema_id] = SCHEMA_ID(N'dbo')
        AND [name] IN (:requiredTables);`,
    { replacements: { requiredTables }, type: QueryTypes.SELECT }
  );
  const existingNames = new Set(existingTables.map((row) => String(row.name)));
  const missingTables = requiredTables.filter((name) => !existingNames.has(name));
  const applicationTableNames = Object.keys(requiredColumns);
  const existingColumns = await sequelize.query(
    `SELECT tableMetadata.[name] AS [tableName],
            columnMetadata.[name] AS [columnName]
       FROM sys.tables AS tableMetadata
       INNER JOIN sys.columns AS columnMetadata
         ON columnMetadata.[object_id] = tableMetadata.[object_id]
      WHERE tableMetadata.[schema_id] = SCHEMA_ID(N'dbo')
        AND tableMetadata.[name] IN (:applicationTableNames);`,
    {
      replacements: { applicationTableNames },
      type: QueryTypes.SELECT
    }
  );
  const columnNamesByTable = new Map();
  for (const row of existingColumns) {
    const tableName = String(row.tableName);
    const columnNames = columnNamesByTable.get(tableName) || new Set();
    columnNames.add(String(row.columnName));
    columnNamesByTable.set(tableName, columnNames);
  }
  const missingColumns = Object.entries(requiredColumns).flatMap(
    ([tableName, columnNames]) => {
      const existingColumnNames = columnNamesByTable.get(tableName) || new Set();
      return columnNames
        .filter((columnName) => !existingColumnNames.has(columnName))
        .map((columnName) => `${tableName}.${columnName}`);
    }
  );

  const loginEmail = String(process.env.DEV_LOGIN_EMAIL || "developer@herp.local")
    .trim()
    .toLowerCase();

  const checks = {
    jobs: await scalar("SELECT COUNT_BIG(*) AS [value] FROM [dbo].[jobs];"),
    lineLevels: await scalar("SELECT COUNT_BIG(*) AS [value] FROM [dbo].[LineLevel];"),
    employees: await scalar("SELECT COUNT_BIG(*) AS [value] FROM [dbo].[Employee];"),
    positions: await scalar("SELECT COUNT_BIG(*) AS [value] FROM [dbo].[Position];"),
    vacations: await scalar("SELECT COUNT_BIG(*) AS [value] FROM [dbo].[Vacation];"),
    timeSheetCodes: await scalar(
      "SELECT COUNT_BIG(*) AS [value] FROM [dbo].[TimeSheetCode];"
    ),
    occupiedPositions: await scalar(
      "SELECT COUNT_BIG(*) AS [value] FROM [dbo].[Position] WHERE [EmployeeId] IS NOT NULL;"
    ),
    vacantPositions: await scalar(
      "SELECT COUNT_BIG(*) AS [value] FROM [dbo].[Position] WHERE [EmployeeId] IS NULL;"
    ),
    missingJobPositions: await scalar(
      "SELECT COUNT_BIG(*) AS [value] FROM [dbo].[Position] WHERE [Job_ID] IS NULL;"
    ),
    employeesWithoutDepartment: await scalar(
      "SELECT COUNT_BIG(*) AS [value] FROM [dbo].[Employee] WHERE [Department_Id] IS NULL;"
    ),
    orphanDepartmentReferences: await scalar(
      `SELECT COUNT_BIG(*) AS [value]
         FROM [dbo].[Employee] AS employee
         LEFT JOIN [dbo].[Departments] AS department
           ON department.[Id] = employee.[Department_Id]
        WHERE employee.[Department_Id] IS NOT NULL
          AND department.[Id] IS NULL;`
    ),
    jobPositionsMissingLineLevel: await scalar(
      `SELECT COUNT_BIG(*) AS [value]
         FROM [dbo].[Position]
        WHERE [Job_ID] IS NOT NULL
          AND [LineLevelId] IS NULL;`
    ),
    joblessPositionsWithLineLevel: await scalar(
      `SELECT COUNT_BIG(*) AS [value]
         FROM [dbo].[Position]
        WHERE [Job_ID] IS NULL
          AND [LineLevelId] IS NOT NULL;`
    ),
    orphanLineLevelReferences: await scalar(
      `SELECT COUNT_BIG(*) AS [value]
         FROM [dbo].[Position] AS position
         LEFT JOIN [dbo].[LineLevel] AS lineLevel
           ON lineLevel.[Line_ID] = position.[LineLevelId]
        WHERE position.[LineLevelId] IS NOT NULL
          AND lineLevel.[Line_ID] IS NULL;`
    ),
    zeroEmployeeNumbers: await scalar(
      "SELECT COUNT_BIG(*) AS [value] FROM [dbo].[Employee] WHERE LTRIM(RTRIM([Ref_Employee])) = N'0';"
    ),
    orphanEmployeeAssignments: await scalar(
      `SELECT COUNT_BIG(*) AS [value]
         FROM [dbo].[Position] AS position
         LEFT JOIN [dbo].[Employee] AS employee
           ON employee.[ID_Employee] = position.[EmployeeId]
        WHERE position.[EmployeeId] IS NOT NULL
          AND employee.[ID_Employee] IS NULL;`
    ),
    orphanJobAssignments: await scalar(
      `SELECT COUNT_BIG(*) AS [value]
         FROM [dbo].[Position] AS position
         LEFT JOIN [dbo].[jobs] AS job
           ON job.[Job_ID] = position.[Job_ID]
        WHERE position.[Job_ID] IS NOT NULL
          AND job.[Job_ID] IS NULL;`
    ),
    orphanVacationEmployeeReferences: await scalar(
      `SELECT COUNT_BIG(*) AS [value]
         FROM [dbo].[Vacation] AS vacation
         LEFT JOIN [dbo].[Employee] AS employee
           ON employee.[Ref_Employee] = vacation.[ID_Employee]
        WHERE employee.[ID_Employee] IS NULL;`
    ),
    orphanVacationTimeSheetCodeReferences: await scalar(
      `SELECT COUNT_BIG(*) AS [value]
         FROM [dbo].[Vacation] AS vacation
         LEFT JOIN [dbo].[TimeSheetCode] AS timeSheetCode
           ON timeSheetCode.[ID] = vacation.[Id_CodeTimeSheet]
        WHERE vacation.[Id_CodeTimeSheet] IS NOT NULL
          AND timeSheetCode.[ID] IS NULL;`
    ),
    vacationEmployeeStartIndex: await scalar(
      `SELECT COUNT_BIG(*) AS [value]
         FROM sys.indexes
        WHERE [object_id] = OBJECT_ID(N'dbo.Vacation')
          AND [name] = N'IX_Vacation_Employee_Start_Id'
          AND [is_disabled] = 0;`
    ),
    trustedPositionForeignKeys: await scalar(
      `SELECT COUNT_BIG(*) AS [value]
        FROM sys.foreign_keys
        WHERE [parent_object_id] = OBJECT_ID(N'dbo.Position')
          AND [name] IN (
            N'FK_Position_Employee',
            N'FK_Position_Jobs',
            N'FK_Position_LineLevel'
          )
          AND [is_disabled] = 0
          AND [is_not_trusted] = 0;`
    ),
    trustedEmployeeDepartmentForeignKey: await scalar(
      `SELECT COUNT_BIG(*) AS [value]
         FROM sys.foreign_keys AS foreignKey
         INNER JOIN sys.foreign_key_columns AS foreignKeyColumn
           ON foreignKeyColumn.[constraint_object_id] = foreignKey.[object_id]
        WHERE foreignKey.[parent_object_id] = OBJECT_ID(N'dbo.Employee')
          AND foreignKey.[referenced_object_id] = OBJECT_ID(N'dbo.Departments')
          AND foreignKeyColumn.[parent_column_id] = COLUMNPROPERTY(
            OBJECT_ID(N'dbo.Employee'), N'Department_Id', N'ColumnId'
          )
          AND foreignKeyColumn.[referenced_column_id] = COLUMNPROPERTY(
            OBJECT_ID(N'dbo.Departments'), N'Id', N'ColumnId'
          )
          AND (
            SELECT COUNT_BIG(*)
            FROM sys.foreign_key_columns AS constraintColumn
            WHERE constraintColumn.[constraint_object_id] = foreignKey.[object_id]
          ) = 1
          AND foreignKey.[delete_referential_action] = 0
          AND foreignKey.[update_referential_action] = 0
          AND foreignKey.[is_disabled] = 0
          AND foreignKey.[is_not_trusted] = 0;`
    ),
    employeeDepartmentIndex: await scalar(
      `SELECT COUNT_BIG(*) AS [value]
         FROM sys.indexes AS indexMetadata
         INNER JOIN sys.index_columns AS indexColumn
           ON indexColumn.[object_id] = indexMetadata.[object_id]
          AND indexColumn.[index_id] = indexMetadata.[index_id]
        WHERE indexMetadata.[object_id] = OBJECT_ID(N'dbo.Employee')
          AND indexMetadata.[name] = N'IX_Employee_Department_Id'
          AND indexMetadata.[is_disabled] = 0
          AND indexMetadata.[is_unique] = 0
          AND indexMetadata.[has_filter] = 0
          AND indexColumn.[column_id] = COLUMNPROPERTY(
            OBJECT_ID(N'dbo.Employee'), N'Department_Id', N'ColumnId'
          )
          AND indexColumn.[key_ordinal] = 1
          AND (
            SELECT COUNT_BIG(*)
            FROM sys.index_columns AS keyColumn
            WHERE keyColumn.[object_id] = indexMetadata.[object_id]
              AND keyColumn.[index_id] = indexMetadata.[index_id]
              AND keyColumn.[key_ordinal] > 0
          ) = 1;`
    ),
    lineLevelIndex: await scalar(
      `SELECT COUNT_BIG(*) AS [value]
         FROM sys.indexes
        WHERE [object_id] = OBJECT_ID(N'dbo.Position')
          AND [name] = N'IX_Position_LineLevelId'
          AND [is_disabled] = 0;`
    ),
    occupiedEmployeeUniqueIndex: await scalar(
      `SELECT COUNT_BIG(*) AS [value]
         FROM sys.indexes
        WHERE [object_id] = OBJECT_ID(N'dbo.Position')
          AND [name] = N'UX_Position_EmployeeId_Occupied'
          AND [is_unique] = 1
          AND [has_filter] = 1;`
    ),
    chartOfAccountsMigrationIndexes: await scalar(
      `SELECT COUNT_BIG(*) AS [value]
         FROM sys.indexes
        WHERE [object_id] = OBJECT_ID(N'dbo.ChartOfAccounts')
          AND [name] IN (
            N'UX_ChartOfAccounts_NewAccountCode',
            N'IX_ChartOfAccounts_AccountGroupCode',
            N'IX_ChartOfAccounts_IsActive',
            N'IX_ChartOfAccounts_LegacyAcct'
          )
          AND [is_disabled] = 0;`
    ),
    accountMappingLocationAccessConstraint: await scalar(
      `SELECT COUNT_BIG(*) AS [value]
         FROM sys.check_constraints
        WHERE [parent_object_id] = OBJECT_ID(N'dbo.EPSA_Department_ChartAccount')
          AND [name] = N'CK_EPSA_Department_ChartAccount_LocationAccess'
          AND [is_disabled] = 0
          AND [is_not_trusted] = 0;`
    ),
    subLocationForeignKey: await scalar(
      `SELECT COUNT_BIG(*) AS [value]
         FROM sys.foreign_keys AS foreignKey
         INNER JOIN sys.foreign_key_columns AS foreignKeyColumn
           ON foreignKeyColumn.[constraint_object_id] = foreignKey.[object_id]
        WHERE foreignKey.[parent_object_id] = OBJECT_ID(N'dbo.SubLocation')
          AND foreignKey.[referenced_object_id] = OBJECT_ID(N'dbo.Location')
          AND foreignKeyColumn.[parent_column_id] = COLUMNPROPERTY(
            OBJECT_ID(N'dbo.SubLocation'), N'LocationId', N'ColumnId'
          )
          AND foreignKeyColumn.[referenced_column_id] = COLUMNPROPERTY(
            OBJECT_ID(N'dbo.Location'), N'ID_Location', N'ColumnId'
          )
          AND foreignKey.[is_disabled] = 0
          AND foreignKey.[is_not_trusted] = 0;`
    ),
    holidayMigrationIndexes: await scalar(
      `SELECT COUNT_BIG(*) AS [value]
         FROM sys.indexes
        WHERE [object_id] = OBJECT_ID(N'dbo.Holidays')
          AND [name] IN (N'IX_Holidays_HolidayDate', N'IX_Holidays_IsActive')
          AND [is_disabled] = 0;`
    ),
    trustedUsersPasswordConstraint: await scalar(
      `SELECT COUNT_BIG(*) AS [value]
         FROM sys.check_constraints
        WHERE [parent_object_id] = OBJECT_ID(N'dbo.Users')
          AND [name] = N'CK_Users_Password_By_Provider'
          AND [is_disabled] = 0
          AND [is_not_trusted] = 0
          AND UPPER(REPLACE(REPLACE([definition], N'[', N''), N']', N'')) LIKE N'%AUTHPROVIDER%PASSWORDHASH%';`
    ),
    developmentLogin: await scalar(
      `SELECT COUNT_BIG(*) AS [value]
         FROM [dbo].[Users]
        WHERE LOWER([Email]) = :loginEmail
          AND [AuthProvider] IN (N'AD', N'LDAP')
          AND [PasswordHash] IS NULL
          AND [IsActive] = 1
          AND [IsLocked] = 0
          AND [DeletedAt] IS NULL;`,
      { loginEmail }
    )
  };

  const failures = [];
  if (missingTables.length) failures.push(`missing tables: ${missingTables.join(", ")}`);
  if (missingColumns.length) failures.push(`missing columns: ${missingColumns.join(", ")}`);
  if (checks.jobs < 8) failures.push("fewer than 8 development jobs");
  if (checks.lineLevels < 8) failures.push("fewer than 8 line levels");
  if (checks.employees < 12) failures.push("fewer than 12 synthetic employees");
  if (checks.positions < 15) failures.push("fewer than 15 positions");
  if (checks.vacations < 8) failures.push("fewer than 8 synthetic vacation records");
  if (checks.timeSheetCodes < 3) failures.push("fewer than 3 timesheet codes");
  if (checks.vacantPositions < 3) failures.push("fewer than 3 vacant positions");
  if (checks.zeroEmployeeNumbers !== 0) failures.push("employee number 0 exists");
  if (checks.orphanEmployeeAssignments !== 0) failures.push("orphan employee assignments exist");
  if (checks.orphanJobAssignments !== 0) failures.push("orphan job assignments exist");
  if (checks.orphanDepartmentReferences !== 0) failures.push("orphan employee department references exist");
  if (checks.jobPositionsMissingLineLevel !== 0) failures.push("job-linked positions are missing line levels");
  if (checks.joblessPositionsWithLineLevel !== 0) failures.push("jobless positions have line levels");
  if (checks.orphanLineLevelReferences !== 0) failures.push("orphan line-level references exist");
  if (checks.orphanVacationEmployeeReferences !== 0) failures.push("orphan vacation employee references exist");
  if (checks.orphanVacationTimeSheetCodeReferences !== 0) failures.push("orphan vacation timesheet-code references exist");
  if (checks.vacationEmployeeStartIndex !== 1) failures.push("vacation employee/date index is missing");
  if (checks.trustedPositionForeignKeys !== 3) failures.push("position foreign keys are missing or untrusted");
  if (checks.trustedEmployeeDepartmentForeignKey !== 1) failures.push("employee department foreign key is missing, untrusted, or cascading");
  if (checks.employeeDepartmentIndex !== 1) failures.push("employee department index is missing");
  if (checks.lineLevelIndex !== 1) failures.push("position line-level index is missing");
  if (checks.occupiedEmployeeUniqueIndex !== 1) failures.push("occupied employee unique index is missing");
  if (checks.chartOfAccountsMigrationIndexes !== 4) failures.push("chart-of-accounts migration indexes are incomplete");
  if (checks.accountMappingLocationAccessConstraint !== 1) failures.push("account-mapping location-access constraint is missing or untrusted");
  if (checks.subLocationForeignKey !== 1) failures.push("sub-location foreign key is missing or untrusted");
  if (checks.holidayMigrationIndexes !== 2) failures.push("holiday migration indexes are incomplete");
  if (checks.trustedUsersPasswordConstraint !== 1) failures.push("authentication password constraint is missing or untrusted");
  if (checks.developmentLogin !== 1) failures.push("development login is unavailable");

  console.log(
    JSON.stringify(
      {
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        status: failures.length ? "FAILED" : "PASS",
        missingTables,
        missingColumns,
        checks
      },
      null,
      2
    )
  );

  if (failures.length) {
    throw new Error(failures.join("; "));
  }
}

main()
  .catch((error) => {
    console.error(
      "[local-db] Verification failed:",
      error instanceof Error ? error.message : error
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => undefined);
  });
