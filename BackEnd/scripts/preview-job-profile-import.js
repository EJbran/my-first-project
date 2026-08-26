require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { connectWithMssql } = require("../src/config/database");

const requiredWorkbookColumns = [
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

const text = (value) => value === null || value === undefined ? "" : String(value).trim();

const normalize = (value) => text(value)
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

const loadWorkbookRows = (filePath) => {
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const rows = Array.isArray(payload) ? payload : payload.rows;
  const headers = Array.isArray(payload.headers)
    ? payload.headers
    : (Array.isArray(rows) && rows.length > 0 ? Object.keys(rows[0]) : []);
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Expected a workbook JSON dump with a non-empty row array");
  }

  const missingColumns = requiredWorkbookColumns.filter((column) => !headers.includes(column));
  if (missingColumns.length > 0) {
    throw new Error(`Workbook is missing required columns: ${missingColumns.join(", ")}`);
  }

  const ids = new Set();
  for (const row of rows) {
    const id = Number(row.Job_ID);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error(`Invalid Job_ID: ${row.Job_ID}`);
    }
    if (ids.has(id)) {
      throw new Error(`Duplicate Job_ID: ${id}`);
    }
    ids.add(id);
  }

  return rows;
};

const main = async () => {
  const dumpPath = process.argv[2];
  if (!dumpPath) {
    throw new Error("Usage: node scripts/preview-job-profile-import.js <workbook-dump.json>");
  }

  const rows = loadWorkbookRows(path.resolve(dumpPath));
  const pool = await connectWithMssql();
  try {
    const [jobsResult, employeeReferencesResult] = await Promise.all([
      pool.request().query(`
        SELECT Id, Job_Name, Job_Name_en
        FROM dbo.Job
        ORDER BY Id;
      `),
      pool.request().query(`
        SELECT TRY_CONVERT(int, Job_Id) AS JobId, COUNT_BIG(*) AS EmployeeCount
        FROM dbo.employee
        WHERE TRY_CONVERT(int, Job_Id) IS NOT NULL
        GROUP BY TRY_CONVERT(int, Job_Id);
      `)
    ]);

    const existingRows = jobsResult.recordset;
    const existingById = new Map(existingRows.map((row) => [Number(row.Id), row]));
    const employeeCountByJobId = new Map(
      employeeReferencesResult.recordset.map((row) => [Number(row.JobId), Number(row.EmployeeCount)])
    );
    const existingIdsByArabicName = new Map();
    for (const row of existingRows) {
      const key = normalize(row.Job_Name);
      if (!key) continue;
      const ids = existingIdsByArabicName.get(key) ?? [];
      ids.push(Number(row.Id));
      existingIdsByArabicName.set(key, ids);
    }

    let insertCount = 0;
    let updateCount = 0;
    let sameArabicCount = 0;
    let differentArabicCount = 0;
    let blankExistingArabicCount = 0;
    let sameEnglishCount = 0;
    let differentEnglishCount = 0;
    let blankExistingEnglishCount = 0;
    let referencedCollisionCount = 0;
    let referencedEmployees = 0;
    let sameArabicDifferentIdCount = 0;
    const conflicts = [];
    const sameNameDifferentId = [];

    for (const workbookRow of rows) {
      const id = Number(workbookRow.Job_ID);
      const existing = existingById.get(id);
      const employeeCount = employeeCountByJobId.get(id) ?? 0;
      if (!existing) {
        insertCount += 1;
      } else {
        updateCount += 1;
        const currentArabic = normalize(existing.Job_Name);
        const workbookArabic = normalize(workbookRow.Job_Name_AR);
        const currentEnglish = normalize(existing.Job_Name_en);
        const workbookEnglish = normalize(workbookRow.Job_Name_EN);

        if (!currentArabic) blankExistingArabicCount += 1;
        else if (currentArabic === workbookArabic) sameArabicCount += 1;
        else differentArabicCount += 1;

        if (!currentEnglish) blankExistingEnglishCount += 1;
        else if (currentEnglish === workbookEnglish) sameEnglishCount += 1;
        else differentEnglishCount += 1;

        if (currentArabic && currentArabic !== workbookArabic) {
          if (employeeCount > 0) {
            referencedCollisionCount += 1;
            referencedEmployees += employeeCount;
          }
          if (conflicts.length < 30) {
            conflicts.push({
              id,
              currentArabic: text(existing.Job_Name),
              workbookArabic: text(workbookRow.Job_Name_AR),
              workbookEnglish: text(workbookRow.Job_Name_EN),
              employeeCount
            });
          }
        }
      }

      const matchingExistingIds = (existingIdsByArabicName.get(normalize(workbookRow.Job_Name_AR)) ?? [])
        .filter((existingId) => existingId !== id);
      if (matchingExistingIds.length > 0) {
        sameArabicDifferentIdCount += 1;
        if (sameNameDifferentId.length < 30) {
          sameNameDifferentId.push({
            workbookId: id,
            workbookArabic: text(workbookRow.Job_Name_AR),
            existingIds: matchingExistingIds,
            employeeCountAtWorkbookId: employeeCount
          });
        }
      }
    }

    const workbookIds = new Set(rows.map((row) => Number(row.Job_ID)));
    const untouchedExistingCount = existingRows.filter((row) => !workbookIds.has(Number(row.Id))).length;

    console.log(JSON.stringify({
      workbookRows: rows.length,
      existingJobRows: existingRows.length,
      insertCount,
      updateCount,
      untouchedExistingCount,
      idCollisionAnalysis: {
        sameArabicCount,
        differentArabicCount,
        blankExistingArabicCount,
        sameEnglishCount,
        differentEnglishCount,
        blankExistingEnglishCount,
        referencedCollisionCount,
        referencedEmployees,
        sameArabicDifferentIdCount
      },
      conflictExamples: conflicts,
      sameArabicDifferentIdExamples: sameNameDifferentId
    }, null, 2));
  } finally {
    await pool.close();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
