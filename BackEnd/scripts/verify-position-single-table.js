require("dotenv").config();

const { connectWithMssql } = require("../src/config/database");

const EXPECTED = Object.freeze({
  positions: 5640,
  occupied: 4614,
  vacant: 1026,
  missingJobs: 202
});
const DEFAULT_EXPECTED_DATABASE = "P_HAROUGE";

const REMOVED_OBJECTS = Object.freeze([
  "PositionAssignment",
  "PositionAssignmentHistory",
  "PositionAssignmentMigrationAudit",
  "PositionAssignmentOpeningBalanceAudit",
  "PositionAssignmentType",
  "vw_EmployeePositionAssignmentHistory",
  "vw_PositionAssignmentAuditTrail",
  "fn_PositionAssignmentsAsOf",
  "usp_AssignEmployeeToPosition",
  "usp_TransferEmployeePosition",
  "usp_EndPositionAssignment",
  "usp_CancelPositionAssignment",
  "trg_PositionAssignment_PreventOverlap"
]);

const number = (value) => Number(value || 0);
const failures = [];
const fail = (message) => failures.push(message);
const expectNumber = (value, expected, label) => {
  if (number(value) !== expected) {
    fail(`${label}: expected ${expected}, found ${value}`);
  }
};

const parseExpectedDatabase = () => {
  const argument = process.argv.slice(2).find(
    (value) => value.startsWith("--expected-database=")
  );
  return argument
    ? argument.slice("--expected-database=".length)
    : DEFAULT_EXPECTED_DATABASE;
};

const main = async () => {
  const expectedDatabase = parseExpectedDatabase();
  const pool = await connectWithMssql();
  try {
    const metadataResult = await pool.request().query(`
      SELECT
        TRY_CONVERT(int, SERVERPROPERTY(N'ProductMajorVersion')) AS server_major_version,
        DB_NAME() AS database_name,
        OBJECT_ID(N'dbo.Employee', N'U') AS employee_object_id,
        OBJECT_ID(N'dbo.Position', N'U') AS position_object_id,
        OBJECT_ID(N'dbo.jobs', N'U') AS jobs_object_id,
        OBJECT_ID(N'dbo.TimeSheet', N'U') AS timesheet_object_id,
        OBJECT_ID(N'dbo.vw_CurrentEmployeePosition', N'V') AS current_view_object_id,
        OBJECT_ID(N'dbo.vw_VacantPositions', N'V') AS vacancy_view_object_id;

      SELECT o.name AS object_name, o.type_desc
      FROM sys.objects AS o
      WHERE o.schema_id = SCHEMA_ID(N'dbo')
        AND o.name IN (
          N'PositionAssignment', N'PositionAssignmentHistory',
          N'PositionAssignmentMigrationAudit', N'PositionAssignmentOpeningBalanceAudit',
          N'PositionAssignmentType', N'vw_EmployeePositionAssignmentHistory',
          N'vw_PositionAssignmentAuditTrail', N'fn_PositionAssignmentsAsOf',
          N'usp_AssignEmployeeToPosition', N'usp_TransferEmployeePosition',
          N'usp_EndPositionAssignment', N'usp_CancelPositionAssignment',
          N'trg_PositionAssignment_PreventOverlap'
        );

      SELECT
        c.name AS column_name,
        TYPE_NAME(c.user_type_id) AS data_type,
        c.max_length,
        c.is_nullable,
        c.is_identity,
        c.is_computed
      FROM sys.columns AS c
      WHERE c.object_id = OBJECT_ID(N'dbo.Position')
      ORDER BY c.column_id;

      SELECT
        kc.name AS primary_key_name,
        i.is_unique,
        i.is_primary_key,
        c.name AS key_column
      FROM sys.key_constraints AS kc
      JOIN sys.indexes AS i
        ON i.object_id = kc.parent_object_id AND i.index_id = kc.unique_index_id
      JOIN sys.index_columns AS ic
        ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
      JOIN sys.columns AS c
        ON c.object_id = ic.object_id AND c.column_id = ic.column_id
      WHERE kc.parent_object_id = OBJECT_ID(N'dbo.Position')
        AND kc.type = N'PK';

      SELECT
        i.name AS index_name,
        i.is_unique,
        i.has_filter,
        i.filter_definition,
        i.is_disabled,
        i.is_hypothetical,
        STRING_AGG(c.name, N',') WITHIN GROUP (ORDER BY ic.key_ordinal) AS key_columns
      FROM sys.indexes AS i
      JOIN sys.index_columns AS ic
        ON ic.object_id = i.object_id AND ic.index_id = i.index_id
       AND ic.is_included_column = 0
      JOIN sys.columns AS c
        ON c.object_id = ic.object_id AND c.column_id = ic.column_id
      WHERE i.object_id = OBJECT_ID(N'dbo.Position')
        AND i.name IN (
          N'UX_Position_EmployeeId_Occupied',
          N'IX_Position_Job_ID',
          N'IX_Position_Position_Number'
        )
      GROUP BY i.name, i.is_unique, i.has_filter, i.filter_definition,
        i.is_disabled, i.is_hypothetical;

      SELECT
        fk.name AS foreign_key_name,
        pc.name AS parent_column,
        OBJECT_SCHEMA_NAME(fk.referenced_object_id) + N'.' + OBJECT_NAME(fk.referenced_object_id)
          AS referenced_object,
        rc.name AS referenced_column,
        fk.delete_referential_action,
        fk.update_referential_action,
        fk.is_disabled,
        fk.is_not_trusted
      FROM sys.foreign_keys AS fk
      JOIN sys.foreign_key_columns AS fkc ON fkc.constraint_object_id = fk.object_id
      JOIN sys.columns AS pc
        ON pc.object_id = fkc.parent_object_id AND pc.column_id = fkc.parent_column_id
      JOIN sys.columns AS rc
        ON rc.object_id = fkc.referenced_object_id AND rc.column_id = fkc.referenced_column_id
      WHERE fk.parent_object_id = OBJECT_ID(N'dbo.Position');

      SELECT
        name AS check_name,
        definition,
        is_disabled,
        is_not_trusted
      FROM sys.check_constraints
      WHERE parent_object_id = OBJECT_ID(N'dbo.Position');

      SELECT
        OBJECT_NAME(c.object_id) AS view_name,
        c.name AS column_name,
        c.column_id
      FROM sys.columns AS c
      WHERE c.object_id IN (
        OBJECT_ID(N'dbo.vw_CurrentEmployeePosition'),
        OBJECT_ID(N'dbo.vw_VacantPositions')
      )
      ORDER BY view_name, c.column_id;

      SELECT
        OBJECT_NAME(sm.object_id) AS module_name,
        sm.definition
      FROM sys.sql_modules AS sm
      WHERE sm.object_id IN (
        OBJECT_ID(N'dbo.vw_CurrentEmployeePosition'),
        OBJECT_ID(N'dbo.vw_VacantPositions')
      );

      SELECT
        COUNT_BIG(*) AS exact_timesheet_fk_count,
        SUM(CASE WHEN fk.delete_referential_action <> 0
                       OR fk.update_referential_action <> 0
                       OR fk.is_disabled = 1
                       OR fk.is_not_trusted = 1
                 THEN 1 ELSE 0 END) AS unsafe_timesheet_fk_count
      FROM sys.foreign_key_columns AS fkc
      JOIN sys.foreign_keys AS fk ON fk.object_id = fkc.constraint_object_id
      WHERE fk.name = N'FK_TimeSheet_Employee'
        AND fkc.parent_object_id = OBJECT_ID(N'dbo.TimeSheet')
        AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'ID_Employee'
        AND fkc.referenced_object_id = OBJECT_ID(N'dbo.Employee')
        AND COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) = N'ID_Employee';
    `);

    const server = metadataResult.recordsets[0][0];
    if (!expectedDatabase || server.database_name !== expectedDatabase) {
      fail(`database confirmation failed: connected to ${server.database_name}, expected ${expectedDatabase}`);
    }
    if (number(server.server_major_version) < 13) fail("SQL Server major version is older than 13");
    for (const objectName of [
      "employee_object_id", "position_object_id", "jobs_object_id",
      "current_view_object_id", "vacancy_view_object_id"
    ]) {
      if (!server[objectName]) fail(`required object is missing (${objectName})`);
    }

    const unexpectedObjects = metadataResult.recordsets[1];
    if (unexpectedObjects.length > 0) {
      fail(
        "assignment-model objects still exist: "
        + unexpectedObjects.map((row) => row.object_name).join(", ")
      );
    }
    const columns = new Map(metadataResult.recordsets[2].map((row) => [row.column_name, row]));
    for (const removedColumn of ["JobId", "Job_Name_AR", "Job_Name_EN"]) {
      if (columns.has(removedColumn)) fail(`dbo.Position.${removedColumn} still exists`);
    }
    const id = columns.get("Id");
    if (!id || id.data_type !== "int" || Boolean(id.is_nullable)
        || !Boolean(id.is_identity) || Boolean(id.is_computed)) {
      fail("dbo.Position.Id is not the expected INT IDENTITY primary key column");
    }
    for (const columnName of ["EmployeeId", "Job_ID"]) {
      const column = columns.get(columnName);
      if (!column || column.data_type !== "int" || !Boolean(column.is_nullable)
          || Boolean(column.is_identity) || Boolean(column.is_computed)) {
        fail(`dbo.Position.${columnName} is not a nullable, ordinary INT column`);
      }
    }

    const primaryKeys = metadataResult.recordsets[3];
    if (primaryKeys.length !== 1 || primaryKeys[0].key_column !== "Id"
        || !Boolean(primaryKeys[0].is_unique) || !Boolean(primaryKeys[0].is_primary_key)) {
      fail("dbo.Position must have exactly one primary key on Id");
    }

    const indexes = new Map(metadataResult.recordsets[4].map((row) => [row.index_name, row]));
    const employeeIndex = indexes.get("UX_Position_EmployeeId_Occupied");
    if (!employeeIndex || !Boolean(employeeIndex.is_unique) || !Boolean(employeeIndex.has_filter)
        || employeeIndex.key_columns !== "EmployeeId") {
      fail("the unique filtered occupied-employee index is missing or invalid");
    }
    for (const [indexName, columnName] of [
      ["IX_Position_Job_ID", "Job_ID"],
      ["IX_Position_Position_Number", "Position_Number"]
    ]) {
      const index = indexes.get(indexName);
      if (!index || Boolean(index.is_unique) || index.key_columns !== columnName) {
        fail(`${indexName} is missing, unique, or targets the wrong column`);
      }
    }
    if ([...indexes.values()].some((row) => Boolean(row.is_disabled) || Boolean(row.is_hypothetical))) {
      fail("one or more required Position indexes are disabled or hypothetical");
    }

    const foreignKeys = new Map(
      metadataResult.recordsets[5].map((row) => [row.foreign_key_name, row])
    );
    const expectedForeignKeys = {
      FK_Position_Employee: ["EmployeeId", "dbo.Employee", "ID_Employee"],
      FK_Position_Jobs: ["Job_ID", "dbo.jobs", "Job_ID"]
    };
    for (const [name, expected] of Object.entries(expectedForeignKeys)) {
      const relationship = foreignKeys.get(name);
      if (!relationship
          || relationship.parent_column !== expected[0]
          || relationship.referenced_object !== expected[1]
          || relationship.referenced_column !== expected[2]
          || number(relationship.delete_referential_action) !== 0
          || number(relationship.update_referential_action) !== 0
          || Boolean(relationship.is_disabled)
          || Boolean(relationship.is_not_trusted)) {
        fail(`${name} is missing, untrusted, cascading, or targets the wrong columns`);
      }
    }
    if (foreignKeys.size !== 2) fail(`dbo.Position has ${foreignKeys.size} foreign keys; expected exactly 2`);

    const checks = metadataResult.recordsets[6];
    const employeeCheck = checks.find((row) => row.check_name === "CK_Position_EmployeeId_Positive");
    if (!employeeCheck || Boolean(employeeCheck.is_disabled) || Boolean(employeeCheck.is_not_trusted)) {
      fail("CK_Position_EmployeeId_Positive is missing, disabled, or untrusted");
    }

    const expectedViewColumns = {
      vw_CurrentEmployeePosition: [
        "EmployeeId", "PositionId", "Position_Number", "PositionLevel",
        "Position_Degree", "Position_DateCreation", "PositionStatus", "Position_Type",
        "Job_ID", "Job_Name_AR", "Job_Name_EN"
      ],
      vw_VacantPositions: [
        "PositionId", "Position_Number", "PositionLevel", "Position_Degree",
        "Position_DateCreation", "Status", "Position_Type", "Job_ID",
        "Job_Name_AR", "Job_Name_EN"
      ]
    };
    for (const [viewName, expectedColumns] of Object.entries(expectedViewColumns)) {
      const actualColumns = metadataResult.recordsets[7]
        .filter((row) => row.view_name === viewName)
        .map((row) => row.column_name);
      if (actualColumns.length !== expectedColumns.length
          || actualColumns.some((name, index) => name !== expectedColumns[index])) {
        fail(`${viewName} does not expose the expected clean columns`);
      }
    }
    for (const module of metadataResult.recordsets[8]) {
      if (/PositionAssignment|\bp\.JobId\b|\bp\.Job_Name_(?:AR|EN)\b/i.test(module.definition || "")) {
        fail(`${module.module_name} still depends on a removed assignment object or duplicate column`);
      }
    }

    const timeSheet = metadataResult.recordsets[9][0];
    if (server.timesheet_object_id) {
      expectNumber(timeSheet.exact_timesheet_fk_count, 1, "TimeSheet employee FK count");
      expectNumber(timeSheet.unsafe_timesheet_fk_count, 0, "unsafe TimeSheet employee FK count");
    }

    if (failures.length > 0) {
      throw new Error(`Single-table Position verification failed:\n- ${failures.join("\n- ")}`);
    }

    const dataResult = await pool.request().query(`
      SELECT
        COUNT_BIG(*) AS position_count,
        SUM(CASE WHEN EmployeeId IS NOT NULL THEN 1 ELSE 0 END) AS occupied_count,
        SUM(CASE WHEN EmployeeId IS NULL THEN 1 ELSE 0 END) AS vacancy_count,
        SUM(CASE WHEN EmployeeId = 0 THEN 1 ELSE 0 END) AS zero_employee_count,
        COUNT_BIG(DISTINCT EmployeeId) AS distinct_occupied_employee_count,
        SUM(CASE WHEN Job_ID IS NULL THEN 1 ELSE 0 END) AS missing_job_count,
        SUM(CASE WHEN Position_Number IS NULL THEN 1 ELSE 0 END) AS missing_position_number_count
      FROM dbo.Position;

      SELECT
        SUM(CASE WHEN p.EmployeeId IS NOT NULL AND e.ID_Employee IS NULL THEN 1 ELSE 0 END)
          AS orphan_employee_count,
        SUM(CASE WHEN p.Job_ID IS NOT NULL AND j.Job_ID IS NULL THEN 1 ELSE 0 END) AS orphan_job_count
      FROM dbo.Position AS p
      LEFT JOIN dbo.Employee AS e ON e.ID_Employee = p.EmployeeId
      LEFT JOIN dbo.jobs AS j ON j.Job_ID = p.Job_ID;

      SELECT
        COUNT_BIG(*) AS current_view_count,
        COUNT_BIG(DISTINCT EmployeeId) AS distinct_current_employee_count
      FROM dbo.vw_CurrentEmployeePosition;

      SELECT COUNT_BIG(*) AS vacancy_view_count FROM dbo.vw_VacantPositions;

      SELECT
        COUNT_BIG(*) AS duplicate_position_number_value_count,
        COALESCE(SUM(grouped.position_count), 0) AS positions_using_duplicate_numbers
      FROM (
        SELECT Position_Number, COUNT_BIG(*) AS position_count
        FROM dbo.Position
        WHERE Position_Number IS NOT NULL
        GROUP BY Position_Number
        HAVING COUNT_BIG(*) > 1
      ) AS grouped;
    `);

    const positions = dataResult.recordsets[0][0];
    const integrity = dataResult.recordsets[1][0];
    const currentView = dataResult.recordsets[2][0];
    const vacancyView = dataResult.recordsets[3][0];
    const duplicates = dataResult.recordsets[4][0];

    expectNumber(positions.position_count, EXPECTED.positions, "position count");
    expectNumber(positions.occupied_count, EXPECTED.occupied, "occupied position count");
    expectNumber(positions.vacancy_count, EXPECTED.vacant, "vacancy count");
    expectNumber(positions.zero_employee_count, 0, "zero employee reference count");
    expectNumber(positions.distinct_occupied_employee_count, EXPECTED.occupied, "distinct occupied employee count");
    expectNumber(positions.missing_job_count, EXPECTED.missingJobs, "missing job count");
    expectNumber(integrity.orphan_employee_count, 0, "orphan employee count");
    expectNumber(integrity.orphan_job_count, 0, "orphan job count");
    expectNumber(currentView.current_view_count, EXPECTED.occupied, "current-position view count");
    expectNumber(currentView.distinct_current_employee_count, EXPECTED.occupied, "current-position view employee count");
    expectNumber(vacancyView.vacancy_view_count, EXPECTED.vacant, "vacancy view count");

    if (failures.length > 0) {
      throw new Error(`Single-table Position verification failed:\n- ${failures.join("\n- ")}`);
    }

    console.log(JSON.stringify({
      status: "verified",
      database: server.database_name,
      serverMajorVersion: number(server.server_major_version),
      position: {
        total: number(positions.position_count),
        occupied: number(positions.occupied_count),
        vacant: number(positions.vacancy_count),
        missingJobs: number(positions.missing_job_count),
        missingPositionNumbers: number(positions.missing_position_number_count),
        duplicatePositionNumberValues: number(duplicates.duplicate_position_number_value_count),
        positionsUsingDuplicateNumbers: number(duplicates.positions_using_duplicate_numbers)
      },
      integrity: {
        orphanEmployees: number(integrity.orphan_employee_count),
        orphanJobs: number(integrity.orphan_job_count),
        trustedNoActionPositionForeignKeys: foreignKeys.size,
        requiredIndexes: indexes.size,
        requiredChecks: checks.filter(
          (row) => row.check_name === "CK_Position_EmployeeId_Positive"
        ).length,
        assignmentObjectsRemaining: unexpectedObjects.length,
        timeSheetEmployeeNoActionRelationship: number(timeSheet.exact_timesheet_fk_count)
      },
      views: {
        currentEmployees: number(currentView.current_view_count),
        vacancies: number(vacancyView.vacancy_view_count)
      },
      note: "Duplicate Position_Number values are intentionally allowed; Position.Id remains the unique primary key.",
      privacy: "Aggregate counts and schema metadata only; no employee row data is printed."
    }, null, 2));
  } finally {
    await pool.close();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
