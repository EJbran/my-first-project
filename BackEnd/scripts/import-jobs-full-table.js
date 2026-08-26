require("dotenv").config();

const fs = require("fs");
const path = require("path");
const sql = require("mssql");
const { connectWithMssql } = require("../src/config/database");

const TARGET_SCHEMA = "dbo";
const TARGET_TABLE = "jobs";
const TARGET_OBJECT = `${TARGET_SCHEMA}.${TARGET_TABLE}`;

const COLUMNS = [
  { name: "Job_ID", type: sql.Int, ddl: "INT NOT NULL" },
  { name: "Job_Name_AR", type: sql.NVarChar(sql.MAX), ddl: "NVARCHAR(MAX) NOT NULL" },
  { name: "Job_Name_EN", type: sql.NVarChar(sql.MAX), ddl: "NVARCHAR(MAX) NOT NULL" },
  { name: "Job_Family", type: sql.NVarChar(sql.MAX), ddl: "NVARCHAR(MAX) NOT NULL" },
  { name: "Career_Level", type: sql.NVarChar(sql.MAX), ddl: "NVARCHAR(MAX) NOT NULL" },
  { name: "Role_Criticality", type: sql.NVarChar(sql.MAX), ddl: "NVARCHAR(MAX) NOT NULL" },
  { name: "Role_Purpose", type: sql.NVarChar(sql.MAX), ddl: "NVARCHAR(MAX) NOT NULL" },
  { name: "Key_Accountabilities", type: sql.NVarChar(sql.MAX), ddl: "NVARCHAR(MAX) NOT NULL" },
  { name: "Typical_Deliverables", type: sql.NVarChar(sql.MAX), ddl: "NVARCHAR(MAX) NOT NULL" },
  { name: "Minimum_Education_Benchmark", type: sql.NVarChar(sql.MAX), ddl: "NVARCHAR(MAX) NOT NULL" },
  { name: "Preferred_Qualifications", type: sql.NVarChar(sql.MAX), ddl: "NVARCHAR(MAX) NOT NULL" },
  { name: "Minimum_Experience_Benchmark", type: sql.NVarChar(sql.MAX), ddl: "NVARCHAR(MAX) NOT NULL" },
  { name: "Technical_Competencies", type: sql.NVarChar(sql.MAX), ddl: "NVARCHAR(MAX) NOT NULL" },
  { name: "Behavioral_Competencies", type: sql.NVarChar(sql.MAX), ddl: "NVARCHAR(MAX) NOT NULL" },
  { name: "HSE_Process_Safety_Accountabilities", type: sql.NVarChar(sql.MAX), ddl: "NVARCHAR(MAX) NOT NULL" },
  { name: "Mandatory_Training_Licences_Benchmark", type: sql.NVarChar(sql.MAX), ddl: "NVARCHAR(MAX) NOT NULL" },
  { name: "Applicable_Standards_Procedures", type: sql.NVarChar(sql.MAX), ddl: "NVARCHAR(MAX) NOT NULL" },
  { name: "Decision_Authority", type: sql.NVarChar(sql.MAX), ddl: "NVARCHAR(MAX) NOT NULL" },
  { name: "Supervisory_Scope", type: sql.NVarChar(sql.MAX), ddl: "NVARCHAR(MAX) NOT NULL" },
  { name: "Key_Interfaces", type: sql.NVarChar(sql.MAX), ddl: "NVARCHAR(MAX) NOT NULL" },
  { name: "Work_Environment_and_Schedule", type: sql.NVarChar(sql.MAX), ddl: "NVARCHAR(MAX) NOT NULL" },
  { name: "Physical_Medical_Fitness", type: sql.NVarChar(sql.MAX), ddl: "NVARCHAR(MAX) NOT NULL" },
  { name: "Competency_Assurance_Method", type: sql.NVarChar(sql.MAX), ddl: "NVARCHAR(MAX) NOT NULL" },
  { name: "KPI_Benchmark", type: sql.NVarChar(sql.MAX), ddl: "NVARCHAR(MAX) NOT NULL" },
  { name: "Required_Languages", type: sql.NVarChar(sql.MAX), ddl: "NVARCHAR(MAX) NOT NULL" },
  { name: "Language_Level_CEFR", type: sql.NVarChar(sql.MAX), ddl: "NVARCHAR(MAX) NOT NULL" },
  { name: "Job_Type", type: sql.NVarChar(sql.MAX), ddl: "NVARCHAR(MAX) NOT NULL" },
  { name: "Profile_Validation_Owner", type: sql.NVarChar(sql.MAX), ddl: "NVARCHAR(MAX) NOT NULL" }
];

const loadAndValidateWorkbookDump = (jsonPath) => {
  const payload = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const headers = Array.isArray(payload.headers) ? payload.headers : [];
  const rawRows = Array.isArray(payload.rows) ? payload.rows : [];
  const expectedHeaders = COLUMNS.map((column) => column.name);

  if (payload.sheet !== "Enterprise Job Profiles") {
    throw new Error(
      `Expected sheet Enterprise Job Profiles; found ${payload.sheet || "an unnamed sheet"}.`
    );
  }

  if (
    headers.length !== expectedHeaders.length ||
    headers.some((header, index) => header !== expectedHeaders[index])
  ) {
    throw new Error(
      `Workbook columns or order differ from the expected 28-column schema. ` +
      `Expected: ${expectedHeaders.join(", ")}. Found: ${headers.join(", ")}.`
    );
  }
  if (rawRows.length === 0) {
    throw new Error("The workbook sheet contains no data rows.");
  }

  const ids = new Set();
  const rows = rawRows.map((rawRow, index) => {
    const workbookRow = index + 2;
    const row = {};
    for (const column of COLUMNS) {
      const value = rawRow[column.name];
      if (column.name === "Job_ID") {
        const id = Number(value);
        if (!Number.isSafeInteger(id) || id <= 0) {
          throw new Error(`Invalid Job_ID at workbook row ${workbookRow}: ${value}`);
        }
        if (ids.has(id)) {
          throw new Error(`Duplicate Job_ID ${id} at workbook row ${workbookRow}.`);
        }
        ids.add(id);
        row[column.name] = id;
      } else {
        if (value === null || value === undefined || String(value).trim() === "") {
          throw new Error(`Blank ${column.name} at workbook row ${workbookRow}.`);
        }
        row[column.name] = String(value);
      }
    }
    return row;
  });

  return {
    rows,
    stats: {
      sheet: payload.sheet,
      rowCount: rows.length,
      columnCount: COLUMNS.length,
      minId: Math.min(...ids),
      maxId: Math.max(...ids)
    }
  };
};

const inspectTarget = async (request) => {
  const result = await request.query(`
    SELECT
      o.name,
      o.type,
      o.type_desc
    FROM sys.objects AS o
    WHERE o.schema_id = SCHEMA_ID(N'${TARGET_SCHEMA}')
      AND o.name = N'${TARGET_TABLE}';

    SELECT
      s.name,
      s.base_object_name
    FROM sys.synonyms AS s
    WHERE s.schema_id = SCHEMA_ID(N'${TARGET_SCHEMA}')
      AND s.name = N'${TARGET_TABLE}';
  `);
  return {
    objects: result.recordsets[0],
    synonyms: result.recordsets[1]
  };
};

const assertTargetDoesNotExist = (inspection) => {
  if (inspection.objects.length > 0 || inspection.synonyms.length > 0) {
    const descriptions = [
      ...inspection.objects.map((item) => `${item.type_desc} ${TARGET_OBJECT}`),
      ...inspection.synonyms.map((item) => `SYNONYM ${TARGET_OBJECT} -> ${item.base_object_name}`)
    ];
    throw new Error(`Target name is already in use: ${descriptions.join(", ")}.`);
  }
};

const createTableSql = () => `
  CREATE TABLE [${TARGET_SCHEMA}].[${TARGET_TABLE}] (
    ${COLUMNS.map((column) => `[${column.name}] ${column.ddl}`).join(",\n    ")},
    CONSTRAINT [PK_jobs] PRIMARY KEY CLUSTERED ([Job_ID])
  );
`;

const createBulkTable = (rows) => {
  const table = new sql.Table(TARGET_OBJECT);
  table.create = false;
  for (const column of COLUMNS) {
    table.columns.add(column.name, column.type, { nullable: false });
  }
  for (const row of rows) {
    table.rows.add(...COLUMNS.map((column) => row[column.name]));
  }
  return table;
};

const compareEveryValue = (sourceRows, databaseRows) => {
  const orderedSourceRows = [...sourceRows].sort((left, right) => left.Job_ID - right.Job_ID);
  if (databaseRows.length !== orderedSourceRows.length) {
    throw new Error(
      `Row-count verification failed: expected ${orderedSourceRows.length}, found ${databaseRows.length}.`
    );
  }
  for (let rowIndex = 0; rowIndex < orderedSourceRows.length; rowIndex += 1) {
    const source = orderedSourceRows[rowIndex];
    const database = databaseRows[rowIndex];
    for (const column of COLUMNS) {
      if (database[column.name] !== source[column.name]) {
        throw new Error(
          `Value verification failed at Job_ID ${source.Job_ID}, column ${column.name}.`
        );
      }
    }
  }
};

const verifyCreatedTable = async (request, rows) => {
  const selectedColumns = COLUMNS.map((column) => `[${column.name}]`).join(", ");
  const result = await request.query(`
    SELECT ${selectedColumns}
    FROM [${TARGET_SCHEMA}].[${TARGET_TABLE}]
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
    WHERE c.object_id = OBJECT_ID(N'${TARGET_OBJECT}')
    ORDER BY c.column_id;

    SELECT COUNT_BIG(*) AS foreign_key_count
    FROM sys.foreign_keys
    WHERE parent_object_id = OBJECT_ID(N'${TARGET_OBJECT}')
       OR referenced_object_id = OBJECT_ID(N'${TARGET_OBJECT}');

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
    WHERE kc.parent_object_id = OBJECT_ID(N'${TARGET_OBJECT}')
      AND kc.type = 'PK'
    ORDER BY ic.key_ordinal;
  `);
  compareEveryValue(rows, result.recordsets[0]);

  const schemaRows = result.recordsets[1];
  const actualColumnNames = schemaRows.map((column) => column.column_name);
  const expectedColumnNames = COLUMNS.map((column) => column.name);
  if (
    actualColumnNames.length !== expectedColumnNames.length ||
    actualColumnNames.some((name, index) => name !== expectedColumnNames[index])
  ) {
    throw new Error(
      `Schema verification failed. Expected ${expectedColumnNames.join(", ")}; ` +
      `found ${actualColumnNames.join(", ")}.`
    );
  }
  if (schemaRows.some((column) => Boolean(column.is_nullable))) {
    throw new Error("Schema verification failed: one or more imported columns are nullable.");
  }
  for (let index = 0; index < schemaRows.length; index += 1) {
    const column = schemaRows[index];
    const isId = index === 0;
    const expectedType = isId ? "int" : "nvarchar";
    const expectedMaxLength = isId ? 4 : -1;
    if (
      column.data_type !== expectedType ||
      Number(column.max_length) !== expectedMaxLength ||
      Boolean(column.is_identity) ||
      Boolean(column.is_computed)
    ) {
      throw new Error(`Schema verification failed for column ${column.column_name}.`);
    }
  }
  const foreignKeyCount = Number(result.recordsets[2][0].foreign_key_count);
  if (foreignKeyCount !== 0) {
    throw new Error(`Isolation verification failed: dbo.jobs has ${foreignKeyCount} foreign keys.`);
  }
  const primaryKeyRows = result.recordsets[3];
  if (
    primaryKeyRows.length !== 1 ||
    primaryKeyRows[0].constraint_name !== "PK_jobs" ||
    primaryKeyRows[0].column_name !== "Job_ID"
  ) {
    throw new Error("Primary-key verification failed for PK_jobs (Job_ID).");
  }

  return {
    rowCount: result.recordsets[0].length,
    columnCount: schemaRows.length,
    foreignKeyCount
  };
};

const main = async () => {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const jsonArgument = args.find((argument) => argument !== "--apply");
  if (!jsonArgument) {
    throw new Error("Usage: node scripts/import-jobs-full-table.js <workbook-dump.json> [--apply]");
  }

  const jsonPath = path.resolve(jsonArgument);
  const { rows, stats } = loadAndValidateWorkbookDump(jsonPath);
  const pool = await connectWithMssql();
  try {
    const initialInspection = await inspectTarget(pool.request());
    assertTargetDoesNotExist(initialInspection);

    if (!apply) {
      console.log(JSON.stringify({
        mode: "dry-run",
        target: TARGET_OBJECT,
        ...stats,
        primaryKey: "PK_jobs (Job_ID)",
        identityColumn: false,
        foreignKeys: 0,
        message: "Workbook and target validation passed. No database changes were made."
      }, null, 2));
      return;
    }

    const transaction = new sql.Transaction(pool);
    let transactionStarted = false;
    try {
      await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
      transactionStarted = true;

      const lockResult = await new sql.Request(transaction).query(`
        DECLARE @lock_result INT;
        EXEC @lock_result = sys.sp_getapplock
          @Resource = N'HERP:dbo.jobs:create',
          @LockMode = N'Exclusive',
          @LockOwner = N'Transaction',
          @LockTimeout = 15000;
        SELECT @lock_result AS lock_result;
      `);
      if (Number(lockResult.recordset[0].lock_result) < 0) {
        throw new Error("Could not obtain the database lock needed to create dbo.jobs safely.");
      }

      const transactionInspection = await inspectTarget(new sql.Request(transaction));
      assertTargetDoesNotExist(transactionInspection);

      await new sql.Request(transaction).batch(createTableSql());
      await new sql.Request(transaction).bulk(createBulkTable(rows));
      const verification = await verifyCreatedTable(new sql.Request(transaction), rows);

      await transaction.commit();
      transactionStarted = false;
      console.log(JSON.stringify({
        mode: "applied",
        target: TARGET_OBJECT,
        ...stats,
        verification,
        message: "dbo.jobs was created, imported, and verified cell-for-cell before commit."
      }, null, 2));
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
  } finally {
    await pool.close();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
