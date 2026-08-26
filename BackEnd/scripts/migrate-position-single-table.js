require("dotenv").config();

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const sql = require("mssql");
const { connectWithMssql } = require("../src/config/database");

const SCRIPT_VERSION = "1.0.0";
const DEFAULT_EXPECTED_DATABASE = "P_HAROUGE";
const EXPECTED = Object.freeze({
  positions: 5640,
  occupied: 4614,
  vacant: 1026,
  missingJobs: 202
});

const SOURCE_TABLES = Object.freeze([
  "PositionAssignment",
  "PositionAssignmentHistory",
  "PositionAssignmentMigrationAudit",
  "PositionAssignmentOpeningBalanceAudit",
  "PositionAssignmentType"
]);

const ASSIGNMENT_ONLY_MODULES = Object.freeze([
  "vw_EmployeePositionAssignmentHistory",
  "vw_PositionAssignmentAuditTrail",
  "fn_PositionAssignmentsAsOf",
  "usp_AssignEmployeeToPosition",
  "usp_TransferEmployeePosition",
  "usp_EndPositionAssignment",
  "usp_CancelPositionAssignment",
  "trg_PositionAssignment_PreventOverlap"
]);

const LEGACY_POSITION_COLUMNS = Object.freeze([
  "JobId",
  "Job_Name_AR",
  "Job_Name_EN"
]);

const SOURCE_FOREIGN_KEYS = new Set([
  "FK_PositionAssignment_Position",
  "FK_PositionAssignment_Employee",
  "FK_PositionAssignment_Type",
  "FK_PositionAssignmentOpeningBalanceAudit_Migration",
  "FK_PositionAssignmentOpeningBalanceAudit_Assignment",
  "FK_PositionAssignmentOpeningBalanceAudit_Position",
  "FK_PositionAssignmentOpeningBalanceAudit_Employee"
]);

const EXPECTED_SOURCE_MODULE_DEPENDENCIES = new Set([
  "dbo.vw_CurrentEmployeePosition",
  "dbo.vw_VacantPositions",
  "dbo.vw_EmployeePositionAssignmentHistory",
  "dbo.vw_PositionAssignmentAuditTrail",
  "dbo.fn_PositionAssignmentsAsOf",
  "dbo.usp_AssignEmployeeToPosition",
  "dbo.usp_TransferEmployeePosition",
  "dbo.usp_EndPositionAssignment",
  "dbo.usp_CancelPositionAssignment",
  "dbo.trg_PositionAssignment_PreventOverlap",
  "dbo.CK_PositionAssignmentType_Code_NotBlank",
  "dbo.CK_PositionAssignment_EffectiveRange",
  "dbo.CK_PositionAssignment_OpeningBalance",
  "dbo.CK_PositionAssignment_CancellationAudit",
  "dbo.CK_PositionAssignment_CreatedBy_NotBlank",
  "dbo.PositionAssignment"
]);

const number = (value) => Number(value || 0);

const parseArguments = () => {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const snapshotArgument = args.find((argument) => argument.startsWith("--snapshot-dir="));
  const expectedDatabaseArgument = args.find(
    (argument) => argument.startsWith("--expected-database=")
  );
  const defaultSnapshotRoot = path.join(
    process.env.LOCALAPPDATA || os.tmpdir(),
    "HERP",
    "migration-backups",
    "position-single-table"
  );

  return {
    apply,
    snapshotDirectory: path.resolve(
      snapshotArgument
        ? snapshotArgument.slice("--snapshot-dir=".length)
        : defaultSnapshotRoot
    ),
    expectedDatabase: expectedDatabaseArgument
      ? expectedDatabaseArgument.slice("--expected-database=".length)
      : DEFAULT_EXPECTED_DATABASE
  };
};

const acquireMigrationLock = async (transaction) => {
  const result = await new sql.Request(transaction).query(`
    SET XACT_ABORT ON;
    DECLARE @LockResult int;
    EXEC @LockResult = sys.sp_getapplock
      @Resource = N'HERP:Position:single-table:v1',
      @LockMode = N'Exclusive',
      @LockOwner = N'Transaction',
      @LockTimeout = 15000;
    IF @LockResult < 0
      THROW 52000, 'Could not acquire the Position single-table migration lock.', 1;
    SELECT @LockResult AS lock_result;
  `);
  return number(result.recordset[0].lock_result);
};

const loadMetadata = async (request) => {
  const result = await request.query(`
    SELECT
      TRY_CONVERT(int, SERVERPROPERTY(N'ProductMajorVersion')) AS server_major_version,
      DB_NAME() AS database_name,
      OBJECT_ID(N'dbo.Employee', N'U') AS employee_object_id,
      OBJECT_ID(N'dbo.Position', N'U') AS position_object_id,
      OBJECT_ID(N'dbo.jobs', N'U') AS jobs_object_id,
      OBJECT_ID(N'dbo.TimeSheet', N'U') AS timesheet_object_id;

    SELECT
      o.name AS object_name,
      o.type AS object_type
    FROM sys.objects AS o
    WHERE o.schema_id = SCHEMA_ID(N'dbo')
      AND o.name IN (
        N'PositionAssignment', N'PositionAssignmentHistory',
        N'PositionAssignmentMigrationAudit', N'PositionAssignmentOpeningBalanceAudit',
        N'PositionAssignmentType', N'vw_CurrentEmployeePosition', N'vw_VacantPositions',
        N'vw_EmployeePositionAssignmentHistory', N'vw_PositionAssignmentAuditTrail',
        N'fn_PositionAssignmentsAsOf', N'usp_AssignEmployeeToPosition',
        N'usp_TransferEmployeePosition', N'usp_EndPositionAssignment',
        N'usp_CancelPositionAssignment', N'trg_PositionAssignment_PreventOverlap'
      );

    SELECT
      OBJECT_NAME(c.object_id) AS table_name,
      c.name AS column_name,
      TYPE_NAME(c.user_type_id) AS data_type,
      c.max_length,
      c.is_nullable,
      c.is_identity,
      c.is_computed
    FROM sys.columns AS c
    WHERE (c.object_id = OBJECT_ID(N'dbo.Position')
           AND c.name IN (
             N'Id', N'Position_Number', N'Position_Type', N'EmployeeId',
             N'JobId', N'Job_ID', N'Job_Name_AR', N'Job_Name_EN'
           ))
       OR (c.object_id = OBJECT_ID(N'dbo.Employee') AND c.name IN (N'ID_Employee', N'Ref_Employee'))
       OR (c.object_id = OBJECT_ID(N'dbo.jobs') AND c.name = N'Job_ID')
       OR c.object_id IN (
         OBJECT_ID(N'dbo.PositionAssignment'),
         OBJECT_ID(N'dbo.PositionAssignmentHistory')
       )
    ORDER BY table_name, c.column_id;

    SELECT
      fk.name AS foreign_key_name,
      OBJECT_SCHEMA_NAME(fk.parent_object_id) + N'.' + OBJECT_NAME(fk.parent_object_id) AS parent_object,
      pc.name AS parent_column,
      OBJECT_SCHEMA_NAME(fk.referenced_object_id) + N'.' + OBJECT_NAME(fk.referenced_object_id) AS referenced_object,
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
    WHERE fk.parent_object_id IN (
            OBJECT_ID(N'dbo.Position'), OBJECT_ID(N'dbo.PositionAssignment'),
            OBJECT_ID(N'dbo.PositionAssignmentOpeningBalanceAudit'), OBJECT_ID(N'dbo.TimeSheet')
          )
       OR fk.referenced_object_id IN (
            OBJECT_ID(N'dbo.Position'), OBJECT_ID(N'dbo.PositionAssignment'),
            OBJECT_ID(N'dbo.PositionAssignmentMigrationAudit'),
            OBJECT_ID(N'dbo.PositionAssignmentType'), OBJECT_ID(N'dbo.Employee')
          );

    SELECT
      OBJECT_SCHEMA_NAME(sed.referencing_id) + N'.' + OBJECT_NAME(sed.referencing_id) AS referencing_object,
      OBJECT_SCHEMA_NAME(sed.referenced_id) + N'.' + OBJECT_NAME(sed.referenced_id) AS referenced_object,
      COL_NAME(sed.referenced_id, sed.referenced_minor_id) AS referenced_column
    FROM sys.sql_expression_dependencies AS sed
    WHERE sed.referenced_id IN (
            OBJECT_ID(N'dbo.PositionAssignment'), OBJECT_ID(N'dbo.PositionAssignmentHistory'),
            OBJECT_ID(N'dbo.PositionAssignmentMigrationAudit'),
            OBJECT_ID(N'dbo.PositionAssignmentOpeningBalanceAudit'),
            OBJECT_ID(N'dbo.PositionAssignmentType')
          )
       OR (
         sed.referenced_id = OBJECT_ID(N'dbo.Position')
         AND COL_NAME(sed.referenced_id, sed.referenced_minor_id)
             IN (N'JobId', N'Job_Name_AR', N'Job_Name_EN')
       );

    SELECT
      i.name AS index_name,
      i.is_unique,
      i.is_primary_key,
      i.has_filter,
      i.filter_definition,
      i.is_disabled,
      STRING_AGG(c.name, N',') WITHIN GROUP (ORDER BY ic.key_ordinal) AS key_columns
    FROM sys.indexes AS i
    JOIN sys.index_columns AS ic
      ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.is_included_column = 0
    JOIN sys.columns AS c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE i.object_id = OBJECT_ID(N'dbo.Position')
    GROUP BY i.name, i.is_unique, i.is_primary_key, i.has_filter,
      i.filter_definition, i.is_disabled;

    SELECT
      temporal_type,
      history_table_id,
      OBJECT_ID(N'dbo.PositionAssignmentHistory', N'U') AS expected_history_table_id
    FROM sys.tables
    WHERE object_id = OBJECT_ID(N'dbo.PositionAssignment');

    SELECT
      i.name AS index_name,
      c.name AS column_name,
      ic.is_included_column
    FROM sys.indexes AS i
    JOIN sys.index_columns AS ic
      ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    JOIN sys.columns AS c
      ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE i.object_id = OBJECT_ID(N'dbo.Position')
      AND c.name IN (N'JobId', N'Job_Name_AR', N'Job_Name_EN');
  `);

  const objects = new Map(
    result.recordsets[1].map((row) => [row.object_name, String(row.object_type).trim()])
  );
  const columns = new Map(
    result.recordsets[2].map((row) => [`${row.table_name}.${row.column_name}`, row])
  );
  return {
    server: result.recordsets[0][0],
    objects,
    columns,
    foreignKeys: result.recordsets[3],
    moduleDependencies: result.recordsets[4],
    indexes: result.recordsets[5],
    temporal: result.recordsets[6][0] || null,
    legacyColumnIndexDependencies: result.recordsets[7]
  };
};

const classifyState = (metadata) => {
  const sourceObjectNames = [...SOURCE_TABLES, ...ASSIGNMENT_ONLY_MODULES];
  const sourceObjectCount = sourceObjectNames.filter((name) => metadata.objects.has(name)).length;
  const legacyColumnCount = LEGACY_POSITION_COLUMNS.filter((name) =>
    metadata.columns.has(`Position.${name}`)
  ).length;

  if (
    sourceObjectCount === sourceObjectNames.length
    && legacyColumnCount === LEGACY_POSITION_COLUMNS.length
  ) {
    return "assignment-model";
  }
  if (sourceObjectCount === 0 && legacyColumnCount === 0) {
    return "single-table";
  }
  return "partial";
};

const assertBaseSchema = (metadata, expectedDatabase) => {
  if (number(metadata.server.server_major_version) < 13) {
    throw new Error("SQL Server 2016 (major version 13) or newer is required.");
  }
  if (!expectedDatabase || metadata.server.database_name !== expectedDatabase) {
    throw new Error(
      `Database confirmation failed: connected to ${metadata.server.database_name || "unknown"}, `
      + `expected ${expectedDatabase || "an explicit database name"}.`
    );
  }
  for (const objectName of ["employee_object_id", "position_object_id", "jobs_object_id"]) {
    if (!metadata.server[objectName]) {
      throw new Error(`Required table is missing (${objectName}).`);
    }
  }

  const requiredColumns = [
    ["Employee.ID_Employee", "int", false],
    ["Position.Id", "int", false],
    ["Position.EmployeeId", "int", true],
    ["Position.Job_ID", "int", true],
    ["jobs.Job_ID", "int", false]
  ];
  for (const [name, dataType, nullable] of requiredColumns) {
    const column = metadata.columns.get(name);
    if (!column || column.data_type !== dataType || Boolean(column.is_nullable) !== nullable) {
      throw new Error(`${name} must be ${nullable ? "nullable " : "non-null "}${dataType}.`);
    }
  }
  const positionId = metadata.columns.get("Position.Id");
  if (!Boolean(positionId.is_identity) || Boolean(positionId.is_computed)) {
    throw new Error("dbo.Position.Id must remain a non-computed IDENTITY column.");
  }
};

const loadCommonCounts = async (request, state) => {
  const jobColumn = state === "assignment-model" ? "p.JobId" : "p.Job_ID";
  const result = await request.query(`
    SELECT
      COUNT_BIG(*) AS position_count,
      SUM(CASE WHEN p.EmployeeId IS NULL THEN 1 ELSE 0 END) AS null_employee_count,
      SUM(CASE WHEN p.EmployeeId = 0 THEN 1 ELSE 0 END) AS zero_employee_count,
      SUM(CASE WHEN p.EmployeeId IS NOT NULL AND p.EmployeeId <> 0 THEN 1 ELSE 0 END) AS nonzero_employee_count,
      COUNT_BIG(DISTINCT CASE WHEN p.EmployeeId IS NOT NULL AND p.EmployeeId <> 0 THEN p.EmployeeId END)
        AS distinct_nonzero_employee_count,
      SUM(CASE WHEN p.Job_ID IS NULL THEN 1 ELSE 0 END) AS missing_job_count,
      SUM(CASE WHEN ${jobColumn} IS NOT NULL AND j.Job_ID IS NULL THEN 1 ELSE 0 END) AS orphan_job_count,
      SUM(CASE WHEN p.Position_Number IS NULL THEN 1 ELSE 0 END) AS missing_position_number_count
    FROM dbo.Position AS p
    LEFT JOIN dbo.jobs AS j ON j.Job_ID = ${jobColumn};

    SELECT
      COUNT_BIG(*) AS orphan_employee_count
    FROM dbo.Position AS p
    LEFT JOIN dbo.Employee AS e ON e.ID_Employee = p.EmployeeId
    WHERE p.EmployeeId IS NOT NULL AND e.ID_Employee IS NULL;

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
  return {
    positions: result.recordsets[0][0],
    orphanEmployees: result.recordsets[1][0],
    duplicateNumbers: result.recordsets[2][0]
  };
};

const loadAssignmentSourceCounts = async (request) => {
  const result = await request.query(`
    SELECT
      COUNT_BIG(*) AS assignment_count,
      SUM(CASE WHEN IsCancelled = 0 AND EffectiveTo IS NULL AND IsPrimary = 1 THEN 1 ELSE 0 END)
        AS current_primary_count,
      SUM(CASE WHEN IsCancelled <> 0 THEN 1 ELSE 0 END) AS cancelled_count,
      SUM(CASE WHEN EffectiveTo IS NOT NULL THEN 1 ELSE 0 END) AS ended_count,
      SUM(CASE WHEN IsPrimary <> 1 THEN 1 ELSE 0 END) AS nonprimary_count,
      SUM(CASE WHEN EmployeeId <= 0 THEN 1 ELSE 0 END) AS nonpositive_employee_count,
      COUNT_BIG(DISTINCT CASE WHEN IsCancelled = 0 AND EffectiveTo IS NULL AND IsPrimary = 1 THEN PositionId END)
        AS distinct_current_position_count,
      COUNT_BIG(DISTINCT CASE WHEN IsCancelled = 0 AND EffectiveTo IS NULL AND IsPrimary = 1 THEN EmployeeId END)
        AS distinct_current_employee_count
    FROM dbo.PositionAssignment;

    SELECT
      SUM(CASE WHEN p.Id IS NULL THEN 1 ELSE 0 END) AS orphan_position_count,
      SUM(CASE WHEN e.ID_Employee IS NULL THEN 1 ELSE 0 END) AS orphan_employee_count,
      SUM(CASE WHEN pa.IsCancelled = 0 AND pa.EffectiveTo IS NULL AND pa.IsPrimary = 1
                    AND p.EmployeeId <> detail.SourceEmployeeReference THEN 1 ELSE 0 END)
        AS legacy_provenance_mismatch_count,
      SUM(CASE WHEN pa.IsCancelled = 0 AND pa.EffectiveTo IS NULL AND pa.IsPrimary = 1
                    AND (detail.EmployeeId <> pa.EmployeeId OR detail.PositionId <> pa.PositionId) THEN 1 ELSE 0 END)
        AS audit_assignment_mismatch_count
    FROM dbo.PositionAssignment AS pa
    LEFT JOIN dbo.Position AS p ON p.Id = pa.PositionId
    LEFT JOIN dbo.Employee AS e ON e.ID_Employee = pa.EmployeeId
    LEFT JOIN dbo.PositionAssignmentOpeningBalanceAudit AS detail
      ON detail.PositionAssignmentId = pa.PositionAssignmentId;

    SELECT
      COUNT_BIG(*) AS detail_audit_count,
      COUNT_BIG(DISTINCT PositionId) AS distinct_audited_position_count,
      COUNT_BIG(DISTINCT EmployeeId) AS distinct_audited_employee_count
    FROM dbo.PositionAssignmentOpeningBalanceAudit;

    SELECT
      COUNT_BIG(*) AS audit_count,
      MIN(PositionCount) AS audited_positions,
      MIN(AssignmentCount) AS audited_assignments,
      MIN(VacancyCount) AS audited_vacancies,
      MIN(MissingJobCount) AS audited_missing_jobs
    FROM dbo.PositionAssignmentMigrationAudit;

    SELECT
      COUNT_BIG(*) AS history_count
    FROM dbo.PositionAssignmentHistory;

    SELECT
      SUM(CASE WHEN p.JobId IS NOT NULL AND p.Job_ID IS NOT NULL AND p.JobId <> p.Job_ID THEN 1 ELSE 0 END)
        AS conflicting_job_count,
      SUM(CASE WHEN p.JobId IS NULL AND p.Job_ID IS NOT NULL THEN 1 ELSE 0 END) AS missing_jobid_copy_count,
      SUM(CASE WHEN p.JobId IS NOT NULL AND p.Job_ID IS NULL THEN 1 ELSE 0 END) AS missing_legacy_job_copy_count
    FROM dbo.Position AS p;
  `);
  return {
    assignments: result.recordsets[0][0],
    integrity: result.recordsets[1][0],
    detailAudit: result.recordsets[2][0],
    audit: result.recordsets[3][0],
    history: result.recordsets[4][0],
    jobs: result.recordsets[5][0]
  };
};

const assertExpectedValue = (actual, expected, label) => {
  if (number(actual) !== expected) {
    throw new Error(`Preflight failed: expected ${label} ${expected}, found ${actual}.`);
  }
};

const assertAssignmentSource = (metadata, common, source) => {
  const expectedSourceObjectTypes = {
    PositionAssignment: "U",
    PositionAssignmentHistory: "U",
    PositionAssignmentMigrationAudit: "U",
    PositionAssignmentOpeningBalanceAudit: "U",
    PositionAssignmentType: "U",
    vw_EmployeePositionAssignmentHistory: "V",
    vw_PositionAssignmentAuditTrail: "V",
    fn_PositionAssignmentsAsOf: "IF",
    usp_AssignEmployeeToPosition: "P",
    usp_TransferEmployeePosition: "P",
    usp_EndPositionAssignment: "P",
    usp_CancelPositionAssignment: "P",
    trg_PositionAssignment_PreventOverlap: "TR"
  };
  for (const [name, type] of Object.entries(expectedSourceObjectTypes)) {
    if (metadata.objects.get(name) !== type) {
      throw new Error(`dbo.${name} is missing or has the wrong SQL object type.`);
    }
  }
  for (const sharedView of ["vw_CurrentEmployeePosition", "vw_VacantPositions"]) {
    if (metadata.objects.get(sharedView) !== "V") {
      throw new Error(`Required source view dbo.${sharedView} is missing.`);
    }
  }
  const snapshotAssignmentColumns = [
    "PositionAssignmentId", "PositionId", "EmployeeId", "AssignmentTypeCode",
    "IsPrimary", "EffectiveFrom", "EffectiveTo", "ImportedAsOf", "IsOpeningBalance",
    "IsCancelled", "DecisionNumber", "DecisionDate", "AssignmentReason", "EndReason",
    "Notes", "CreatedAtUtc", "CreatedBy", "ModifiedAtUtc", "ModifiedBy",
    "CancelledAtUtc", "CancelledBy", "CancellationReason", "RowVersion",
    "SystemValidFrom", "SystemValidTo"
  ];
  for (const tableName of ["PositionAssignment", "PositionAssignmentHistory"]) {
    for (const columnName of snapshotAssignmentColumns) {
      if (!metadata.columns.has(`${tableName}.${columnName}`)) {
        throw new Error(
          `Rollback snapshot cannot be guaranteed because dbo.${tableName}.${columnName} is missing.`
        );
      }
    }
  }
  for (const name of LEGACY_POSITION_COLUMNS) {
    if (!metadata.columns.has(`Position.${name}`)) {
      throw new Error(`Required source column dbo.Position.${name} is missing.`);
    }
  }
  const jobId = metadata.columns.get("Position.JobId");
  if (jobId.data_type !== "int" || !Boolean(jobId.is_nullable)) {
    throw new Error("dbo.Position.JobId must be a nullable INT source column.");
  }
  if (!metadata.temporal || number(metadata.temporal.temporal_type) !== 2) {
    throw new Error("dbo.PositionAssignment must still be system-versioned before conversion.");
  }
  if (number(metadata.temporal.history_table_id) !== number(metadata.temporal.expected_history_table_id)) {
    throw new Error("dbo.PositionAssignmentHistory is not the configured temporal history table.");
  }

  const unknownSourceForeignKeys = metadata.foreignKeys.filter((foreignKey) => {
    const touchesSource = SOURCE_TABLES.some(
      (table) => foreignKey.parent_object === `dbo.${table}` || foreignKey.referenced_object === `dbo.${table}`
    );
    return touchesSource && !SOURCE_FOREIGN_KEYS.has(foreignKey.foreign_key_name);
  });
  if (unknownSourceForeignKeys.length > 0) {
    throw new Error(
      "Unexpected relationships reference assignment tables: "
      + unknownSourceForeignKeys.map((row) => row.foreign_key_name).join(", ")
    );
  }
  const presentSourceForeignKeys = metadata.foreignKeys.filter((foreignKey) =>
    SOURCE_FOREIGN_KEYS.has(foreignKey.foreign_key_name)
  );
  if (presentSourceForeignKeys.length !== SOURCE_FOREIGN_KEYS.size) {
    throw new Error("One or more expected PositionAssignment foreign keys are missing.");
  }
  if (presentSourceForeignKeys.some((foreignKey) =>
    Boolean(foreignKey.is_disabled)
    || Boolean(foreignKey.is_not_trusted)
    || number(foreignKey.delete_referential_action) !== 0
    || number(foreignKey.update_referential_action) !== 0
  )) {
    throw new Error("A PositionAssignment foreign key is disabled, untrusted, or cascading.");
  }

  const positionForeignKeys = metadata.foreignKeys.filter(
    (foreignKey) => foreignKey.parent_object === "dbo.Position"
  );
  if (
    positionForeignKeys.length !== 1
    || positionForeignKeys[0].foreign_key_name !== "FK_Position_Jobs"
    || positionForeignKeys[0].parent_column !== "JobId"
    || positionForeignKeys[0].referenced_object !== "dbo.jobs"
    || positionForeignKeys[0].referenced_column !== "Job_ID"
    || Boolean(positionForeignKeys[0].is_disabled)
    || Boolean(positionForeignKeys[0].is_not_trusted)
    || number(positionForeignKeys[0].delete_referential_action) !== 0
    || number(positionForeignKeys[0].update_referential_action) !== 0
  ) {
    throw new Error("The source Position.JobId relationship is missing, unsafe, or unexpected.");
  }
  const sourceJobIndex = metadata.indexes.find(
    (index) => index.index_name === "IX_HERP_Position_JobId"
  );
  if (!sourceJobIndex || sourceJobIndex.key_columns !== "JobId"
      || Boolean(sourceJobIndex.is_unique) || Boolean(sourceJobIndex.is_disabled)) {
    throw new Error("The expected IX_HERP_Position_JobId source index is missing or invalid.");
  }
  const unexpectedLegacyIndexes = metadata.legacyColumnIndexDependencies.filter(
    (dependency) => dependency.index_name !== "IX_HERP_Position_JobId"
      || dependency.column_name !== "JobId"
      || Boolean(dependency.is_included_column)
  );
  if (unexpectedLegacyIndexes.length > 0
      || metadata.legacyColumnIndexDependencies.length !== 1) {
    throw new Error("Unexpected indexes depend on Position columns scheduled for removal.");
  }
  if (metadata.server.timesheet_object_id) {
    const timeSheetForeignKeys = metadata.foreignKeys.filter(
      (foreignKey) => foreignKey.foreign_key_name === "FK_TimeSheet_Employee"
    );
    if (
      timeSheetForeignKeys.length !== 1
      || timeSheetForeignKeys[0].parent_object !== "dbo.TimeSheet"
      || timeSheetForeignKeys[0].parent_column !== "ID_Employee"
      || timeSheetForeignKeys[0].referenced_object !== "dbo.Employee"
      || timeSheetForeignKeys[0].referenced_column !== "ID_Employee"
      || Boolean(timeSheetForeignKeys[0].is_disabled)
      || Boolean(timeSheetForeignKeys[0].is_not_trusted)
      || number(timeSheetForeignKeys[0].delete_referential_action) !== 0
      || number(timeSheetForeignKeys[0].update_referential_action) !== 0
    ) {
      throw new Error("FK_TimeSheet_Employee must remain a trusted NO ACTION relationship.");
    }
  }

  const unknownModuleDependencies = metadata.moduleDependencies.filter(
    (dependency) => !EXPECTED_SOURCE_MODULE_DEPENDENCIES.has(dependency.referencing_object)
  );
  if (unknownModuleDependencies.length > 0) {
    throw new Error(
      "Unexpected SQL modules depend on objects that will be removed: "
      + [...new Set(unknownModuleDependencies.map((row) => row.referencing_object))].join(", ")
    );
  }

  assertExpectedValue(common.positions.position_count, EXPECTED.positions, "position count");
  assertExpectedValue(common.positions.missing_job_count, EXPECTED.missingJobs, "missing job count");
  assertExpectedValue(common.positions.orphan_job_count, 0, "orphan job count");
  assertExpectedValue(source.assignments.assignment_count, EXPECTED.occupied, "assignment count");
  assertExpectedValue(source.assignments.current_primary_count, EXPECTED.occupied, "current primary assignment count");
  assertExpectedValue(source.assignments.distinct_current_position_count, EXPECTED.occupied, "distinct occupied position count");
  assertExpectedValue(source.assignments.distinct_current_employee_count, EXPECTED.occupied, "distinct assigned employee count");
  assertExpectedValue(source.assignments.cancelled_count, 0, "cancelled assignment count");
  assertExpectedValue(source.assignments.ended_count, 0, "ended assignment count");
  assertExpectedValue(source.assignments.nonprimary_count, 0, "non-primary assignment count");
  assertExpectedValue(source.assignments.nonpositive_employee_count, 0, "non-positive assignment employee count");
  assertExpectedValue(source.integrity.orphan_position_count, 0, "orphan assignment position count");
  assertExpectedValue(source.integrity.orphan_employee_count, 0, "orphan assignment employee count");
  assertExpectedValue(source.integrity.legacy_provenance_mismatch_count, 0, "legacy provenance mismatch count");
  assertExpectedValue(source.integrity.audit_assignment_mismatch_count, 0, "assignment audit mismatch count");
  assertExpectedValue(source.detailAudit.detail_audit_count, EXPECTED.occupied, "opening-balance audit row count");
  assertExpectedValue(source.detailAudit.distinct_audited_position_count, EXPECTED.occupied, "audited position count");
  assertExpectedValue(source.detailAudit.distinct_audited_employee_count, EXPECTED.occupied, "audited employee count");
  assertExpectedValue(source.audit.audit_count, 1, "migration audit count");
  assertExpectedValue(source.audit.audited_positions, EXPECTED.positions, "audited position count");
  assertExpectedValue(source.audit.audited_assignments, EXPECTED.occupied, "audited assignment count");
  assertExpectedValue(source.audit.audited_vacancies, EXPECTED.vacant, "audited vacancy count");
  assertExpectedValue(source.audit.audited_missing_jobs, EXPECTED.missingJobs, "audited missing-job count");
  assertExpectedValue(source.jobs.conflicting_job_count, 0, "conflicting Position job identifiers");
  assertExpectedValue(source.jobs.missing_jobid_copy_count, 0, "missing JobId copies");
  assertExpectedValue(source.jobs.missing_legacy_job_copy_count, 0, "missing Job_ID copies");

  const legacyOccupied = number(common.positions.nonzero_employee_count);
  const legacyVacant = number(common.positions.null_employee_count) + number(common.positions.zero_employee_count);
  assertExpectedValue(legacyOccupied, EXPECTED.occupied, "legacy occupied position count");
  assertExpectedValue(legacyVacant, EXPECTED.vacant, "legacy vacancy count");
};

const loadTargetDetails = async (request) => {
  const result = await request.query(`
    SELECT
      COUNT_BIG(*) AS current_view_count,
      COUNT_BIG(DISTINCT EmployeeId) AS current_view_distinct_employee_count
    FROM dbo.vw_CurrentEmployeePosition;

    SELECT COUNT_BIG(*) AS vacancy_view_count FROM dbo.vw_VacantPositions;

    SELECT
      COUNT_BIG(*) AS exact_fk_count,
      SUM(CASE WHEN fk.is_disabled = 1 OR fk.is_not_trusted = 1
                    OR fk.delete_referential_action <> 0 OR fk.update_referential_action <> 0
               THEN 1 ELSE 0 END) AS unsafe_fk_count
    FROM sys.foreign_key_columns AS fkc
    JOIN sys.foreign_keys AS fk ON fk.object_id = fkc.constraint_object_id
    WHERE (fk.name = N'FK_Position_Employee'
           AND fkc.parent_object_id = OBJECT_ID(N'dbo.Position')
           AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'EmployeeId'
           AND fkc.referenced_object_id = OBJECT_ID(N'dbo.Employee')
           AND COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) = N'ID_Employee')
       OR (fk.name = N'FK_Position_Jobs'
           AND fkc.parent_object_id = OBJECT_ID(N'dbo.Position')
           AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'Job_ID'
           AND fkc.referenced_object_id = OBJECT_ID(N'dbo.jobs')
           AND COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) = N'Job_ID');

    SELECT
      COUNT_BIG(*) AS required_index_count,
      SUM(CASE WHEN is_disabled = 1 OR is_hypothetical = 1 THEN 1 ELSE 0 END) AS unsafe_index_count,
      SUM(CASE WHEN name = N'UX_Position_EmployeeId_Occupied'
                    AND (is_unique = 0 OR has_filter = 0) THEN 1 ELSE 0 END) AS invalid_employee_index_count
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.Position')
      AND name IN (
        N'UX_Position_EmployeeId_Occupied',
        N'IX_Position_Job_ID',
        N'IX_Position_Position_Number'
      );

    SELECT
      COUNT_BIG(*) AS check_count,
      SUM(CASE WHEN is_disabled = 1 OR is_not_trusted = 1 THEN 1 ELSE 0 END) AS unsafe_check_count
    FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID(N'dbo.Position')
      AND name = N'CK_Position_EmployeeId_Positive';

    SELECT
      COUNT_BIG(*) AS timesheet_fk_count,
      SUM(CASE WHEN fk.is_disabled = 1 OR fk.is_not_trusted = 1
                    OR fk.delete_referential_action <> 0 OR fk.update_referential_action <> 0
               THEN 1 ELSE 0 END) AS unsafe_timesheet_fk_count
    FROM sys.foreign_key_columns AS fkc
    JOIN sys.foreign_keys AS fk ON fk.object_id = fkc.constraint_object_id
    WHERE fk.name = N'FK_TimeSheet_Employee'
      AND fkc.parent_object_id = OBJECT_ID(N'dbo.TimeSheet')
      AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'ID_Employee'
      AND fkc.referenced_object_id = OBJECT_ID(N'dbo.Employee')
      AND COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) = N'ID_Employee';

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
  `);
  return {
    currentView: result.recordsets[0][0],
    vacancyView: result.recordsets[1][0],
    foreignKeys: result.recordsets[2][0],
    indexes: result.recordsets[3][0],
    checks: result.recordsets[4][0],
    timeSheet: result.recordsets[5][0],
    viewColumns: result.recordsets[6]
  };
};

const assertSingleTableTarget = (metadata, common, target) => {
  assertExpectedValue(common.positions.position_count, EXPECTED.positions, "position count");
  assertExpectedValue(common.positions.nonzero_employee_count, EXPECTED.occupied, "occupied position count");
  assertExpectedValue(common.positions.distinct_nonzero_employee_count, EXPECTED.occupied, "distinct occupied employee count");
  assertExpectedValue(common.positions.null_employee_count, EXPECTED.vacant, "vacant position count");
  assertExpectedValue(common.positions.zero_employee_count, 0, "zero-valued Position.EmployeeId count");
  assertExpectedValue(common.positions.missing_job_count, EXPECTED.missingJobs, "missing job count");
  assertExpectedValue(common.positions.orphan_job_count, 0, "orphan job count");
  assertExpectedValue(common.orphanEmployees.orphan_employee_count, 0, "orphan employee count");
  assertExpectedValue(target.currentView.current_view_count, EXPECTED.occupied, "current-position view count");
  assertExpectedValue(target.currentView.current_view_distinct_employee_count, EXPECTED.occupied, "current-position distinct employee count");
  assertExpectedValue(target.vacancyView.vacancy_view_count, EXPECTED.vacant, "vacancy view count");
  assertExpectedValue(target.foreignKeys.exact_fk_count, 2, "required Position foreign-key count");
  assertExpectedValue(target.foreignKeys.unsafe_fk_count, 0, "unsafe Position foreign-key count");
  assertExpectedValue(target.indexes.required_index_count, 3, "required Position index count");
  assertExpectedValue(target.indexes.unsafe_index_count, 0, "unsafe Position index count");
  assertExpectedValue(target.indexes.invalid_employee_index_count, 0, "invalid occupied-employee index count");
  assertExpectedValue(target.checks.check_count, 1, "required Position check count");
  assertExpectedValue(target.checks.unsafe_check_count, 0, "unsafe Position check count");

  if (metadata.server.timesheet_object_id) {
    assertExpectedValue(target.timeSheet.timesheet_fk_count, 1, "TimeSheet employee FK count");
    assertExpectedValue(target.timeSheet.unsafe_timesheet_fk_count, 0, "unsafe TimeSheet FK count");
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
  for (const [viewName, columns] of Object.entries(expectedViewColumns)) {
    const actual = target.viewColumns
      .filter((row) => row.view_name === viewName)
      .map((row) => row.column_name);
    if (actual.length !== columns.length || actual.some((name, index) => name !== columns[index])) {
      throw new Error(`${viewName} does not expose the expected clean single-table columns.`);
    }
  }
};

const inspectState = async (request, expectedDatabase) => {
  const metadata = await loadMetadata(request);
  assertBaseSchema(metadata, expectedDatabase);
  const state = classifyState(metadata);
  if (state === "partial") {
    throw new Error(
      "A partial or unexpected Position schema was detected. No automatic repair will be attempted."
    );
  }
  const common = await loadCommonCounts(request, state);
  if (state === "assignment-model") {
    const source = await loadAssignmentSourceCounts(request);
    assertAssignmentSource(metadata, common, source);
    return { state, metadata, common, source, target: null };
  }
  const target = await loadTargetDetails(request);
  assertSingleTableTarget(metadata, common, target);
  return { state, metadata, common, source: null, target };
};

const lockSourceTables = async (transaction) => {
  await new sql.Request(transaction).query(`
    DECLARE @PositionRows bigint, @AssignmentRows bigint, @HistoryRows bigint,
            @DetailRows bigint, @AuditRows bigint, @TypeRows bigint,
            @EmployeeRows bigint, @JobRows bigint;
    SELECT @PositionRows = COUNT_BIG(*) FROM dbo.Position WITH (TABLOCKX, HOLDLOCK);
    SELECT @AssignmentRows = COUNT_BIG(*) FROM dbo.PositionAssignment WITH (TABLOCKX, HOLDLOCK);
    SELECT @HistoryRows = COUNT_BIG(*) FROM dbo.PositionAssignmentHistory WITH (TABLOCKX, HOLDLOCK);
    SELECT @DetailRows = COUNT_BIG(*) FROM dbo.PositionAssignmentOpeningBalanceAudit WITH (TABLOCKX, HOLDLOCK);
    SELECT @AuditRows = COUNT_BIG(*) FROM dbo.PositionAssignmentMigrationAudit WITH (TABLOCKX, HOLDLOCK);
    SELECT @TypeRows = COUNT_BIG(*) FROM dbo.PositionAssignmentType WITH (TABLOCKX, HOLDLOCK);
    SELECT @EmployeeRows = COUNT_BIG(*) FROM dbo.Employee WITH (TABLOCK, HOLDLOCK);
    SELECT @JobRows = COUNT_BIG(*) FROM dbo.jobs WITH (TABLOCK, HOLDLOCK);
  `);
};

const loadRollbackSnapshot = async (transaction, inspection) => {
  const result = await new sql.Request(transaction).query(`
    SELECT Id, EmployeeId, JobId, Job_ID, Job_Name_AR, Job_Name_EN
    FROM dbo.Position ORDER BY Id;

    SELECT
      PositionAssignmentId, PositionId, EmployeeId, AssignmentTypeCode,
      IsPrimary, EffectiveFrom, EffectiveTo, ImportedAsOf, IsOpeningBalance,
      IsCancelled, DecisionNumber, DecisionDate, AssignmentReason, EndReason,
      Notes, CreatedAtUtc, CreatedBy, ModifiedAtUtc, ModifiedBy,
      CancelledAtUtc, CancelledBy, CancellationReason, RowVersion,
      SystemValidFrom, SystemValidTo
    FROM dbo.PositionAssignment
    ORDER BY PositionAssignmentId;

    SELECT
      PositionAssignmentId, PositionId, EmployeeId, AssignmentTypeCode,
      IsPrimary, EffectiveFrom, EffectiveTo, ImportedAsOf, IsOpeningBalance,
      IsCancelled, DecisionNumber, DecisionDate, AssignmentReason, EndReason,
      Notes, CreatedAtUtc, CreatedBy, ModifiedAtUtc, ModifiedBy,
      CancelledAtUtc, CancelledBy, CancellationReason, RowVersion,
      SystemValidFrom, SystemValidTo
    FROM dbo.PositionAssignmentHistory
    ORDER BY PositionAssignmentId, SystemValidFrom;
    SELECT * FROM dbo.PositionAssignmentMigrationAudit ORDER BY MigrationKey;
    SELECT * FROM dbo.PositionAssignmentOpeningBalanceAudit ORDER BY MigrationKey, PositionId;
    SELECT * FROM dbo.PositionAssignmentType ORDER BY SortOrder, AssignmentTypeCode;

    SELECT
      OBJECT_SCHEMA_NAME(c.object_id) AS schema_name,
      OBJECT_NAME(c.object_id) AS table_name,
      c.column_id,
      c.name AS column_name,
      TYPE_NAME(c.user_type_id) AS data_type,
      c.max_length,
      c.precision,
      c.scale,
      c.is_nullable,
      c.is_identity,
      c.is_computed,
      c.generated_always_type,
      c.is_hidden,
      dc.name AS default_name,
      dc.definition AS default_definition
    FROM sys.columns AS c
    LEFT JOIN sys.default_constraints AS dc ON dc.object_id = c.default_object_id
    WHERE c.object_id IN (
      OBJECT_ID(N'dbo.Position'), OBJECT_ID(N'dbo.PositionAssignment'),
      OBJECT_ID(N'dbo.PositionAssignmentHistory'),
      OBJECT_ID(N'dbo.PositionAssignmentMigrationAudit'),
      OBJECT_ID(N'dbo.PositionAssignmentOpeningBalanceAudit'),
      OBJECT_ID(N'dbo.PositionAssignmentType')
    )
    ORDER BY table_name, c.column_id;

    SELECT
      OBJECT_SCHEMA_NAME(o.object_id) AS schema_name,
      o.name AS object_name,
      o.type_desc,
      sm.definition
    FROM sys.objects AS o
    JOIN sys.sql_modules AS sm ON sm.object_id = o.object_id
    WHERE o.schema_id = SCHEMA_ID(N'dbo')
      AND o.name IN (
        N'vw_CurrentEmployeePosition', N'vw_VacantPositions',
        N'vw_EmployeePositionAssignmentHistory', N'vw_PositionAssignmentAuditTrail',
        N'fn_PositionAssignmentsAsOf', N'usp_AssignEmployeeToPosition',
        N'usp_TransferEmployeePosition', N'usp_EndPositionAssignment',
        N'usp_CancelPositionAssignment', N'trg_PositionAssignment_PreventOverlap'
      )
    ORDER BY o.name;

    SELECT
      fk.name AS foreign_key_name,
      OBJECT_SCHEMA_NAME(fk.parent_object_id) AS parent_schema,
      OBJECT_NAME(fk.parent_object_id) AS parent_table,
      pc.name AS parent_column,
      OBJECT_SCHEMA_NAME(fk.referenced_object_id) AS referenced_schema,
      OBJECT_NAME(fk.referenced_object_id) AS referenced_table,
      rc.name AS referenced_column,
      fk.delete_referential_action_desc,
      fk.update_referential_action_desc,
      fk.is_not_trusted,
      fk.is_disabled
    FROM sys.foreign_keys AS fk
    JOIN sys.foreign_key_columns AS fkc ON fkc.constraint_object_id = fk.object_id
    JOIN sys.columns AS pc
      ON pc.object_id = fkc.parent_object_id AND pc.column_id = fkc.parent_column_id
    JOIN sys.columns AS rc
      ON rc.object_id = fkc.referenced_object_id AND rc.column_id = fkc.referenced_column_id
    WHERE fk.parent_object_id IN (
      OBJECT_ID(N'dbo.Position'), OBJECT_ID(N'dbo.PositionAssignment'),
      OBJECT_ID(N'dbo.PositionAssignmentOpeningBalanceAudit')
    )
    ORDER BY fk.name;

    SELECT
      OBJECT_NAME(i.object_id) AS table_name,
      i.name AS index_name,
      i.is_unique,
      i.is_primary_key,
      i.has_filter,
      i.filter_definition,
      i.type_desc,
      ic.key_ordinal,
      ic.is_descending_key,
      ic.is_included_column,
      c.name AS column_name
    FROM sys.indexes AS i
    JOIN sys.index_columns AS ic
      ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    JOIN sys.columns AS c
      ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE i.object_id IN (
      OBJECT_ID(N'dbo.Position'), OBJECT_ID(N'dbo.PositionAssignment'),
      OBJECT_ID(N'dbo.PositionAssignmentHistory'),
      OBJECT_ID(N'dbo.PositionAssignmentMigrationAudit'),
      OBJECT_ID(N'dbo.PositionAssignmentOpeningBalanceAudit'),
      OBJECT_ID(N'dbo.PositionAssignmentType')
    )
      AND i.index_id > 0
    ORDER BY table_name, i.index_id, ic.key_ordinal, ic.index_column_id;

    SELECT
      OBJECT_NAME(cc.parent_object_id) AS table_name,
      cc.name AS constraint_name,
      cc.definition,
      cc.is_disabled,
      cc.is_not_trusted
    FROM sys.check_constraints AS cc
    WHERE cc.parent_object_id IN (
      OBJECT_ID(N'dbo.Position'), OBJECT_ID(N'dbo.PositionAssignment'),
      OBJECT_ID(N'dbo.PositionAssignmentMigrationAudit'),
      OBJECT_ID(N'dbo.PositionAssignmentOpeningBalanceAudit'),
      OBJECT_ID(N'dbo.PositionAssignmentType')
    )
    ORDER BY table_name, constraint_name;
  `);

  return {
    format: "HERP Position single-table logical rollback snapshot",
    formatVersion: 1,
    scriptVersion: SCRIPT_VERSION,
    capturedAtUtc: new Date().toISOString(),
    database: inspection.metadata.server.database_name,
    sourceState: inspection.state,
    warning: "Contains internal employee identifiers and database schema. Store securely. This is a logical snapshot, not a SQL Server .bak file.",
    expectedCounts: EXPECTED,
    positionColumnsBeingChangedOrRemoved: result.recordsets[0],
    positionAssignments: result.recordsets[1],
    positionAssignmentHistory: result.recordsets[2],
    migrationAudit: result.recordsets[3],
    openingBalanceAudit: result.recordsets[4],
    assignmentTypes: result.recordsets[5],
    sourceColumnMetadata: result.recordsets[6],
    sourceModuleDefinitions: result.recordsets[7],
    sourceForeignKeys: result.recordsets[8],
    sourceIndexes: result.recordsets[9],
    sourceCheckConstraints: result.recordsets[10]
  };
};

const writeRollbackSnapshot = (snapshot, snapshotDirectory) => {
  fs.mkdirSync(snapshotDirectory, { recursive: true, mode: 0o700 });
  const safeDatabase = String(snapshot.database).replace(/[^A-Za-z0-9_.-]/g, "_");
  const stamp = snapshot.capturedAtUtc.replace(/[:.]/g, "-");
  const baseName = `${safeDatabase}-position-assignment-before-single-table-${stamp}`;
  const snapshotPath = path.join(snapshotDirectory, `${baseName}.json`);
  const checksumPath = `${snapshotPath}.sha256`;
  const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;
  const sha256 = crypto.createHash("sha256").update(serialized, "utf8").digest("hex");

  fs.writeFileSync(snapshotPath, serialized, { encoding: "utf8", flag: "wx", mode: 0o600 });
  fs.writeFileSync(checksumPath, `${sha256}  ${path.basename(snapshotPath)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600
  });
  return {
    path: snapshotPath,
    checksumPath,
    sha256,
    bytes: Buffer.byteLength(serialized, "utf8")
  };
};

const dropSourceAndConsolidateSql = `
  SET XACT_ABORT ON;

  ;WITH CurrentAssignments AS (
    SELECT PositionId, EmployeeId
    FROM dbo.PositionAssignment
    WHERE IsCancelled = 0 AND EffectiveTo IS NULL AND IsPrimary = 1
  )
  UPDATE p
  SET p.EmployeeId = currentAssignment.EmployeeId
  FROM dbo.Position AS p
  LEFT JOIN CurrentAssignments AS currentAssignment ON currentAssignment.PositionId = p.Id;

  IF (SELECT COUNT_BIG(*) FROM dbo.Position WHERE EmployeeId IS NOT NULL) <> 4614
    THROW 52010, 'Position employee consolidation produced an unexpected occupied count.', 1;
  IF EXISTS (
    SELECT 1
    FROM dbo.Position AS p
    FULL JOIN (
      SELECT PositionId, EmployeeId
      FROM dbo.PositionAssignment
      WHERE IsCancelled = 0 AND EffectiveTo IS NULL AND IsPrimary = 1
    ) AS currentAssignment ON currentAssignment.PositionId = p.Id
    WHERE (p.EmployeeId IS NULL AND currentAssignment.EmployeeId IS NOT NULL)
       OR (p.EmployeeId IS NOT NULL AND currentAssignment.EmployeeId IS NULL)
       OR p.EmployeeId <> currentAssignment.EmployeeId
  ) THROW 52011, 'Position employee mapping verification failed before source removal.', 1;

  UPDATE dbo.Position SET Job_ID = JobId;

  DROP VIEW IF EXISTS dbo.vw_CurrentEmployeePosition;
  DROP VIEW IF EXISTS dbo.vw_VacantPositions;
  DROP VIEW IF EXISTS dbo.vw_EmployeePositionAssignmentHistory;
  DROP VIEW IF EXISTS dbo.vw_PositionAssignmentAuditTrail;
  DROP FUNCTION IF EXISTS dbo.fn_PositionAssignmentsAsOf;
  DROP PROCEDURE IF EXISTS dbo.usp_AssignEmployeeToPosition;
  DROP PROCEDURE IF EXISTS dbo.usp_TransferEmployeePosition;
  DROP PROCEDURE IF EXISTS dbo.usp_EndPositionAssignment;
  DROP PROCEDURE IF EXISTS dbo.usp_CancelPositionAssignment;
  DROP TRIGGER IF EXISTS dbo.trg_PositionAssignment_PreventOverlap;

  DROP TABLE dbo.PositionAssignmentOpeningBalanceAudit;
  ALTER TABLE dbo.PositionAssignment SET (SYSTEM_VERSIONING = OFF);
  DROP TABLE dbo.PositionAssignment;
  DROP TABLE dbo.PositionAssignmentHistory;
  DROP TABLE dbo.PositionAssignmentType;
  DROP TABLE dbo.PositionAssignmentMigrationAudit;

  ALTER TABLE dbo.Position DROP CONSTRAINT FK_Position_Jobs;
  DROP INDEX IX_HERP_Position_JobId ON dbo.Position;

  DECLARE @DropStatistics nvarchar(max) = N'';
  SELECT @DropStatistics = @DropStatistics
    + N'DROP STATISTICS dbo.Position.' + QUOTENAME(removable.name) + N';'
  FROM (
    SELECT DISTINCT st.name
    FROM sys.stats AS st
    JOIN sys.stats_columns AS sc
      ON sc.object_id = st.object_id AND sc.stats_id = st.stats_id
    JOIN sys.columns AS c
      ON c.object_id = sc.object_id AND c.column_id = sc.column_id
    LEFT JOIN sys.indexes AS i
      ON i.object_id = st.object_id AND i.index_id = st.stats_id
    WHERE st.object_id = OBJECT_ID(N'dbo.Position')
      AND c.name IN (N'JobId', N'Job_Name_AR', N'Job_Name_EN')
      AND i.index_id IS NULL
  ) AS removable;
  IF LEN(@DropStatistics) > 0 EXEC sys.sp_executesql @DropStatistics;

  ALTER TABLE dbo.Position DROP COLUMN JobId, Job_Name_AR, Job_Name_EN;

  ALTER TABLE dbo.Position WITH CHECK
    ADD CONSTRAINT FK_Position_Employee FOREIGN KEY (EmployeeId)
    REFERENCES dbo.Employee (ID_Employee) ON DELETE NO ACTION ON UPDATE NO ACTION;

  ALTER TABLE dbo.Position WITH CHECK
    ADD CONSTRAINT FK_Position_Jobs FOREIGN KEY (Job_ID)
    REFERENCES dbo.jobs (Job_ID) ON DELETE NO ACTION ON UPDATE NO ACTION;

  ALTER TABLE dbo.Position WITH CHECK
    ADD CONSTRAINT CK_Position_EmployeeId_Positive
    CHECK (EmployeeId IS NULL OR EmployeeId > 0);

  CREATE UNIQUE INDEX UX_Position_EmployeeId_Occupied
    ON dbo.Position (EmployeeId)
    WHERE EmployeeId IS NOT NULL;

  CREATE INDEX IX_Position_Job_ID ON dbo.Position (Job_ID);
  CREATE INDEX IX_Position_Position_Number ON dbo.Position (Position_Number);
`;

const currentEmployeeViewSql = `
CREATE VIEW dbo.vw_CurrentEmployeePosition
AS
  SELECT
    p.EmployeeId,
    p.Id AS PositionId,
    p.Position_Number,
    p.PositionLevel,
    p.Position_Degree,
    p.Position_DateCreation,
    p.Status AS PositionStatus,
    p.Position_Type,
    p.Job_ID,
    j.Job_Name_AR,
    j.Job_Name_EN
  FROM dbo.Position AS p
  LEFT JOIN dbo.jobs AS j ON j.Job_ID = p.Job_ID
  WHERE p.EmployeeId IS NOT NULL;
`;

const vacantPositionsViewSql = `
CREATE VIEW dbo.vw_VacantPositions
AS
  SELECT
    p.Id AS PositionId,
    p.Position_Number,
    p.PositionLevel,
    p.Position_Degree,
    p.Position_DateCreation,
    p.Status,
    p.Position_Type,
    p.Job_ID,
    j.Job_Name_AR,
    j.Job_Name_EN
  FROM dbo.Position AS p
  LEFT JOIN dbo.jobs AS j ON j.Job_ID = p.Job_ID
  WHERE p.EmployeeId IS NULL;
`;

const applyMigration = async (pool, initialInspection, options) => {
  if (initialInspection.state === "single-table") {
    return {
      mode: "no-op",
      state: "single-table",
      database: initialInspection.metadata.server.database_name,
      message: "The verified single-table Position model is already installed. No changes were made."
    };
  }

  const transaction = new sql.Transaction(pool);
  let transactionStarted = false;
  let snapshotInfo = null;
  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    transactionStarted = true;
    const lockResult = await acquireMigrationLock(transaction);
    await lockSourceTables(transaction);

    const lockedInspection = await inspectState(
      new sql.Request(transaction),
      options.expectedDatabase
    );
    if (lockedInspection.state !== "assignment-model") {
      throw new Error(
        `Migration state changed while waiting for the lock (${initialInspection.state} -> ${lockedInspection.state}).`
      );
    }

    const snapshot = await loadRollbackSnapshot(transaction, lockedInspection);
    snapshotInfo = writeRollbackSnapshot(snapshot, options.snapshotDirectory);

    await new sql.Request(transaction).query(dropSourceAndConsolidateSql);
    await new sql.Request(transaction).query(currentEmployeeViewSql);
    await new sql.Request(transaction).query(vacantPositionsViewSql);

    const verification = await inspectState(
      new sql.Request(transaction),
      options.expectedDatabase
    );
    if (verification.state !== "single-table") {
      throw new Error("Transactional verification did not detect the completed single-table state.");
    }

    await transaction.commit();
    transactionStarted = false;
    return {
      mode: "applied",
      state: verification.state,
      database: verification.metadata.server.database_name,
      scriptVersion: SCRIPT_VERSION,
      lockResult,
      snapshot: snapshotInfo,
      verification: {
        positions: number(verification.common.positions.position_count),
        occupied: number(verification.common.positions.nonzero_employee_count),
        vacant: number(verification.common.positions.null_employee_count),
        missingJobs: number(verification.common.positions.missing_job_count),
        orphanEmployees: number(verification.common.orphanEmployees.orphan_employee_count),
        orphanJobs: number(verification.common.positions.orphan_job_count)
      },
      message: "Position is now the sole current-state employee/position/job mapping table."
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error(
          "Rollback also failed:",
          rollbackError instanceof Error ? rollbackError.message : rollbackError
        );
      }
    }
    if (snapshotInfo) {
      console.error(`Logical rollback snapshot retained at: ${snapshotInfo.path}`);
    }
    throw error;
  }
};

const summarizeInspection = (inspection) => ({
  database: inspection.metadata.server.database_name,
  serverMajorVersion: number(inspection.metadata.server.server_major_version),
  state: inspection.state,
  positions: number(inspection.common.positions.position_count),
  sourceOccupied: inspection.state === "assignment-model"
    ? number(inspection.source.assignments.current_primary_count)
    : number(inspection.common.positions.nonzero_employee_count),
  vacancies: inspection.state === "assignment-model"
    ? number(inspection.common.positions.null_employee_count)
      + number(inspection.common.positions.zero_employee_count)
    : number(inspection.common.positions.null_employee_count),
  missingJobs: number(inspection.common.positions.missing_job_count),
  duplicatePositionNumberValues: number(
    inspection.common.duplicateNumbers.duplicate_position_number_value_count
  ),
  positionsUsingDuplicateNumbers: number(
    inspection.common.duplicateNumbers.positions_using_duplicate_numbers
  ),
  temporalHistoryRowsToSnapshot: inspection.source
    ? number(inspection.source.history.history_count)
    : 0
});

const main = async () => {
  const options = parseArguments();
  const pool = await connectWithMssql();
  try {
    const inspection = await inspectState(pool.request(), options.expectedDatabase);
    if (!options.apply) {
      console.log(JSON.stringify({
        mode: "dry-run",
        scriptVersion: SCRIPT_VERSION,
        ...summarizeInspection(inspection),
        snapshotDirectory: options.snapshotDirectory,
        plannedMutation: inspection.state === "assignment-model"
          ? "Create a local logical rollback snapshot, replace Position.EmployeeId with internal employee IDs, normalize vacancies to NULL, retain Position.Job_ID, remove PositionAssignment objects and duplicate Position job columns, then add trusted constraints and direct views."
          : "None. The single-table model is already installed and verified.",
        message: "Strict preflight passed. No database or local snapshot changes were made. Use --apply to execute."
      }, null, 2));
      return;
    }

    const result = await applyMigration(pool, inspection, options);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await pool.close();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
