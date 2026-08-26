require("dotenv").config();

const { spawnSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const sql = require("mssql");
const { connectWithMssql } = require("../src/config/database");

const IMPORTER_SCHEMA_VERSION = "job-catalog-bootstrap-v2";

const WORKBOOK_COLUMNS = [
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

const SHORT_PROFILE_FIELDS = [
  ["Job_Family", 250],
  ["Career_Level", 150],
  ["Role_Criticality", 150],
  ["Required_Languages", 250],
  ["Language_Level_CEFR", 250],
  ["Job_Type", 250],
  ["Profile_Validation_Owner", 500]
];

const LONG_PROFILE_FIELDS = [
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
  "KPI_Benchmark"
];

const PROFILE_FIELDS = [
  ...SHORT_PROFILE_FIELDS.map(([name]) => name),
  ...LONG_PROFILE_FIELDS
];

const FINAL_COLUMNS = [
  { name: "Id", ddl: "int NOT NULL", type: () => sql.Int },
  { name: "Job_Name", ddl: "nvarchar(250) NOT NULL", type: () => sql.NVarChar(250) },
  { name: "Job_Name_en", ddl: "nvarchar(250) NULL", type: () => sql.NVarChar(250) },
  { name: "Job_Name_AR", ddl: "nvarchar(250) NOT NULL", type: () => sql.NVarChar(250) },
  { name: "Legacy_Job_Id", ddl: "int NULL", type: () => sql.Int },
  { name: "Canonical_Job_Id", ddl: "int NULL", type: () => sql.Int },
  { name: "Profile_Source_Job_ID", ddl: "int NULL", type: () => sql.Int },
  { name: "Profile_Source_Row", ddl: "int NULL", type: () => sql.Int },
  { name: "Is_Profile_Canonical", ddl: "bit NOT NULL", type: () => sql.Bit },
  { name: "Is_Legacy_Placeholder", ddl: "bit NOT NULL", type: () => sql.Bit },
  { name: "Profile_Match_Method", ddl: "nvarchar(50) NOT NULL", type: () => sql.NVarChar(50) },
  ...SHORT_PROFILE_FIELDS.map(([name, length]) => ({
    name,
    ddl: `nvarchar(${length}) NULL`,
    type: () => sql.NVarChar(length)
  })),
  ...LONG_PROFILE_FIELDS.map((name) => ({
    name,
    ddl: "nvarchar(max) NULL",
    type: () => sql.NVarChar(sql.MAX)
  })),
  { name: "Profile_Source_Workbook", ddl: "nvarchar(260) NULL", type: () => sql.NVarChar(260) },
  { name: "Profile_Source_SHA256", ddl: "char(64) NULL", type: () => sql.Char(64) },
  { name: "Legacy_Mapping_Source_SHA256", ddl: "char(64) NULL", type: () => sql.Char(64) },
  { name: "Profile_Imported_At", ddl: "datetime2(0) NOT NULL", type: () => sql.DateTime2(0) }
];

const text = (value) => value === null || value === undefined ? "" : String(value).trim();

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function quoteIdentifier(value) {
  return `[${String(value).replace(/]/g, "]]" )}]`;
}

function normalizeName(value) {
  return text(value)
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")
    .replace(/[\u0649\u06CC]/g, "\u064A")
    .replace(/\u0624/g, "\u0648")
    .replace(/\u0626/g, "\u064A")
    .replace(/\u0629/g, "\u0647")
    .replace(/\u06A9/g, "\u0643")
    .replace(/[\u200C\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  return JSON.stringify(value);
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function sha256Buffer(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function sha256File(filePath) {
  return await new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const valueText = String(value);
  return /[",\r\n]/.test(valueText) ? `"${valueText.replace(/"/g, '""')}"` : valueText;
}

function writeCsv(filePath, headers, rows) {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvCell(row[header])).join(","));
  }
  fs.writeFileSync(filePath, `${lines.join("\r\n")}\r\n`, "utf8");
}

function extractWorkbook(workbookPath, sheetName, outputPath) {
  const extractorPath = path.resolve(__dirname, "extract-xlsx-sheet.ps1");
  const result = spawnSync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", extractorPath,
    "-WorkbookPath", workbookPath,
    "-SheetName", sheetName,
    "-OutputPath", outputPath,
    "-KeyColumn", "Job_ID",
    "-ValueColumn", "Job_Name_AR"
  ], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    windowsHide: true
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Workbook extraction failed: ${text(result.stderr) || text(result.stdout)}`);
  }
}

function loadWorkbookRows(extractedJsonBuffer) {
  const payload = JSON.parse(extractedJsonBuffer.toString("utf8"));
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error("The workbook must contain a non-empty row array.");
  }

  const sourceIds = new Set();
  const normalizedArabicNames = new Map();
  return payload.map((sourceRow, index) => {
    const worksheetRow = index + 2;
    const missingColumns = WORKBOOK_COLUMNS.filter(
      (column) => !Object.prototype.hasOwnProperty.call(sourceRow, column)
    );
    if (missingColumns.length > 0) {
      throw new Error(`Workbook row ${worksheetRow} is missing columns: ${missingColumns.join(", ")}`);
    }
    const blankColumns = WORKBOOK_COLUMNS.filter((column) => text(sourceRow[column]) === "");
    if (blankColumns.length > 0) {
      throw new Error(`Workbook row ${worksheetRow} has blank fields: ${blankColumns.join(", ")}`);
    }

    const sourceJobId = Number(sourceRow.Job_ID);
    if (!Number.isSafeInteger(sourceJobId) || sourceJobId <= 0 || sourceJobId > 2147483647) {
      throw new Error(`Workbook row ${worksheetRow} has invalid Job_ID: ${sourceRow.Job_ID}`);
    }
    if (sourceIds.has(sourceJobId)) throw new Error(`Workbook Job_ID ${sourceJobId} is duplicated.`);
    sourceIds.add(sourceJobId);

    const normalizedArabic = normalizeName(sourceRow.Job_Name_AR);
    const previousName = normalizedArabicNames.get(normalizedArabic);
    if (previousName) {
      throw new Error(
        `Workbook Arabic names collide after normalization at rows ${previousName.worksheetRow} and ${worksheetRow}.`
      );
    }
    normalizedArabicNames.set(normalizedArabic, { worksheetRow, sourceJobId });

    for (const [column, maxLength] of [
      ["Job_Name_AR", 250],
      ["Job_Name_EN", 250],
      ...SHORT_PROFILE_FIELDS
    ]) {
      if (text(sourceRow[column]).length > maxLength) {
        throw new Error(`Workbook row ${worksheetRow} ${column} exceeds ${maxLength} characters.`);
      }
    }

    return {
      ...Object.fromEntries(WORKBOOK_COLUMNS.map((column) => [column, text(sourceRow[column])])),
      Job_ID: sourceJobId,
      Source_Row: worksheetRow,
      Normalized_Arabic: normalizedArabic
    };
  });
}

function loadLegacyEmployeeMappings(fileBuffer) {
  const payload = JSON.parse(fileBuffer.toString("utf8"));
  if (!Array.isArray(payload)) throw new Error("The legacy job mapping JSON must contain an array.");
  const mappings = new Map();
  for (const [index, row] of payload.entries()) {
    const employeeNumber = text(row.Employee_ID);
    const jobId = Number(row.Job_ID);
    if (!/^\d+$/.test(employeeNumber) || Number(employeeNumber) <= 0) continue;
    if (!Number.isSafeInteger(jobId) || jobId <= 0 || jobId > 2147483647) continue;
    const jobName = text(row.Job_Name);
    if (!jobName) throw new Error(`Legacy mapping row ${index + 2} has a job ID without a job name.`);
    if (mappings.has(employeeNumber)) {
      throw new Error(`Legacy mapping contains duplicate employee number ${employeeNumber}.`);
    }
    mappings.set(employeeNumber, { employeeNumber, jobId, jobName, sourceRow: index + 2 });
  }
  if (mappings.size === 0) throw new Error("No usable positive employee mappings were found.");
  return mappings;
}

async function inspectBootstrapState(transaction) {
  const result = await new sql.Request(transaction).query(`
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
    WHERE c.object_id = OBJECT_ID(N'dbo.Job')
    ORDER BY c.column_id;

    SELECT
      i.name AS index_name,
      i.is_unique,
      i.is_primary_key,
      i.has_filter,
      i.filter_definition
    FROM sys.indexes AS i
    WHERE i.object_id = OBJECT_ID(N'dbo.Job') AND i.index_id > 0;

    SELECT COUNT_BIG(*) AS row_count
    FROM dbo.Job WITH (TABLOCKX, HOLDLOCK);

    SELECT tr.name, tr.is_disabled
    FROM sys.triggers AS tr
    WHERE tr.parent_id = OBJECT_ID(N'dbo.Job');

    SELECT o.name, o.type_desc
    FROM sys.objects AS o
    WHERE o.parent_object_id = OBJECT_ID(N'dbo.Job')
      AND o.type IN (N'F', N'C', N'D', N'UQ', N'PK');

    SELECT sp.object_id, sp.predicate_definition
    FROM sys.security_predicates AS sp
    WHERE sp.target_object_id = OBJECT_ID(N'dbo.Job');

    SELECT
      OBJECT_SCHEMA_NAME(c.object_id) AS schema_name,
      OBJECT_NAME(c.object_id) AS table_name,
      c.name AS column_name,
      t.name AS data_type,
      c.is_nullable
    FROM sys.columns AS c
    JOIN sys.types AS t ON c.user_type_id = t.user_type_id
    WHERE OBJECT_SCHEMA_NAME(c.object_id) = N'dbo'
      AND LOWER(c.name) IN (N'job_id', N'jobid', N'id_job')
    ORDER BY OBJECT_NAME(c.object_id), c.name;

    SELECT
      COUNT_BIG(*) AS total_positions,
      SUM(CASE WHEN [JobId] IS NOT NULL THEN 1 ELSE 0 END) AS positions_with_job_id
    FROM dbo.Position WITH (HOLDLOCK);

    SELECT MAX(candidate_id) AS reserved_max_job_id
    FROM (
      SELECT MAX([Job_Id]) AS candidate_id FROM dbo.Employee
      UNION ALL SELECT MAX([JobId]) FROM dbo.Position
      UNION ALL SELECT MAX(TRY_CONVERT(int, [OLD_JobId3])) FROM dbo.Employee
      UNION ALL SELECT MAX(TRY_CONVERT(int, [OLD_JobId4])) FROM dbo.Employee
      UNION ALL SELECT MAX(TRY_CONVERT(int, [OLD_JobId5])) FROM dbo.Employee
      UNION ALL SELECT MAX(TRY_CONVERT(int, [NUM_JOB_EGALISEE])) FROM dbo.EmployeeTemp
      UNION ALL SELECT MAX(TRY_CONVERT(int, [NUM_JOB_EGALISEE_1])) FROM dbo.EmployeeTemp
      UNION ALL SELECT MAX(TRY_CONVERT(int, [NUM_JOB_EGALISEE_2])) FROM dbo.EmployeeTemp
      UNION ALL SELECT MAX(TRY_CONVERT(int, [NUM_JOB_EGALISEE_3])) FROM dbo.EmployeeTemp
      UNION ALL SELECT MAX(TRY_CONVERT(int, [NUM_JOB_EGALISEE_4])) FROM dbo.EmployeeTemp
      UNION ALL SELECT MAX(TRY_CONVERT(int, [NUM_JOB_EGALISEE_5])) FROM dbo.EmployeeTemp
    ) AS reserved_ids;

    SELECT
      HAS_PERMS_BY_NAME(N'dbo.Job', N'OBJECT', N'ALTER') AS can_alter_job,
      HAS_PERMS_BY_NAME(N'dbo.Employee', N'OBJECT', N'ALTER') AS can_alter_employee,
      HAS_PERMS_BY_NAME(N'dbo.Position', N'OBJECT', N'ALTER') AS can_alter_position;
  `);
  return {
    columns: result.recordsets[0],
    indexes: result.recordsets[1],
    rowCount: Number(result.recordsets[2][0].row_count),
    triggers: result.recordsets[3],
    relatedObjects: result.recordsets[4],
    securityPredicates: result.recordsets[5],
    jobIdConsumers: result.recordsets[6],
    totalPositions: Number(result.recordsets[7][0].total_positions),
    positionsWithJobId: Number(result.recordsets[7][0].positions_with_job_id ?? 0),
    reservedMaxJobId: Number(result.recordsets[8][0].reserved_max_job_id ?? 0),
    permissions: {
      canAlterJob: Boolean(result.recordsets[9][0].can_alter_job),
      canAlterEmployee: Boolean(result.recordsets[9][0].can_alter_employee),
      canAlterPosition: Boolean(result.recordsets[9][0].can_alter_position)
    }
  };
}

function assertBootstrapState(state) {
  if (state.columns.length !== 1) {
    throw new Error(
      `Bootstrap is restricted to the current empty Id-only dbo.Job table; found ${state.columns.length} columns.`
    );
  }
  const id = state.columns[0];
  if (
    String(id.column_name).toLocaleLowerCase("en-US") !== "id" ||
    String(id.data_type).toLocaleLowerCase("en-US") !== "int" ||
    Boolean(id.is_nullable) || Boolean(id.is_identity) || Boolean(id.is_computed)
  ) {
    throw new Error("Bootstrap requires dbo.Job.Id to be a non-null, non-identity, non-computed int column.");
  }
  if (state.rowCount !== 0) throw new Error(`Bootstrap requires an empty dbo.Job table; found ${state.rowCount} rows.`);
  if (state.indexes.length > 0) throw new Error("Bootstrap found unexpected existing indexes on dbo.Job.");
  if (state.triggers.length > 0) throw new Error("Bootstrap found an unexpected trigger on dbo.Job.");
  if (state.relatedObjects.length > 0) throw new Error("Bootstrap found an unexpected constraint on dbo.Job.");
  if (state.securityPredicates.length > 0) throw new Error("Bootstrap found a security predicate on dbo.Job.");
  const expectedConsumers = ["Employee.Job_Id:int", "Position.JobId:int"];
  const actualConsumers = state.jobIdConsumers.map(
    (row) => `${row.table_name}.${row.column_name}:${String(row.data_type).toLocaleLowerCase("en-US")}`
  ).sort();
  if (stableStringify(actualConsumers) !== stableStringify(expectedConsumers.sort())) {
    throw new Error(`Unexpected dbo job-ID consumer columns: ${actualConsumers.join(", ")}`);
  }
  if (state.positionsWithJobId !== 0) {
    throw new Error(`Bootstrap found ${state.positionsWithJobId} populated Position.JobId row(s) without a trusted name map.`);
  }
  if (!state.permissions.canAlterJob || !state.permissions.canAlterEmployee || !state.permissions.canAlterPosition) {
    throw new Error("The database login needs ALTER permission on dbo.Job, dbo.Employee, and dbo.Position.");
  }
}

async function readLiveEmployeeMappings(transaction) {
  const result = await new sql.Request(transaction).query(`
    SELECT
      LTRIM(RTRIM(CONVERT(nvarchar(50), e.[Ref_Employee]))) AS EmployeeNumber,
      e.[Job_Id] AS JobId
    FROM dbo.Employee AS e WITH (HOLDLOCK)
    WHERE e.[Job_Id] IS NOT NULL
    ORDER BY LTRIM(RTRIM(CONVERT(nvarchar(50), e.[Ref_Employee])));
  `);
  const mappings = new Map();
  for (const row of result.recordset) {
    const employeeNumber = text(row.EmployeeNumber);
    const jobId = Number(row.JobId);
    if (!employeeNumber || !Number.isSafeInteger(jobId) || jobId <= 0) {
      throw new Error("The live employee table contains an invalid populated Job_Id mapping.");
    }
    if (mappings.has(employeeNumber)) {
      throw new Error(`The live employee table contains duplicate employee number ${employeeNumber}.`);
    }
    mappings.set(employeeNumber, { employeeNumber, jobId });
  }
  return mappings;
}

function validateLegacyMappingsAgainstLive(legacyMappings, liveMappings) {
  const conflicts = [];
  for (const [employeeNumber, live] of liveMappings) {
    const legacy = legacyMappings.get(employeeNumber);
    if (!legacy) {
      conflicts.push({ type: "live-employee-missing-from-legacy-map", employeeNumber, liveJobId: live.jobId });
    }
    else if (legacy.jobId !== live.jobId) {
      conflicts.push({
        type: "employee-job-id-changed",
        employeeNumber,
        liveJobId: live.jobId,
        legacyJobId: legacy.jobId,
        legacyJobName: legacy.jobName
      });
    }
  }
  for (const [employeeNumber, legacy] of legacyMappings) {
    if (!liveMappings.has(employeeNumber)) {
      conflicts.push({
        type: "legacy-mapped-employee-not-currently-populated",
        employeeNumber,
        legacyJobId: legacy.jobId,
        legacyJobName: legacy.jobName
      });
    }
  }
  return conflicts;
}

function chooseMostFrequentName(nameVariants) {
  const rawCounts = new Map();
  for (const variant of nameVariants.values()) {
    for (const [rawName, count] of variant.rawCounts) {
      rawCounts.set(rawName, (rawCounts.get(rawName) ?? 0) + count);
    }
  }
  return [...rawCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ar"))[0][0];
}

function createFullProfileRow({
  databaseJobId,
  legacyJobId,
  canonicalJobId,
  isCanonical,
  matchMethod,
  workbookRow,
  workbookName,
  workbookSha256,
  legacySha256,
  importedAt
}) {
  return {
    Id: databaseJobId,
    Job_Name: workbookRow.Job_Name_AR,
    Job_Name_en: workbookRow.Job_Name_EN,
    Job_Name_AR: workbookRow.Job_Name_AR,
    Legacy_Job_Id: legacyJobId,
    Canonical_Job_Id: canonicalJobId,
    Profile_Source_Job_ID: workbookRow.Job_ID,
    Profile_Source_Row: workbookRow.Source_Row,
    Is_Profile_Canonical: isCanonical,
    Is_Legacy_Placeholder: false,
    Profile_Match_Method: matchMethod,
    ...Object.fromEntries(PROFILE_FIELDS.map((field) => [field, workbookRow[field]])),
    Profile_Source_Workbook: workbookName,
    Profile_Source_SHA256: workbookSha256,
    Legacy_Mapping_Source_SHA256: legacySha256,
    Profile_Imported_At: importedAt
  };
}

function createPlaceholderRow({ databaseJobId, jobName, legacySha256, importedAt }) {
  return {
    Id: databaseJobId,
    Job_Name: jobName,
    Job_Name_en: null,
    Job_Name_AR: jobName,
    Legacy_Job_Id: databaseJobId,
    Canonical_Job_Id: null,
    Profile_Source_Job_ID: null,
    Profile_Source_Row: null,
    Is_Profile_Canonical: false,
    Is_Legacy_Placeholder: true,
    Profile_Match_Method: "legacy-placeholder",
    ...Object.fromEntries(PROFILE_FIELDS.map((field) => [field, null])),
    Profile_Source_Workbook: null,
    Profile_Source_SHA256: null,
    Legacy_Mapping_Source_SHA256: legacySha256,
    Profile_Imported_At: importedAt
  };
}

function buildCatalogPlan({
  workbookRows,
  legacyMappings,
  liveMappings,
  workbookName,
  workbookSha256,
  legacySha256,
  importedAt,
  reservedMaxJobId
}) {
  const workbookByNormalizedArabic = new Map(
    workbookRows.map((row) => [row.Normalized_Arabic, row])
  );
  const evidenceByJobId = new Map();
  for (const live of liveMappings.values()) {
    const legacy = legacyMappings.get(live.employeeNumber);
    const variants = evidenceByJobId.get(live.jobId) ?? new Map();
    const normalizedName = normalizeName(legacy.jobName);
    const variant = variants.get(normalizedName) ?? { rawCounts: new Map(), employeeCount: 0 };
    variant.rawCounts.set(legacy.jobName, (variant.rawCounts.get(legacy.jobName) ?? 0) + 1);
    variant.employeeCount += 1;
    variants.set(normalizedName, variant);
    evidenceByJobId.set(live.jobId, variants);
  }

  const profileToLegacyJobs = new Map();
  const legacyPlaceholders = [];
  const matchingConflicts = [];
  const nameVariantWarnings = [];
  const employeeCountByJobId = new Map();
  for (const [legacyJobId, variants] of evidenceByJobId) {
    employeeCountByJobId.set(
      legacyJobId,
      [...variants.values()].reduce((sum, variant) => sum + variant.employeeCount, 0)
    );
    const workbookMatches = new Map();
    for (const normalizedName of variants.keys()) {
      const workbookRow = workbookByNormalizedArabic.get(normalizedName);
      if (workbookRow) workbookMatches.set(workbookRow.Job_ID, workbookRow);
    }
    const variantEvidence = [...variants.entries()].map(([normalizedName, variant]) => ({
      normalizedName,
      employeeCount: variant.employeeCount,
      workbookSourceJobId: workbookByNormalizedArabic.get(normalizedName)?.Job_ID ?? null,
      rawNames: [...variant.rawCounts.entries()]
        .map(([jobName, employeeCount]) => ({ jobName, employeeCount }))
        .sort((a, b) => b.employeeCount - a.employeeCount || a.jobName.localeCompare(b.jobName, "ar"))
    }));
    const rawNameCount = variantEvidence.reduce((sum, variant) => sum + variant.rawNames.length, 0);
    if (rawNameCount > 1) {
      nameVariantWarnings.push({
        legacyJobId,
        employeeCount: employeeCountByJobId.get(legacyJobId),
        matchedWorkbookSourceJobIds: [...workbookMatches.keys()].sort((a, b) => a - b),
        variants: variantEvidence
      });
    }
    if (workbookMatches.size > 1) {
      matchingConflicts.push({
        type: "one-legacy-id-matches-multiple-workbook-profiles",
        legacyJobId,
        workbookSourceIds: [...workbookMatches.keys()],
        legacyNames: [...variants.values()].flatMap((variant) => [...variant.rawCounts.keys()])
      });
      continue;
    }
    if (workbookMatches.size === 0) {
      legacyPlaceholders.push({
        legacyJobId,
        jobName: chooseMostFrequentName(variants),
        employeeCount: employeeCountByJobId.get(legacyJobId),
        legacyNames: [...variants.values()].flatMap((variant) => [...variant.rawCounts.keys()])
      });
      continue;
    }
    const workbookRow = [...workbookMatches.values()][0];
    const targets = profileToLegacyJobs.get(workbookRow.Job_ID) ?? [];
    targets.push({
      legacyJobId,
      employeeCount: employeeCountByJobId.get(legacyJobId),
      legacyNames: [...variants.values()].flatMap((variant) => [...variant.rawCounts.keys()])
    });
    profileToLegacyJobs.set(workbookRow.Job_ID, targets);
  }

  if (matchingConflicts.length > 0) {
    return {
      targetRows: [],
      matchingConflicts,
      nameVariantWarnings,
      legacyPlaceholders,
      newWorkbookProfiles: [],
      profileAliases: []
    };
  }

  const usedIds = new Set(evidenceByJobId.keys());
  let nextId = Math.max(reservedMaxJobId, 0, ...usedIds) + 1;
  const targetRows = [];
  const profileAliases = [];
  const newWorkbookProfiles = [];

  for (const workbookRow of [...workbookRows].sort((a, b) => a.Job_ID - b.Job_ID)) {
    const legacyTargets = [...(profileToLegacyJobs.get(workbookRow.Job_ID) ?? [])]
      .sort((a, b) => b.employeeCount - a.employeeCount || a.legacyJobId - b.legacyJobId);
    if (legacyTargets.length === 0) {
      while (usedIds.has(nextId)) nextId += 1;
      if (nextId > 2147483647) throw new Error("No safe int IDs remain for new workbook profiles.");
      const databaseJobId = nextId;
      usedIds.add(databaseJobId);
      nextId += 1;
      targetRows.push(createFullProfileRow({
        databaseJobId,
        legacyJobId: null,
        canonicalJobId: databaseJobId,
        isCanonical: true,
        matchMethod: "new-workbook-profile",
        workbookRow,
        workbookName,
        workbookSha256,
        legacySha256,
        importedAt
      }));
      newWorkbookProfiles.push({
        sourceJobId: workbookRow.Job_ID,
        databaseJobId,
        sourceRow: workbookRow.Source_Row,
        jobNameArabic: workbookRow.Job_Name_AR,
        jobNameEnglish: workbookRow.Job_Name_EN
      });
      continue;
    }

    const canonicalJobId = legacyTargets[0].legacyJobId;
    for (const [index, target] of legacyTargets.entries()) {
      const isCanonical = index === 0;
      targetRows.push(createFullProfileRow({
        databaseJobId: target.legacyJobId,
        legacyJobId: target.legacyJobId,
        canonicalJobId,
        isCanonical,
        matchMethod: isCanonical ? "legacy-name-canonical" : "legacy-name-alias",
        workbookRow,
        workbookName,
        workbookSha256,
        legacySha256,
        importedAt
      }));
      if (!isCanonical) {
        profileAliases.push({
          sourceJobId: workbookRow.Job_ID,
          canonicalDatabaseJobId: canonicalJobId,
          aliasDatabaseJobId: target.legacyJobId,
          employeeCount: target.employeeCount,
          jobNameArabic: workbookRow.Job_Name_AR
        });
      }
    }
  }

  for (const placeholder of legacyPlaceholders) {
    targetRows.push(createPlaceholderRow({
      databaseJobId: placeholder.legacyJobId,
      jobName: placeholder.jobName,
      legacySha256,
      importedAt
    }));
  }
  targetRows.sort((a, b) => a.Id - b.Id);

  const uniqueIds = new Set(targetRows.map((row) => row.Id));
  if (uniqueIds.size !== targetRows.length) throw new Error("The generated catalog contains duplicate dbo.Job IDs.");
  const representedSourceIds = new Set(
    targetRows.filter((row) => row.Profile_Source_Job_ID !== null).map((row) => row.Profile_Source_Job_ID)
  );
  if (representedSourceIds.size !== workbookRows.length) {
    throw new Error(`Only ${representedSourceIds.size} of ${workbookRows.length} workbook profiles were represented.`);
  }
  const canonicalRows = targetRows.filter((row) => row.Is_Profile_Canonical);
  if (canonicalRows.length !== workbookRows.length) {
    throw new Error(`Expected ${workbookRows.length} canonical profiles, generated ${canonicalRows.length}.`);
  }

  return {
    targetRows,
    matchingConflicts,
    nameVariantWarnings,
    legacyPlaceholders: legacyPlaceholders.sort((a, b) => a.legacyJobId - b.legacyJobId),
    newWorkbookProfiles,
    profileAliases
  };
}

function createStageTableSql() {
  return `
    CREATE TABLE #JobCatalogStage (
      ${FINAL_COLUMNS.map((column) => `${quoteIdentifier(column.name)} ${column.ddl}`).join(",\n      ")}
    );
  `;
}

async function insertStageRows(transaction, rows) {
  const chunkSize = 30;
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize);
    const request = new sql.Request(transaction);
    const values = chunk.map((row, rowIndex) => {
      const parameters = FINAL_COLUMNS.map((column, columnIndex) => {
        const parameterName = `p${rowIndex}_${columnIndex}`;
        request.input(parameterName, column.type(), row[column.name]);
        return `@${parameterName}`;
      });
      return `(${parameters.join(", ")})`;
    });
    await request.query(`
      INSERT INTO #JobCatalogStage (${FINAL_COLUMNS.map((column) => quoteIdentifier(column.name)).join(", ")})
      VALUES ${values.join(",\n")};
    `);
  }
}

function addCatalogColumnsSql() {
  return `
    ALTER TABLE dbo.Job ADD
      ${FINAL_COLUMNS.slice(1).map((column) => `${quoteIdentifier(column.name)} ${column.ddl}`).join(",\n      ")};
  `;
}

function addCatalogConstraintsSql() {
  return `
    ALTER TABLE dbo.Job ADD CONSTRAINT [PK_HERP_Job] PRIMARY KEY CLUSTERED ([Id]);

    ALTER TABLE dbo.Job WITH CHECK ADD CONSTRAINT [CK_HERP_Job_Profile_State]
      CHECK (
        ([Is_Legacy_Placeholder] = 1
          AND [Is_Profile_Canonical] = 0
          AND [Profile_Source_Job_ID] IS NULL
          AND [Canonical_Job_Id] IS NULL)
        OR
        ([Is_Legacy_Placeholder] = 0
          AND [Profile_Source_Job_ID] IS NOT NULL
          AND [Profile_Source_Row] IS NOT NULL
          AND [Profile_Source_Workbook] IS NOT NULL
          AND [Profile_Source_SHA256] IS NOT NULL
          AND [Canonical_Job_Id] IS NOT NULL)
      );

    ALTER TABLE dbo.Job WITH CHECK ADD CONSTRAINT [CK_HERP_Job_Canonical_State]
      CHECK ([Is_Profile_Canonical] = 0 OR [Canonical_Job_Id] = [Id]);

    ALTER TABLE dbo.Job WITH CHECK ADD CONSTRAINT [CK_HERP_Job_Legacy_Id]
      CHECK ([Legacy_Job_Id] IS NULL OR [Legacy_Job_Id] = [Id]);

    CREATE UNIQUE INDEX [UX_HERP_Job_Id_Profile_Source]
      ON dbo.Job ([Id], [Profile_Source_Job_ID]);

    ALTER TABLE dbo.Job WITH CHECK ADD CONSTRAINT [FK_HERP_Job_Canonical_Profile]
      FOREIGN KEY ([Canonical_Job_Id], [Profile_Source_Job_ID])
      REFERENCES dbo.Job ([Id], [Profile_Source_Job_ID]);

    CREATE INDEX [IX_HERP_Job_Profile_Source_Job_ID]
      ON dbo.Job ([Profile_Source_Job_ID]);

    CREATE UNIQUE INDEX [UX_HERP_Job_Canonical_Profile_Source]
      ON dbo.Job ([Profile_Source_Job_ID])
      WHERE [Is_Profile_Canonical] = 1;

    CREATE INDEX [IX_HERP_Job_Canonical_Job_Id]
      ON dbo.Job ([Canonical_Job_Id]);

    CREATE INDEX [IX_HERP_Employee_Job_Id]
      ON dbo.Employee ([Job_Id]);

    ALTER TABLE dbo.Employee WITH CHECK ADD CONSTRAINT [FK_HERP_Employee_Job]
      FOREIGN KEY ([Job_Id]) REFERENCES dbo.Job ([Id]);

    CREATE INDEX [IX_HERP_Position_JobId]
      ON dbo.Position ([JobId]);

    ALTER TABLE dbo.Position WITH CHECK ADD CONSTRAINT [FK_HERP_Position_Job]
      FOREIGN KEY ([JobId]) REFERENCES dbo.Job ([Id]);
  `;
}

function makeArtifactPaths(outputDirectory, timestamp) {
  return {
    resultPath: path.join(outputDirectory, `job-catalog-plan-${timestamp}.json`),
    mappingPath: path.join(outputDirectory, `job-catalog-full-mapping-${timestamp}.csv`),
    placeholderPath: path.join(outputDirectory, `job-catalog-legacy-placeholders-${timestamp}.csv`),
    newProfilesPath: path.join(outputDirectory, `job-catalog-new-profiles-${timestamp}.csv`),
    aliasesPath: path.join(outputDirectory, `job-catalog-profile-aliases-${timestamp}.csv`),
    nameVariantsPath: path.join(outputDirectory, `job-catalog-name-variants-${timestamp}.json`),
    conflictsPath: path.join(outputDirectory, `job-catalog-conflicts-${timestamp}.json`),
    schemaBackupPath: path.join(outputDirectory, `job-catalog-schema-before-${timestamp}.json`)
  };
}

function writePlanArtifacts(paths, result, plan, state) {
  writeCsv(
    paths.mappingPath,
    [
      "databaseJobId", "legacyJobId", "canonicalJobId", "profileSourceJobId", "profileSourceRow",
      "isProfileCanonical", "isLegacyPlaceholder", "matchMethod", "jobNameArabic", "jobNameEnglish"
    ],
    plan.targetRows.map((row) => ({
      databaseJobId: row.Id,
      legacyJobId: row.Legacy_Job_Id,
      canonicalJobId: row.Canonical_Job_Id,
      profileSourceJobId: row.Profile_Source_Job_ID,
      profileSourceRow: row.Profile_Source_Row,
      isProfileCanonical: row.Is_Profile_Canonical ? 1 : 0,
      isLegacyPlaceholder: row.Is_Legacy_Placeholder ? 1 : 0,
      matchMethod: row.Profile_Match_Method,
      jobNameArabic: row.Job_Name_AR,
      jobNameEnglish: row.Job_Name_en
    }))
  );
  writeCsv(
    paths.placeholderPath,
    ["legacyJobId", "jobName", "employeeCount", "legacyNames"],
    plan.legacyPlaceholders.map((row) => ({ ...row, legacyNames: row.legacyNames.join(" | ") }))
  );
  writeCsv(
    paths.newProfilesPath,
    ["sourceJobId", "databaseJobId", "sourceRow", "jobNameArabic", "jobNameEnglish"],
    plan.newWorkbookProfiles
  );
  writeCsv(
    paths.aliasesPath,
    ["sourceJobId", "canonicalDatabaseJobId", "aliasDatabaseJobId", "employeeCount", "jobNameArabic"],
    plan.profileAliases
  );
  fs.writeFileSync(paths.nameVariantsPath, `${JSON.stringify(plan.nameVariantWarnings, null, 2)}\n`, "utf8");
  fs.writeFileSync(paths.conflictsPath, `${JSON.stringify(plan.matchingConflicts, null, 2)}\n`, "utf8");
  fs.writeFileSync(paths.schemaBackupPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  fs.writeFileSync(paths.resultPath, `${JSON.stringify({ ...result, artifacts: paths }, null, 2)}\n`, "utf8");
}

async function main() {
  const sourceWorkbookArgument = readArgument("--source-workbook");
  const legacyMapArgument = readArgument("--legacy-map");
  const sheetName = readArgument("--sheet") || "Enterprise Job Profiles";
  const outputDirectory = path.resolve(readArgument("--output-dir") || "outputs/job_catalog_import");
  const applyChanges = process.argv.includes("--apply");
  const testTransaction = process.argv.includes("--test-transaction");
  const confirmPlan = readArgument("--confirm-plan");
  const approveNameVariants = readArgument("--approve-name-variants");

  if (!sourceWorkbookArgument || !legacyMapArgument) {
    throw new Error(
      "Usage: node scripts/import-job-catalog.js --source-workbook <jobs.xlsx> --legacy-map <employee-jobs.json> " +
      "[--sheet <name>] [--output-dir <directory>] [--test-transaction | --apply] " +
      "[--confirm-plan <sha256>] [--approve-name-variants <sha256>]"
    );
  }
  if (applyChanges && testTransaction) {
    throw new Error("--apply and --test-transaction cannot be used together.");
  }

  const sourceWorkbookPath = path.resolve(sourceWorkbookArgument);
  const legacyMapPath = path.resolve(legacyMapArgument);
  const timestamp = new Date().toISOString().replace(/[.:]/g, "-");
  fs.mkdirSync(outputDirectory, { recursive: true });
  const extractedJsonPath = path.join(outputDirectory, `jobs-workbook-verified-${timestamp}.json`);
  const artifactPaths = makeArtifactPaths(outputDirectory, timestamp);

  const workbookSha256Before = await sha256File(sourceWorkbookPath);
  extractWorkbook(sourceWorkbookPath, sheetName, extractedJsonPath);
  const workbookSha256After = await sha256File(sourceWorkbookPath);
  if (workbookSha256Before !== workbookSha256After) {
    throw new Error("The source workbook changed while it was being extracted; no import plan was created.");
  }
  const extractedJsonBuffer = fs.readFileSync(extractedJsonPath);
  const legacyMapBuffer = fs.readFileSync(legacyMapPath);
  const workbookRows = loadWorkbookRows(extractedJsonBuffer);
  const legacyMappings = loadLegacyEmployeeMappings(legacyMapBuffer);
  const workbookSha256 = workbookSha256After;
  const extractedJsonSha256 = sha256Buffer(extractedJsonBuffer);
  const legacySha256 = sha256Buffer(legacyMapBuffer);
  const importedAt = new Date(Math.floor(Date.now() / 1000) * 1000);

  const pool = await connectWithMssql();
  const transaction = new sql.Transaction(pool);
  let transactionStarted = false;
  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    transactionStarted = true;
    await new sql.Request(transaction).batch("SET XACT_ABORT ON;");

    const appLock = await new sql.Request(transaction).query(`
      DECLARE @result int;
      EXEC @result = sys.sp_getapplock
        @Resource = N'HERP-dbo.Job-catalog-bootstrap',
        @LockMode = N'Exclusive',
        @LockOwner = N'Transaction',
        @LockTimeout = 10000;
      SELECT @result AS result;
    `);
    if (Number(appLock.recordset[0].result) < 0) {
      throw new Error("Could not obtain the exclusive dbo.Job catalog-import lock.");
    }

    const state = await inspectBootstrapState(transaction);
    assertBootstrapState(state);
    const liveMappings = await readLiveEmployeeMappings(transaction);
    const employeeMappingConflicts = validateLegacyMappingsAgainstLive(legacyMappings, liveMappings);
    const plan = buildCatalogPlan({
      workbookRows,
      legacyMappings,
      liveMappings,
      workbookName: path.basename(sourceWorkbookPath),
      workbookSha256,
      legacySha256,
      importedAt,
      reservedMaxJobId: state.reservedMaxJobId
    });

    const profileEmployeeCount = [...liveMappings.values()].filter((live) => {
      const target = plan.targetRows.find((row) => row.Id === live.jobId);
      return target && !target.Is_Legacy_Placeholder;
    }).length;
    const placeholderEmployeeCount = liveMappings.size - profileEmployeeCount;
    const targetRowsSha256 = sha256Text(stableStringify(
      plan.targetRows.map(({ Profile_Imported_At: _importedAt, ...row }) => row)
    ));
    const liveEmployeeStateSha256 = sha256Text(stableStringify(
      [...liveMappings.values()].sort((a, b) => a.employeeNumber.localeCompare(b.employeeNumber))
    ));
    const bootstrapStateSha256 = sha256Text(stableStringify(state));
    const nameVariantWarningsSha256 = sha256Text(stableStringify(plan.nameVariantWarnings));
    const ddlDefinitionSha256 = sha256Text(stableStringify({
      importerSchemaVersion: IMPORTER_SCHEMA_VERSION,
      finalColumns: FINAL_COLUMNS.map(({ name, ddl }) => ({ name, ddl })),
      stageSql: createStageTableSql(),
      addColumnsSql: addCatalogColumnsSql(),
      addConstraintsSql: addCatalogConstraintsSql()
    }));
    const planHash = sha256Text(stableStringify({
      importerSchemaVersion: IMPORTER_SCHEMA_VERSION,
      workbookSha256,
      extractedJsonSha256,
      legacySha256,
      targetRowsSha256,
      liveEmployeeStateSha256,
      bootstrapStateSha256,
      nameVariantWarningsSha256,
      ddlDefinitionSha256
    }));

    const result = {
      mode: applyChanges ? "apply-preflight" : (testTransaction ? "transaction-test-preflight" : "dry-run"),
      timestampUtc: new Date().toISOString(),
      importerSchemaVersion: IMPORTER_SCHEMA_VERSION,
      sourceWorkbookPath,
      sourceWorkbookSha256: workbookSha256,
      extractedJsonPath,
      extractedJsonSha256,
      legacyMapPath,
      legacyMapSha256: legacySha256,
      workbookProfiles: workbookRows.length,
      currentEmployeesWithJobId: liveMappings.size,
      reservedMaxJobId: state.reservedMaxJobId,
      legacyMappingEntries: legacyMappings.size,
      employeeMappingConflicts: employeeMappingConflicts.length,
      profileMatchingConflicts: plan.matchingConflicts.length,
      legacyNameVariantWarnings: plan.nameVariantWarnings.length,
      targetJobRows: plan.targetRows.length,
      canonicalProfileRows: plan.targetRows.filter((row) => row.Is_Profile_Canonical).length,
      legacyProfileAliasRows: plan.profileAliases.length,
      legacyPlaceholderRows: plan.legacyPlaceholders.length,
      newWorkbookProfileRows: plan.newWorkbookProfiles.length,
      employeesReceivingFullProfile: profileEmployeeCount,
      employeesUsingLegacyPlaceholder: placeholderEmployeeCount,
      targetRowsSha256,
      liveEmployeeStateSha256,
      bootstrapStateSha256,
      nameVariantWarningsSha256,
      ddlDefinitionSha256,
      planHash,
      databaseChanged: false,
      artifactPaths
    };

    if (employeeMappingConflicts.length > 0 || plan.matchingConflicts.length > 0) {
      fs.writeFileSync(
        artifactPaths.conflictsPath,
        `${JSON.stringify({ employeeMappingConflicts, profileMatchingConflicts: plan.matchingConflicts }, null, 2)}\n`,
        "utf8"
      );
      throw new Error(
        `Preflight found ${employeeMappingConflicts.length} employee mapping conflict(s) and ` +
        `${plan.matchingConflicts.length} profile matching conflict(s).`
      );
    }

    if (!applyChanges && !testTransaction) {
      await transaction.rollback();
      transactionStarted = false;
      writePlanArtifacts(artifactPaths, result, plan, state);
      console.log(JSON.stringify({ ...result, artifacts: artifactPaths }, null, 2));
      return;
    }

    if (confirmPlan !== planHash) {
      await transaction.rollback();
      transactionStarted = false;
      writePlanArtifacts(artifactPaths, result, plan, state);
      console.log(JSON.stringify({ ...result, artifacts: artifactPaths }, null, 2));
      throw new Error(
        `Execution was not authorized for this exact plan. Review the artifacts, then re-run with --confirm-plan ${planHash}.`
      );
    }
    if (plan.nameVariantWarnings.length > 0 && approveNameVariants !== nameVariantWarningsSha256) {
      await transaction.rollback();
      transactionStarted = false;
      writePlanArtifacts(artifactPaths, result, plan, state);
      throw new Error(
        `The plan contains ${plan.nameVariantWarnings.length} audited legacy-name variant group(s). ` +
        `Review ${artifactPaths.nameVariantsPath}, then re-run with --approve-name-variants ${nameVariantWarningsSha256}.`
      );
    }

    writePlanArtifacts(artifactPaths, result, plan, state);
    await new sql.Request(transaction).batch(createStageTableSql());
    await insertStageRows(transaction, plan.targetRows);
    await new sql.Request(transaction).batch(addCatalogColumnsSql());

    const projection = FINAL_COLUMNS.map((column) => quoteIdentifier(column.name)).join(", ");
    const insertResult = await new sql.Request(transaction).query(`
      INSERT INTO dbo.Job (${projection})
      SELECT ${projection}
      FROM #JobCatalogStage;
    `);
    const insertedCount = Number(insertResult.rowsAffected[0] ?? 0);
    if (insertedCount !== plan.targetRows.length) {
      throw new Error(`Expected ${plan.targetRows.length} inserted rows, SQL Server inserted ${insertedCount}.`);
    }

    await new sql.Request(transaction).batch(addCatalogConstraintsSql());
    const verification = await new sql.Request(transaction).query(`
      SELECT COUNT_BIG(*) AS MissingOrChangedRows
      FROM (
        SELECT ${projection} FROM #JobCatalogStage
        EXCEPT
        SELECT ${projection} FROM dbo.Job
      ) AS differences;

      SELECT COUNT_BIG(*) AS UnexpectedRows
      FROM (
        SELECT ${projection} FROM dbo.Job
        EXCEPT
        SELECT ${projection} FROM #JobCatalogStage
      ) AS differences;

      SELECT
        COUNT_BIG(*) AS TotalRows,
        COUNT(DISTINCT [Profile_Source_Job_ID]) AS DistinctSourceProfiles,
        SUM(CASE WHEN [Is_Profile_Canonical] = 1 THEN 1 ELSE 0 END) AS CanonicalProfiles,
        SUM(CASE WHEN [Is_Legacy_Placeholder] = 1 THEN 1 ELSE 0 END) AS LegacyPlaceholders
      FROM dbo.Job;

      SELECT COUNT_BIG(*) AS OrphanEmployeeJobReferences
      FROM dbo.Employee AS e
      LEFT JOIN dbo.Job AS j ON e.[Job_Id] = j.[Id]
      WHERE e.[Job_Id] IS NOT NULL AND j.[Id] IS NULL;

      SELECT COUNT_BIG(*) AS OrphanPositionJobReferences
      FROM dbo.Position AS p
      LEFT JOIN dbo.Job AS j ON p.[JobId] = j.[Id]
      WHERE p.[JobId] IS NOT NULL AND j.[Id] IS NULL;
    `);
    const missingOrChangedRows = Number(verification.recordsets[0][0].MissingOrChangedRows);
    const unexpectedRows = Number(verification.recordsets[1][0].UnexpectedRows);
    const summary = verification.recordsets[2][0];
    const orphanEmployeeJobReferences = Number(verification.recordsets[3][0].OrphanEmployeeJobReferences);
    const orphanPositionJobReferences = Number(verification.recordsets[4][0].OrphanPositionJobReferences);
    const verificationFailed =
      missingOrChangedRows !== 0 ||
      unexpectedRows !== 0 ||
      Number(summary.TotalRows) !== plan.targetRows.length ||
      Number(summary.DistinctSourceProfiles) !== workbookRows.length ||
      Number(summary.CanonicalProfiles) !== workbookRows.length ||
      Number(summary.LegacyPlaceholders) !== plan.legacyPlaceholders.length ||
      orphanEmployeeJobReferences !== 0 ||
      orphanPositionJobReferences !== 0;
    if (verificationFailed) {
      throw new Error(`Post-import verification failed: ${JSON.stringify({
        missingOrChangedRows,
        unexpectedRows,
        summary,
        orphanEmployeeJobReferences,
        orphanPositionJobReferences
      })}`);
    }

    const successfulVerification = {
      missingOrChangedRows,
      unexpectedRows,
      totalRows: Number(summary.TotalRows),
      distinctSourceProfiles: Number(summary.DistinctSourceProfiles),
      canonicalProfiles: Number(summary.CanonicalProfiles),
      legacyPlaceholders: Number(summary.LegacyPlaceholders),
      orphanEmployeeJobReferences,
      orphanPositionJobReferences
    };

    if (testTransaction) {
      await transaction.rollback();
      transactionStarted = false;
      const testedResult = {
        ...result,
        mode: "transaction-tested",
        databaseChanged: false,
        transientInsertedCount: insertedCount,
        verification: successfulVerification,
        artifacts: artifactPaths
      };
      fs.writeFileSync(artifactPaths.resultPath, `${JSON.stringify(testedResult, null, 2)}\n`, "utf8");
      console.log(JSON.stringify(testedResult, null, 2));
      return;
    }

    await transaction.commit();
    transactionStarted = false;
    const appliedResult = {
      ...result,
      mode: "applied",
      databaseChanged: true,
      insertedCount,
      orphanEmployeeJobReferences,
      orphanPositionJobReferences,
      verification: successfulVerification,
      artifacts: artifactPaths
    };
    try {
      fs.writeFileSync(artifactPaths.resultPath, `${JSON.stringify(appliedResult, null, 2)}\n`, "utf8");
    }
    catch (artifactError) {
      console.error(JSON.stringify({
        ...appliedResult,
        databaseCommitted: true,
        message: "The database commit succeeded, but the final audit manifest could not be written.",
        artifactError: artifactError instanceof Error ? artifactError.message : String(artifactError)
      }, null, 2));
      process.exitCode = 2;
      return;
    }
    console.log(JSON.stringify(appliedResult, null, 2));
  }
  catch (error) {
    if (transactionStarted) {
      try {
        await transaction.rollback();
      }
      catch {
        // XACT_ABORT may already have rolled back the transaction.
      }
    }
    throw error;
  }
  finally {
    await pool.close();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    message: error instanceof Error ? error.message : String(error),
    code: error?.code,
    number: error?.number,
    lineNumber: error?.lineNumber
  }, null, 2));
  process.exitCode = 1;
});
