require("dotenv").config();

const sql = require("mssql");
const { connectWithMssql } = require("../src/config/database");

const MIGRATION_KEY = "position-assignment-opening-balance-v1";
const SCRIPT_VERSION = "1.1.1";
const EXPECTED = Object.freeze({
  positions: 5640,
  assignments: 4614,
  vacancies: 1026,
  missingJobs: 202
});

const parseArguments = () => {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const dateArgument = args.find((argument) => argument.startsWith("--imported-as-of="));
  const importedAsOf = dateArgument
    ? dateArgument.slice("--imported-as-of=".length)
    : new Date().toISOString().slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(importedAsOf)) {
    throw new Error("--imported-as-of must use YYYY-MM-DD format.");
  }
  const parsed = new Date(`${importedAsOf}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== importedAsOf) {
    throw new Error("--imported-as-of is not a valid calendar date.");
  }

  return { apply, importedAsOf };
};

const loadPreflight = async (request) => {
  const result = await request.query(`
    SELECT
      TRY_CONVERT(int, SERVERPROPERTY(N'ProductMajorVersion')) AS server_major_version,
      DB_NAME() AS database_name,
      OBJECT_ID(N'dbo.Employee', N'U') AS employee_object_id,
      OBJECT_ID(N'dbo.Position', N'U') AS position_object_id,
      OBJECT_ID(N'dbo.jobs', N'U') AS jobs_object_id,
      OBJECT_ID(N'dbo.PositionAssignmentType', N'U') AS assignment_type_object_id,
      OBJECT_ID(N'dbo.PositionAssignment', N'U') AS assignment_object_id,
      OBJECT_ID(N'dbo.PositionAssignmentHistory', N'U') AS history_object_id,
      OBJECT_ID(N'dbo.PositionAssignmentMigrationAudit', N'U') AS audit_object_id,
      OBJECT_ID(N'dbo.PositionAssignmentOpeningBalanceAudit', N'U') AS detail_audit_object_id;

    SELECT
      OBJECT_NAME(c.object_id) AS table_name,
      c.name AS column_name,
      TYPE_NAME(c.user_type_id) AS data_type,
      c.max_length,
      c.is_nullable,
      c.is_identity
    FROM sys.columns AS c
    WHERE (c.object_id = OBJECT_ID(N'dbo.Employee')
           AND c.name IN (N'ID_Employee', N'Ref_Employee'))
       OR (c.object_id = OBJECT_ID(N'dbo.Position')
           AND c.name IN (N'Id', N'EmployeeId', N'JobId', N'Job_ID'))
       OR (c.object_id = OBJECT_ID(N'dbo.jobs')
           AND c.name = N'Job_ID')
    ORDER BY table_name, c.column_id;

    ;WITH EmployeeReferenceCounts AS (
      SELECT
        TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(100), e.Ref_Employee))), N'')) AS employee_reference,
        MIN(e.ID_Employee) AS mapped_employee_id,
        COUNT_BIG(*) AS employee_count
      FROM dbo.Employee AS e
      GROUP BY TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(100), e.Ref_Employee))), N''))
    )
    SELECT
      COUNT_BIG(*) AS position_count,
      SUM(CASE WHEN p.EmployeeId IS NULL OR p.EmployeeId = 0 THEN 1 ELSE 0 END) AS vacancy_count,
      SUM(CASE WHEN p.EmployeeId IS NOT NULL AND p.EmployeeId <> 0 THEN 1 ELSE 0 END) AS occupied_source_count,
      COUNT_BIG(DISTINCT CASE WHEN p.EmployeeId IS NOT NULL AND p.EmployeeId <> 0 THEN p.EmployeeId END) AS distinct_occupied_source_count,
      SUM(CASE WHEN p.EmployeeId IS NOT NULL AND p.EmployeeId <> 0 AND erc.employee_count = 1 THEN 1 ELSE 0 END) AS uniquely_mappable_count,
      SUM(CASE WHEN p.EmployeeId IS NOT NULL AND p.EmployeeId <> 0 AND erc.employee_count IS NULL THEN 1 ELSE 0 END) AS unmatched_count,
      SUM(CASE WHEN p.EmployeeId IS NOT NULL AND p.EmployeeId <> 0 AND erc.employee_count > 1 THEN 1 ELSE 0 END) AS ambiguous_count,
      COUNT_BIG(DISTINCT CASE WHEN p.EmployeeId IS NOT NULL AND p.EmployeeId <> 0 AND erc.employee_count = 1 THEN erc.mapped_employee_id END) AS distinct_mapped_employee_count
    FROM dbo.Position AS p
    LEFT JOIN EmployeeReferenceCounts AS erc
      ON erc.employee_reference = p.EmployeeId;

    SELECT
      SUM(CASE WHEN p.Job_ID IS NULL THEN 1 ELSE 0 END) AS missing_imported_job_count,
      SUM(CASE WHEN p.JobId IS NOT NULL AND p.Job_ID IS NOT NULL AND p.JobId <> p.Job_ID THEN 1 ELSE 0 END) AS conflicting_job_count,
      SUM(CASE WHEN COALESCE(p.JobId, p.Job_ID) IS NOT NULL AND j.Job_ID IS NULL THEN 1 ELSE 0 END) AS orphan_job_count
    FROM dbo.Position AS p
    LEFT JOIN dbo.jobs AS j
      ON j.Job_ID = COALESCE(p.JobId, p.Job_ID);
  `);

  const objects = result.recordsets[0][0];
  let audit = null;
  if (objects.audit_object_id) {
    const auditResult = await request.query(`
      SELECT
        MigrationKey,
        AppliedAtUtc,
        ImportedAsOf,
        PositionCount,
        AssignmentCount,
        VacancyCount,
        MissingJobCount,
        ScriptVersion
      FROM dbo.PositionAssignmentMigrationAudit
      WHERE MigrationKey = N'${MIGRATION_KEY}';
    `);
    audit = auditResult.recordset[0] || null;
  }

  return {
    objects,
    columns: result.recordsets[1],
    mapping: result.recordsets[2][0],
    jobs: result.recordsets[3][0],
    audit
  };
};

const columnMap = (columns) => new Map(
  columns.map((column) => [`${column.table_name}.${column.column_name}`, column])
);

const assertSourceSchema = (preflight) => {
  if (Number(preflight.objects.server_major_version) < 13) {
    throw new Error("Position assignments require SQL Server 2016 (major version 13) or newer.");
  }
  for (const objectName of ["employee_object_id", "position_object_id", "jobs_object_id"]) {
    if (!preflight.objects[objectName]) {
      throw new Error(`Required source object is missing (${objectName}).`);
    }
  }

  const columns = columnMap(preflight.columns);
  const requiredIntColumns = [
    "Employee.ID_Employee",
    "Position.Id",
    "Position.EmployeeId",
    "Position.JobId",
    "Position.Job_ID",
    "jobs.Job_ID"
  ];
  for (const name of requiredIntColumns) {
    const column = columns.get(name);
    if (!column || column.data_type !== "int") {
      throw new Error(`${name} must exist and use SQL Server INT.`);
    }
  }
  if (!columns.has("Employee.Ref_Employee")) {
    throw new Error("dbo.Employee.Ref_Employee is required for the opening-balance mapping.");
  }
};

const classifyTargetState = (preflight) => {
  const flags = [
    preflight.objects.assignment_type_object_id,
    preflight.objects.assignment_object_id,
    preflight.objects.history_object_id,
    preflight.objects.audit_object_id,
    preflight.objects.detail_audit_object_id
  ].map(Boolean);
  const count = flags.filter(Boolean).length;
  if (count === 0) return "fresh";
  if (count === flags.length && preflight.audit) return "installed";
  return "partial";
};

const assertFreshData = (preflight) => {
  const mapping = preflight.mapping;
  const jobs = preflight.jobs;
  const checks = [
    [mapping.position_count, EXPECTED.positions, "position count"],
    [mapping.vacancy_count, EXPECTED.vacancies, "vacancy count"],
    [mapping.occupied_source_count, EXPECTED.assignments, "occupied source count"],
    [mapping.distinct_occupied_source_count, EXPECTED.assignments, "distinct occupied reference count"],
    [mapping.uniquely_mappable_count, EXPECTED.assignments, "uniquely mappable position count"],
    [mapping.distinct_mapped_employee_count, EXPECTED.assignments, "distinct mapped employee count"],
    [mapping.unmatched_count, 0, "unmatched position count"],
    [mapping.ambiguous_count, 0, "ambiguous position count"],
    [jobs.missing_imported_job_count, EXPECTED.missingJobs, "missing Job_ID count"],
    [jobs.conflicting_job_count, 0, "conflicting JobId count"],
    [jobs.orphan_job_count, 0, "orphan JobId count"]
  ];
  for (const [actual, expected, label] of checks) {
    if (Number(actual) !== expected) {
      throw new Error(`Preflight failed: expected ${label} ${expected}, found ${actual}.`);
    }
  }
};

const acquireMigrationLock = async (transaction) => {
  const result = await new sql.Request(transaction).query(`
    SET XACT_ABORT ON;
    DECLARE @LockResult int;
    EXEC @LockResult = sys.sp_getapplock
      @Resource = N'HERP:PositionAssignment:rollout:v1',
      @LockMode = N'Exclusive',
      @LockOwner = N'Transaction',
      @LockTimeout = 15000;
    IF @LockResult < 0
      THROW 51000, 'Could not acquire the PositionAssignment migration lock.', 1;
    SELECT @LockResult AS lock_result;
  `);
  return Number(result.recordset[0].lock_result);
};

const lockSourceTables = async (transaction) => {
  await new sql.Request(transaction).query(`
    DECLARE @PositionRows bigint, @EmployeeRows bigint, @JobRows bigint;
    SELECT @PositionRows = COUNT_BIG(*) FROM dbo.Position WITH (TABLOCKX, HOLDLOCK);
    SELECT @EmployeeRows = COUNT_BIG(*) FROM dbo.Employee WITH (TABLOCKX, HOLDLOCK);
    SELECT @JobRows = COUNT_BIG(*) FROM dbo.jobs WITH (TABLOCK, HOLDLOCK);
    SELECT @PositionRows AS position_rows, @EmployeeRows AS employee_rows, @JobRows AS job_rows;
  `);
};

const createBaseObjectsSql = `
  IF OBJECT_ID(N'dbo.PositionAssignmentMigrationAudit', N'U') IS NULL
  BEGIN
    CREATE TABLE dbo.PositionAssignmentMigrationAudit (
      MigrationKey varchar(100) NOT NULL
        CONSTRAINT PK_PositionAssignmentMigrationAudit PRIMARY KEY,
      AppliedAtUtc datetime2(7) NOT NULL,
      ImportedAsOf date NOT NULL,
      PositionCount int NOT NULL,
      AssignmentCount int NOT NULL,
      VacancyCount int NOT NULL,
      MissingJobCount int NOT NULL,
      ScriptVersion varchar(30) NOT NULL,
      AppliedBy nvarchar(128) NOT NULL
    );
  END;

  IF OBJECT_ID(N'dbo.PositionAssignmentType', N'U') IS NULL
  BEGIN
    CREATE TABLE dbo.PositionAssignmentType (
      AssignmentTypeCode varchar(30) NOT NULL
        CONSTRAINT PK_PositionAssignmentType PRIMARY KEY,
      Name_EN nvarchar(100) NOT NULL,
      Name_AR nvarchar(100) NOT NULL,
      IsActive bit NOT NULL
        CONSTRAINT DF_PositionAssignmentType_IsActive DEFAULT (1),
      SortOrder smallint NOT NULL
        CONSTRAINT DF_PositionAssignmentType_SortOrder DEFAULT (0),
      CreatedAtUtc datetime2(7) NOT NULL
        CONSTRAINT DF_PositionAssignmentType_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
      CONSTRAINT CK_PositionAssignmentType_Code_NotBlank
        CHECK (LEN(LTRIM(RTRIM(AssignmentTypeCode))) > 0)
    );
  END;

  IF OBJECT_ID(N'dbo.PositionAssignment', N'U') IS NULL
  BEGIN
    IF OBJECT_ID(N'dbo.PositionAssignmentHistory', N'U') IS NOT NULL
      THROW 51001, 'PositionAssignmentHistory exists without PositionAssignment. Manual review is required.', 1;

    CREATE TABLE dbo.PositionAssignment (
      PositionAssignmentId bigint IDENTITY(1,1) NOT NULL
        CONSTRAINT PK_PositionAssignment PRIMARY KEY,
      PositionId int NOT NULL,
      EmployeeId int NOT NULL,
      AssignmentTypeCode varchar(30) NOT NULL,
      IsPrimary bit NOT NULL
        CONSTRAINT DF_PositionAssignment_IsPrimary DEFAULT (1),
      EffectiveFrom date NULL,
      EffectiveTo date NULL,
      ImportedAsOf date NULL,
      IsOpeningBalance bit NOT NULL
        CONSTRAINT DF_PositionAssignment_IsOpeningBalance DEFAULT (0),
      IsCancelled bit NOT NULL
        CONSTRAINT DF_PositionAssignment_IsCancelled DEFAULT (0),
      DecisionNumber nvarchar(100) NULL,
      DecisionDate date NULL,
      AssignmentReason nvarchar(250) NULL,
      EndReason nvarchar(250) NULL,
      Notes nvarchar(1000) NULL,
      CreatedAtUtc datetime2(7) NOT NULL
        CONSTRAINT DF_PositionAssignment_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
      CreatedBy nvarchar(128) NOT NULL,
      ModifiedAtUtc datetime2(7) NULL,
      ModifiedBy nvarchar(128) NULL,
      CancelledAtUtc datetime2(7) NULL,
      CancelledBy nvarchar(128) NULL,
      CancellationReason nvarchar(250) NULL,
      RowVersion rowversion NOT NULL,
      SystemValidFrom datetime2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL
        CONSTRAINT DF_PositionAssignment_SystemValidFrom DEFAULT (SYSUTCDATETIME()),
      SystemValidTo datetime2(7) GENERATED ALWAYS AS ROW END HIDDEN NOT NULL
        CONSTRAINT DF_PositionAssignment_SystemValidTo
        DEFAULT (CONVERT(datetime2(7), '9999-12-31 23:59:59.9999999')),
      PERIOD FOR SYSTEM_TIME (SystemValidFrom, SystemValidTo),
      CONSTRAINT CK_PositionAssignment_EffectiveRange
        CHECK (EffectiveTo IS NULL OR EffectiveTo > COALESCE(EffectiveFrom, ImportedAsOf)),
      CONSTRAINT CK_PositionAssignment_OpeningBalance
        CHECK (
          (IsOpeningBalance = 1 AND ImportedAsOf IS NOT NULL)
          OR
          (IsOpeningBalance = 0 AND ImportedAsOf IS NULL AND EffectiveFrom IS NOT NULL)
        ),
      CONSTRAINT CK_PositionAssignment_CancellationAudit
        CHECK (
          (IsCancelled = 0 AND CancelledAtUtc IS NULL AND CancelledBy IS NULL AND CancellationReason IS NULL)
          OR
          (IsCancelled = 1 AND CancelledAtUtc IS NOT NULL AND CancelledBy IS NOT NULL
            AND LEN(LTRIM(RTRIM(CancellationReason))) > 0)
        ),
      CONSTRAINT CK_PositionAssignment_CreatedBy_NotBlank
        CHECK (LEN(LTRIM(RTRIM(CreatedBy))) > 0)
    )
    WITH (
      SYSTEM_VERSIONING = ON (
        HISTORY_TABLE = dbo.PositionAssignmentHistory,
        DATA_CONSISTENCY_CHECK = ON
      )
    );
  END;

  IF OBJECT_ID(N'dbo.PositionAssignmentOpeningBalanceAudit', N'U') IS NULL
  BEGIN
    CREATE TABLE dbo.PositionAssignmentOpeningBalanceAudit (
      MigrationKey varchar(100) NOT NULL,
      PositionAssignmentId bigint NOT NULL,
      PositionId int NOT NULL,
      SourceEmployeeReference int NOT NULL,
      EmployeeId int NOT NULL,
      ImportedAsOf date NOT NULL,
      MigratedAtUtc datetime2(7) NOT NULL
        CONSTRAINT DF_PositionAssignmentOpeningBalanceAudit_MigratedAtUtc DEFAULT (SYSUTCDATETIME()),
      CONSTRAINT PK_PositionAssignmentOpeningBalanceAudit
        PRIMARY KEY (MigrationKey, PositionId),
      CONSTRAINT UQ_PositionAssignmentOpeningBalanceAudit_Assignment
        UNIQUE (PositionAssignmentId),
      CONSTRAINT FK_PositionAssignmentOpeningBalanceAudit_Migration
        FOREIGN KEY (MigrationKey)
        REFERENCES dbo.PositionAssignmentMigrationAudit (MigrationKey),
      CONSTRAINT FK_PositionAssignmentOpeningBalanceAudit_Assignment
        FOREIGN KEY (PositionAssignmentId)
        REFERENCES dbo.PositionAssignment (PositionAssignmentId),
      CONSTRAINT FK_PositionAssignmentOpeningBalanceAudit_Position
        FOREIGN KEY (PositionId)
        REFERENCES dbo.Position (Id),
      CONSTRAINT FK_PositionAssignmentOpeningBalanceAudit_Employee
        FOREIGN KEY (EmployeeId)
        REFERENCES dbo.Employee (ID_Employee)
    );
  END;
`;

const seedTypesSql = `
  DECLARE @Types TABLE (
    AssignmentTypeCode varchar(30) NOT NULL,
    Name_EN nvarchar(100) NOT NULL,
    Name_AR nvarchar(100) NOT NULL,
    SortOrder smallint NOT NULL
  );
  INSERT INTO @Types (AssignmentTypeCode, Name_EN, Name_AR, SortOrder)
  VALUES
    ('PRIMARY', N'Primary', N'أساسي', 10),
    ('ACTING', N'Acting', N'تكليف', 20),
    ('SECONDMENT', N'Secondment', N'إعارة / ندب', 30),
    ('TEMPORARY', N'Temporary', N'مؤقت', 40);

  IF EXISTS (
    SELECT 1
    FROM @Types AS source
    JOIN dbo.PositionAssignmentType AS target
      ON target.AssignmentTypeCode = source.AssignmentTypeCode
    WHERE target.Name_EN <> source.Name_EN
       OR target.Name_AR <> source.Name_AR
       OR target.SortOrder <> source.SortOrder
  )
    THROW 51002, 'An existing assignment type conflicts with the required seed values.', 1;

  INSERT INTO dbo.PositionAssignmentType
    (AssignmentTypeCode, Name_EN, Name_AR, IsActive, SortOrder)
  SELECT source.AssignmentTypeCode, source.Name_EN, source.Name_AR, 1, source.SortOrder
  FROM @Types AS source
  WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.PositionAssignmentType AS target WITH (UPDLOCK, HOLDLOCK)
    WHERE target.AssignmentTypeCode = source.AssignmentTypeCode
  );
`;

const createRelationshipsAndIndexesSql = `
  IF EXISTS (
    SELECT 1
    FROM dbo.Position AS p
    WHERE p.JobId IS NOT NULL AND p.Job_ID IS NOT NULL AND p.JobId <> p.Job_ID
  )
    THROW 51003, 'Position.JobId conflicts with Position.Job_ID.', 1;

  UPDATE dbo.Position
  SET JobId = Job_ID
  WHERE JobId IS NULL AND Job_ID IS NOT NULL;

  IF EXISTS (
    SELECT 1
    FROM dbo.Position AS p
    LEFT JOIN dbo.jobs AS j ON j.Job_ID = p.JobId
    WHERE p.JobId IS NOT NULL AND j.Job_ID IS NULL
  )
    THROW 51004, 'Position.JobId contains values not found in dbo.jobs.', 1;

  IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_key_columns AS fkc
    JOIN sys.foreign_keys AS fk ON fk.object_id = fkc.constraint_object_id
    WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.Position')
      AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'JobId'
      AND fkc.referenced_object_id = OBJECT_ID(N'dbo.jobs')
      AND COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) = N'Job_ID'
  )
  BEGIN
    IF OBJECT_ID(N'dbo.FK_Position_Jobs', N'F') IS NOT NULL
      THROW 51005, 'FK_Position_Jobs exists with a different definition.', 1;
    ALTER TABLE dbo.Position WITH CHECK
      ADD CONSTRAINT FK_Position_Jobs FOREIGN KEY (JobId)
      REFERENCES dbo.jobs (Job_ID);
  END;

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Position') AND name = N'IX_HERP_Position_JobId')
    CREATE INDEX IX_HERP_Position_JobId ON dbo.Position (JobId);

  IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE parent_object_id = OBJECT_ID(N'dbo.PositionAssignment') AND name = N'FK_PositionAssignment_Position')
    ALTER TABLE dbo.PositionAssignment WITH CHECK
      ADD CONSTRAINT FK_PositionAssignment_Position FOREIGN KEY (PositionId)
      REFERENCES dbo.Position (Id);

  IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE parent_object_id = OBJECT_ID(N'dbo.PositionAssignment') AND name = N'FK_PositionAssignment_Employee')
    ALTER TABLE dbo.PositionAssignment WITH CHECK
      ADD CONSTRAINT FK_PositionAssignment_Employee FOREIGN KEY (EmployeeId)
      REFERENCES dbo.Employee (ID_Employee);

  IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE parent_object_id = OBJECT_ID(N'dbo.PositionAssignment') AND name = N'FK_PositionAssignment_Type')
    ALTER TABLE dbo.PositionAssignment WITH CHECK
      ADD CONSTRAINT FK_PositionAssignment_Type FOREIGN KEY (AssignmentTypeCode)
      REFERENCES dbo.PositionAssignmentType (AssignmentTypeCode);

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.PositionAssignment') AND name = N'UX_PositionAssignment_OpenPosition')
    CREATE UNIQUE INDEX UX_PositionAssignment_OpenPosition
      ON dbo.PositionAssignment (PositionId)
      WHERE EffectiveTo IS NULL AND IsCancelled = 0;

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.PositionAssignment') AND name = N'UX_PositionAssignment_OpenPrimaryEmployee')
    CREATE UNIQUE INDEX UX_PositionAssignment_OpenPrimaryEmployee
      ON dbo.PositionAssignment (EmployeeId)
      WHERE EffectiveTo IS NULL AND IsCancelled = 0 AND IsPrimary = 1;

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.PositionAssignment') AND name = N'UX_PositionAssignment_OpeningBalancePosition')
    CREATE UNIQUE INDEX UX_PositionAssignment_OpeningBalancePosition
      ON dbo.PositionAssignment (PositionId)
      WHERE IsOpeningBalance = 1;

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.PositionAssignment') AND name = N'IX_PositionAssignment_PositionInterval')
    CREATE INDEX IX_PositionAssignment_PositionInterval
      ON dbo.PositionAssignment (PositionId, IsCancelled, EffectiveFrom, EffectiveTo)
      INCLUDE (EmployeeId, IsPrimary, AssignmentTypeCode);

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.PositionAssignment') AND name = N'IX_PositionAssignment_EmployeeInterval')
    CREATE INDEX IX_PositionAssignment_EmployeeInterval
      ON dbo.PositionAssignment (EmployeeId, IsPrimary, IsCancelled, EffectiveFrom, EffectiveTo)
      INCLUDE (PositionId, AssignmentTypeCode);

  IF OBJECT_ID(N'dbo.TimeSheet', N'U') IS NULL
    THROW 51006, 'dbo.TimeSheet is required for the employee-history safety change.', 1;

  IF (
    SELECT COUNT_BIG(*)
    FROM sys.foreign_key_columns AS fkc
    JOIN sys.foreign_keys AS fk ON fk.object_id = fkc.constraint_object_id
    WHERE fk.name = N'FK_TimeSheet_Employee'
      AND fkc.parent_object_id = OBJECT_ID(N'dbo.TimeSheet')
      AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'ID_Employee'
      AND fkc.referenced_object_id = OBJECT_ID(N'dbo.Employee')
      AND COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) = N'ID_Employee'
  ) <> 1
    THROW 51007, 'FK_TimeSheet_Employee does not match the audited one-column relationship.', 1;

  IF EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE object_id = OBJECT_ID(N'dbo.FK_TimeSheet_Employee', N'F')
      AND delete_referential_action = 1
  )
  BEGIN
    ALTER TABLE dbo.TimeSheet DROP CONSTRAINT FK_TimeSheet_Employee;
    ALTER TABLE dbo.TimeSheet WITH CHECK
      ADD CONSTRAINT FK_TimeSheet_Employee FOREIGN KEY (ID_Employee)
      REFERENCES dbo.Employee (ID_Employee)
      ON DELETE NO ACTION;
  END;

  IF EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE object_id = OBJECT_ID(N'dbo.FK_TimeSheet_Employee', N'F')
      AND (delete_referential_action <> 0 OR is_disabled = 1 OR is_not_trusted = 1)
  )
    THROW 51008, 'FK_TimeSheet_Employee is not a trusted NO ACTION relationship.', 1;
`;

const overlapTriggerSql = `
CREATE OR ALTER TRIGGER dbo.trg_PositionAssignment_PreventOverlap
ON dbo.PositionAssignment
AFTER INSERT, UPDATE
AS
BEGIN
  SET NOCOUNT ON;

  IF EXISTS (
    SELECT 1
    FROM inserted AS changed
    JOIN dbo.PositionAssignment AS existing
      ON existing.PositionId = changed.PositionId
     AND existing.PositionAssignmentId <> changed.PositionAssignmentId
     AND existing.IsCancelled = 0
     AND (changed.EffectiveTo IS NULL OR COALESCE(existing.EffectiveFrom, existing.ImportedAsOf) < changed.EffectiveTo)
     AND (existing.EffectiveTo IS NULL OR COALESCE(changed.EffectiveFrom, changed.ImportedAsOf) < existing.EffectiveTo)
    WHERE changed.IsCancelled = 0
  )
    THROW 51100, 'A position cannot have overlapping assignments.', 1;

  IF EXISTS (
    SELECT 1
    FROM inserted AS changed
    JOIN dbo.PositionAssignment AS existing
      ON existing.EmployeeId = changed.EmployeeId
     AND existing.PositionAssignmentId <> changed.PositionAssignmentId
     AND existing.IsPrimary = 1
     AND existing.IsCancelled = 0
     AND (changed.EffectiveTo IS NULL OR COALESCE(existing.EffectiveFrom, existing.ImportedAsOf) < changed.EffectiveTo)
     AND (existing.EffectiveTo IS NULL OR COALESCE(changed.EffectiveFrom, changed.ImportedAsOf) < existing.EffectiveTo)
    WHERE changed.IsPrimary = 1
      AND changed.IsCancelled = 0
  )
    THROW 51101, 'An employee cannot have overlapping primary assignments.', 1;
END;
`;

const currentEmployeeViewSql = `
CREATE OR ALTER VIEW dbo.vw_CurrentEmployeePosition
AS
  SELECT
    pa.EmployeeId,
    pa.PositionAssignmentId,
    pa.PositionId,
    p.Position_Number,
    p.JobId,
    j.Job_Name_AR,
    j.Job_Name_EN,
    pa.AssignmentTypeCode,
    pa.IsPrimary,
    pa.EffectiveFrom,
    pa.EffectiveTo,
    pa.DecisionNumber,
    pa.DecisionDate
  FROM dbo.PositionAssignment AS pa
  JOIN dbo.Position AS p ON p.Id = pa.PositionId
  LEFT JOIN dbo.jobs AS j ON j.Job_ID = p.JobId
  WHERE pa.IsPrimary = 1
    AND pa.IsCancelled = 0
    AND pa.EffectiveTo IS NULL
    AND COALESCE(pa.EffectiveFrom, pa.ImportedAsOf) <= CONVERT(date, SYSDATETIME());
`;

const vacantPositionsViewSql = `
CREATE OR ALTER VIEW dbo.vw_VacantPositions
AS
  SELECT
    p.Id AS PositionId,
    p.Position_Number,
    p.JobId,
    j.Job_Name_AR,
    j.Job_Name_EN,
    p.PositionLevel,
    p.Position_Degree,
    p.Position_DateCreation,
    p.Status,
    p.Position_Type
  FROM dbo.Position AS p
  LEFT JOIN dbo.jobs AS j ON j.Job_ID = p.JobId
  WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.PositionAssignment AS pa
    WHERE pa.PositionId = p.Id
      AND pa.IsCancelled = 0
      AND COALESCE(pa.EffectiveFrom, pa.ImportedAsOf) <= CONVERT(date, SYSDATETIME())
      AND (pa.EffectiveTo IS NULL OR CONVERT(date, SYSDATETIME()) < pa.EffectiveTo)
  );
`;

const asOfFunctionSql = `
CREATE OR ALTER FUNCTION dbo.fn_PositionAssignmentsAsOf (@AsOfDate date)
RETURNS TABLE
AS
RETURN
(
  SELECT
    pa.EmployeeId,
    pa.PositionAssignmentId,
    pa.PositionId,
    p.Position_Number,
    p.JobId,
    j.Job_Name_AR,
    j.Job_Name_EN,
    pa.AssignmentTypeCode,
    pa.IsPrimary,
    pa.EffectiveFrom,
    pa.EffectiveTo,
    pa.DecisionNumber,
    pa.DecisionDate
  FROM dbo.PositionAssignment AS pa
  JOIN dbo.Position AS p ON p.Id = pa.PositionId
  LEFT JOIN dbo.jobs AS j ON j.Job_ID = p.JobId
  WHERE @AsOfDate IS NOT NULL
    AND pa.IsCancelled = 0
    AND COALESCE(pa.EffectiveFrom, pa.ImportedAsOf) <= @AsOfDate
    AND (pa.EffectiveTo IS NULL OR @AsOfDate < pa.EffectiveTo)
);
`;

const historyViewSql = `
CREATE OR ALTER VIEW dbo.vw_EmployeePositionAssignmentHistory
AS
  SELECT
    pa.EmployeeId,
    pa.PositionAssignmentId,
    pa.PositionId,
    p.Position_Number,
    p.JobId,
    j.Job_Name_AR,
    j.Job_Name_EN,
    pa.AssignmentTypeCode,
    pa.IsPrimary,
    pa.EffectiveFrom,
    pa.EffectiveTo,
    pa.IsOpeningBalance,
    pa.ImportedAsOf,
    pa.IsCancelled,
    pa.DecisionNumber,
    pa.DecisionDate,
    pa.AssignmentReason,
    pa.EndReason,
    pa.CancellationReason,
    pa.CreatedAtUtc,
    pa.CreatedBy,
    pa.ModifiedAtUtc,
    pa.ModifiedBy
  FROM dbo.PositionAssignment AS pa
  JOIN dbo.Position AS p ON p.Id = pa.PositionId
  LEFT JOIN dbo.jobs AS j ON j.Job_ID = p.JobId;
`;

const temporalAuditViewSql = `
CREATE OR ALTER VIEW dbo.vw_PositionAssignmentAuditTrail
AS
  SELECT
    pa.PositionAssignmentId,
    pa.PositionId,
    pa.EmployeeId,
    pa.AssignmentTypeCode,
    pa.IsPrimary,
    pa.EffectiveFrom,
    pa.EffectiveTo,
    pa.IsCancelled,
    pa.DecisionNumber,
    pa.DecisionDate,
    pa.AssignmentReason,
    pa.EndReason,
    pa.CancellationReason,
    pa.CreatedAtUtc,
    pa.CreatedBy,
    pa.ModifiedAtUtc,
    pa.ModifiedBy,
    pa.SystemValidFrom,
    pa.SystemValidTo
  FROM dbo.PositionAssignment FOR SYSTEM_TIME ALL AS pa;
`;

const assignProcedureSql = `
CREATE OR ALTER PROCEDURE dbo.usp_AssignEmployeeToPosition
  @PositionId int,
  @EmployeeId int,
  @EffectiveFrom date,
  @Actor nvarchar(128),
  @AssignmentTypeCode varchar(30) = 'PRIMARY',
  @IsPrimary bit = 1,
  @DecisionNumber nvarchar(100) = NULL,
  @DecisionDate date = NULL,
  @AssignmentReason nvarchar(250) = NULL,
  @Notes nvarchar(1000) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @InitialTransactionCount int = @@TRANCOUNT;
  DECLARE @SavepointCreated bit = 0;
  IF @InitialTransactionCount = 0 SET XACT_ABORT ON;
  ELSE SET XACT_ABORT OFF;

  BEGIN TRY
    IF @InitialTransactionCount = 0
      BEGIN TRANSACTION;
    ELSE
    BEGIN
      SAVE TRANSACTION AssignPositionSavepoint;
      SET @SavepointCreated = 1;
    END;

    IF @EffectiveFrom IS NULL THROW 51200, 'EffectiveFrom is required.', 1;
    IF NULLIF(LTRIM(RTRIM(@Actor)), N'') IS NULL THROW 51201, 'Actor is required.', 1;

    DECLARE
      @LockResult int,
      @EmployeeLockResource nvarchar(255) = CONCAT(N'HERP:PositionAssignment:Employee:', @EmployeeId),
      @PositionLockResource nvarchar(255) = CONCAT(N'HERP:PositionAssignment:Position:', @PositionId);
    EXEC @LockResult = sys.sp_getapplock
      @Resource = @EmployeeLockResource,
      @LockMode = N'Exclusive', @LockOwner = N'Transaction', @LockTimeout = 10000;
    IF @LockResult < 0 THROW 51202, 'Could not lock the employee assignment resource.', 1;
    EXEC @LockResult = sys.sp_getapplock
      @Resource = @PositionLockResource,
      @LockMode = N'Exclusive', @LockOwner = N'Transaction', @LockTimeout = 10000;
    IF @LockResult < 0 THROW 51203, 'Could not lock the position assignment resource.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.Employee WITH (UPDLOCK, HOLDLOCK) WHERE ID_Employee = @EmployeeId)
      THROW 51204, 'Employee does not exist.', 1;
    IF NOT EXISTS (SELECT 1 FROM dbo.Position WITH (UPDLOCK, HOLDLOCK) WHERE Id = @PositionId)
      THROW 51205, 'Position does not exist.', 1;
    IF NOT EXISTS (
      SELECT 1 FROM dbo.PositionAssignmentType WITH (UPDLOCK, HOLDLOCK)
      WHERE AssignmentTypeCode = @AssignmentTypeCode AND IsActive = 1
    ) THROW 51206, 'Assignment type is missing or inactive.', 1;

    IF EXISTS (
      SELECT 1 FROM dbo.PositionAssignment WITH (UPDLOCK, HOLDLOCK)
      WHERE PositionId = @PositionId AND IsCancelled = 0
        AND (EffectiveTo IS NULL OR @EffectiveFrom < EffectiveTo)
    ) THROW 51207, 'The position is not available for the requested interval.', 1;

    IF @IsPrimary = 1 AND EXISTS (
      SELECT 1 FROM dbo.PositionAssignment WITH (UPDLOCK, HOLDLOCK)
      WHERE EmployeeId = @EmployeeId AND IsPrimary = 1 AND IsCancelled = 0
        AND (EffectiveTo IS NULL OR @EffectiveFrom < EffectiveTo)
    ) THROW 51208, 'The employee already has a primary assignment in the requested interval.', 1;

    INSERT INTO dbo.PositionAssignment (
      PositionId, EmployeeId, AssignmentTypeCode, IsPrimary,
      EffectiveFrom, EffectiveTo, ImportedAsOf, IsOpeningBalance, IsCancelled,
      DecisionNumber, DecisionDate, AssignmentReason, Notes, CreatedBy
    ) VALUES (
      @PositionId, @EmployeeId, @AssignmentTypeCode, @IsPrimary,
      @EffectiveFrom, NULL, NULL, 0, 0,
      NULLIF(LTRIM(RTRIM(@DecisionNumber)), N''), @DecisionDate,
      NULLIF(LTRIM(RTRIM(@AssignmentReason)), N''), @Notes, LTRIM(RTRIM(@Actor))
    );
    DECLARE @PositionAssignmentId bigint = CONVERT(bigint, SCOPE_IDENTITY());

    IF @InitialTransactionCount = 0
      COMMIT TRANSACTION;

    SELECT
      N'ASSIGNED' AS Action,
      PositionAssignmentId, PositionId, EmployeeId, AssignmentTypeCode,
      IsPrimary, EffectiveFrom, EffectiveTo, IsCancelled, RowVersion
    FROM dbo.PositionAssignment
    WHERE PositionAssignmentId = @PositionAssignmentId;
  END TRY
  BEGIN CATCH
    IF @InitialTransactionCount = 0 AND XACT_STATE() <> 0
      ROLLBACK TRANSACTION;
    ELSE IF @SavepointCreated = 1 AND XACT_STATE() = 1
      ROLLBACK TRANSACTION AssignPositionSavepoint;
    THROW;
  END CATCH;
END;
`;

const transferProcedureSql = `
CREATE OR ALTER PROCEDURE dbo.usp_TransferEmployeePosition
  @EmployeeId int,
  @ToPositionId int,
  @EffectiveDate date,
  @Actor nvarchar(128),
  @AssignmentTypeCode varchar(30) = 'PRIMARY',
  @IsPrimary bit = 1,
  @DecisionNumber nvarchar(100) = NULL,
  @DecisionDate date = NULL,
  @AssignmentReason nvarchar(250) = NULL,
  @EndReason nvarchar(250) = NULL,
  @Notes nvarchar(1000) = NULL,
  @ExpectedCurrentAssignmentId bigint = NULL,
  @ExpectedRowVersion binary(8) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @InitialTransactionCount int = @@TRANCOUNT;
  DECLARE @SavepointCreated bit = 0;
  IF @InitialTransactionCount = 0 SET XACT_ABORT ON;
  ELSE SET XACT_ABORT OFF;

  BEGIN TRY
    IF @InitialTransactionCount = 0
      BEGIN TRANSACTION;
    ELSE
    BEGIN
      SAVE TRANSACTION TransferPositionSavepoint;
      SET @SavepointCreated = 1;
    END;

    IF @EffectiveDate IS NULL THROW 51300, 'EffectiveDate is required.', 1;
    IF NULLIF(LTRIM(RTRIM(@Actor)), N'') IS NULL THROW 51301, 'Actor is required.', 1;

    DECLARE
      @LockResult int,
      @EmployeeLockResource nvarchar(255) = CONCAT(N'HERP:PositionAssignment:Employee:', @EmployeeId);
    EXEC @LockResult = sys.sp_getapplock
      @Resource = @EmployeeLockResource,
      @LockMode = N'Exclusive', @LockOwner = N'Transaction', @LockTimeout = 10000;
    IF @LockResult < 0 THROW 51302, 'Could not lock the employee assignment resource.', 1;

    DECLARE
      @CurrentAssignmentId bigint,
      @CurrentPositionId int,
      @CurrentEffectiveFrom date,
      @CurrentImportedAsOf date,
      @CurrentRowVersion binary(8);

    SELECT
      @CurrentAssignmentId = PositionAssignmentId,
      @CurrentPositionId = PositionId,
      @CurrentEffectiveFrom = EffectiveFrom,
      @CurrentImportedAsOf = ImportedAsOf,
      @CurrentRowVersion = RowVersion
    FROM dbo.PositionAssignment WITH (UPDLOCK, HOLDLOCK)
    WHERE EmployeeId = @EmployeeId
      AND IsPrimary = 1
      AND IsCancelled = 0
      AND EffectiveTo IS NULL
      AND COALESCE(EffectiveFrom, ImportedAsOf) <= @EffectiveDate;

    IF @CurrentAssignmentId IS NULL THROW 51303, 'No open primary assignment was found for the employee.', 1;
    IF @ExpectedCurrentAssignmentId IS NOT NULL AND @ExpectedCurrentAssignmentId <> @CurrentAssignmentId
      THROW 51304, 'The employee current assignment changed. Refresh and retry.', 1;
    IF @ExpectedRowVersion IS NOT NULL AND @ExpectedRowVersion <> @CurrentRowVersion
      THROW 51305, 'The current assignment was modified. Refresh and retry.', 1;
    IF @CurrentPositionId = @ToPositionId THROW 51306, 'Source and destination positions are the same.', 1;
    IF @EffectiveDate <= COALESCE(@CurrentEffectiveFrom, @CurrentImportedAsOf)
      THROW 51307, 'Transfer date must be after the current assignment start date.', 1;

    DECLARE @FirstPositionId int = CASE WHEN @CurrentPositionId < @ToPositionId THEN @CurrentPositionId ELSE @ToPositionId END;
    DECLARE @SecondPositionId int = CASE WHEN @CurrentPositionId < @ToPositionId THEN @ToPositionId ELSE @CurrentPositionId END;
    DECLARE @FirstPositionLockResource nvarchar(255) = CONCAT(N'HERP:PositionAssignment:Position:', @FirstPositionId);
    DECLARE @SecondPositionLockResource nvarchar(255) = CONCAT(N'HERP:PositionAssignment:Position:', @SecondPositionId);
    EXEC @LockResult = sys.sp_getapplock
      @Resource = @FirstPositionLockResource,
      @LockMode = N'Exclusive', @LockOwner = N'Transaction', @LockTimeout = 10000;
    IF @LockResult < 0 THROW 51308, 'Could not lock the first position resource.', 1;
    EXEC @LockResult = sys.sp_getapplock
      @Resource = @SecondPositionLockResource,
      @LockMode = N'Exclusive', @LockOwner = N'Transaction', @LockTimeout = 10000;
    IF @LockResult < 0 THROW 51309, 'Could not lock the second position resource.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.Employee WITH (UPDLOCK, HOLDLOCK) WHERE ID_Employee = @EmployeeId)
      THROW 51310, 'Employee does not exist.', 1;
    IF NOT EXISTS (SELECT 1 FROM dbo.Position WITH (UPDLOCK, HOLDLOCK) WHERE Id = @ToPositionId)
      THROW 51311, 'Destination position does not exist.', 1;
    IF NOT EXISTS (
      SELECT 1 FROM dbo.PositionAssignmentType WITH (UPDLOCK, HOLDLOCK)
      WHERE AssignmentTypeCode = @AssignmentTypeCode AND IsActive = 1
    ) THROW 51312, 'Assignment type is missing or inactive.', 1;

    IF EXISTS (
      SELECT 1 FROM dbo.PositionAssignment WITH (UPDLOCK, HOLDLOCK)
      WHERE PositionId = @ToPositionId AND IsCancelled = 0
        AND (EffectiveTo IS NULL OR @EffectiveDate < EffectiveTo)
    ) THROW 51313, 'The destination position is not available on the transfer date.', 1;

    IF @IsPrimary = 1 AND EXISTS (
      SELECT 1 FROM dbo.PositionAssignment WITH (UPDLOCK, HOLDLOCK)
      WHERE EmployeeId = @EmployeeId AND IsPrimary = 1 AND IsCancelled = 0
        AND PositionAssignmentId <> @CurrentAssignmentId
        AND (EffectiveTo IS NULL OR @EffectiveDate < EffectiveTo)
    ) THROW 51314, 'The employee has another overlapping primary assignment.', 1;

    UPDATE dbo.PositionAssignment
    SET EffectiveTo = @EffectiveDate,
        EndReason = COALESCE(NULLIF(LTRIM(RTRIM(@EndReason)), N''), N'Transferred'),
        Notes = COALESCE(@Notes, Notes),
        ModifiedAtUtc = SYSUTCDATETIME(),
        ModifiedBy = LTRIM(RTRIM(@Actor))
    WHERE PositionAssignmentId = @CurrentAssignmentId
      AND RowVersion = @CurrentRowVersion;
    IF @@ROWCOUNT <> 1 THROW 51315, 'The source assignment changed during transfer.', 1;

    INSERT INTO dbo.PositionAssignment (
      PositionId, EmployeeId, AssignmentTypeCode, IsPrimary,
      EffectiveFrom, EffectiveTo, ImportedAsOf, IsOpeningBalance, IsCancelled,
      DecisionNumber, DecisionDate, AssignmentReason, Notes, CreatedBy
    ) VALUES (
      @ToPositionId, @EmployeeId, @AssignmentTypeCode, @IsPrimary,
      @EffectiveDate, NULL, NULL, 0, 0,
      NULLIF(LTRIM(RTRIM(@DecisionNumber)), N''), @DecisionDate,
      COALESCE(NULLIF(LTRIM(RTRIM(@AssignmentReason)), N''), N'Transfer'),
      @Notes, LTRIM(RTRIM(@Actor))
    );
    DECLARE @NewAssignmentId bigint = CONVERT(bigint, SCOPE_IDENTITY());

    IF @InitialTransactionCount = 0
      COMMIT TRANSACTION;

    SELECT
      N'TRANSFERRED' AS Action,
      @CurrentAssignmentId AS PreviousPositionAssignmentId,
      PositionAssignmentId, PositionId, EmployeeId, AssignmentTypeCode,
      IsPrimary, EffectiveFrom, EffectiveTo, IsCancelled, RowVersion
    FROM dbo.PositionAssignment
    WHERE PositionAssignmentId = @NewAssignmentId;
  END TRY
  BEGIN CATCH
    IF @InitialTransactionCount = 0 AND XACT_STATE() <> 0
      ROLLBACK TRANSACTION;
    ELSE IF @SavepointCreated = 1 AND XACT_STATE() = 1
      ROLLBACK TRANSACTION TransferPositionSavepoint;
    THROW;
  END CATCH;
END;
`;

const endProcedureSql = `
CREATE OR ALTER PROCEDURE dbo.usp_EndPositionAssignment
  @PositionAssignmentId bigint,
  @EffectiveTo date,
  @EndReason nvarchar(250),
  @Actor nvarchar(128),
  @Notes nvarchar(1000) = NULL,
  @ExpectedRowVersion binary(8) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @InitialTransactionCount int = @@TRANCOUNT;
  DECLARE @SavepointCreated bit = 0;
  IF @InitialTransactionCount = 0 SET XACT_ABORT ON;
  ELSE SET XACT_ABORT OFF;

  BEGIN TRY
    IF @InitialTransactionCount = 0
      BEGIN TRANSACTION;
    ELSE
    BEGIN
      SAVE TRANSACTION EndPositionSavepoint;
      SET @SavepointCreated = 1;
    END;

    IF @EffectiveTo IS NULL THROW 51400, 'EffectiveTo is required.', 1;
    IF NULLIF(LTRIM(RTRIM(@EndReason)), N'') IS NULL THROW 51401, 'EndReason is required.', 1;
    IF NULLIF(LTRIM(RTRIM(@Actor)), N'') IS NULL THROW 51402, 'Actor is required.', 1;

    DECLARE @EmployeeId int, @PositionId int, @EffectiveFrom date, @ImportedAsOf date, @CurrentRowVersion binary(8), @LockResult int;
    SELECT
      @EmployeeId = EmployeeId,
      @PositionId = PositionId,
      @EffectiveFrom = EffectiveFrom,
      @ImportedAsOf = ImportedAsOf,
      @CurrentRowVersion = RowVersion
    FROM dbo.PositionAssignment WITH (UPDLOCK, HOLDLOCK)
    WHERE PositionAssignmentId = @PositionAssignmentId
      AND IsCancelled = 0
      AND EffectiveTo IS NULL;

    IF @EmployeeId IS NULL THROW 51403, 'Open assignment was not found.', 1;
    IF @ExpectedRowVersion IS NOT NULL AND @ExpectedRowVersion <> @CurrentRowVersion
      THROW 51404, 'The assignment was modified. Refresh and retry.', 1;
    IF @EffectiveTo <= COALESCE(@EffectiveFrom, @ImportedAsOf)
      THROW 51405, 'End date must be after the assignment start date.', 1;

    DECLARE @EmployeeLockResource nvarchar(255) = CONCAT(N'HERP:PositionAssignment:Employee:', @EmployeeId);
    DECLARE @PositionLockResource nvarchar(255) = CONCAT(N'HERP:PositionAssignment:Position:', @PositionId);
    EXEC @LockResult = sys.sp_getapplock
      @Resource = @EmployeeLockResource,
      @LockMode = N'Exclusive', @LockOwner = N'Transaction', @LockTimeout = 10000;
    IF @LockResult < 0 THROW 51406, 'Could not lock the employee assignment resource.', 1;
    EXEC @LockResult = sys.sp_getapplock
      @Resource = @PositionLockResource,
      @LockMode = N'Exclusive', @LockOwner = N'Transaction', @LockTimeout = 10000;
    IF @LockResult < 0 THROW 51407, 'Could not lock the position assignment resource.', 1;

    UPDATE dbo.PositionAssignment
    SET EffectiveTo = @EffectiveTo,
        EndReason = LTRIM(RTRIM(@EndReason)),
        Notes = COALESCE(@Notes, Notes),
        ModifiedAtUtc = SYSUTCDATETIME(),
        ModifiedBy = LTRIM(RTRIM(@Actor))
    WHERE PositionAssignmentId = @PositionAssignmentId
      AND RowVersion = @CurrentRowVersion;
    IF @@ROWCOUNT <> 1 THROW 51408, 'The assignment changed while it was being ended.', 1;

    IF @InitialTransactionCount = 0
      COMMIT TRANSACTION;

    SELECT
      N'ENDED' AS Action,
      PositionAssignmentId, PositionId, EmployeeId, AssignmentTypeCode,
      IsPrimary, EffectiveFrom, EffectiveTo, IsCancelled, RowVersion
    FROM dbo.PositionAssignment
    WHERE PositionAssignmentId = @PositionAssignmentId;
  END TRY
  BEGIN CATCH
    IF @InitialTransactionCount = 0 AND XACT_STATE() <> 0
      ROLLBACK TRANSACTION;
    ELSE IF @SavepointCreated = 1 AND XACT_STATE() = 1
      ROLLBACK TRANSACTION EndPositionSavepoint;
    THROW;
  END CATCH;
END;
`;

const cancelProcedureSql = `
CREATE OR ALTER PROCEDURE dbo.usp_CancelPositionAssignment
  @PositionAssignmentId bigint,
  @CancellationReason nvarchar(250),
  @Actor nvarchar(128),
  @ExpectedRowVersion binary(8) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @InitialTransactionCount int = @@TRANCOUNT;
  DECLARE @SavepointCreated bit = 0;
  IF @InitialTransactionCount = 0 SET XACT_ABORT ON;
  ELSE SET XACT_ABORT OFF;

  BEGIN TRY
    IF @InitialTransactionCount = 0
      BEGIN TRANSACTION;
    ELSE
    BEGIN
      SAVE TRANSACTION CancelPositionSavepoint;
      SET @SavepointCreated = 1;
    END;

    IF NULLIF(LTRIM(RTRIM(@CancellationReason)), N'') IS NULL THROW 51500, 'CancellationReason is required.', 1;
    IF NULLIF(LTRIM(RTRIM(@Actor)), N'') IS NULL THROW 51501, 'Actor is required.', 1;

    DECLARE @EmployeeId int, @PositionId int, @CurrentRowVersion binary(8), @LockResult int;
    SELECT
      @EmployeeId = EmployeeId,
      @PositionId = PositionId,
      @CurrentRowVersion = RowVersion
    FROM dbo.PositionAssignment WITH (UPDLOCK, HOLDLOCK)
    WHERE PositionAssignmentId = @PositionAssignmentId
      AND IsCancelled = 0;

    IF @EmployeeId IS NULL THROW 51502, 'Active assignment record was not found.', 1;
    IF @ExpectedRowVersion IS NOT NULL AND @ExpectedRowVersion <> @CurrentRowVersion
      THROW 51503, 'The assignment was modified. Refresh and retry.', 1;

    DECLARE @EmployeeLockResource nvarchar(255) = CONCAT(N'HERP:PositionAssignment:Employee:', @EmployeeId);
    DECLARE @PositionLockResource nvarchar(255) = CONCAT(N'HERP:PositionAssignment:Position:', @PositionId);
    EXEC @LockResult = sys.sp_getapplock
      @Resource = @EmployeeLockResource,
      @LockMode = N'Exclusive', @LockOwner = N'Transaction', @LockTimeout = 10000;
    IF @LockResult < 0 THROW 51504, 'Could not lock the employee assignment resource.', 1;
    EXEC @LockResult = sys.sp_getapplock
      @Resource = @PositionLockResource,
      @LockMode = N'Exclusive', @LockOwner = N'Transaction', @LockTimeout = 10000;
    IF @LockResult < 0 THROW 51505, 'Could not lock the position assignment resource.', 1;

    UPDATE dbo.PositionAssignment
    SET IsCancelled = 1,
        CancelledAtUtc = SYSUTCDATETIME(),
        CancelledBy = LTRIM(RTRIM(@Actor)),
        CancellationReason = LTRIM(RTRIM(@CancellationReason)),
        ModifiedAtUtc = SYSUTCDATETIME(),
        ModifiedBy = LTRIM(RTRIM(@Actor))
    WHERE PositionAssignmentId = @PositionAssignmentId
      AND RowVersion = @CurrentRowVersion;
    IF @@ROWCOUNT <> 1 THROW 51506, 'The assignment changed while it was being cancelled.', 1;

    IF @InitialTransactionCount = 0
      COMMIT TRANSACTION;

    SELECT
      N'CANCELLED' AS Action,
      PositionAssignmentId, PositionId, EmployeeId, AssignmentTypeCode,
      IsPrimary, EffectiveFrom, EffectiveTo, IsCancelled, RowVersion
    FROM dbo.PositionAssignment
    WHERE PositionAssignmentId = @PositionAssignmentId;
  END TRY
  BEGIN CATCH
    IF @InitialTransactionCount = 0 AND XACT_STATE() <> 0
      ROLLBACK TRANSACTION;
    ELSE IF @SavepointCreated = 1 AND XACT_STATE() = 1
      ROLLBACK TRANSACTION CancelPositionSavepoint;
    THROW;
  END CATCH;
END;
`;

const seedOpeningBalances = async (transaction, importedAsOf) => {
  const request = new sql.Request(transaction);
  request.input("ImportedAsOf", sql.Date, importedAsOf);
  request.input("MigrationKey", sql.VarChar(100), MIGRATION_KEY);
  request.input("ScriptVersion", sql.VarChar(30), SCRIPT_VERSION);
  request.input("ExpectedPositions", sql.Int, EXPECTED.positions);
  request.input("ExpectedAssignments", sql.Int, EXPECTED.assignments);
  request.input("ExpectedVacancies", sql.Int, EXPECTED.vacancies);
  request.input("ExpectedMissingJobs", sql.Int, EXPECTED.missingJobs);
  const result = await request.query(`
    IF EXISTS (SELECT 1 FROM dbo.PositionAssignmentMigrationAudit WITH (UPDLOCK, HOLDLOCK) WHERE MigrationKey = @MigrationKey)
    BEGIN
      SELECT CAST(0 AS int) AS inserted_count, CAST(1 AS bit) AS already_applied;
      RETURN;
    END;

    IF EXISTS (SELECT 1 FROM dbo.PositionAssignment)
      THROW 51600, 'PositionAssignment is not empty before the opening-balance migration.', 1;

    ;WITH EmployeeReferenceCounts AS (
      SELECT
        TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(100), e.Ref_Employee))), N'')) AS employee_reference,
        MIN(e.ID_Employee) AS employee_id,
        COUNT_BIG(*) AS employee_count
      FROM dbo.Employee AS e
      GROUP BY TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(100), e.Ref_Employee))), N''))
    )
    INSERT INTO dbo.PositionAssignment (
      PositionId, EmployeeId, AssignmentTypeCode, IsPrimary,
      EffectiveFrom, EffectiveTo, ImportedAsOf, IsOpeningBalance, IsCancelled,
      AssignmentReason, CreatedBy
    )
    SELECT
      p.Id, erc.employee_id, 'PRIMARY', 1,
      NULL, NULL, @ImportedAsOf, 1, 0,
      N'Opening balance imported from dbo.Position.EmployeeId',
      N'migration:position-assignment-v1'
    FROM dbo.Position AS p
    JOIN EmployeeReferenceCounts AS erc
      ON erc.employee_reference = p.EmployeeId
     AND erc.employee_count = 1
    WHERE p.EmployeeId IS NOT NULL
      AND p.EmployeeId <> 0
      AND NOT EXISTS (
        SELECT 1 FROM dbo.PositionAssignment AS existing WITH (UPDLOCK, HOLDLOCK)
        WHERE existing.PositionId = p.Id AND existing.IsOpeningBalance = 1
      );

    DECLARE @InsertedCount int = @@ROWCOUNT;
    IF @InsertedCount <> @ExpectedAssignments
      THROW 51601, 'Opening-balance insert count did not match the preflight assertion.', 1;

    IF (SELECT COUNT_BIG(*) FROM dbo.PositionAssignment WHERE IsOpeningBalance = 1) <> @ExpectedAssignments
      THROW 51602, 'Opening-balance assignment verification failed.', 1;

    IF EXISTS (
      SELECT 1
      FROM dbo.Position AS p
      JOIN dbo.Employee AS e
        ON TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(100), e.Ref_Employee))), N'')) = p.EmployeeId
      LEFT JOIN dbo.PositionAssignment AS pa
        ON pa.PositionId = p.Id AND pa.EmployeeId = e.ID_Employee AND pa.IsOpeningBalance = 1
      WHERE p.EmployeeId IS NOT NULL AND p.EmployeeId <> 0
        AND pa.PositionAssignmentId IS NULL
    ) THROW 51603, 'At least one source occupancy is missing from PositionAssignment.', 1;

    INSERT INTO dbo.PositionAssignmentMigrationAudit (
      MigrationKey, AppliedAtUtc, ImportedAsOf, PositionCount,
      AssignmentCount, VacancyCount, MissingJobCount, ScriptVersion, AppliedBy
    ) VALUES (
      @MigrationKey, SYSUTCDATETIME(), @ImportedAsOf, @ExpectedPositions,
      @ExpectedAssignments, @ExpectedVacancies, @ExpectedMissingJobs,
      @ScriptVersion, N'migration:position-assignment-v1'
    );

    INSERT INTO dbo.PositionAssignmentOpeningBalanceAudit (
      MigrationKey, PositionAssignmentId, PositionId,
      SourceEmployeeReference, EmployeeId, ImportedAsOf
    )
    SELECT
      @MigrationKey,
      pa.PositionAssignmentId,
      pa.PositionId,
      p.EmployeeId,
      pa.EmployeeId,
      @ImportedAsOf
    FROM dbo.PositionAssignment AS pa
    JOIN dbo.Position AS p ON p.Id = pa.PositionId
    WHERE pa.IsOpeningBalance = 1;

    IF @@ROWCOUNT <> @ExpectedAssignments
      THROW 51604, 'Per-position migration audit count did not match the opening balance.', 1;

    SELECT @InsertedCount AS inserted_count, CAST(0 AS bit) AS already_applied;
  `);
  return result.recordset[0];
};

const verifyInsideTransaction = async (transaction) => {
  const result = await new sql.Request(transaction).query(`
    SELECT
      (SELECT COUNT_BIG(*) FROM dbo.PositionAssignment WHERE IsOpeningBalance = 1) AS opening_balance_count,
      (SELECT COUNT_BIG(*) FROM dbo.PositionAssignment WHERE IsOpeningBalance = 1 AND EmployeeId IS NULL) AS null_employee_count,
      (SELECT COUNT_BIG(*) FROM dbo.PositionAssignment AS pa LEFT JOIN dbo.Position AS p ON p.Id = pa.PositionId WHERE p.Id IS NULL) AS orphan_position_count,
      (SELECT COUNT_BIG(*) FROM dbo.PositionAssignment AS pa LEFT JOIN dbo.Employee AS e ON e.ID_Employee = pa.EmployeeId WHERE e.ID_Employee IS NULL) AS orphan_employee_count,
      (SELECT COUNT_BIG(*) FROM dbo.Position AS p LEFT JOIN dbo.jobs AS j ON j.Job_ID = p.JobId WHERE p.JobId IS NOT NULL AND j.Job_ID IS NULL) AS orphan_job_count,
      (SELECT COUNT_BIG(*) FROM dbo.Position WHERE JobId IS NOT NULL AND Job_ID IS NOT NULL AND JobId <> Job_ID) AS job_conflict_count,
      (SELECT COUNT_BIG(*) FROM dbo.PositionAssignmentMigrationAudit WHERE MigrationKey = N'${MIGRATION_KEY}') AS audit_count,
      (SELECT COUNT_BIG(*) FROM dbo.PositionAssignmentOpeningBalanceAudit WHERE MigrationKey = N'${MIGRATION_KEY}') AS detail_audit_count,
      (SELECT temporal_type FROM sys.tables WHERE object_id = OBJECT_ID(N'dbo.PositionAssignment')) AS temporal_type,
      (SELECT history_table_id FROM sys.tables WHERE object_id = OBJECT_ID(N'dbo.PositionAssignment')) AS history_table_id;

    SELECT
      COUNT_BIG(*) AS named_fk_count,
      SUM(CASE WHEN is_disabled = 1 OR is_not_trusted = 1 OR delete_referential_action <> 0 THEN 1 ELSE 0 END) AS untrusted_or_disabled_fk_count
    FROM sys.foreign_keys
    WHERE name IN (
      N'FK_Position_Jobs', N'FK_PositionAssignment_Position',
      N'FK_PositionAssignment_Employee', N'FK_PositionAssignment_Type'
    );
  `);
  const aggregate = result.recordsets[0][0];
  const checks = [
    [aggregate.opening_balance_count, EXPECTED.assignments, "opening balance count"],
    [aggregate.null_employee_count, 0, "null assignment employee count"],
    [aggregate.orphan_position_count, 0, "orphan assignment position count"],
    [aggregate.orphan_employee_count, 0, "orphan assignment employee count"],
    [aggregate.orphan_job_count, 0, "orphan position job count"],
    [aggregate.job_conflict_count, 0, "Position job conflict count"],
    [aggregate.audit_count, 1, "migration audit count"],
    [aggregate.detail_audit_count, EXPECTED.assignments, "per-position migration audit count"],
    [aggregate.temporal_type, 2, "PositionAssignment temporal type"],
    [result.recordsets[1][0].named_fk_count, 4, "named relationship count"],
    [result.recordsets[1][0].untrusted_or_disabled_fk_count, 0, "untrusted/disabled/cascading FK count"]
  ];
  for (const [actual, expected, label] of checks) {
    if (Number(actual) !== Number(expected)) {
      throw new Error(`Transactional verification failed: ${label} is ${actual}, expected ${expected}.`);
    }
  }
  if (Number(aggregate.history_table_id) !== Number((await new sql.Request(transaction).query(
    "SELECT OBJECT_ID(N'dbo.PositionAssignmentHistory', N'U') AS history_table_id;"
  )).recordset[0].history_table_id)) {
    throw new Error("PositionAssignment is not linked to dbo.PositionAssignmentHistory.");
  }
  return aggregate;
};

const applyMigration = async (pool, importedAsOf, initialState) => {
  const transaction = new sql.Transaction(pool);
  let transactionStarted = false;
  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    transactionStarted = true;
    const lockResult = await acquireMigrationLock(transaction);
    await lockSourceTables(transaction);

    const lockedPreflight = await loadPreflight(new sql.Request(transaction));
    assertSourceSchema(lockedPreflight);
    const lockedState = classifyTargetState(lockedPreflight);
    if (lockedState === "partial") {
      throw new Error("A partial PositionAssignment rollout exists. No automatic repair was attempted.");
    }
    if (initialState !== lockedState) {
      throw new Error(`Rollout state changed while waiting for the migration lock (${initialState} -> ${lockedState}).`);
    }
    if (lockedState === "fresh") assertFreshData(lockedPreflight);

    await new sql.Request(transaction).query(createBaseObjectsSql);
    await new sql.Request(transaction).query(seedTypesSql);
    await new sql.Request(transaction).query(createRelationshipsAndIndexesSql);
    await new sql.Request(transaction).query(overlapTriggerSql);
    await new sql.Request(transaction).query(currentEmployeeViewSql);
    await new sql.Request(transaction).query(vacantPositionsViewSql);
    await new sql.Request(transaction).query(asOfFunctionSql);
    await new sql.Request(transaction).query(historyViewSql);
    await new sql.Request(transaction).query(temporalAuditViewSql);
    await new sql.Request(transaction).query(assignProcedureSql);
    await new sql.Request(transaction).query(transferProcedureSql);
    await new sql.Request(transaction).query(endProcedureSql);
    await new sql.Request(transaction).query(cancelProcedureSql);

    const seed = await seedOpeningBalances(transaction, importedAsOf);
    const verification = await verifyInsideTransaction(transaction);
    await transaction.commit();
    transactionStarted = false;

    return {
      mode: "applied",
      migrationKey: MIGRATION_KEY,
      scriptVersion: SCRIPT_VERSION,
      importedAsOf,
      lockResult,
      insertedOpeningBalances: Number(seed.inserted_count),
      alreadyApplied: Boolean(seed.already_applied),
      verification: {
        openingBalanceCount: Number(verification.opening_balance_count),
        orphanPositionCount: Number(verification.orphan_position_count),
        orphanEmployeeCount: Number(verification.orphan_employee_count),
        orphanJobCount: Number(verification.orphan_job_count),
        temporalType: Number(verification.temporal_type)
      },
      preservedLegacyColumns: [
        "dbo.Position.EmployeeId",
        "dbo.Position.Job_ID",
        "dbo.Position.Job_Name_AR",
        "dbo.Position.Job_Name_EN"
      ]
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
    throw error;
  }
};

const main = async () => {
  const { apply, importedAsOf } = parseArguments();
  const pool = await connectWithMssql();
  try {
    const preflight = await loadPreflight(pool.request());
    assertSourceSchema(preflight);
    const state = classifyTargetState(preflight);
    if (state === "partial") {
      throw new Error(
        "A partial PositionAssignment rollout was detected. The script will not guess or overwrite it."
      );
    }
    if (state === "fresh") assertFreshData(preflight);

    if (!apply) {
      console.log(JSON.stringify({
        mode: "dry-run",
        migrationKey: MIGRATION_KEY,
        scriptVersion: SCRIPT_VERSION,
        importedAsOf,
        targetState: state,
        database: preflight.objects.database_name,
        serverMajorVersion: Number(preflight.objects.server_major_version),
        mapping: Object.fromEntries(
          Object.entries(preflight.mapping).map(([key, value]) => [key, Number(value)])
        ),
        jobs: Object.fromEntries(
          Object.entries(preflight.jobs).map(([key, value]) => [key, Number(value)])
        ),
        audit: preflight.audit,
        plannedMutation: state === "fresh"
          ? "Add PositionAssignment objects, copy Position.Job_ID into empty Position.JobId values, and seed opening balances."
          : "Re-validate and idempotently refresh rollout objects; no opening-balance rows are duplicated.",
        message: "Preflight passed. No database changes were made. Use --apply to execute the transaction."
      }, null, 2));
      return;
    }

    const result = await applyMigration(pool, importedAsOf, state);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await pool.close();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
