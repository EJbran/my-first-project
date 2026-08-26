require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { connectWithMssql } = require("../src/config/database");

const EXPECTED_COLUMNS = [
  "Job_ID",
  "Job_Name_AR",
  "Job_Name_EN",
  "Job_Family",
  "Career_Level",
  "Role_Criticality",
  "Role_Purpose",
  "Key_Accountabilities",
  "Typical_Deliverables",
  "Minimum_Education_Benchmark",
  "Preferred_Qualifications",
  "Minimum_Experience_Benchmark",
  "Technical_Competencies",
  "Behavioral_Competencies",
  "HSE_Process_Safety_Accountabilities",
  "Mandatory_Training_Licences_Benchmark",
  "Applicable_Standards_Procedures",
  "Decision_Authority",
  "Supervisory_Scope",
  "Key_Interfaces",
  "Work_Environment_and_Schedule",
  "Physical_Medical_Fitness",
  "Competency_Assurance_Method",
  "KPI_Benchmark",
  "Required_Languages",
  "Language_Level_CEFR",
  "Job_Type",
  "Profile_Validation_Owner"
];

const main = async () => {
  const jsonArgument = process.argv[2];
  if (!jsonArgument) {
    throw new Error("Usage: node scripts/verify-jobs-full-table.js <workbook-dump.json>");
  }
  const payload = JSON.parse(fs.readFileSync(path.resolve(jsonArgument), "utf8"));
  if (
    payload.sheet !== "Enterprise Job Profiles" ||
    !Array.isArray(payload.headers) ||
    payload.headers.length !== EXPECTED_COLUMNS.length ||
    payload.headers.some((column, index) => column !== EXPECTED_COLUMNS[index]) ||
    !Array.isArray(payload.rows)
  ) {
    throw new Error("The workbook dump does not match the expected source sheet and schema.");
  }

  const pool = await connectWithMssql();
  try {
    const selectedColumns = EXPECTED_COLUMNS.map((column) => `[${column}]`).join(", ");
    const result = await pool.request().query(`
      SELECT ${selectedColumns}
      FROM [dbo].[jobs]
      ORDER BY [Job_ID];

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
      WHERE c.object_id = OBJECT_ID(N'dbo.jobs')
      ORDER BY c.column_id;

      SELECT COUNT_BIG(*) AS foreign_key_count
      FROM sys.foreign_keys
      WHERE parent_object_id = OBJECT_ID(N'dbo.jobs')
         OR referenced_object_id = OBJECT_ID(N'dbo.jobs');

      SELECT
        kc.name AS constraint_name,
        c.name AS column_name
      FROM sys.key_constraints AS kc
      JOIN sys.index_columns AS ic
        ON ic.object_id = kc.parent_object_id
       AND ic.index_id = kc.unique_index_id
       AND ic.key_ordinal > 0
      JOIN sys.columns AS c
        ON c.object_id = ic.object_id
       AND c.column_id = ic.column_id
      WHERE kc.parent_object_id = OBJECT_ID(N'dbo.jobs')
        AND kc.type = 'PK'
      ORDER BY ic.key_ordinal;
    `);

    const databaseRows = result.recordsets[0];
    const sourceRows = [...payload.rows].sort((left, right) => Number(left.Job_ID) - Number(right.Job_ID));
    if (databaseRows.length !== sourceRows.length) {
      throw new Error(`Expected ${sourceRows.length} rows; found ${databaseRows.length}.`);
    }
    for (let rowIndex = 0; rowIndex < sourceRows.length; rowIndex += 1) {
      for (const column of EXPECTED_COLUMNS) {
        const expected = column === "Job_ID"
          ? Number(sourceRows[rowIndex][column])
          : String(sourceRows[rowIndex][column]);
        if (databaseRows[rowIndex][column] !== expected) {
          throw new Error(
            `Mismatch at Job_ID ${sourceRows[rowIndex].Job_ID}, column ${column}.`
          );
        }
      }
    }

    const schemaRows = result.recordsets[1];
    if (
      schemaRows.length !== EXPECTED_COLUMNS.length ||
      schemaRows.some((column, index) => column.column_name !== EXPECTED_COLUMNS[index])
    ) {
      throw new Error("dbo.jobs column names or order do not match the workbook.");
    }
    for (let index = 0; index < schemaRows.length; index += 1) {
      const column = schemaRows[index];
      const isId = index === 0;
      if (
        column.data_type !== (isId ? "int" : "nvarchar") ||
        Number(column.max_length) !== (isId ? 4 : -1) ||
        Boolean(column.is_nullable) ||
        Boolean(column.is_identity) ||
        Boolean(column.is_computed)
      ) {
        throw new Error(`Invalid SQL definition for ${column.column_name}.`);
      }
    }
    const foreignKeyCount = Number(result.recordsets[2][0].foreign_key_count);
    const primaryKeyRows = result.recordsets[3];
    if (foreignKeyCount !== 0) {
      throw new Error(`Expected zero foreign keys; found ${foreignKeyCount}.`);
    }
    if (
      primaryKeyRows.length !== 1 ||
      primaryKeyRows[0].constraint_name !== "PK_jobs" ||
      primaryKeyRows[0].column_name !== "Job_ID"
    ) {
      throw new Error("PK_jobs (Job_ID) verification failed.");
    }

    console.log(JSON.stringify({
      verified: true,
      target: "dbo.jobs",
      rowCount: databaseRows.length,
      columnCount: schemaRows.length,
      minId: databaseRows[0]?.Job_ID ?? null,
      maxId: databaseRows.at(-1)?.Job_ID ?? null,
      foreignKeyCount,
      primaryKey: "PK_jobs (Job_ID)",
      firstJob: {
        Job_ID: databaseRows[0]?.Job_ID ?? null,
        Job_Name_AR: databaseRows[0]?.Job_Name_AR ?? null,
        Job_Name_EN: databaseRows[0]?.Job_Name_EN ?? null
      },
      lastJob: {
        Job_ID: databaseRows.at(-1)?.Job_ID ?? null,
        Job_Name_AR: databaseRows.at(-1)?.Job_Name_AR ?? null,
        Job_Name_EN: databaseRows.at(-1)?.Job_Name_EN ?? null
      },
      message: "Every persisted database value matches the workbook dump."
    }, null, 2));
  } finally {
    await pool.close();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
