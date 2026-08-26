require("dotenv").config();
require("ts-node/register/transpile-only");

const { QueryTypes, Transaction } = require("sequelize");
const { sequelize } = require("../src/config/database");
const { createEmployee } = require("../src/controllers/HR/employee.controller.ts");

const TEST_EMPLOYEE_NUMBER = "CODEX-POSITION-CREATE-ROLLBACK";
const TEST_CONFLICT_EMPLOYEE_NUMBER = "CODEX-POSITION-CREATE-CONFLICT";
const CONTRACT_START = "2026-07-22";

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

const aggregatePositionState = async () => {
  const rows = await sequelize.query(
    `
      SELECT
        COUNT_BIG(*) AS [TotalPositions],
        SUM(CASE WHEN [EmployeeId] IS NULL THEN 1 ELSE 0 END) AS [VacantPositions],
        SUM(CASE WHEN [EmployeeId] IS NOT NULL THEN 1 ELSE 0 END) AS [OccupiedPositions]
      FROM [dbo].[Position];
    `,
    { type: QueryTypes.SELECT, raw: true }
  );
  return Object.fromEntries(
    Object.entries(rows[0]).map(([key, value]) => [key, Number(value ?? 0)])
  );
};

const ensureTestEmployeesDoNotExist = async () => {
  const rows = await sequelize.query(
    `
      SELECT COUNT_BIG(*) AS [TestEmployees]
      FROM [dbo].[Employee]
      WHERE [Ref_Employee] IN (:employeeNumber, :conflictEmployeeNumber);
    `,
    {
      replacements: {
        employeeNumber: TEST_EMPLOYEE_NUMBER,
        conflictEmployeeNumber: TEST_CONFLICT_EMPLOYEE_NUMBER
      },
      type: QueryTypes.SELECT,
      raw: true
    }
  );
  if (Number(rows[0]?.TestEmployees) !== 0) {
    throw new Error("A prior atomic-create test employee exists; manual review is required before testing.");
  }
};

const employeePayload = (employeeNumber, positionId) => ({
  body: {
    Ref_Employee: employeeNumber,
    EmployeeName: "اختبار إنشاء ذري",
    EmployeeName_En: "Atomic Create Rollback Test",
    Gender: null,
    DateOFBirth: null,
    Phone: null,
    Email: null,
    State: true,
    Contract_Type: null,
    Start_of_Contract: CONTRACT_START,
    Type_Employee: null,
    Location_Id: null,
    positionAssignment: { positionId }
  }
});

const main = async () => {
  await ensureTestEmployeesDoNotExist();
  const baseline = await aggregatePositionState();

  const [vacantRows, occupiedRows] = await Promise.all([
    sequelize.query(
      `
        SELECT TOP (1) [Id] AS [PositionId]
        FROM [dbo].[Position]
        WHERE [EmployeeId] IS NULL
        ORDER BY [Id];
      `,
      { type: QueryTypes.SELECT, raw: true }
    ),
    sequelize.query(
      `
        SELECT TOP (1) [Id] AS [PositionId], [EmployeeId]
        FROM [dbo].[Position]
        WHERE [EmployeeId] IS NOT NULL
        ORDER BY [Id];
      `,
      { type: QueryTypes.SELECT, raw: true }
    )
  ]);

  const vacantPositionId = Number(vacantRows[0]?.PositionId);
  const occupiedPositionId = Number(occupiedRows[0]?.PositionId);
  const occupiedPositionEmployeeId = Number(occupiedRows[0]?.EmployeeId);
  if (
    !Number.isSafeInteger(vacantPositionId)
    || !Number.isSafeInteger(occupiedPositionId)
    || !Number.isSafeInteger(occupiedPositionEmployeeId)
  ) {
    throw new Error("Safe vacant and occupied position fixtures were not available.");
  }

  const transaction = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE
  });
  const originalTransactionMethod = sequelize.transaction;
  let transactionFinished = false;

  try {
    sequelize.transaction = async (callback) => callback(transaction);
    const createResult = await invoke(
      createEmployee,
      employeePayload(TEST_EMPLOYEE_NUMBER, vacantPositionId)
    );
    if (createResult.statusCode !== 201 || createResult.payload?.success !== true) {
      throw new Error(`Atomic create returned HTTP ${createResult.statusCode}: ${JSON.stringify(createResult.payload)}`);
    }

    const employeeId = Number(createResult.payload?.data?.ID_Employee);
    if (
      !Number.isSafeInteger(employeeId)
      || Number(createResult.payload?.data?.CurrentPositionId) !== vacantPositionId
    ) {
      throw new Error("Atomic create did not return its current position.");
    }

    const insideRows = await sequelize.query(
      `
        SELECT
          (SELECT COUNT_BIG(*) FROM [dbo].[Employee]
            WHERE [ID_Employee] = :employeeId AND [Ref_Employee] = :employeeNumber) AS [EmployeeRows],
          (SELECT COUNT_BIG(*) FROM [dbo].[Position]
            WHERE [Id] = :positionId AND [EmployeeId] = :employeeId) AS [PositionRows];
      `,
      {
        replacements: {
          employeeId,
          employeeNumber: TEST_EMPLOYEE_NUMBER,
          positionId: vacantPositionId
        },
        type: QueryTypes.SELECT,
        raw: true,
        transaction
      }
    );
    if (Number(insideRows[0]?.EmployeeRows) !== 1 || Number(insideRows[0]?.PositionRows) !== 1) {
      throw new Error(`Employee and position were not visible atomically: ${JSON.stringify(insideRows[0])}`);
    }

    await transaction.rollback();
    transactionFinished = true;
    sequelize.transaction = originalTransactionMethod;

    const rollbackRows = await sequelize.query(
      `
        SELECT
          (SELECT COUNT_BIG(*) FROM [dbo].[Employee]
            WHERE [Ref_Employee] = :employeeNumber) AS [EmployeeRows],
          (SELECT COUNT_BIG(*) FROM [dbo].[Position]
            WHERE [Id] = :positionId AND [EmployeeId] IS NULL) AS [VacantPositionRows];
      `,
      {
        replacements: {
          employeeNumber: TEST_EMPLOYEE_NUMBER,
          positionId: vacantPositionId
        },
        type: QueryTypes.SELECT,
        raw: true
      }
    );
    if (Number(rollbackRows[0]?.EmployeeRows) !== 0 || Number(rollbackRows[0]?.VacantPositionRows) !== 1) {
      throw new Error(`Atomic-create rollback left persistent state: ${JSON.stringify(rollbackRows[0])}`);
    }

    const conflictResult = await invoke(
      createEmployee,
      employeePayload(TEST_CONFLICT_EMPLOYEE_NUMBER, occupiedPositionId)
    );
    if (
      conflictResult.statusCode !== 409
      || conflictResult.payload?.success !== false
      || conflictResult.payload?.code !== "POSITION_OCCUPIED"
    ) {
      throw new Error(`Occupied-position create was not rejected cleanly: ${JSON.stringify(conflictResult)}`);
    }

    const conflictRows = await sequelize.query(
      `
        SELECT
          (SELECT COUNT_BIG(*) FROM [dbo].[Employee]
            WHERE [Ref_Employee] = :employeeNumber) AS [EmployeeRows],
          (SELECT COUNT_BIG(*) FROM [dbo].[Position]
            WHERE [Id] = :positionId AND [EmployeeId] = :expectedEmployeeId) AS [OriginalOccupantRows];
      `,
      {
        replacements: {
          employeeNumber: TEST_CONFLICT_EMPLOYEE_NUMBER,
          positionId: occupiedPositionId,
          expectedEmployeeId: occupiedPositionEmployeeId
        },
        type: QueryTypes.SELECT,
        raw: true
      }
    );
    if (Number(conflictRows[0]?.EmployeeRows) !== 0 || Number(conflictRows[0]?.OriginalOccupantRows) !== 1) {
      throw new Error(`Occupied-position conflict changed persistent state: ${JSON.stringify(conflictRows[0])}`);
    }

    const after = await aggregatePositionState();
    if (JSON.stringify(after) !== JSON.stringify(baseline)) {
      throw new Error(`Atomic-create tests changed aggregate position state: ${JSON.stringify({ baseline, after })}`);
    }

    console.log(JSON.stringify({
      status: "passed-and-rolled-back",
      employeeAndPositionCreatedAtomically: true,
      occupiedPositionRejectedBeforeEmployeeInsert: true,
      aggregateStateBefore: baseline,
      aggregateStateAfter: after,
      persistentTestEmployees: 0,
      persistentPositionChanges: 0,
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
