require("dotenv").config();

const fs = require("fs");
const path = require("path");
const sql = require("mssql");
const { connectWithMssql } = require("../src/config/database");

const TARGET_OBJECT = "dbo.Position";
const WORKBOOK_COLUMNS = [
  "Ref_Employee",
  "Job_ID",
  "Job_Name_AR",
  "Job_Name_EN",
  "Position_Number"
];

const REQUIRED_DATABASE_COLUMNS = {
  Position_Number: { type: "bigint", nullable: true },
  EmployeeId: { type: "int", nullable: true },
  Job_ID: { type: "int", nullable: true },
  Job_Name_AR: { type: "nvarchar", nullable: false, maxLength: -1 },
  Job_Name_EN: { type: "nvarchar", nullable: false, maxLength: -1 }
};

const literalNull = (value) =>
  value === null ||
  value === undefined ||
  (typeof value === "string" && value.trim().toLocaleUpperCase("en-US") === "NULL");

const nullableInteger = (value, column, workbookRow, { min, max }) => {
  if (literalNull(value)) return null;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) {
    throw new Error(`Invalid ${column} at workbook row ${workbookRow}: ${value}`);
  }
  return number;
};

const requiredText = (value, column, workbookRow) => {
  if (value === null || value === undefined || String(value).trim() === "") {
    throw new Error(`Blank ${column} at workbook row ${workbookRow}.`);
  }
  return String(value);
};

const canonicalRow = (row) => JSON.stringify([
  row.Ref_Employee,
  row.Job_ID,
  row.Job_Name_AR,
  row.Job_Name_EN,
  row.Position_Number
]);

const multiset = (rows) => {
  const counts = new Map();
  for (const row of rows) {
    const key = canonicalRow(row);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
};

const loadAndValidateWorkbookDump = (jsonPath) => {
  const payload = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const headers = Array.isArray(payload.headers) ? payload.headers : [];
  const rawRows = Array.isArray(payload.rows) ? payload.rows : [];

  if (payload.sheet !== "Positions") {
    throw new Error(`Expected sheet Positions; found ${payload.sheet || "an unnamed sheet"}.`);
  }
  if (
    headers.length !== WORKBOOK_COLUMNS.length ||
    headers.some((header, index) => header !== WORKBOOK_COLUMNS[index])
  ) {
    throw new Error(
      `Workbook columns or order changed. Expected ${WORKBOOK_COLUMNS.join(", ")}; ` +
      `found ${headers.join(", ")}.`
    );
  }
  if (rawRows.length === 0) {
    throw new Error("The Positions sheet contains no data rows.");
  }

  const rows = rawRows.map((rawRow, index) => {
    const workbookRow = index + 2;
    return {
      Ref_Employee: nullableInteger(rawRow.Ref_Employee, "Ref_Employee", workbookRow, {
        min: 0,
        max: 2147483647
      }),
      Job_ID: nullableInteger(rawRow.Job_ID, "Job_ID", workbookRow, {
        min: 1,
        max: 2147483647
      }),
      Job_Name_AR: requiredText(rawRow.Job_Name_AR, "Job_Name_AR", workbookRow),
      Job_Name_EN: requiredText(rawRow.Job_Name_EN, "Job_Name_EN", workbookRow),
      Position_Number: nullableInteger(
        rawRow.Position_Number,
        "Position_Number",
        workbookRow,
        { min: -9007199254740991, max: 9007199254740991 }
      )
    };
  });

  const rowCounts = multiset(rows);
  const exactDuplicateGroups = [...rowCounts.values()].filter((count) => count > 1);
  const jobIds = rows.filter((row) => row.Job_ID !== null).map((row) => row.Job_ID);

  return {
    rows,
    stats: {
      sheet: payload.sheet,
      rowCount: rows.length,
      columnCount: WORKBOOK_COLUMNS.length,
      nullRefEmployeeRows: rows.filter((row) => row.Ref_Employee === null).length,
      vacancyRows: rows.filter((row) => row.Ref_Employee === 0).length,
      nullJobIdRows: rows.filter((row) => row.Job_ID === null).length,
      nullPositionNumberRows: rows.filter((row) => row.Position_Number === null).length,
      distinctJobIds: new Set(jobIds).size,
      minJobId: Math.min(...jobIds),
      maxJobId: Math.max(...jobIds),
      exactDuplicateGroups: exactDuplicateGroups.length,
      exactDuplicateRows: exactDuplicateGroups.reduce((sum, count) => sum + count, 0)
    }
  };
};

const inspectPositionTable = async (request) => {
  const result = await request.query(`
    SELECT
      c.column_id,
      c.name AS column_name,
      t.name AS data_type,
      c.max_length,
      c.is_nullable,
      c.is_identity,
      c.is_computed,
      c.default_object_id
    FROM sys.columns AS c
    JOIN sys.types AS t ON c.user_type_id = t.user_type_id
    WHERE c.object_id = OBJECT_ID(N'${TARGET_OBJECT}')
    ORDER BY c.column_id;

    SELECT COUNT_BIG(*) AS row_count FROM [dbo].[Position];

    SELECT COUNT_BIG(*) AS foreign_key_count
    FROM sys.foreign_keys
    WHERE parent_object_id = OBJECT_ID(N'${TARGET_OBJECT}')
       OR referenced_object_id = OBJECT_ID(N'${TARGET_OBJECT}');

    SELECT
      i.name AS index_name,
      i.is_primary_key,
      i.is_unique,
      c.name AS column_name,
      ic.key_ordinal
    FROM sys.indexes AS i
    JOIN sys.index_columns AS ic
      ON ic.object_id = i.object_id
     AND ic.index_id = i.index_id
     AND ic.key_ordinal > 0
    JOIN sys.columns AS c
      ON c.object_id = ic.object_id
     AND c.column_id = ic.column_id
    WHERE i.object_id = OBJECT_ID(N'${TARGET_OBJECT}')
    ORDER BY i.index_id, ic.key_ordinal;
  `);
  return {
    columns: result.recordsets[0],
    rowCount: Number(result.recordsets[1][0]?.row_count ?? 0),
    foreignKeyCount: Number(result.recordsets[2][0]?.foreign_key_count ?? 0),
    indexes: result.recordsets[3]
  };
};

const assertBaseTable = (inspection) => {
  if (inspection.columns.length === 0) {
    throw new Error("dbo.Position does not exist.");
  }
  if (inspection.rowCount !== 0) {
    throw new Error(
      `dbo.Position must be empty for this one-time workbook import; found ${inspection.rowCount} rows.`
    );
  }
  const id = inspection.columns.find((column) => column.column_name === "Id");
  if (
    !id ||
    id.data_type !== "int" ||
    Boolean(id.is_nullable) ||
    !Boolean(id.is_identity) ||
    Boolean(id.is_computed)
  ) {
    throw new Error("dbo.Position.Id must remain an INT IDENTITY primary-key column.");
  }
  const primaryKey = inspection.indexes.filter((index) => Boolean(index.is_primary_key));
  if (
    primaryKey.length !== 1 ||
    primaryKey[0].index_name !== "PK_Position" ||
    primaryKey[0].column_name !== "Id"
  ) {
    throw new Error("Expected PK_Position on dbo.Position.Id.");
  }
  const suppliedColumns = new Set([
    "position_number",
    "employeeid",
    "job_id",
    "job_name_ar",
    "job_name_en"
  ]);
  const unsupportedRequiredColumns = inspection.columns.filter((column) =>
    column.column_name !== "Id" &&
    !suppliedColumns.has(column.column_name.toLocaleLowerCase("en-US")) &&
    !Boolean(column.is_nullable) &&
    !Boolean(column.is_computed) &&
    Number(column.default_object_id) === 0
  );
  if (unsupportedRequiredColumns.length > 0) {
    throw new Error(
      `Bulk import cannot omit required Position columns: ` +
      unsupportedRequiredColumns.map((column) => column.column_name).join(", ")
    );
  }
};

const assertCompatibleExistingColumns = (inspection) => {
  const columnsByName = new Map(
    inspection.columns.map((column) => [column.column_name.toLocaleLowerCase("en-US"), column])
  );
  for (const [name, expected] of Object.entries(REQUIRED_DATABASE_COLUMNS)) {
    const actual = columnsByName.get(name.toLocaleLowerCase("en-US"));
    if (!actual) continue;
    if (
      actual.data_type !== expected.type ||
      Boolean(actual.is_nullable) !== expected.nullable ||
      Boolean(actual.is_identity) ||
      Boolean(actual.is_computed) ||
      (expected.maxLength !== undefined && Number(actual.max_length) !== expected.maxLength)
    ) {
      throw new Error(`Existing dbo.Position.${name} is not compatible with the workbook import.`);
    }
  }
};

const missingColumns = (inspection) => {
  const existing = new Set(
    inspection.columns.map((column) => column.column_name.toLocaleLowerCase("en-US"))
  );
  return [
    { name: "Position_Number", ddl: "BIGINT NULL" },
    { name: "EmployeeId", ddl: "INT NULL" },
    { name: "Job_ID", ddl: "INT NULL" },
    { name: "Job_Name_AR", ddl: "NVARCHAR(MAX) NOT NULL" },
    { name: "Job_Name_EN", ddl: "NVARCHAR(MAX) NOT NULL" }
  ].filter((column) => !existing.has(column.name.toLocaleLowerCase("en-US")));
};

const verifyJobCatalog = async (request, rows) => {
  const result = await request.query(`
    SELECT [Job_ID], [Job_Name_AR], [Job_Name_EN]
    FROM [dbo].[jobs];
  `);
  const catalog = new Map(result.recordset.map((row) => [Number(row.Job_ID), row]));
  const referencedIds = new Set();
  const missingIds = new Set();
  const mismatchedIds = new Set();
  let mismatchedRows = 0;
  const mismatchExamples = [];
  for (const row of rows) {
    if (row.Job_ID === null) continue;
    referencedIds.add(row.Job_ID);
    const job = catalog.get(row.Job_ID);
    if (!job) {
      missingIds.add(row.Job_ID);
      continue;
    }
    if (job.Job_Name_AR !== row.Job_Name_AR || job.Job_Name_EN !== row.Job_Name_EN) {
      mismatchedIds.add(row.Job_ID);
      mismatchedRows += 1;
      if (mismatchExamples.length < 10) {
        mismatchExamples.push({
          Job_ID: row.Job_ID,
          positionJobNameAR: row.Job_Name_AR,
          catalogJobNameAR: job.Job_Name_AR,
          positionJobNameEN: row.Job_Name_EN,
          catalogJobNameEN: job.Job_Name_EN
        });
      }
    }
  }
  return {
    catalogRows: catalog.size,
    referencedJobIds: referencedIds.size,
    missingJobIds: [...missingIds].sort((left, right) => left - right),
    mismatchedJobIds: mismatchedIds.size,
    mismatchedRows,
    mismatchExamples
  };
};

const createBulkTable = (rows) => {
  const table = new sql.Table(TARGET_OBJECT);
  table.create = false;
  table.columns.add("Position_Number", sql.BigInt, { nullable: true });
  table.columns.add("EmployeeId", sql.Int, { nullable: true });
  table.columns.add("Job_ID", sql.Int, { nullable: true });
  table.columns.add("Job_Name_AR", sql.NVarChar(sql.MAX), { nullable: false });
  table.columns.add("Job_Name_EN", sql.NVarChar(sql.MAX), { nullable: false });
  for (const row of rows) {
    table.rows.add(
      row.Position_Number,
      row.Ref_Employee,
      row.Job_ID,
      row.Job_Name_AR,
      row.Job_Name_EN
    );
  }
  return table;
};

const normalizeDatabaseRows = (rows) => rows.map((row) => ({
  Ref_Employee: row.EmployeeId === null ? null : Number(row.EmployeeId),
  Job_ID: row.Job_ID === null ? null : Number(row.Job_ID),
  Job_Name_AR: row.Job_Name_AR,
  Job_Name_EN: row.Job_Name_EN,
  Position_Number: row.Position_Number === null ? null : Number(row.Position_Number)
}));

const compareMultisets = (sourceRows, databaseRows) => {
  const sourceCounts = multiset(sourceRows);
  const databaseCounts = multiset(normalizeDatabaseRows(databaseRows));
  if (sourceCounts.size !== databaseCounts.size) {
    throw new Error("Imported row-set verification failed: distinct row counts differ.");
  }
  for (const [key, expectedCount] of sourceCounts) {
    if (databaseCounts.get(key) !== expectedCount) {
      throw new Error("Imported row-set verification failed: a row or duplicate count differs.");
    }
  }
};

const verifyImportedData = async (request, sourceRows) => {
  const result = await request.query(`
    SELECT [EmployeeId], [Job_ID], [Job_Name_AR], [Job_Name_EN], [Position_Number]
    FROM [dbo].[Position];

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
  `);
  compareMultisets(sourceRows, result.recordsets[0]);
  const counts = result.recordsets[1][0];
  if (Number(counts.row_count) !== sourceRows.length) {
    throw new Error(`Expected ${sourceRows.length} imported rows; found ${counts.row_count}.`);
  }
  if (Number(counts.changed_legacy_rows) !== 0) {
    throw new Error("One or more pre-existing Position fields were unexpectedly populated.");
  }
  return {
    rowCount: Number(counts.row_count),
    nullEmployeeIdRows: Number(counts.null_employee_id_rows),
    vacancyRows: Number(counts.vacancy_rows),
    nullJobIdRows: Number(counts.null_job_id_rows),
    nullPositionNumberRows: Number(counts.null_position_number_rows),
    changedLegacyRows: Number(counts.changed_legacy_rows)
  };
};

const main = async () => {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const jsonArgument = args.find((argument) => argument !== "--apply");
  if (!jsonArgument) {
    throw new Error("Usage: node scripts/import-position-workbook.js <workbook-dump.json> [--apply]");
  }

  const jsonPath = path.resolve(jsonArgument);
  const { rows, stats } = loadAndValidateWorkbookDump(jsonPath);
  const pool = await connectWithMssql();
  try {
    const initialInspection = await inspectPositionTable(pool.request());
    assertBaseTable(initialInspection);
    assertCompatibleExistingColumns(initialInspection);
    const initialMissingColumns = missingColumns(initialInspection);
    const catalogVerification = await verifyJobCatalog(pool.request(), rows);

    if (!apply) {
      console.log(JSON.stringify({
        mode: "dry-run",
        target: TARGET_OBJECT,
        ...stats,
        catalogVerification,
        currentPositionRows: initialInspection.rowCount,
        columnsToAdd: initialMissingColumns.map((column) => column.name),
        preservedExistingColumns: [
          "Id",
          "Position_Number",
          "PositionLevel",
          "Position_Degree",
          "Position_DateCreation",
          "Status",
          "Position_Type",
          "EmployeeId",
          "JobId"
        ],
        foreignKeysAdded: 0,
        message: "Workbook, catalog, and schema validation passed. No database changes were made."
      }, null, 2));
      return;
    }

    const transaction = new sql.Transaction(pool);
    let transactionStarted = false;
    try {
      await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
      transactionStarted = true;

      await new sql.Request(transaction).query(
        "SELECT COUNT_BIG(*) AS row_count FROM [dbo].[Position] WITH (TABLOCKX, HOLDLOCK);"
      );
      const transactionInspection = await inspectPositionTable(new sql.Request(transaction));
      assertBaseTable(transactionInspection);
      assertCompatibleExistingColumns(transactionInspection);
      await verifyJobCatalog(new sql.Request(transaction), rows);

      const transactionMissingColumns = missingColumns(transactionInspection);
      if (transactionMissingColumns.length > 0) {
        await new sql.Request(transaction).batch(`
          ALTER TABLE [dbo].[Position]
          ADD ${transactionMissingColumns
            .map((column) => `[${column.name}] ${column.ddl}`)
            .join(",\n              ")};
        `);
      }

      const expandedInspection = await inspectPositionTable(new sql.Request(transaction));
      assertCompatibleExistingColumns(expandedInspection);
      if (missingColumns(expandedInspection).length > 0) {
        throw new Error("Not all workbook columns were added to dbo.Position.");
      }

      await new sql.Request(transaction).bulk(createBulkTable(rows));
      const verification = await verifyImportedData(new sql.Request(transaction), rows);

      await transaction.commit();
      transactionStarted = false;
      console.log(JSON.stringify({
        mode: "applied",
        target: TARGET_OBJECT,
        ...stats,
        addedColumns: transactionMissingColumns.map((column) => column.name),
        verification,
        foreignKeysAdded: 0,
        message: "dbo.Position was expanded, imported, and fully verified before commit."
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
