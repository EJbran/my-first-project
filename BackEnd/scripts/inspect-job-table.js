require("dotenv").config();

const { connectWithMssql } = require("../src/config/database");

const schemaQuery = `
  SELECT
    c.column_id,
    c.name AS column_name,
    t.name AS data_type,
    c.max_length,
    c.precision,
    c.scale,
    c.is_nullable,
    c.is_identity,
    dc.definition AS default_definition
  FROM sys.columns AS c
  JOIN sys.types AS t
    ON c.user_type_id = t.user_type_id
  LEFT JOIN sys.default_constraints AS dc
    ON c.default_object_id = dc.object_id
  WHERE c.object_id = OBJECT_ID(N'dbo.Job')
  ORDER BY c.column_id;

  SELECT
    i.name AS index_name,
    i.is_unique,
    i.is_primary_key,
    STRING_AGG(c.name, ',') WITHIN GROUP (ORDER BY ic.key_ordinal) AS columns
  FROM sys.indexes AS i
  JOIN sys.index_columns AS ic
    ON i.object_id = ic.object_id
    AND i.index_id = ic.index_id
  JOIN sys.columns AS c
    ON c.object_id = ic.object_id
    AND c.column_id = ic.column_id
  WHERE i.object_id = OBJECT_ID(N'dbo.Job')
    AND ic.is_included_column = 0
  GROUP BY i.name, i.is_unique, i.is_primary_key;

  SELECT
    COUNT_BIG(*) AS row_count,
    MIN(Id) AS min_id,
    MAX(Id) AS max_id
  FROM dbo.Job;

  SELECT TOP (10)
    Id,
    Job_Name,
    Job_Name_en,
    Profile_Source_Job_ID,
    Canonical_Job_Id,
    Is_Profile_Canonical,
    Is_Legacy_Placeholder,
    Profile_Match_Method
  FROM dbo.Job
  ORDER BY Id;

  SELECT
    fk.name AS foreign_key_name,
    OBJECT_SCHEMA_NAME(fkc.parent_object_id) AS parent_schema,
    OBJECT_NAME(fkc.parent_object_id) AS parent_table,
    pc.name AS parent_column,
    rc.name AS referenced_column,
    fk.is_disabled,
    fk.is_not_trusted
  FROM sys.foreign_key_columns AS fkc
  JOIN sys.foreign_keys AS fk
    ON fk.object_id = fkc.constraint_object_id
  JOIN sys.columns AS pc
    ON pc.object_id = fkc.parent_object_id
    AND pc.column_id = fkc.parent_column_id
  JOIN sys.columns AS rc
    ON rc.object_id = fkc.referenced_object_id
    AND rc.column_id = fkc.referenced_column_id
  WHERE fkc.referenced_object_id = OBJECT_ID(N'dbo.Job');

  SELECT
    COUNT_BIG(*) AS total_employees,
    SUM(CASE WHEN TRY_CONVERT(int, Job_Id) IS NOT NULL THEN 1 ELSE 0 END) AS employees_with_numeric_job_id,
    COUNT(DISTINCT TRY_CONVERT(int, Job_Id)) AS distinct_numeric_job_ids,
    MIN(TRY_CONVERT(int, Job_Id)) AS min_numeric_job_id,
    MAX(TRY_CONVERT(int, Job_Id)) AS max_numeric_job_id,
    SUM(CASE WHEN TRY_CONVERT(int, Job_Id) BETWEEN 1 AND 1197 THEN 1 ELSE 0 END) AS employees_with_job_id_in_workbook_range
  FROM dbo.Employee;

  SELECT TOP (25)
    TRY_CONVERT(int, Job_Id) AS job_id,
    COUNT_BIG(*) AS employee_count
  FROM dbo.Employee
  WHERE TRY_CONVERT(int, Job_Id) IS NOT NULL
  GROUP BY TRY_CONVERT(int, Job_Id)
  ORDER BY COUNT_BIG(*) DESC, TRY_CONVERT(int, Job_Id);

  SELECT
    OBJECT_SCHEMA_NAME(c.object_id) AS schema_name,
    OBJECT_NAME(c.object_id) AS table_name,
    c.name AS column_name,
    t.name AS data_type,
    c.max_length,
    c.is_nullable
  FROM sys.columns AS c
  JOIN sys.types AS t ON c.user_type_id = t.user_type_id
  WHERE LOWER(c.name) IN (N'job_id', N'jobid', N'id_job')
  ORDER BY OBJECT_SCHEMA_NAME(c.object_id), OBJECT_NAME(c.object_id), c.name;

  SELECT
    COUNT_BIG(*) AS total_positions,
    SUM(CASE WHEN JobId IS NOT NULL THEN 1 ELSE 0 END) AS positions_with_job_id,
    COUNT(DISTINCT JobId) AS distinct_job_ids,
    MIN(JobId) AS min_job_id,
    MAX(JobId) AS max_job_id
  FROM dbo.Position;

  SELECT TOP (25) JobId AS job_id, COUNT_BIG(*) AS position_count
  FROM dbo.Position
  WHERE JobId IS NOT NULL
  GROUP BY JobId
  ORDER BY COUNT_BIG(*) DESC, JobId;

  SELECT
    OBJECT_SCHEMA_NAME(c.object_id) AS schema_name,
    OBJECT_NAME(c.object_id) AS table_name,
    c.name AS column_name,
    t.name AS data_type,
    c.max_length,
    c.is_nullable
  FROM sys.columns AS c
  JOIN sys.types AS t ON c.user_type_id = t.user_type_id
  WHERE c.name LIKE N'%Job%'
    AND OBJECT_SCHEMA_NAME(c.object_id) = N'dbo'
  ORDER BY OBJECT_NAME(c.object_id), c.column_id;

  SELECT
    MAX(TRY_CONVERT(int, OLD_JobId3)) AS max_old_job_id_3,
    MAX(TRY_CONVERT(int, OLD_JobId4)) AS max_old_job_id_4,
    MAX(TRY_CONVERT(int, OLD_JobId5)) AS max_old_job_id_5
  FROM dbo.Employee;

  SELECT
    MAX(TRY_CONVERT(int, NUM_JOB_EGALISEE)) AS max_equalized_job_id,
    MAX(TRY_CONVERT(int, NUM_JOB_EGALISEE_1)) AS max_equalized_job_id_1,
    MAX(TRY_CONVERT(int, NUM_JOB_EGALISEE_2)) AS max_equalized_job_id_2,
    MAX(TRY_CONVERT(int, NUM_JOB_EGALISEE_3)) AS max_equalized_job_id_3,
    MAX(TRY_CONVERT(int, NUM_JOB_EGALISEE_4)) AS max_equalized_job_id_4,
    MAX(TRY_CONVERT(int, NUM_JOB_EGALISEE_5)) AS max_equalized_job_id_5
  FROM dbo.EmployeeTemp;

  SELECT
    COUNT_BIG(*) AS total_job_rows,
    COUNT(DISTINCT Profile_Source_Job_ID) AS distinct_source_profiles,
    SUM(CASE WHEN Is_Profile_Canonical = 1 THEN 1 ELSE 0 END) AS canonical_profiles,
    SUM(CASE WHEN Is_Legacy_Placeholder = 1 THEN 1 ELSE 0 END) AS legacy_placeholders
  FROM dbo.Job;

  SELECT
    (SELECT COUNT_BIG(*)
     FROM dbo.Employee AS e
     LEFT JOIN dbo.Job AS j ON e.Job_Id = j.Id
     WHERE e.Job_Id IS NOT NULL AND j.Id IS NULL) AS orphan_employee_jobs,
    (SELECT COUNT_BIG(*)
     FROM dbo.Position AS p
     LEFT JOIN dbo.Job AS j ON p.JobId = j.Id
     WHERE p.JobId IS NOT NULL AND j.Id IS NULL) AS orphan_position_jobs;

  SELECT
    Id,
    Job_Name,
    Job_Name_en,
    Profile_Source_Job_ID,
    Canonical_Job_Id,
    Is_Profile_Canonical,
    Is_Legacy_Placeholder
  FROM dbo.Job
  WHERE Profile_Source_Job_ID IN (1, 2, 3, 4, 5)
  ORDER BY Profile_Source_Job_ID, Is_Profile_Canonical DESC, Id;
`;

const main = async () => {
  const pool = await connectWithMssql();
  try {
    const result = await pool.request().query(schemaQuery);
    console.log(JSON.stringify({
      columns: result.recordsets[0],
      indexes: result.recordsets[1],
      summary: result.recordsets[2]?.[0] ?? null,
      sample: result.recordsets[3],
      incomingForeignKeys: result.recordsets[4],
      employeeJobSummary: result.recordsets[5]?.[0] ?? null,
      mostUsedEmployeeJobIds: result.recordsets[6],
      possibleJobIdConsumers: result.recordsets[7],
      positionJobSummary: result.recordsets[8]?.[0] ?? null,
      mostUsedPositionJobIds: result.recordsets[9],
      dboJobNamedColumns: result.recordsets[10],
      employeeHistoricalJobIdMaxima: result.recordsets[11]?.[0] ?? null,
      employeeTempJobIdMaxima: result.recordsets[12]?.[0] ?? null,
      importedCatalogSummary: result.recordsets[13]?.[0] ?? null,
      orphanSummary: result.recordsets[14]?.[0] ?? null,
      importedProfileSamples: result.recordsets[15]
    }, null, 2));
  } finally {
    await pool.close();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
