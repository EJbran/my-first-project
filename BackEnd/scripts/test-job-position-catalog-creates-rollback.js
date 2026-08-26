require("dotenv").config();
require("ts-node/register/transpile-only");

const { QueryTypes, Transaction } = require("sequelize");
const { sequelize } = require("../src/config/database");
const { createJob } = require("../src/controllers/HR/job.controller.ts");
const { createPosition } = require("../src/controllers/HR/position.controller.ts");
const { JOB_TEXT_FIELDS } = require("../src/validators/HR/job.validator.ts");

const POSITION_NUMBER = "9000000000000000000";
const POSITION_IDENTITY_GAP_ACKNOWLEDGEMENT = "I_ACCEPT_A_PERMANENT_POSITION_IDENTITY_GAP";
const allowPositionIdentityGapTest =
  process.env.HERP_POSITION_IDENTITY_GAP_TEST === POSITION_IDENTITY_GAP_ACKNOWLEDGEMENT;

const invoke = (handler, request) => new Promise((resolve, reject) => {
  let statusCode = 200;
  const response = {
    status(code) {
      statusCode = code;
      return response;
    },
    json(payload) {
      resolve({ statusCode, payload });
      return payload;
    }
  };
  Promise.resolve(handler(request, response, reject)).catch(reject);
});

const aggregateState = async (transaction) => {
  const rows = await sequelize.query(
    `
      SELECT
        (SELECT COUNT_BIG(*) FROM [dbo].[jobs]) AS [Jobs],
        (SELECT COUNT_BIG(*) FROM [dbo].[Position]) AS [Positions],
        (SELECT COUNT_BIG(*) FROM [dbo].[Position] WHERE [EmployeeId] IS NULL) AS [Vacancies];
    `,
    { type: QueryTypes.SELECT, raw: true, transaction }
  );
  return Object.fromEntries(
    Object.entries(rows[0]).map(([key, value]) => [key, Number(value ?? 0)])
  );
};

const jobPayload = (jobId) => {
  const payload = {};
  for (const field of JOB_TEXT_FIELDS) payload[field] = `Rollback QA ${field}`;
  payload.Job_Name_AR = "اختبار مؤقت لا يتم حفظه";
  payload.Job_Name_EN = "Rollback-only catalog test";
  payload.Job_Family = "Rollback QA family";
  if (jobId !== undefined) payload.Job_ID = jobId;
  return payload;
};

const positionPayload = (jobId) => ({
  positionNumber: POSITION_NUMBER,
  positionType: "Rollback QA type",
  positionLevel: "Rollback QA level",
  positionDegree: "Rollback QA degree",
  positionDateCreation: "2026-07-22",
  status: "Open",
  jobId
});

const assertSuccess = (label, result, expectedStatus) => {
  if (result.statusCode !== expectedStatus || result.payload?.success !== true) {
    throw new Error(`${label} returned HTTP ${result.statusCode}: ${JSON.stringify(result.payload)}`);
  }
};

const main = async () => {
  const baseline = await aggregateState();
  const baselineTestRows = await sequelize.query(
    `SELECT COUNT_BIG(*) AS [Total] FROM [dbo].[Position] WHERE [Position_Number] = :number;`,
    { replacements: { number: POSITION_NUMBER }, type: QueryTypes.SELECT, raw: true }
  );
  if (Number(baselineTestRows[0]?.Total ?? 0) !== 0) {
    throw new Error("The rollback-only Position_Number fixture is already in use.");
  }

  const transaction = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE
  });
  const originalTransactionMethod = sequelize.transaction;
  let transactionFinished = false;

  try {
    sequelize.transaction = async (...args) => {
      const callback = typeof args[0] === "function" ? args[0] : args[1];
      if (typeof callback !== "function") throw new Error("A transaction callback was expected.");
      return callback(transaction);
    };

    const createdJob = await invoke(createJob, { body: jobPayload() });
    assertSuccess("auto-ID job create", createdJob, 201);
    const jobId = Number(createdJob.payload?.data?.Job_ID);
    if (!Number.isSafeInteger(jobId) || jobId <= 0) {
      throw new Error("Job creation did not return its auto-allocated Job_ID.");
    }

    const duplicateJob = await invoke(createJob, { body: jobPayload(jobId) });
    if (
      duplicateJob.statusCode !== 409
      || duplicateJob.payload?.success !== false
      || duplicateJob.payload?.code !== "JOB_ID_EXISTS"
    ) {
      throw new Error(`Duplicate Job_ID was not controlled: ${JSON.stringify(duplicateJob)}`);
    }

    let expectedPositionRows = 0;
    if (allowPositionIdentityGapTest) {
      console.warn(
        "WARNING: the successful Position-create test permanently consumes two dbo.Position "
        + "IDENTITY values even though its rows are rolled back."
      );
      const firstPosition = await invoke(createPosition, { body: positionPayload(jobId) });
      assertSuccess("vacant position create", firstPosition, 201);
      if (
        firstPosition.payload?.data?.EmployeeId !== null
        || Number(firstPosition.payload?.data?.JobId) !== jobId
        || String(firstPosition.payload?.data?.Position_Number) !== POSITION_NUMBER
      ) {
        throw new Error("The created Position was not returned as the expected vacancy.");
      }

      const secondPosition = await invoke(createPosition, { body: positionPayload(jobId) });
      assertSuccess("duplicate-number position create", secondPosition, 201);
      expectedPositionRows = 2;
    }

    const missingJob = await invoke(createPosition, {
      body: positionPayload(jobId + 1)
    });
    if (
      missingJob.statusCode !== 404
      || missingJob.payload?.success !== false
      || missingJob.payload?.code !== "JOB_NOT_FOUND"
    ) {
      throw new Error(`Missing job was not controlled: ${JSON.stringify(missingJob)}`);
    }

    const insideRows = await sequelize.query(
      `
        SELECT
          (SELECT COUNT_BIG(*) FROM [dbo].[jobs] WHERE [Job_ID] = :jobId) AS [Jobs],
          (SELECT COUNT_BIG(*) FROM [dbo].[Position]
            WHERE [Position_Number] = :positionNumber
              AND [Job_ID] = :jobId
              AND [EmployeeId] IS NULL) AS [Positions];
      `,
      {
        replacements: { jobId, positionNumber: POSITION_NUMBER },
        type: QueryTypes.SELECT,
        raw: true,
        transaction
      }
    );
    if (
      Number(insideRows[0]?.Jobs) !== 1
      || Number(insideRows[0]?.Positions) !== expectedPositionRows
    ) {
      throw new Error(`Catalog rows were not visible atomically: ${JSON.stringify(insideRows[0])}`);
    }

    await transaction.rollback();
    transactionFinished = true;
    sequelize.transaction = originalTransactionMethod;

    const after = await aggregateState();
    const persistentRows = await sequelize.query(
      `
        SELECT COUNT_BIG(*) AS [Total]
        FROM [dbo].[Position]
        WHERE [Position_Number] = :positionNumber;
      `,
      {
        replacements: { positionNumber: POSITION_NUMBER },
        type: QueryTypes.SELECT,
        raw: true
      }
    );
    if (JSON.stringify(after) !== JSON.stringify(baseline)) {
      throw new Error(`Rollback changed catalog aggregates: ${JSON.stringify({ baseline, after })}`);
    }
    if (Number(persistentRows[0]?.Total ?? 0) !== 0) {
      throw new Error("Rollback-only positions persisted unexpectedly.");
    }

    console.log(JSON.stringify({
      status: "passed-and-rolled-back",
      checks: {
        jobAutoIdAllocated: true,
        duplicateJobIdRejected: true,
        positionCreateSuccess: allowPositionIdentityGapTest
          ? "passed-with-explicit-permanent-identity-gap-acknowledgement"
          : "skipped-to-protect-the-live-identity-sequence",
        duplicatePositionNumbersPermitted: allowPositionIdentityGapTest
          ? "passed-with-explicit-permanent-identity-gap-acknowledgement"
          : "not-run-against-live-database",
        missingJobRejectedBeforePositionInsert: true,
        persistentRows: 0
      },
      aggregateStateBefore: baseline,
      aggregateStateAfter: after,
      safety: allowPositionIdentityGapTest
        ? "dbo.Position identity values were permanently consumed; inserted rows were rolled back."
        : `Set HERP_POSITION_IDENTITY_GAP_TEST=${POSITION_IDENTITY_GAP_ACKNOWLEDGEMENT} only on an isolated disposable database to test successful Position inserts.`,
      privacy: "Only aggregate counts and booleans are printed."
    }, null, 2));
  } finally {
    sequelize.transaction = originalTransactionMethod;
    if (!transactionFinished) {
      try {
        await transaction.rollback();
      } catch (_error) {
        // Closing the connection releases transaction-owned application locks.
      }
    }
    await sequelize.close();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
