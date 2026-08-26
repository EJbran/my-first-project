require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { connectWithMssql } = require("../src/config/database");

const EXPECTED_HEADERS = [
  "Ref_Employee",
  "Job_ID",
  "Job_Name_AR",
  "Job_Name_EN",
  "Position_Number"
];

const EXPECTED_DATABASE_COLUMNS = [
  "Id",
  "Position_Number",
  "PositionLevel",
  "Position_Degree",
  "Position_DateCreation",
  "Status",
  "Position_Type",
  "EmployeeId",
  "JobId",
  "Job_ID",
  "Job_Name_AR",
  "Job_Name_EN"
];

const literalNull = (value) =>
  value === null ||
  value === undefined ||
  (typeof value === "string" && value.trim().toLocaleUpperCase("en-US") === "NULL");

const normalizeSourceRow = (row) => ({
  Ref_Employee: literalNull(row.Ref_Employee) ? null : Number(row.Ref_Employee),
  Job_ID: literalNull(row.Job_ID) ? null : Number(row.Job_ID),
  Job_Name_AR: String(row.Job_Name_AR),
  Job_Name_EN: String(row.Job_Name_EN),
  Position_Number: literalNull(row.Position_Number) ? null : Number(row.Position_Number)
});

const normalizeDatabaseRow = (row) => ({
  Ref_Employee: row.EmployeeId === null ? null : Number(row.EmployeeId),
  Job_ID: row.Job_ID === null ? null : Number(row.Job_ID),
  Job_Name_AR: row.Job_Name_AR,
  Job_Name_EN: row.Job_Name_EN,
  Position_Number: row.Position_Number === null ? null : Number(row.Position_Number)
});

const rowKey = (row) => JSON.stringify([
  row.Ref_Employee,
  row.Job_ID,
  row.Job_Name_AR,
  row.Job_Name_EN,
  row.Position_Number
]);

const multiset = (rows) => {
  const counts = new Map();
  for (const row of rows) {
    const key = rowKey(row);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
};

const compareMultisets = (sourceRows, databaseRows) => {
  const sourceCounts = multiset(sourceRows);
  const databaseCounts = multiset(databaseRows);
  if (sourceCounts.size !== databaseCounts.size) {
    throw new Error("Distinct position-row counts differ between workbook and database.");
  }
  for (const [key, count] of sourceCounts) {
    if (databaseCounts.get(key) !== count) {
      throw new Error("A position row or its duplicate count differs from the workbook.");
    }
  }
};

const main = async () => {
  const jsonArgument = process.argv[2];
  if (!jsonArgument) {
    throw new Error("Usage: node scripts/verify-position-workbook.js <workbook-dump.json>");
  }
  const payload = JSON.parse(fs.readFileSync(path.resolve(jsonArgument), "utf8"));
  if (
    payload.sheet !== "Positions" ||
    !Array.isArray(payload.headers) ||
    payload.headers.length !== EXPECTED_HEADERS.length ||
    payload.headers.some((header, index) => header !== EXPECTED_HEADERS[index]) ||
    !Array.isArray(payload.rows)
  ) {
    throw new Error("Workbook dump does not match the expected Positions sheet.");
  }
  const sourceRows = payload.rows.map(normalizeSourceRow);

  const pool = await connectWithMssql();
  try {
    const result = await pool.request().query(`
      SELECT [EmployeeId], [Job_ID], [Job_Name_AR], [Job_Name_EN], [Position_Number]
      FROM [dbo].[Position];

      SELECT
        c.column_id,
        c.name AS column_name,
        t.name AS data_type,
        c.max_length,
        c.is_nullable,
        c.is_identity,
        c.is_computed
      FROM sys.columns AS c
      JOIN sys.types AS t ON c.user_type_id = t.user_type_id
      WHERE c.object_id = OBJECT_ID(N'dbo.Position')
      ORDER BY c.column_id;

      SELECT
        COUNT_BIG(*) AS row_count,
        SUM(CASE WHEN [EmployeeId] IS NULL THEN 1 ELSE 0 END) AS null_employee_id_rows,
        SUM(CASE WHEN [EmployeeId] = 0 THEN 1 ELSE 0 END) AS vacancy_rows,
        SUM(CASE WHEN [Job_ID] IS NULL THEN 1 ELSE 0 END) AS null_job_id_rows,
        SUM(CASE WHEN [Position_Number] IS NULL THEN 1 ELSE 0 END) AS null_position_number_rows,
        SUM(CASE WHEN [PositionLevel] IS NOT NULL
                      OR [Position_Degree] IS NOT NULL
                      OR [Position_DateCreation] IS NOT NULL
                      OR [Status] IS NOT NULL
                      OR [Position_Type] IS NOT NULL
                      OR [JobId] IS NOT NULL
                 THEN 1 ELSE 0 END) AS changed_legacy_rows
      FROM [dbo].[Position];

      SELECT COUNT_BIG(*) AS foreign_key_count
      FROM sys.foreign_keys
      WHERE parent_object_id = OBJECT_ID(N'dbo.Position')
         OR referenced_object_id = OBJECT_ID(N'dbo.Position');

      SELECT
        i.name AS index_name,
        i.is_primary_key,
        i.is_unique,
        c.name AS column_name
      FROM sys.indexes AS i
      JOIN sys.index_columns AS ic
        ON ic.object_id = i.object_id
       AND ic.index_id = i.index_id
       AND ic.key_ordinal > 0
      JOIN sys.columns AS c
        ON c.object_id = ic.object_id
       AND c.column_id = ic.column_id
      WHERE i.object_id = OBJECT_ID(N'dbo.Position');
    `);

    const databaseRows = result.recordsets[0].map(normalizeDatabaseRow);
    if (databaseRows.length !== sourceRows.length) {
      throw new Error(`Expected ${sourceRows.length} rows; found ${databaseRows.length}.`);
    }
    compareMultisets(sourceRows, databaseRows);

    const schemaRows = result.recordsets[1];
    const actualColumns = schemaRows.map((column) => column.column_name);
    if (
      actualColumns.length !== EXPECTED_DATABASE_COLUMNS.length ||
      actualColumns.some((column, index) => column !== EXPECTED_DATABASE_COLUMNS[index])
    ) {
      throw new Error(
        `Unexpected dbo.Position schema. Found: ${actualColumns.join(", ")}.`
      );
    }
    const expectedNewDefinitions = {
      EmployeeId: { type: "int", maxLength: 4, nullable: true },
      Job_ID: { type: "int", maxLength: 4, nullable: true },
      Job_Name_AR: { type: "nvarchar", maxLength: -1, nullable: false },
      Job_Name_EN: { type: "nvarchar", maxLength: -1, nullable: false }
    };
    for (const [name, expected] of Object.entries(expectedNewDefinitions)) {
      const actual = schemaRows.find((column) => column.column_name === name);
      if (
        !actual ||
        actual.data_type !== expected.type ||
        Number(actual.max_length) !== expected.maxLength ||
        Boolean(actual.is_nullable) !== expected.nullable ||
        Boolean(actual.is_identity) ||
        Boolean(actual.is_computed)
      ) {
        throw new Error(`Invalid imported column definition for dbo.Position.${name}.`);
      }
    }

    const counts = result.recordsets[2][0];
    const foreignKeyCount = Number(result.recordsets[3][0].foreign_key_count);
    const indexes = result.recordsets[4];
    const primaryKey = indexes.find((index) => Boolean(index.is_primary_key));
    const jobIdIndex = indexes.find((index) => index.index_name === "IX_HERP_Position_JobId");
    if (
      !primaryKey ||
      primaryKey.index_name !== "PK_Position" ||
      primaryKey.column_name !== "Id" ||
      !jobIdIndex ||
      jobIdIndex.column_name !== "JobId"
    ) {
      throw new Error("The existing Position primary key or JobId index was not preserved.");
    }
    if (foreignKeyCount !== 0) {
      throw new Error(`Expected zero Position foreign keys; found ${foreignKeyCount}.`);
    }
    if (Number(counts.changed_legacy_rows) !== 0) {
      throw new Error("One or more legacy Position fields were unexpectedly changed.");
    }

    console.log(JSON.stringify({
      verified: true,
      target: "dbo.Position",
      rowCount: Number(counts.row_count),
      totalColumnCount: schemaRows.length,
      importedWorkbookColumns: EXPECTED_HEADERS,
      nullEmployeeIdRows: Number(counts.null_employee_id_rows),
      vacancyRows: Number(counts.vacancy_rows),
      nullJobIdRows: Number(counts.null_job_id_rows),
      nullPositionNumberRows: Number(counts.null_position_number_rows),
      changedLegacyRows: Number(counts.changed_legacy_rows),
      foreignKeyCount,
      primaryKey: "PK_Position (Id)",
      preservedIndex: "IX_HERP_Position_JobId (JobId)",
      message: "Committed Position rows and duplicate counts match the workbook exactly."
    }, null, 2));
  } finally {
    await pool.close();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
