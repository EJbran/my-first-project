require("dotenv").config();

const fs = require("fs");
const path = require("path");
const sql = require("mssql");
const { connectWithMssql } = require("../src/config/database");

const SOURCE_COLUMNS = [
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

const PHYSICAL_COLUMNS = [
  { source: "Job_ID", target: "Id", ddl: "INT NOT NULL", type: sql.Int, nullable: false },
  { source: "Job_Name_AR", target: "Job_Name_AR", ddl: "NVARCHAR(300) NOT NULL", type: sql.NVarChar(300), nullable: false },
  { source: "Job_Name_EN", target: "Job_Name_EN", ddl: "NVARCHAR(300) NOT NULL", type: sql.NVarChar(300), nullable: false },
  { source: "Job_Family", target: "Job_Family", ddl: "NVARCHAR(200) NULL", type: sql.NVarChar(200), nullable: true },
  { source: "Career_Level", target: "Career_Level", ddl: "NVARCHAR(100) NULL", type: sql.NVarChar(100), nullable: true },
  { source: "Role_Criticality", target: "Role_Criticality", ddl: "NVARCHAR(100) NULL", type: sql.NVarChar(100), nullable: true },
  { source: "Role_Purpose", target: "Role_Purpose", ddl: "NVARCHAR(MAX) NULL", type: sql.NVarChar(sql.MAX), nullable: true },
  { source: "Key_Accountabilities", target: "Key_Accountabilities", ddl: "NVARCHAR(MAX) NULL", type: sql.NVarChar(sql.MAX), nullable: true },
  { source: "Typical_Deliverables", target: "Typical_Deliverables", ddl: "NVARCHAR(MAX) NULL", type: sql.NVarChar(sql.MAX), nullable: true },
  { source: "Minimum_Education_Benchmark", target: "Minimum_Education_Benchmark", ddl: "NVARCHAR(MAX) NULL", type: sql.NVarChar(sql.MAX), nullable: true },
  { source: "Preferred_Qualifications", target: "Preferred_Qualifications", ddl: "NVARCHAR(MAX) NULL", type: sql.NVarChar(sql.MAX), nullable: true },
  { source: "Minimum_Experience_Benchmark", target: "Minimum_Experience_Benchmark", ddl: "NVARCHAR(MAX) NULL", type: sql.NVarChar(sql.MAX), nullable: true },
  { source: "Technical_Competencies", target: "Technical_Competencies", ddl: "NVARCHAR(MAX) NULL", type: sql.NVarChar(sql.MAX), nullable: true },
  { source: "Behavioral_Competencies", target: "Behavioral_Competencies", ddl: "NVARCHAR(MAX) NULL", type: sql.NVarChar(sql.MAX), nullable: true },
  { source: "HSE_Process_Safety_Accountabilities", target: "HSE_Process_Safety_Accountabilities", ddl: "NVARCHAR(MAX) NULL", type: sql.NVarChar(sql.MAX), nullable: true },
  { source: "Mandatory_Training_Licences_Benchmark", target: "Mandatory_Training_Licences_Benchmark", ddl: "NVARCHAR(MAX) NULL", type: sql.NVarChar(sql.MAX), nullable: true },
  { source: "Applicable_Standards_Procedures", target: "Applicable_Standards_Procedures", ddl: "NVARCHAR(MAX) NULL", type: sql.NVarChar(sql.MAX), nullable: true },
  { source: "Decision_Authority", target: "Decision_Authority", ddl: "NVARCHAR(MAX) NULL", type: sql.NVarChar(sql.MAX), nullable: true },
  { source: "Supervisory_Scope", target: "Supervisory_Scope", ddl: "NVARCHAR(MAX) NULL", type: sql.NVarChar(sql.MAX), nullable: true },
  { source: "Key_Interfaces", target: "Key_Interfaces", ddl: "NVARCHAR(MAX) NULL", type: sql.NVarChar(sql.MAX), nullable: true },
  { source: "Work_Environment_and_Schedule", target: "Work_Environment_and_Schedule", ddl: "NVARCHAR(MAX) NULL", type: sql.NVarChar(sql.MAX), nullable: true },
  { source: "Physical_Medical_Fitness", target: "Physical_Medical_Fitness", ddl: "NVARCHAR(MAX) NULL", type: sql.NVarChar(sql.MAX), nullable: true },
  { source: "Competency_Assurance_Method", target: "Competency_Assurance_Method", ddl: "NVARCHAR(MAX) NULL", type: sql.NVarChar(sql.MAX), nullable: true },
  { source: "KPI_Benchmark", target: "KPI_Benchmark", ddl: "NVARCHAR(MAX) NULL", type: sql.NVarChar(sql.MAX), nullable: true },
  { source: "Required_Languages", target: "Required_Languages", ddl: "NVARCHAR(300) NULL", type: sql.NVarChar(300), nullable: true },
  { source: "Language_Level_CEFR", target: "Language_Level_CEFR", ddl: "NVARCHAR(300) NULL", type: sql.NVarChar(300), nullable: true },
  { source: "Job_Type", target: "Job_Type", ddl: "NVARCHAR(200) NULL", type: sql.NVarChar(200), nullable: true },
  { source: "Profile_Validation_Owner", target: "Profile_Validation_Owner", ddl: "NVARCHAR(500) NULL", type: sql.NVarChar(500), nullable: true }
];

const COMPATIBILITY_COLUMNS = [
  "[Job_Name] AS (CONVERT(NVARCHAR(300), [Job_Name_AR]))",
  "[Job_Name_en] AS (CONVERT(NVARCHAR(300), [Job_Name_EN]))",
  "[RequiredLanguages] AS (CONVERT(NVARCHAR(300), [Required_Languages]))",
  "[Language_Level] AS (CONVERT(NVARCHAR(300), [Language_Level_CEFR]))"
];

const textValue = (value) => {
  if (value === null || value === undefined) return null;
  const valueAsText = String(value).trim();
  return valueAsText || null;
};

const loadAndValidateRows = (jsonPath) => {
  const payload = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const headers = Array.isArray(payload.headers) ? payload.headers : [];
  const rows = Array.isArray(payload.rows) ? payload.rows : [];

  const missingHeaders = SOURCE_COLUMNS.filter((column) => !headers.includes(column));
  const unexpectedHeaders = headers.filter((column) => !SOURCE_COLUMNS.includes(column));
  if (missingHeaders.length > 0 || unexpectedHeaders.length > 0) {
    throw new Error(
      `Workbook columns do not match the import contract. Missing: ${missingHeaders.join(", ") || "none"}. ` +
      `Unexpected: ${unexpectedHeaders.join(", ") || "none"}.`
    );
  }
  if (rows.length === 0) {
    throw new Error("The workbook contains no job rows.");
  }

  const seenIds = new Set();
  const seenArabicNames = new Set();
  const duplicateEnglishNames = new Map();
  const normalizedRows = rows.map((row, index) => {
    const rowNumber = index + 2;
    const id = Number(row.Job_ID);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error(`Invalid Job_ID at workbook row ${rowNumber}: ${row.Job_ID}`);
    }
    if (seenIds.has(id)) {
      throw new Error(`Duplicate Job_ID ${id} at workbook row ${rowNumber}.`);
    }
    seenIds.add(id);

    const normalized = { Job_ID: id };
    for (const column of SOURCE_COLUMNS.slice(1)) {
      normalized[column] = textValue(row[column]);
      if (normalized[column] === null) {
        throw new Error(`Blank ${column} at workbook row ${rowNumber}.`);
      }
    }

    const arabicKey = normalized.Job_Name_AR.normalize("NFKC").toLocaleLowerCase("ar");
    if (seenArabicNames.has(arabicKey)) {
      throw new Error(`Duplicate Arabic job name at workbook row ${rowNumber}: ${normalized.Job_Name_AR}`);
    }
    seenArabicNames.add(arabicKey);

    const englishKey = normalized.Job_Name_EN.normalize("NFKC").toLocaleLowerCase("en-US");
    duplicateEnglishNames.set(englishKey, (duplicateEnglishNames.get(englishKey) || 0) + 1);
    return normalized;
  });

  return {
    rows: normalizedRows,
    stats: {
      rowCount: normalizedRows.length,
      minId: Math.min(...seenIds),
      maxId: Math.max(...seenIds),
      duplicateEnglishTitleGroups: [...duplicateEnglishNames.values()].filter((count) => count > 1).length
    }
  };
};

const inspectJobTable = async (request) => {
  const result = await request.query(`
    SELECT
      c.column_id,
      c.name AS column_name,
      t.name AS data_type,
      c.is_nullable,
      c.is_identity,
      c.is_computed
    FROM sys.columns AS c
    JOIN sys.types AS t ON c.user_type_id = t.user_type_id
    WHERE c.object_id = OBJECT_ID(N'dbo.Job')
    ORDER BY c.column_id;

    SELECT COUNT_BIG(*) AS row_count FROM dbo.Job;

    SELECT
      fk.name AS foreign_key_name,
      OBJECT_SCHEMA_NAME(fk.parent_object_id) AS parent_schema,
      OBJECT_NAME(fk.parent_object_id) AS parent_table
    FROM sys.foreign_keys AS fk
    WHERE fk.referenced_object_id = OBJECT_ID(N'dbo.Job');

    SELECT name FROM sys.triggers WHERE parent_id = OBJECT_ID(N'dbo.Job') AND is_disabled = 0;
  `);
  return {
    columns: result.recordsets[0],
    rowCount: Number(result.recordsets[1][0].row_count),
    referencingForeignKeys: result.recordsets[2],
    enabledTriggers: result.recordsets[3]
  };
};

const inspectLegacyReferences = async (request, sourceRows) => {
  const result = await request.query(`
    SELECT TRY_CONVERT(INT, [Job_Id]) AS job_id, COUNT_BIG(*) AS reference_count
    FROM [dbo].[Employee]
    WHERE TRY_CONVERT(INT, [Job_Id]) IS NOT NULL
    GROUP BY TRY_CONVERT(INT, [Job_Id]);

    SELECT TRY_CONVERT(INT, [JobId]) AS job_id, COUNT_BIG(*) AS reference_count
    FROM [dbo].[Position]
    WHERE TRY_CONVERT(INT, [JobId]) IS NOT NULL
    GROUP BY TRY_CONVERT(INT, [JobId]);
  `);
  const sourceIds = new Set(sourceRows.map((row) => row.Job_ID));
  const summarize = (rows) => {
    const overlaps = rows
      .map((row) => ({ jobId: Number(row.job_id), references: Number(row.reference_count) }))
      .filter((row) => sourceIds.has(row.jobId));
    return {
      overlappingIds: overlaps.length,
      overlappingRows: overlaps.reduce((sum, row) => sum + row.references, 0),
      examples: overlaps.slice(0, 10)
    };
  };
  return {
    employees: summarize(result.recordsets[0]),
    positions: summarize(result.recordsets[1])
  };
};

const assertResetTable = (inspection) => {
  if (inspection.columns.length === 0) {
    throw new Error("dbo.Job does not exist.");
  }
  if (inspection.rowCount !== 0) {
    throw new Error(`dbo.Job must be empty before this one-time rebuild; found ${inspection.rowCount} rows.`);
  }
  if (inspection.columns.length !== 1) {
    throw new Error(
      `dbo.Job must contain only Id before this one-time rebuild; found columns: ` +
      inspection.columns.map((column) => column.column_name).join(", ")
    );
  }
  const idColumn = inspection.columns[0];
  if (
    idColumn.column_name !== "Id" ||
    idColumn.data_type !== "int" ||
    Boolean(idColumn.is_nullable) ||
    Boolean(idColumn.is_identity) ||
    Boolean(idColumn.is_computed)
  ) {
    throw new Error("dbo.Job.Id must be a non-null, non-identity, non-computed INT column.");
  }
  if (inspection.referencingForeignKeys.length > 0) {
    throw new Error(
      `dbo.Job is still referenced by foreign keys: ` +
      inspection.referencingForeignKeys.map((foreignKey) => foreignKey.foreign_key_name).join(", ")
    );
  }
  if (inspection.enabledTriggers.length > 0) {
    throw new Error(
      `dbo.Job has enabled triggers that could change the import: ` +
      inspection.enabledTriggers.map((trigger) => trigger.name).join(", ")
    );
  }
};

const buildSchemaSql = () => {
  const addedPhysicalColumns = PHYSICAL_COLUMNS.slice(1)
    .map((column) => `[${column.target}] ${column.ddl}`)
    .join(",\n      ");
  return `
    ALTER TABLE [dbo].[Job]
      ADD ${addedPhysicalColumns};

    ALTER TABLE [dbo].[Job]
      ADD ${COMPATIBILITY_COLUMNS.join(",\n      ")};

    ALTER TABLE [dbo].[Job]
      ADD CONSTRAINT [PK_Job] PRIMARY KEY CLUSTERED ([Id]);
  `;
};

const createBulkTable = (rows) => {
  const table = new sql.Table("dbo.Job");
  table.create = false;
  for (const column of PHYSICAL_COLUMNS) {
    table.columns.add(column.target, column.type, { nullable: column.nullable });
  }
  for (const row of rows) {
    table.rows.add(...PHYSICAL_COLUMNS.map((column) => row[column.source]));
  }
  return table;
};

const compareImportedRows = (sourceRows, databaseRows) => {
  if (databaseRows.length !== sourceRows.length) {
    throw new Error(`Row-count verification failed: expected ${sourceRows.length}, found ${databaseRows.length}.`);
  }
  for (let index = 0; index < sourceRows.length; index += 1) {
    const source = sourceRows[index];
    const database = databaseRows[index];
    for (const column of PHYSICAL_COLUMNS) {
      const expected = column.source === "Job_ID" ? source.Job_ID : source[column.source];
      const actual = database[column.target];
      if (actual !== expected) {
        throw new Error(
          `Verification failed for Job_ID ${source.Job_ID}, column ${column.target}.`
        );
      }
    }
  }
};

const main = async () => {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const acknowledgeEmployeeIdOverlap = args.includes("--acknowledge-employee-id-overlap");
  const knownFlags = new Set(["--apply", "--acknowledge-employee-id-overlap"]);
  const jsonArgument = args.find((argument) => !knownFlags.has(argument));
  if (!jsonArgument) {
    throw new Error(
      "Usage: node scripts/import-job-profiles.js <workbook-dump.json> " +
      "[--apply] [--acknowledge-employee-id-overlap]"
    );
  }

  const jsonPath = path.resolve(jsonArgument);
  const { rows, stats } = loadAndValidateRows(jsonPath);
  const pool = await connectWithMssql();
  try {
    const initialInspection = await inspectJobTable(pool.request());
    assertResetTable(initialInspection);
    const initialLegacyReferences = await inspectLegacyReferences(pool.request(), rows);

    if (!apply) {
      console.log(JSON.stringify({
        mode: "dry-run",
        source: path.basename(jsonPath),
        ...stats,
        currentTable: {
          rowCount: initialInspection.rowCount,
          columns: initialInspection.columns.map((column) => column.column_name),
          referencingForeignKeys: initialInspection.referencingForeignKeys.length
        },
        plannedSchema: {
          sourceColumns: SOURCE_COLUMNS.length,
          physicalDatabaseColumns: PHYSICAL_COLUMNS.length,
          compatibilityColumns: COMPATIBILITY_COLUMNS.length,
          primaryKey: "PK_Job (Id)"
        },
        legacyReferenceRisk: initialLegacyReferences,
        message: "Validation passed. No database changes were made."
      }, null, 2));
      return;
    }

    const transaction = new sql.Transaction(pool);
    let transactionStarted = false;
    try {
      await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
      transactionStarted = true;

      const lockedRequest = new sql.Request(transaction);
      await lockedRequest.query("SELECT COUNT_BIG(*) AS row_count FROM [dbo].[Job] WITH (TABLOCKX, HOLDLOCK);");
      const transactionInspection = await inspectJobTable(new sql.Request(transaction));
      assertResetTable(transactionInspection);
      const transactionLegacyReferences = await inspectLegacyReferences(
        new sql.Request(transaction),
        rows
      );
      const overlappingEmployeeRows = transactionLegacyReferences.employees.overlappingRows;
      const overlappingPositionRows = transactionLegacyReferences.positions.overlappingRows;
      if (
        (overlappingEmployeeRows > 0 || overlappingPositionRows > 0) &&
        !acknowledgeEmployeeIdOverlap
      ) {
        throw new Error(
          `Import stopped: ${overlappingEmployeeRows} employee rows and ` +
          `${overlappingPositionRows} position rows contain IDs used by this workbook. ` +
          "The application would join them to the new jobs. Resolve those legacy IDs or rerun only " +
          "after explicitly acknowledging the overlap."
        );
      }

      await new sql.Request(transaction).batch(buildSchemaSql());
      await new sql.Request(transaction).bulk(createBulkTable(rows));

      const selectColumns = PHYSICAL_COLUMNS.map((column) => `[${column.target}]`).join(", ");
      const verification = await new sql.Request(transaction).query(`
        SELECT ${selectColumns}
        FROM [dbo].[Job]
        ORDER BY [Id];
      `);
      compareImportedRows(rows, verification.recordset);

      const compatibilityVerification = await new sql.Request(transaction).query(`
        SELECT COUNT_BIG(*) AS invalid_compatibility_rows
        FROM [dbo].[Job]
        WHERE [Job_Name] <> [Job_Name_AR]
           OR [Job_Name_en] <> [Job_Name_EN]
           OR [RequiredLanguages] <> [Required_Languages]
           OR [Language_Level] <> [Language_Level_CEFR];
      `);
      const invalidCompatibilityRows = Number(
        compatibilityVerification.recordset[0].invalid_compatibility_rows
      );
      if (invalidCompatibilityRows !== 0) {
        throw new Error(`Compatibility-column verification failed for ${invalidCompatibilityRows} rows.`);
      }

      await transaction.commit();
      transactionStarted = false;
      console.log(JSON.stringify({
        mode: "applied",
        insertedRows: rows.length,
        minId: stats.minId,
        maxId: stats.maxId,
        sourceColumns: SOURCE_COLUMNS.length,
        compatibilityColumns: COMPATIBILITY_COLUMNS.length,
        message: "dbo.Job was rebuilt and every imported value was verified before commit."
      }, null, 2));
    } catch (error) {
      if (transactionStarted) {
        await transaction.rollback();
      }
      throw error;
    }
  } finally {
    await pool.close();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
