require("dotenv").config();
require("ts-node/register/transpile-only");

const { QueryTypes, Transaction } = require("sequelize");
const { sequelize } = require("../src/config/database");
const {
  assignEmployeeToPosition,
  releaseEmployeePosition,
  transferEmployeePosition
} = require("../src/controllers/HR/position.controller.ts");

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

const assertResponse = (label, result, expectedStatus) => {
  if (result.statusCode !== expectedStatus || result.payload?.success !== true) {
    throw new Error(`${label} returned HTTP ${result.statusCode}: ${JSON.stringify(result.payload)}`);
  }
};

const readAggregateState = async (transaction) => {
  const rows = await sequelize.query(
    `
      SELECT
        COUNT_BIG(*) AS [TotalPositions],
        SUM(CASE WHEN [EmployeeId] IS NULL THEN 1 ELSE 0 END) AS [VacantPositions],
        SUM(CASE WHEN [EmployeeId] IS NOT NULL THEN 1 ELSE 0 END) AS [OccupiedPositions],
        COUNT_BIG(DISTINCT CASE WHEN [EmployeeId] IS NOT NULL THEN [EmployeeId] END) AS [AssignedEmployees]
      FROM [dbo].[Position];
    `,
    { type: QueryTypes.SELECT, raw: true, transaction }
  );
  return Object.fromEntries(
    Object.entries(rows[0]).map(([key, value]) => [key, Number(value ?? 0)])
  );
};

const main = async () => {
  const baseline = await readAggregateState();
  const [employeeRows, positionRows] = await Promise.all([
    sequelize.query(
      `
        SELECT TOP (1) employee.[ID_Employee] AS [EmployeeId]
        FROM [dbo].[Employee] AS employee
        WHERE NOT EXISTS (
          SELECT 1
          FROM [dbo].[Position] AS position
          WHERE position.[EmployeeId] = employee.[ID_Employee]
        )
          AND NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(100), employee.[Ref_Employee]))), N'') IS NOT NULL
          AND (
            TRY_CONVERT(decimal(38,10), employee.[Ref_Employee]) IS NULL
            OR TRY_CONVERT(decimal(38,10), employee.[Ref_Employee]) <> 0
          )
        ORDER BY employee.[ID_Employee];
      `,
      { type: QueryTypes.SELECT, raw: true }
    ),
    sequelize.query(
      `
        SELECT TOP (2) [Id] AS [PositionId]
        FROM [dbo].[Position]
        WHERE [EmployeeId] IS NULL
        ORDER BY [Id];
      `,
      { type: QueryTypes.SELECT, raw: true }
    )
  ]);

  const employeeId = Number(employeeRows[0]?.EmployeeId);
  const positionIds = positionRows.map((row) => Number(row.PositionId));
  if (!Number.isSafeInteger(employeeId) || positionIds.length !== 2) {
    throw new Error("Safe unassigned-employee and vacant-position fixtures were not available.");
  }

  const transaction = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE
  });
  const originalTransactionMethod = sequelize.transaction;
  let transactionFinished = false;

  try {
    sequelize.transaction = async (callback) => callback(transaction);

    const assigned = await invoke(assignEmployeeToPosition, {
      body: { employeeId, positionId: positionIds[0] }
    });
    assertResponse("assign", assigned, 201);

    const transferred = await invoke(transferEmployeePosition, {
      body: { employeeId, positionId: positionIds[1] }
    });
    assertResponse("transfer", transferred, 200);

    const afterTransfer = await sequelize.query(
      `
        SELECT
          SUM(CASE WHEN [Id] = :sourcePositionId AND [EmployeeId] IS NULL THEN 1 ELSE 0 END) AS [ReleasedSource],
          SUM(CASE WHEN [Id] = :targetPositionId AND [EmployeeId] = :employeeId THEN 1 ELSE 0 END) AS [OccupiedTarget]
        FROM [dbo].[Position]
        WHERE [Id] IN (:sourcePositionId, :targetPositionId);
      `,
      {
        replacements: {
          sourcePositionId: positionIds[0],
          targetPositionId: positionIds[1],
          employeeId
        },
        type: QueryTypes.SELECT,
        raw: true,
        transaction
      }
    );
    if (Number(afterTransfer[0]?.ReleasedSource) !== 1 || Number(afterTransfer[0]?.OccupiedTarget) !== 1) {
      throw new Error(`Transfer state assertion failed: ${JSON.stringify(afterTransfer[0])}`);
    }

    const released = await invoke(releaseEmployeePosition, { body: { employeeId } });
    assertResponse("release", released, 200);

    const afterRelease = await sequelize.query(
      `
        SELECT
          SUM(CASE WHEN [EmployeeId] IS NULL THEN 1 ELSE 0 END) AS [VacantTestPositions],
          SUM(CASE WHEN [EmployeeId] = :employeeId THEN 1 ELSE 0 END) AS [EmployeeAssignments]
        FROM [dbo].[Position]
        WHERE [Id] IN (:sourcePositionId, :targetPositionId);
      `,
      {
        replacements: {
          sourcePositionId: positionIds[0],
          targetPositionId: positionIds[1],
          employeeId
        },
        type: QueryTypes.SELECT,
        raw: true,
        transaction
      }
    );
    if (Number(afterRelease[0]?.VacantTestPositions) !== 2 || Number(afterRelease[0]?.EmployeeAssignments) !== 0) {
      throw new Error(`Release state assertion failed: ${JSON.stringify(afterRelease[0])}`);
    }

    await transaction.rollback();
    transactionFinished = true;
    sequelize.transaction = originalTransactionMethod;

    const afterRollback = await readAggregateState();
    if (JSON.stringify(afterRollback) !== JSON.stringify(baseline)) {
      throw new Error(`Rollback changed aggregate position state: ${JSON.stringify({ baseline, afterRollback })}`);
    }

    const restoredFixtures = await sequelize.query(
      `
        SELECT
          SUM(CASE WHEN [EmployeeId] IS NULL THEN 1 ELSE 0 END) AS [VacantTestPositions],
          SUM(CASE WHEN [EmployeeId] = :employeeId THEN 1 ELSE 0 END) AS [EmployeeAssignments]
        FROM [dbo].[Position]
        WHERE [Id] IN (:sourcePositionId, :targetPositionId);
      `,
      {
        replacements: {
          sourcePositionId: positionIds[0],
          targetPositionId: positionIds[1],
          employeeId
        },
        type: QueryTypes.SELECT,
        raw: true
      }
    );
    if (Number(restoredFixtures[0]?.VacantTestPositions) !== 2 || Number(restoredFixtures[0]?.EmployeeAssignments) !== 0) {
      throw new Error(`Rollback did not restore the selected fixtures: ${JSON.stringify(restoredFixtures[0])}`);
    }

    console.log(JSON.stringify({
      status: "passed-and-rolled-back",
      operations: ["assign", "transfer", "release"],
      aggregateStateBefore: baseline,
      aggregateStateAfter: afterRollback,
      persistentChanges: 0,
      privacy: "Only aggregate counts are printed."
    }, null, 2));
  } finally {
    sequelize.transaction = originalTransactionMethod;
    if (!transactionFinished) {
      try {
        await transaction.rollback();
      } catch (_error) {
        // Preserve the original failure; closing the connection releases transaction-owned locks.
      }
    }
    await sequelize.close();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
