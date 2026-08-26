require("dotenv").config();

const { connectWithMssql } = require("../src/config/database");

const main = async () => {
  const pool = await connectWithMssql();

  try {
    const result = await pool.request().query(`
      SELECT
        OBJECT_ID(N'dbo.Employee') AS employee_object_id,
        OBJECT_ID(N'dbo.Position') AS position_object_id,
        OBJECT_ID(N'dbo.jobs') AS jobs_object_id,
        OBJECT_ID(N'dbo.PositionAssignment') AS assignment_object_id;

      SELECT
        OBJECT_SCHEMA_NAME(kc.parent_object_id) AS schema_name,
        OBJECT_NAME(kc.parent_object_id) AS table_name,
        kc.name AS primary_key_name,
        STRING_AGG(c.name, N',') WITHIN GROUP (ORDER BY ic.key_ordinal) AS key_columns
      FROM sys.key_constraints AS kc
      JOIN sys.index_columns AS ic
        ON ic.object_id = kc.parent_object_id
       AND ic.index_id = kc.unique_index_id
      JOIN sys.columns AS c
        ON c.object_id = ic.object_id
       AND c.column_id = ic.column_id
      WHERE kc.type = N'PK'
        AND kc.parent_object_id IN (
          OBJECT_ID(N'dbo.Employee'),
          OBJECT_ID(N'dbo.Position'),
          OBJECT_ID(N'dbo.jobs')
        )
      GROUP BY kc.parent_object_id, kc.name;

      SELECT
        c.column_id,
        c.name AS column_name,
        t.name AS data_type,
        c.max_length,
        c.is_nullable,
        c.is_identity
      FROM sys.columns AS c
      JOIN sys.types AS t ON t.user_type_id = c.user_type_id
      WHERE c.object_id = OBJECT_ID(N'dbo.Employee')
        AND c.name IN (N'ID_Employee', N'Ref_Employee', N'Job_Id', N'Start_of_Contract')
      ORDER BY c.column_id;

      WITH EmployeeReferenceCounts AS (
        SELECT
          TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(100), [Ref_Employee]))), N'')) AS employee_reference,
          COUNT_BIG(*) AS employee_count
        FROM dbo.Employee
        GROUP BY TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(100), [Ref_Employee]))), N''))
      )
      SELECT
        COUNT_BIG(*) AS position_count,
        SUM(CASE WHEN p.EmployeeId IS NULL THEN 1 ELSE 0 END) AS null_employee_reference_count,
        SUM(CASE WHEN p.EmployeeId = 0 THEN 1 ELSE 0 END) AS zero_employee_reference_count,
        SUM(CASE WHEN p.EmployeeId IS NOT NULL AND p.EmployeeId <> 0 THEN 1 ELSE 0 END) AS nonzero_employee_reference_count,
        COUNT_BIG(DISTINCT CASE WHEN p.EmployeeId IS NOT NULL AND p.EmployeeId <> 0 THEN p.EmployeeId END) AS distinct_nonzero_employee_references,
        SUM(CASE WHEN p.EmployeeId IS NOT NULL AND p.EmployeeId <> 0 AND erc.employee_count = 1 THEN 1 ELSE 0 END) AS uniquely_mappable_position_count,
        SUM(CASE WHEN p.EmployeeId IS NOT NULL AND p.EmployeeId <> 0 AND erc.employee_count IS NULL THEN 1 ELSE 0 END) AS unmatched_position_count,
        SUM(CASE WHEN p.EmployeeId IS NOT NULL AND p.EmployeeId <> 0 AND erc.employee_count > 1 THEN 1 ELSE 0 END) AS ambiguously_mapped_position_count
      FROM dbo.Position AS p
      LEFT JOIN EmployeeReferenceCounts AS erc
        ON erc.employee_reference = p.EmployeeId;

      WITH EmployeeReferenceCounts AS (
        SELECT
          TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(100), [Ref_Employee]))), N'')) AS employee_reference,
          COUNT_BIG(*) AS employee_count
        FROM dbo.Employee
        GROUP BY TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(100), [Ref_Employee]))), N''))
      )
      SELECT
        SUM(CASE WHEN employee_reference IS NULL THEN employee_count ELSE 0 END) AS employee_null_or_nonnumeric_reference_count,
        SUM(CASE WHEN employee_reference = 0 THEN employee_count ELSE 0 END) AS employee_zero_reference_count,
        SUM(CASE WHEN employee_reference IS NOT NULL AND employee_reference <> 0 THEN employee_count ELSE 0 END) AS employee_nonzero_reference_count,
        SUM(CASE WHEN employee_reference IS NOT NULL AND employee_reference <> 0 AND employee_count > 1 THEN 1 ELSE 0 END) AS duplicated_nonzero_reference_value_count,
        MAX(CASE WHEN employee_reference IS NOT NULL AND employee_reference <> 0 THEN employee_count ELSE 0 END) AS maximum_nonzero_reference_multiplicity
      FROM EmployeeReferenceCounts;

      SELECT
        COUNT_BIG(*) AS position_count,
        SUM(CASE WHEN p.JobId IS NULL THEN 1 ELSE 0 END) AS null_legacy_job_id_count,
        SUM(CASE WHEN p.Job_ID IS NULL THEN 1 ELSE 0 END) AS null_imported_job_id_count,
        SUM(CASE WHEN p.JobId IS NOT NULL AND p.Job_ID IS NOT NULL AND p.JobId <> p.Job_ID THEN 1 ELSE 0 END) AS conflicting_job_id_count,
        SUM(CASE WHEN p.Job_ID IS NOT NULL AND j.Job_ID IS NULL THEN 1 ELSE 0 END) AS orphan_imported_job_id_count
      FROM dbo.Position AS p
      LEFT JOIN dbo.jobs AS j ON j.Job_ID = p.Job_ID;

      IF COL_LENGTH(N'dbo.Employee', N'Job_Id') IS NULL
      BEGIN
        SELECT
          CAST(0 AS bit) AS legacy_job_id_column_exists,
          COUNT_BIG(*) AS employee_count,
          CAST(NULL AS bigint) AS null_legacy_job_id_count,
          CAST(NULL AS bigint) AS populated_legacy_job_id_count
        FROM dbo.Employee;
      END
      ELSE
      BEGIN
        EXEC sys.sp_executesql N'
          SELECT
            CAST(1 AS bit) AS legacy_job_id_column_exists,
            COUNT_BIG(*) AS employee_count,
            SUM(CASE WHEN Job_Id IS NULL THEN 1 ELSE 0 END) AS null_legacy_job_id_count,
            SUM(CASE WHEN Job_Id IS NOT NULL THEN 1 ELSE 0 END) AS populated_legacy_job_id_count
          FROM dbo.Employee;';
      END;

      WITH PositionNumberCounts AS (
        SELECT Position_Number, COUNT_BIG(*) AS position_number_count
        FROM dbo.Position
        WHERE Position_Number IS NOT NULL
        GROUP BY Position_Number
      )
      SELECT
        (SELECT COUNT_BIG(*) FROM dbo.Position WHERE Position_Number IS NULL) AS null_position_number_count,
        COUNT_BIG(*) AS distinct_nonnull_position_number_count,
        SUM(CASE WHEN position_number_count > 1 THEN 1 ELSE 0 END) AS duplicated_position_number_value_count,
        SUM(CASE WHEN position_number_count > 1 THEN position_number_count ELSE 0 END) AS rows_using_duplicated_position_numbers
      FROM PositionNumberCounts;

      SELECT
        fk.name AS foreign_key_name,
        OBJECT_SCHEMA_NAME(fk.parent_object_id) AS parent_schema,
        OBJECT_NAME(fk.parent_object_id) AS parent_table,
        pc.name AS parent_column,
        OBJECT_SCHEMA_NAME(fk.referenced_object_id) AS referenced_schema,
        OBJECT_NAME(fk.referenced_object_id) AS referenced_table,
        rc.name AS referenced_column,
        fk.delete_referential_action_desc AS on_delete
      FROM sys.foreign_keys AS fk
      JOIN sys.foreign_key_columns AS fkc ON fkc.constraint_object_id = fk.object_id
      JOIN sys.columns AS pc
        ON pc.object_id = fkc.parent_object_id
       AND pc.column_id = fkc.parent_column_id
      JOIN sys.columns AS rc
        ON rc.object_id = fkc.referenced_object_id
       AND rc.column_id = fkc.referenced_column_id
      WHERE fk.parent_object_id IN (
          OBJECT_ID(N'dbo.Employee'),
          OBJECT_ID(N'dbo.Position'),
          OBJECT_ID(N'dbo.jobs'),
          OBJECT_ID(N'dbo.PositionAssignment')
        )
         OR fk.referenced_object_id IN (
          OBJECT_ID(N'dbo.Employee'),
          OBJECT_ID(N'dbo.Position'),
          OBJECT_ID(N'dbo.jobs'),
          OBJECT_ID(N'dbo.PositionAssignment')
        )
      ORDER BY fk.name;
    `);

    console.log(JSON.stringify({
      objects: result.recordsets[0][0],
      primaryKeys: result.recordsets[1],
      employeeColumns: result.recordsets[2],
      positionEmployeeMapping: result.recordsets[3][0],
      employeeReferenceQuality: result.recordsets[4][0],
      positionJobMapping: result.recordsets[5][0],
      employeeLegacyJobCoverage: result.recordsets[6][0],
      positionNumberQuality: result.recordsets[7][0],
      relatedForeignKeys: result.recordsets[8]
    }, null, 2));
  } finally {
    await pool.close();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
