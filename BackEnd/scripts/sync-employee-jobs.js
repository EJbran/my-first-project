const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const sql = require("mssql");
const { connectWithMssql } = require("../src/config/database");

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function csvCell(value) {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function parseMappingRows(rawRows) {
  if (!Array.isArray(rawRows)) {
    throw new Error("Mapping JSON must contain an array of workbook rows.");
  }

  const valid = [];
  const unresolvedEmployees = [];
  const excludedVacancies = [];
  const invalidEmployeeIds = [];
  const invalidJobIds = [];
  const seenEmployeeNumbers = new Map();

  rawRows.forEach((row, index) => {
    const sourceRow = index + 2;
    const employeeNumber = String(row.Employee_ID ?? "").trim();
    const rawJobId = String(row.Job_ID ?? "").trim();
    const workbookJobName = String(row.Job_Name ?? "").trim();

    if (employeeNumber === "0") {
      excludedVacancies.push({ sourceRow, jobId: rawJobId || null, workbookJobName });
      return;
    }

    if (!/^\d+$/.test(employeeNumber) || Number(employeeNumber) <= 0) {
      invalidEmployeeIds.push({ sourceRow, employeeNumber, workbookJobName });
      return;
    }

    if (!rawJobId) {
      unresolvedEmployees.push({ sourceRow, employeeNumber, workbookJobName });
      return;
    }

    if (!/^\d+$/.test(rawJobId) || Number(rawJobId) <= 0 || Number(rawJobId) > 2147483647) {
      invalidJobIds.push({ sourceRow, employeeNumber, rawJobId, workbookJobName });
      return;
    }

    const jobId = Number(rawJobId);
    const prior = seenEmployeeNumbers.get(employeeNumber);
    if (prior) {
      throw new Error(
        `Duplicate positive employee number ${employeeNumber} at workbook rows ${prior.sourceRow} and ${sourceRow}.`
      );
    }

    const mapping = { sourceRow, employeeNumber, jobId, workbookJobName };
    seenEmployeeNumbers.set(employeeNumber, mapping);
    valid.push(mapping);
  });

  if (invalidJobIds.length > 0) {
    throw new Error(`Workbook contains ${invalidJobIds.length} invalid nonblank Job_ID value(s).`);
  }

  return {
    valid,
    unresolvedEmployees,
    excludedVacancies,
    invalidEmployeeIds,
    invalidJobIds
  };
}

async function insertMappings(transaction, mappings) {
  const chunkSize = 250;
  for (let offset = 0; offset < mappings.length; offset += chunkSize) {
    const chunk = mappings.slice(offset, offset + chunkSize);
    const request = new sql.Request(transaction);
    const values = chunk.map((mapping, index) => {
      request.input(`employeeNumber${index}`, sql.NVarChar(50), mapping.employeeNumber);
      request.input(`jobId${index}`, sql.Int, mapping.jobId);
      request.input(`sourceRow${index}`, sql.Int, mapping.sourceRow);
      request.input(`workbookJobName${index}`, sql.NVarChar(250), mapping.workbookJobName || null);
      return `(@employeeNumber${index}, @jobId${index}, @sourceRow${index}, @workbookJobName${index})`;
    });

    await request.query(`
      INSERT INTO #EmployeeJobMapping (EmployeeNumber, JobId, SourceRow, WorkbookJobName)
      VALUES ${values.join(",\n")};
    `);
  }
}

function writeBackupCsv(backupPath, rows) {
  const headers = [
    "ID_Employee",
    "Ref_Employee",
    "Previous_Job_Id",
    "New_Job_Id",
    "Workbook_Source_Row",
    "Workbook_Job_Name",
    "Database_Job_Name"
  ];
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.ID_Employee,
        row.Ref_Employee,
        row.Previous_Job_Id,
        row.New_Job_Id,
        row.Workbook_Source_Row,
        row.Workbook_Job_Name,
        row.Database_Job_Name
      ].map(csvCell).join(",")
    );
  }
  fs.writeFileSync(backupPath, `${lines.join("\r\n")}\r\n`, "utf8");
}

async function main() {
  const inputPath = readArgument("--input");
  const outputDirectory = path.resolve(readArgument("--output-dir") || "outputs/employee_job_sync");
  const sourceWorkbook = readArgument("--source-workbook");
  const applyChanges = process.argv.includes("--apply");

  if (!inputPath) {
    throw new Error("Usage: node scripts/sync-employee-jobs.js --input <mapping.json> [--source-workbook <file.xlsx>] [--output-dir <directory>] [--apply]");
  }

  const resolvedInputPath = path.resolve(inputPath);
  const rawRows = JSON.parse(fs.readFileSync(resolvedInputPath, "utf8"));
  const parsed = parseMappingRows(rawRows);
  const sourceWorkbookHash = sourceWorkbook ? await sha256File(path.resolve(sourceWorkbook)) : null;

  if (parsed.valid.length === 0) {
    throw new Error("No resolved positive employee mappings were found.");
  }

  fs.mkdirSync(outputDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[.:]/g, "-");
  const pool = await connectWithMssql();
  const transaction = new sql.Transaction(pool);
  let transactionStarted = false;

  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    transactionStarted = true;

    await new sql.Request(transaction).batch(`
      SET XACT_ABORT ON;
      CREATE TABLE #EmployeeJobMapping (
        EmployeeNumber nvarchar(50) COLLATE Arabic_CI_AS NOT NULL PRIMARY KEY,
        JobId int NOT NULL,
        SourceRow int NOT NULL,
        WorkbookJobName nvarchar(250) COLLATE Arabic_CI_AS NULL
      );
    `);

    await insertMappings(transaction, parsed.valid);

    const validationResult = await new sql.Request(transaction).query(`
      SELECT
        (SELECT COUNT(*) FROM #EmployeeJobMapping) AS StagedCount,
        (SELECT COUNT(*)
         FROM #EmployeeJobMapping m
         LEFT JOIN dbo.Employee e
           ON LTRIM(RTRIM(e.Ref_Employee)) = m.EmployeeNumber
         WHERE e.ID_Employee IS NULL) AS MissingEmployeeCount,
        (SELECT COUNT(*)
         FROM (
           SELECT m.EmployeeNumber
           FROM #EmployeeJobMapping m
           JOIN dbo.Employee e
             ON LTRIM(RTRIM(e.Ref_Employee)) = m.EmployeeNumber
           GROUP BY m.EmployeeNumber
           HAVING COUNT(*) <> 1
         ) duplicateEmployeeMatches) AS NonUniqueEmployeeMatchCount,
        (SELECT COUNT(*)
         FROM #EmployeeJobMapping m
         LEFT JOIN dbo.Job j ON j.Id = m.JobId
         WHERE j.Id IS NULL) AS MissingJobCount,
        (SELECT COUNT(*)
         FROM #EmployeeJobMapping m
         JOIN dbo.Employee e
           ON LTRIM(RTRIM(e.Ref_Employee)) = m.EmployeeNumber
         WHERE e.Job_Id IS NOT NULL AND e.Job_Id <> m.JobId) AS ConflictingExistingJobCount,
        (SELECT COUNT(*)
         FROM #EmployeeJobMapping m
         JOIN dbo.Employee e
           ON LTRIM(RTRIM(e.Ref_Employee)) = m.EmployeeNumber
         WHERE e.Job_Id = m.JobId) AS AlreadyMatchingCount,
        (SELECT COUNT(*)
         FROM #EmployeeJobMapping m
         JOIN dbo.Job j ON j.Id = m.JobId
         WHERE ISNULL(LTRIM(RTRIM(m.WorkbookJobName)), N'')
             <> ISNULL(LTRIM(RTRIM(j.Job_Name)), N'')) AS JobNameTextDifferenceCount;

      SELECT TOP (25)
        m.EmployeeNumber,
        m.SourceRow,
        m.JobId,
        m.WorkbookJobName
      FROM #EmployeeJobMapping m
      LEFT JOIN dbo.Employee e
        ON LTRIM(RTRIM(e.Ref_Employee)) = m.EmployeeNumber
      WHERE e.ID_Employee IS NULL
      ORDER BY m.SourceRow;

      SELECT TOP (25)
        m.JobId,
        m.SourceRow,
        m.WorkbookJobName
      FROM #EmployeeJobMapping m
      LEFT JOIN dbo.Job j ON j.Id = m.JobId
      WHERE j.Id IS NULL
      ORDER BY m.SourceRow;
    `);

    const validation = validationResult.recordsets[0][0];
    const validationProblems = [
      ["staged row count", Number(validation.StagedCount) !== parsed.valid.length],
      ["missing employees", Number(validation.MissingEmployeeCount) !== 0],
      ["non-unique employee matches", Number(validation.NonUniqueEmployeeMatchCount) !== 0],
      ["missing jobs", Number(validation.MissingJobCount) !== 0],
      ["conflicting existing jobs", Number(validation.ConflictingExistingJobCount) !== 0]
    ].filter(([, failed]) => failed);

    if (validationProblems.length > 0) {
      throw new Error(
        `Preflight validation failed: ${validationProblems.map(([name]) => name).join(", ")}. ` +
        JSON.stringify({
          validation,
          missingEmployeeSamples: validationResult.recordsets[1],
          missingJobSamples: validationResult.recordsets[2]
        })
      );
    }

    const beforeResult = await new sql.Request(transaction).query(`
      SELECT
        e.ID_Employee,
        e.Ref_Employee,
        e.Job_Id AS Previous_Job_Id,
        m.JobId AS New_Job_Id,
        m.SourceRow AS Workbook_Source_Row,
        m.WorkbookJobName AS Workbook_Job_Name,
        j.Job_Name AS Database_Job_Name
      FROM #EmployeeJobMapping m
      JOIN dbo.Employee e WITH (UPDLOCK, HOLDLOCK)
        ON LTRIM(RTRIM(e.Ref_Employee)) = m.EmployeeNumber
      JOIN dbo.Job j ON j.Id = m.JobId
      ORDER BY e.ID_Employee;
    `);

    let updatedCount = 0;
    let backupPath = null;

    if (applyChanges) {
      backupPath = path.join(outputDirectory, `employee-job-before-${timestamp}.csv`);
      writeBackupCsv(backupPath, beforeResult.recordset);

      const updateResult = await new sql.Request(transaction).query(`
        UPDATE e
        SET e.Job_Id = m.JobId
        FROM dbo.Employee e
        JOIN #EmployeeJobMapping m
          ON LTRIM(RTRIM(e.Ref_Employee)) = m.EmployeeNumber
        WHERE e.Job_Id IS NULL;
      `);
      updatedCount = Number(updateResult.rowsAffected[0] || 0);

      const expectedUpdateCount = parsed.valid.length - Number(validation.AlreadyMatchingCount);
      if (updatedCount !== expectedUpdateCount) {
        throw new Error(`Expected to update ${expectedUpdateCount} rows, but SQL Server updated ${updatedCount}.`);
      }

      const postValidation = await new sql.Request(transaction).query(`
        SELECT COUNT(*) AS IncorrectTargetCount
        FROM #EmployeeJobMapping m
        JOIN dbo.Employee e
          ON LTRIM(RTRIM(e.Ref_Employee)) = m.EmployeeNumber
        WHERE e.Job_Id IS NULL OR e.Job_Id <> m.JobId;
      `);
      if (Number(postValidation.recordset[0].IncorrectTargetCount) !== 0) {
        throw new Error("Post-update verification found targets with an incorrect or null Job_Id.");
      }

      await transaction.commit();
      transactionStarted = false;
    }
    else {
      await transaction.rollback();
      transactionStarted = false;
    }

    const databaseCounts = await pool.request().query(`
      SELECT
        COUNT(*) AS TotalEmployees,
        SUM(CASE WHEN Job_Id IS NULL THEN 1 ELSE 0 END) AS NullJobCount,
        SUM(CASE WHEN Job_Id IS NOT NULL THEN 1 ELSE 0 END) AS PopulatedJobCount,
        SUM(CASE WHEN LTRIM(RTRIM(ISNULL(Ref_Employee, N''))) = N'0' THEN 1 ELSE 0 END) AS VacancyCount,
        SUM(CASE WHEN LTRIM(RTRIM(ISNULL(Ref_Employee, N''))) = N'0' AND Job_Id IS NOT NULL THEN 1 ELSE 0 END) AS VacancyPopulatedJobCount,
        SUM(CASE WHEN LTRIM(RTRIM(ISNULL(Ref_Employee, N''))) = N'0' AND Job_Id IS NULL THEN 1 ELSE 0 END) AS VacancyNullJobCount,
        SUM(CASE WHEN LTRIM(RTRIM(ISNULL(Ref_Employee, N''))) NOT IN (N'', N'0') AND Job_Id IS NULL THEN 1 ELSE 0 END) AS IdentifiedEmployeeNullJobCount
      FROM dbo.Employee;
    `);

    const result = {
      mode: applyChanges ? "apply" : "dry-run",
      timestampUtc: new Date().toISOString(),
      inputPath: resolvedInputPath,
      sourceWorkbook: sourceWorkbook ? path.resolve(sourceWorkbook) : null,
      sourceWorkbookSha256: sourceWorkbookHash,
      resolvedPositiveMappings: parsed.valid.length,
      unresolvedPositiveEmployees: parsed.unresolvedEmployees.length,
      excludedVacancyRows: parsed.excludedVacancies.length,
      resolvedExcludedVacancyRows: parsed.excludedVacancies.filter((row) => row.jobId).length,
      unresolvedExcludedVacancyRows: parsed.excludedVacancies.filter((row) => !row.jobId).length,
      invalidEmployeeIdRows: parsed.invalidEmployeeIds.length,
      validation: {
        ...validation,
        StagedCount: Number(validation.StagedCount),
        MissingEmployeeCount: Number(validation.MissingEmployeeCount),
        NonUniqueEmployeeMatchCount: Number(validation.NonUniqueEmployeeMatchCount),
        MissingJobCount: Number(validation.MissingJobCount),
        ConflictingExistingJobCount: Number(validation.ConflictingExistingJobCount),
        AlreadyMatchingCount: Number(validation.AlreadyMatchingCount),
        JobNameTextDifferenceCount: Number(validation.JobNameTextDifferenceCount)
      },
      updatedCount,
      databaseCounts: databaseCounts.recordset[0],
      backupPath,
      unresolvedPositiveSamples: parsed.unresolvedEmployees.slice(0, 25),
      invalidEmployeeIdSamples: parsed.invalidEmployeeIds.slice(0, 25)
    };

    const resultPath = path.join(outputDirectory, `employee-job-sync-${applyChanges ? "applied" : "dry-run"}-${timestamp}.json`);
    fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ ...result, resultPath }, null, 2));
  }
  catch (error) {
    if (transactionStarted) {
      try {
        await transaction.rollback();
      }
      catch {
        // XACT_ABORT may already have rolled the transaction back. Preserve the original error.
      }
    }
    throw error;
  }
  finally {
    await sql.close();
  }
}

main().catch((error) => {
  if (error instanceof Error) {
    console.error(JSON.stringify({
      message: error.message,
      code: error.code,
      number: error.number,
      lineNumber: error.lineNumber,
      precedingErrors: Array.isArray(error.precedingErrors)
        ? error.precedingErrors.map((item) => ({ message: item.message, number: item.number, lineNumber: item.lineNumber }))
        : undefined
    }, null, 2));
  }
  else {
    console.error(String(error));
  }
  process.exitCode = 1;
});
