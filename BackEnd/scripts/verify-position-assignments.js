require("dotenv").config();

const { connectWithMssql } = require("../src/config/database");

const MIGRATION_KEY = "position-assignment-opening-balance-v1";
const EXPECTED_OPENING_BALANCES = 4614;

const fail = (message) => {
  throw new Error(`PositionAssignment verification failed: ${message}`);
};

const number = (value) => Number(value ?? 0);

const main = async () => {
  const pool = await connectWithMssql();
  try {
    const metadataResult = await pool.request().query(`
      SELECT
        TRY_CONVERT(int, SERVERPROPERTY(N'ProductMajorVersion')) AS server_major_version,
        DB_NAME() AS database_name,
        OBJECT_ID(N'dbo.PositionAssignmentType', N'U') AS assignment_type_object_id,
        OBJECT_ID(N'dbo.PositionAssignment', N'U') AS assignment_object_id,
        OBJECT_ID(N'dbo.PositionAssignmentHistory', N'U') AS history_object_id,
        OBJECT_ID(N'dbo.PositionAssignmentMigrationAudit', N'U') AS audit_object_id,
        OBJECT_ID(N'dbo.PositionAssignmentOpeningBalanceAudit', N'U') AS detail_audit_object_id,
        OBJECT_ID(N'dbo.vw_CurrentEmployeePosition', N'V') AS current_view_object_id,
        OBJECT_ID(N'dbo.vw_VacantPositions', N'V') AS vacancy_view_object_id,
        OBJECT_ID(N'dbo.vw_EmployeePositionAssignmentHistory', N'V') AS business_history_view_object_id,
        OBJECT_ID(N'dbo.vw_PositionAssignmentAuditTrail', N'V') AS audit_view_object_id,
        OBJECT_ID(N'dbo.fn_PositionAssignmentsAsOf', N'IF') AS as_of_function_object_id,
        OBJECT_ID(N'dbo.usp_AssignEmployeeToPosition', N'P') AS assign_procedure_object_id,
        OBJECT_ID(N'dbo.usp_TransferEmployeePosition', N'P') AS transfer_procedure_object_id,
        OBJECT_ID(N'dbo.usp_EndPositionAssignment', N'P') AS end_procedure_object_id,
        OBJECT_ID(N'dbo.usp_CancelPositionAssignment', N'P') AS cancel_procedure_object_id,
        OBJECT_ID(N'dbo.trg_PositionAssignment_PreventOverlap', N'TR') AS overlap_trigger_object_id;

      SELECT
        c.name AS column_name,
        TYPE_NAME(c.user_type_id) AS data_type,
        c.max_length,
        c.precision,
        c.scale,
        c.is_nullable,
        c.is_identity,
        c.is_hidden,
        c.generated_always_type
      FROM sys.columns AS c
      WHERE c.object_id = OBJECT_ID(N'dbo.PositionAssignment')
      ORDER BY c.column_id;

      SELECT
        o.name AS object_name,
        c.column_id,
        c.name AS column_name
      FROM sys.objects AS o
      JOIN sys.columns AS c ON c.object_id = o.object_id
      WHERE o.object_id IN (
        OBJECT_ID(N'dbo.vw_CurrentEmployeePosition'),
        OBJECT_ID(N'dbo.vw_VacantPositions'),
        OBJECT_ID(N'dbo.fn_PositionAssignmentsAsOf')
      )
      ORDER BY o.name, c.column_id;

      SELECT
        o.name AS procedure_name,
        p.parameter_id,
        p.name AS parameter_name,
        TYPE_NAME(p.user_type_id) AS data_type,
        p.max_length,
        p.has_default_value
      FROM sys.objects AS o
      JOIN sys.parameters AS p ON p.object_id = o.object_id
      WHERE o.object_id IN (
        OBJECT_ID(N'dbo.usp_AssignEmployeeToPosition'),
        OBJECT_ID(N'dbo.usp_TransferEmployeePosition'),
        OBJECT_ID(N'dbo.usp_EndPositionAssignment'),
        OBJECT_ID(N'dbo.usp_CancelPositionAssignment')
      )
      ORDER BY o.name, p.parameter_id;

      SELECT
        o.name AS procedure_name,
        CASE
          WHEN m.definition LIKE N'%@InitialTransactionCount int = @@TRANCOUNT%'
           AND m.definition LIKE N'%SAVE TRANSACTION%'
           AND m.definition LIKE N'%IF @InitialTransactionCount = 0 AND XACT_STATE() <> 0%'
           AND m.definition LIKE N'%IF @InitialTransactionCount = 0 SET XACT_ABORT ON%'
           AND m.definition LIKE N'%ELSE SET XACT_ABORT OFF%'
          THEN CAST(1 AS bit)
          ELSE CAST(0 AS bit)
        END AS is_caller_transaction_safe
      FROM sys.objects AS o
      JOIN sys.sql_modules AS m ON m.object_id = o.object_id
      WHERE o.object_id IN (
        OBJECT_ID(N'dbo.usp_AssignEmployeeToPosition'),
        OBJECT_ID(N'dbo.usp_TransferEmployeePosition'),
        OBJECT_ID(N'dbo.usp_EndPositionAssignment'),
        OBJECT_ID(N'dbo.usp_CancelPositionAssignment')
      )
      ORDER BY o.name;
    `);

    const objects = metadataResult.recordsets[0][0];
    const requiredObjects = [
      "assignment_type_object_id",
      "assignment_object_id",
      "history_object_id",
      "audit_object_id",
      "detail_audit_object_id",
      "current_view_object_id",
      "vacancy_view_object_id",
      "business_history_view_object_id",
      "audit_view_object_id",
      "as_of_function_object_id",
      "assign_procedure_object_id",
      "transfer_procedure_object_id",
      "end_procedure_object_id",
      "cancel_procedure_object_id",
      "overlap_trigger_object_id"
    ];
    for (const property of requiredObjects) {
      if (!objects[property]) fail(`required object ${property} is missing`);
    }
    const procedureTransactionSafety = metadataResult.recordsets[4];
    if (
      procedureTransactionSafety.length !== 4
      || procedureTransactionSafety.some((procedure) => !Boolean(procedure.is_caller_transaction_safe))
    ) {
      fail("one or more assignment procedures can roll back a caller-owned transaction");
    }

    const aggregateResult = await pool.request().query(`
      SELECT
        t.temporal_type,
        t.history_table_id,
        OBJECT_ID(N'dbo.PositionAssignmentHistory', N'U') AS expected_history_table_id,
        t.is_memory_optimized
      FROM sys.tables AS t
      WHERE t.object_id = OBJECT_ID(N'dbo.PositionAssignment');

      SELECT
        COUNT_BIG(*) AS assignment_count,
        SUM(CASE WHEN IsOpeningBalance = 1 THEN 1 ELSE 0 END) AS opening_balance_count,
        SUM(CASE WHEN IsOpeningBalance = 1 AND ImportedAsOf IS NULL THEN 1 ELSE 0 END) AS invalid_opening_balance_count,
        SUM(CASE WHEN IsOpeningBalance = 0 AND EffectiveFrom IS NULL THEN 1 ELSE 0 END) AS missing_effective_from_count,
        SUM(CASE WHEN IsCancelled = 1 THEN 1 ELSE 0 END) AS cancelled_count,
        SUM(CASE WHEN EffectiveTo IS NOT NULL THEN 1 ELSE 0 END) AS ended_count,
        SUM(CASE WHEN IsCancelled = 0 AND EffectiveTo IS NULL THEN 1 ELSE 0 END) AS open_count,
        SUM(CASE WHEN EffectiveTo IS NOT NULL AND EffectiveTo <= COALESCE(EffectiveFrom, ImportedAsOf) THEN 1 ELSE 0 END) AS invalid_interval_count
      FROM dbo.PositionAssignment;

      SELECT COUNT_BIG(*) AS temporal_history_row_count
      FROM dbo.PositionAssignmentHistory;

      SELECT
        COUNT_BIG(*) AS source_position_count,
        SUM(CASE WHEN EmployeeId IS NULL OR EmployeeId = 0 THEN 1 ELSE 0 END) AS legacy_vacancy_count,
        SUM(CASE WHEN EmployeeId IS NOT NULL AND EmployeeId <> 0 THEN 1 ELSE 0 END) AS legacy_occupied_count,
        SUM(CASE WHEN Job_ID IS NULL THEN 1 ELSE 0 END) AS missing_job_count,
        SUM(CASE WHEN JobId IS NOT NULL AND Job_ID IS NOT NULL AND JobId <> Job_ID THEN 1 ELSE 0 END) AS job_copy_conflict_count
      FROM dbo.Position;

      SELECT
        SUM(CASE WHEN p.Id IS NULL THEN 1 ELSE 0 END) AS orphan_position_count,
        SUM(CASE WHEN e.ID_Employee IS NULL THEN 1 ELSE 0 END) AS orphan_employee_count,
        SUM(CASE WHEN assignmentType.AssignmentTypeCode IS NULL THEN 1 ELSE 0 END) AS orphan_type_count
      FROM dbo.PositionAssignment AS pa
      LEFT JOIN dbo.Position AS p ON p.Id = pa.PositionId
      LEFT JOIN dbo.Employee AS e ON e.ID_Employee = pa.EmployeeId
      LEFT JOIN dbo.PositionAssignmentType AS assignmentType
        ON assignmentType.AssignmentTypeCode = pa.AssignmentTypeCode;

      SELECT COUNT_BIG(*) AS orphan_position_job_count
      FROM dbo.Position AS p
      LEFT JOIN dbo.jobs AS j ON j.Job_ID = p.JobId
      WHERE p.JobId IS NOT NULL AND j.Job_ID IS NULL;

      SELECT
        COUNT_BIG(*) AS required_type_count,
        SUM(CASE WHEN IsActive = 1 THEN 1 ELSE 0 END) AS active_required_type_count
      FROM dbo.PositionAssignmentType
      WHERE AssignmentTypeCode IN ('PRIMARY', 'ACTING', 'SECONDMENT', 'TEMPORARY');

      SELECT
        COUNT_BIG(*) AS audit_count,
        MIN(PositionCount) AS audited_position_count,
        MIN(AssignmentCount) AS audited_assignment_count,
        MIN(VacancyCount) AS audited_vacancy_count,
        MIN(MissingJobCount) AS audited_missing_job_count,
        MIN(ImportedAsOf) AS imported_as_of,
        MIN(AppliedAtUtc) AS applied_at_utc
      FROM dbo.PositionAssignmentMigrationAudit
      WHERE MigrationKey = N'${MIGRATION_KEY}';

      SELECT
        COUNT_BIG(*) AS detail_audit_count,
        SUM(CASE WHEN pa.PositionAssignmentId IS NULL THEN 1 ELSE 0 END) AS missing_assignment_count,
        SUM(CASE WHEN p.Id IS NULL THEN 1 ELSE 0 END) AS missing_position_count,
        SUM(CASE WHEN e.ID_Employee IS NULL THEN 1 ELSE 0 END) AS missing_employee_count,
        SUM(CASE WHEN pa.PositionId <> detail.PositionId
                   OR pa.EmployeeId <> detail.EmployeeId
                   OR p.EmployeeId <> detail.SourceEmployeeReference
                 THEN 1 ELSE 0 END) AS provenance_mismatch_count
      FROM dbo.PositionAssignmentOpeningBalanceAudit AS detail
      LEFT JOIN dbo.PositionAssignment AS pa
        ON pa.PositionAssignmentId = detail.PositionAssignmentId
       AND pa.IsOpeningBalance = 1
      LEFT JOIN dbo.Position AS p ON p.Id = detail.PositionId
      LEFT JOIN dbo.Employee AS e ON e.ID_Employee = detail.EmployeeId
      WHERE detail.MigrationKey = N'${MIGRATION_KEY}';

      ;WITH ExpectedOpeningBalance AS (
        SELECT p.Id AS PositionId, e.ID_Employee AS EmployeeId
        FROM dbo.Position AS p
        JOIN dbo.Employee AS e
          ON TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(100), e.Ref_Employee))), N'')) = p.EmployeeId
        WHERE p.EmployeeId IS NOT NULL AND p.EmployeeId <> 0
      ), ActualOpeningBalance AS (
        SELECT PositionId, EmployeeId
        FROM dbo.PositionAssignment
        WHERE IsOpeningBalance = 1
      )
      SELECT
        (SELECT COUNT_BIG(*) FROM (
          SELECT PositionId, EmployeeId FROM ExpectedOpeningBalance
          EXCEPT
          SELECT PositionId, EmployeeId FROM ActualOpeningBalance
        ) AS missing) AS missing_opening_balance_mapping_count,
        (SELECT COUNT_BIG(*) FROM (
          SELECT PositionId, EmployeeId FROM ActualOpeningBalance
          EXCEPT
          SELECT PositionId, EmployeeId FROM ExpectedOpeningBalance
        ) AS unexpected) AS unexpected_opening_balance_mapping_count;

      SELECT
        (SELECT COUNT_BIG(*)
         FROM dbo.PositionAssignment AS leftAssignment
         JOIN dbo.PositionAssignment AS rightAssignment
           ON rightAssignment.PositionId = leftAssignment.PositionId
          AND rightAssignment.PositionAssignmentId > leftAssignment.PositionAssignmentId
          AND rightAssignment.IsCancelled = 0
          AND (leftAssignment.EffectiveTo IS NULL OR COALESCE(rightAssignment.EffectiveFrom, rightAssignment.ImportedAsOf) < leftAssignment.EffectiveTo)
          AND (rightAssignment.EffectiveTo IS NULL OR COALESCE(leftAssignment.EffectiveFrom, leftAssignment.ImportedAsOf) < rightAssignment.EffectiveTo)
         WHERE leftAssignment.IsCancelled = 0) AS overlapping_position_pair_count,
        (SELECT COUNT_BIG(*)
         FROM dbo.PositionAssignment AS leftAssignment
         JOIN dbo.PositionAssignment AS rightAssignment
           ON rightAssignment.EmployeeId = leftAssignment.EmployeeId
          AND rightAssignment.PositionAssignmentId > leftAssignment.PositionAssignmentId
          AND rightAssignment.IsPrimary = 1
          AND rightAssignment.IsCancelled = 0
          AND (leftAssignment.EffectiveTo IS NULL OR COALESCE(rightAssignment.EffectiveFrom, rightAssignment.ImportedAsOf) < leftAssignment.EffectiveTo)
          AND (rightAssignment.EffectiveTo IS NULL OR COALESCE(leftAssignment.EffectiveFrom, leftAssignment.ImportedAsOf) < rightAssignment.EffectiveTo)
         WHERE leftAssignment.IsPrimary = 1 AND leftAssignment.IsCancelled = 0) AS overlapping_primary_employee_pair_count;

      SELECT
        COUNT_BIG(*) AS current_view_count,
        COUNT_BIG(DISTINCT EmployeeId) AS current_view_distinct_employee_count
      FROM dbo.vw_CurrentEmployeePosition;

      SELECT
        (SELECT COUNT_BIG(*) FROM dbo.vw_VacantPositions) AS current_vacancy_count,
        (SELECT COUNT_BIG(*) FROM dbo.fn_PositionAssignmentsAsOf(CONVERT(date, SYSDATETIME()))) AS as_of_today_count;

      SELECT
        COUNT_BIG(*) AS required_fk_count,
        SUM(CASE WHEN fk.is_disabled = 1 OR fk.is_not_trusted = 1 THEN 1 ELSE 0 END) AS disabled_or_untrusted_fk_count,
        SUM(CASE WHEN fk.delete_referential_action <> 0 OR fk.update_referential_action <> 0 THEN 1 ELSE 0 END) AS cascading_fk_count
      FROM sys.foreign_keys AS fk
      WHERE fk.name IN (
        N'FK_Position_Jobs', N'FK_PositionAssignment_Position',
        N'FK_PositionAssignment_Employee', N'FK_PositionAssignment_Type'
      );

      SELECT
        COUNT_BIG(*) AS exact_relationship_count,
        SUM(CASE WHEN fk.is_disabled = 1 OR fk.is_not_trusted = 1 OR fk.delete_referential_action <> 0 THEN 1 ELSE 0 END) AS unsafe_relationship_count
      FROM sys.foreign_key_columns AS fkc
      JOIN sys.foreign_keys AS fk ON fk.object_id = fkc.constraint_object_id
      WHERE (fkc.parent_object_id = OBJECT_ID(N'dbo.Position')
             AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'JobId'
             AND fkc.referenced_object_id = OBJECT_ID(N'dbo.jobs')
             AND COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) = N'Job_ID')
         OR (fkc.parent_object_id = OBJECT_ID(N'dbo.PositionAssignment')
             AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'PositionId'
             AND fkc.referenced_object_id = OBJECT_ID(N'dbo.Position')
             AND COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) = N'Id')
         OR (fkc.parent_object_id = OBJECT_ID(N'dbo.PositionAssignment')
             AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'EmployeeId'
             AND fkc.referenced_object_id = OBJECT_ID(N'dbo.Employee')
             AND COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) = N'ID_Employee')
         OR (fkc.parent_object_id = OBJECT_ID(N'dbo.PositionAssignment')
             AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'AssignmentTypeCode'
             AND fkc.referenced_object_id = OBJECT_ID(N'dbo.PositionAssignmentType')
             AND COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) = N'AssignmentTypeCode');

      SELECT
        COUNT_BIG(*) AS required_index_count,
        SUM(CASE WHEN name IN (
          N'UX_PositionAssignment_OpenPosition',
          N'UX_PositionAssignment_OpenPrimaryEmployee',
          N'UX_PositionAssignment_OpeningBalancePosition'
        ) AND (is_unique = 0 OR has_filter = 0) THEN 1 ELSE 0 END) AS invalid_unique_filtered_index_count,
        SUM(CASE WHEN is_disabled = 1 OR is_hypothetical = 1 THEN 1 ELSE 0 END) AS disabled_or_hypothetical_index_count
      FROM sys.indexes
      WHERE object_id = OBJECT_ID(N'dbo.PositionAssignment')
        AND name IN (
          N'UX_PositionAssignment_OpenPosition',
          N'UX_PositionAssignment_OpenPrimaryEmployee',
          N'UX_PositionAssignment_OpeningBalancePosition',
          N'IX_PositionAssignment_PositionInterval',
          N'IX_PositionAssignment_EmployeeInterval'
        );

      SELECT
        COUNT_BIG(*) AS required_check_count,
        SUM(CASE WHEN is_disabled = 1 OR is_not_trusted = 1 THEN 1 ELSE 0 END) AS disabled_or_untrusted_check_count
      FROM sys.check_constraints
      WHERE parent_object_id = OBJECT_ID(N'dbo.PositionAssignment')
        AND name IN (
          N'CK_PositionAssignment_EffectiveRange',
          N'CK_PositionAssignment_OpeningBalance',
          N'CK_PositionAssignment_CancellationAudit',
          N'CK_PositionAssignment_CreatedBy_NotBlank'
        );

      SELECT
        is_disabled,
        is_instead_of_trigger
      FROM sys.triggers
      WHERE object_id = OBJECT_ID(N'dbo.trg_PositionAssignment_PreventOverlap');

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

    const sets = aggregateResult.recordsets;
    const temporal = sets[0][0];
    const assignments = sets[1][0];
    const history = sets[2][0];
    const positions = sets[3][0];
    const orphans = sets[4][0];
    const orphanJobs = sets[5][0];
    const types = sets[6][0];
    const audit = sets[7][0];
    const detailAudit = sets[8][0];
    const mapping = sets[9][0];
    const overlaps = sets[10][0];
    const currentView = sets[11][0];
    const currentSnapshot = sets[12][0];
    const namedForeignKeys = sets[13][0];
    const relationships = sets[14][0];
    const indexes = sets[15][0];
    const checks = sets[16][0];
    const trigger = sets[17][0];
    const timeSheetRelationship = sets[18][0];

    if (number(temporal.temporal_type) !== 2) fail("dbo.PositionAssignment is not system-versioned");
    if (number(temporal.history_table_id) !== number(temporal.expected_history_table_id)) {
      fail("dbo.PositionAssignmentHistory is not the configured temporal history table");
    }
    if (number(assignments.opening_balance_count) !== EXPECTED_OPENING_BALANCES) {
      fail(`expected ${EXPECTED_OPENING_BALANCES} opening balances, found ${assignments.opening_balance_count}`);
    }
    for (const [value, label] of [
      [assignments.invalid_opening_balance_count, "opening balances without ImportedAsOf"],
      [assignments.missing_effective_from_count, "non-opening assignments without EffectiveFrom"],
      [assignments.invalid_interval_count, "invalid assignment intervals"],
      [orphans.orphan_position_count, "orphan assignment positions"],
      [orphans.orphan_employee_count, "orphan assignment employees"],
      [orphans.orphan_type_count, "orphan assignment types"],
      [orphanJobs.orphan_position_job_count, "orphan position jobs"],
      [positions.job_copy_conflict_count, "Position JobId/Job_ID conflicts"],
      [mapping.missing_opening_balance_mapping_count, "missing opening-balance mappings"],
      [mapping.unexpected_opening_balance_mapping_count, "unexpected opening-balance mappings"],
      [overlaps.overlapping_position_pair_count, "overlapping position assignment pairs"],
      [overlaps.overlapping_primary_employee_pair_count, "overlapping primary employee assignment pairs"],
      [namedForeignKeys.disabled_or_untrusted_fk_count, "disabled or untrusted named foreign keys"],
      [namedForeignKeys.cascading_fk_count, "cascading named foreign keys"],
      [relationships.unsafe_relationship_count, "unsafe expected relationships"],
      [indexes.invalid_unique_filtered_index_count, "invalid unique filtered indexes"],
      [indexes.disabled_or_hypothetical_index_count, "disabled/hypothetical indexes"],
      [checks.disabled_or_untrusted_check_count, "disabled/untrusted checks"],
      [detailAudit.missing_assignment_count, "migration detail rows without opening assignments"],
      [detailAudit.missing_position_count, "migration detail rows without positions"],
      [detailAudit.missing_employee_count, "migration detail rows without employees"],
      [detailAudit.provenance_mismatch_count, "migration detail provenance mismatches"],
      [timeSheetRelationship.unsafe_timesheet_fk_count, "unsafe TimeSheet employee relationship"]
    ]) {
      if (number(value) !== 0) fail(`${label}: ${value}`);
    }
    if (number(types.required_type_count) !== 4 || number(types.active_required_type_count) !== 4) {
      fail("the four required active assignment types are not present");
    }
    if (number(audit.audit_count) !== 1 || number(audit.audited_assignment_count) !== EXPECTED_OPENING_BALANCES) {
      fail("the opening-balance migration audit is missing or inconsistent");
    }
    if (number(detailAudit.detail_audit_count) !== EXPECTED_OPENING_BALANCES) {
      fail(`expected ${EXPECTED_OPENING_BALANCES} per-position migration audit rows`);
    }
    if (number(currentView.current_view_count) !== number(currentView.current_view_distinct_employee_count)) {
      fail("vw_CurrentEmployeePosition returns more than one row for an employee");
    }
    if (number(namedForeignKeys.required_fk_count) !== 4 || number(relationships.exact_relationship_count) !== 4) {
      fail("the four required trusted NO ACTION relationships are not present");
    }
    if (number(indexes.required_index_count) !== 5) fail("one or more required assignment indexes are missing");
    if (number(checks.required_check_count) !== 4) fail("one or more required assignment checks are missing");
    if (number(timeSheetRelationship.exact_timesheet_fk_count) !== 1) {
      fail("FK_TimeSheet_Employee is missing or does not match the audited one-column relationship");
    }
    if (!trigger || Boolean(trigger.is_disabled) || Boolean(trigger.is_instead_of_trigger)) {
      fail("the overlap-protection AFTER trigger is missing, disabled, or the wrong type");
    }

    const columns = metadataResult.recordsets[1];
    const requiredColumns = [
      "PositionAssignmentId", "PositionId", "EmployeeId", "AssignmentTypeCode",
      "IsPrimary", "EffectiveFrom", "EffectiveTo", "ImportedAsOf",
      "IsOpeningBalance", "IsCancelled", "DecisionNumber", "DecisionDate",
      "AssignmentReason", "EndReason", "Notes", "CreatedAtUtc", "CreatedBy",
      "ModifiedAtUtc", "ModifiedBy", "CancelledAtUtc", "CancelledBy",
      "CancellationReason", "RowVersion", "SystemValidFrom", "SystemValidTo"
    ];
    const presentColumns = new Set(columns.map((column) => column.column_name));
    for (const requiredColumn of requiredColumns) {
      if (!presentColumns.has(requiredColumn)) fail(`column ${requiredColumn} is missing`);
    }
    const rowVersion = columns.find((column) => column.column_name === "RowVersion");
    if (!rowVersion || rowVersion.data_type !== "timestamp" || number(rowVersion.max_length) !== 8) {
      fail("RowVersion is not SQL Server rowversion/timestamp(8)");
    }
    for (const periodColumnName of ["SystemValidFrom", "SystemValidTo"]) {
      const period = columns.find((column) => column.column_name === periodColumnName);
      if (!period || !Boolean(period.is_hidden) || ![1, 2].includes(number(period.generated_always_type))) {
        fail(`${periodColumnName} is not a hidden generated temporal period column`);
      }
    }

    const report = {
      status: "verified",
      database: objects.database_name,
      serverMajorVersion: number(objects.server_major_version),
      migration: {
        key: MIGRATION_KEY,
        auditCount: number(audit.audit_count),
        importedAsOf: audit.imported_as_of,
        appliedAtUtc: audit.applied_at_utc,
        auditedPositionCount: number(audit.audited_position_count),
        auditedAssignmentCount: number(audit.audited_assignment_count),
        auditedVacancyCount: number(audit.audited_vacancy_count),
        auditedMissingJobCount: number(audit.audited_missing_job_count),
        perPositionProvenanceRows: number(detailAudit.detail_audit_count)
      },
      assignments: {
        total: number(assignments.assignment_count),
        openingBalances: number(assignments.opening_balance_count),
        open: number(assignments.open_count),
        ended: number(assignments.ended_count),
        cancelled: number(assignments.cancelled_count),
        temporalHistoryVersions: number(history.temporal_history_row_count)
      },
      sourceSnapshot: {
        positions: number(positions.source_position_count),
        legacyOccupied: number(positions.legacy_occupied_count),
        legacyVacant: number(positions.legacy_vacancy_count),
        missingJobs: number(positions.missing_job_count)
      },
      currentReadModels: {
        employeesWithCurrentPrimaryPosition: number(currentView.current_view_count),
        vacantPositions: number(currentSnapshot.current_vacancy_count),
        activeAssignmentsAsOfToday: number(currentSnapshot.as_of_today_count)
      },
      integrity: {
        orphanAssignments: number(orphans.orphan_position_count)
          + number(orphans.orphan_employee_count)
          + number(orphans.orphan_type_count),
        orphanPositionJobs: number(orphanJobs.orphan_position_job_count),
        overlapPairs: number(overlaps.overlapping_position_pair_count)
          + number(overlaps.overlapping_primary_employee_pair_count),
        openingBalanceMappingDifferences: number(mapping.missing_opening_balance_mapping_count)
          + number(mapping.unexpected_opening_balance_mapping_count),
        trustedNoActionRelationships: number(relationships.exact_relationship_count),
        requiredIndexes: number(indexes.required_index_count),
        requiredChecks: number(checks.required_check_count),
        timeSheetEmployeeNoActionRelationship: number(timeSheetRelationship.exact_timesheet_fk_count)
      },
      metadata: {
        assignmentColumns: columns.length,
        exposedViewAndFunctionColumns: metadataResult.recordsets[2].length,
        procedureParameters: metadataResult.recordsets[3].length,
        callerSafeProcedures: procedureTransactionSafety.length
      },
      privacy: "Aggregate counts and schema metadata only; no employee row data was read into output."
    };

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await pool.close();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
