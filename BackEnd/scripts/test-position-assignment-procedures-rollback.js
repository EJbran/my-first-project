require("dotenv").config();

const sql = require("mssql");
const { connectWithMssql } = require("../src/config/database");

const EFFECTIVE_DATE = "2026-07-23";
const END_DATE = "2026-07-24";
const SECOND_ASSIGNMENT_DATE = "2026-07-25";
const ACTOR = "integration-test:rollback";

const execute = async (transaction, statement, inputs) => {
  const request = new sql.Request(transaction);
  for (const [name, definition] of Object.entries(inputs)) {
    request.input(name, definition.type, definition.value);
  }
  return request.query(statement);
};

const main = async () => {
  const pool = await connectWithMssql();
  const transaction = new sql.Transaction(pool);
  let started = false;

  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    started = true;

    const fixtures = await new sql.Request(transaction).query(`
      SELECT TOP (1) e.ID_Employee AS EmployeeId
      FROM dbo.Employee AS e
      WHERE NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(100), e.Ref_Employee))), N'') IS NOT NULL
        AND (
          TRY_CONVERT(decimal(38,10), e.Ref_Employee) IS NULL
          OR TRY_CONVERT(decimal(38,10), e.Ref_Employee) <> 0
        )
        AND NOT EXISTS (
          SELECT 1 FROM dbo.PositionAssignment AS pa
          WHERE pa.EmployeeId = e.ID_Employee
            AND pa.IsPrimary = 1
            AND pa.IsCancelled = 0
            AND pa.EffectiveTo IS NULL
        )
      ORDER BY e.ID_Employee;

      SELECT TOP (2) PositionId
      FROM dbo.vw_VacantPositions
      ORDER BY PositionId;

      SELECT TOP (1)
        pa.EmployeeId,
        pa.PositionAssignmentId,
        pa.PositionId
      FROM dbo.PositionAssignment AS pa
      WHERE pa.IsPrimary = 1
        AND pa.IsCancelled = 0
        AND pa.EffectiveTo IS NULL
      ORDER BY pa.PositionAssignmentId;
    `);

    const unassignedEmployeeId = Number(fixtures.recordsets[0][0]?.EmployeeId);
    const vacantPositionIds = fixtures.recordsets[1].map((row) => Number(row.PositionId));
    const transferFixture = fixtures.recordsets[2][0];
    if (!Number.isSafeInteger(unassignedEmployeeId) || vacantPositionIds.length < 2 || !transferFixture) {
      throw new Error("Could not find safe assignment test fixtures.");
    }

    const assignmentResult = await execute(
      transaction,
      `EXEC dbo.usp_AssignEmployeeToPosition
        @PositionId=@PositionId, @EmployeeId=@EmployeeId, @EffectiveFrom=@EffectiveFrom,
        @Actor=@Actor, @AssignmentReason=N'Rollback integration test';`,
      {
        PositionId: { type: sql.Int, value: vacantPositionIds[0] },
        EmployeeId: { type: sql.Int, value: unassignedEmployeeId },
        EffectiveFrom: { type: sql.Date, value: EFFECTIVE_DATE },
        Actor: { type: sql.NVarChar(128), value: ACTOR }
      }
    );
    const firstAssignmentId = Number(assignmentResult.recordset[0]?.PositionAssignmentId);
    if (!Number.isSafeInteger(firstAssignmentId)) throw new Error("Assign procedure returned no assignment ID.");

    await execute(
      transaction,
      `EXEC dbo.usp_EndPositionAssignment
        @PositionAssignmentId=@AssignmentId, @EffectiveTo=@EffectiveTo,
        @EndReason=N'Rollback integration test', @Actor=@Actor;`,
      {
        AssignmentId: { type: sql.BigInt, value: firstAssignmentId },
        EffectiveTo: { type: sql.Date, value: END_DATE },
        Actor: { type: sql.NVarChar(128), value: ACTOR }
      }
    );

    const secondAssignmentResult = await execute(
      transaction,
      `EXEC dbo.usp_AssignEmployeeToPosition
        @PositionId=@PositionId, @EmployeeId=@EmployeeId, @EffectiveFrom=@EffectiveFrom,
        @Actor=@Actor, @AssignmentReason=N'Rollback integration test cancellation';`,
      {
        PositionId: { type: sql.Int, value: vacantPositionIds[0] },
        EmployeeId: { type: sql.Int, value: unassignedEmployeeId },
        EffectiveFrom: { type: sql.Date, value: SECOND_ASSIGNMENT_DATE },
        Actor: { type: sql.NVarChar(128), value: ACTOR }
      }
    );
    const secondAssignmentId = Number(secondAssignmentResult.recordset[0]?.PositionAssignmentId);

    await execute(
      transaction,
      `EXEC dbo.usp_CancelPositionAssignment
        @PositionAssignmentId=@AssignmentId,
        @CancellationReason=N'Rollback integration test', @Actor=@Actor;`,
      {
        AssignmentId: { type: sql.BigInt, value: secondAssignmentId },
        Actor: { type: sql.NVarChar(128), value: ACTOR }
      }
    );

    const transferResult = await execute(
      transaction,
      `EXEC dbo.usp_TransferEmployeePosition
        @EmployeeId=@EmployeeId, @ToPositionId=@ToPositionId,
        @EffectiveDate=@EffectiveDate, @Actor=@Actor,
        @AssignmentReason=N'Rollback integration test transfer';`,
      {
        EmployeeId: { type: sql.Int, value: Number(transferFixture.EmployeeId) },
        ToPositionId: { type: sql.Int, value: vacantPositionIds[1] },
        EffectiveDate: { type: sql.Date, value: EFFECTIVE_DATE },
        Actor: { type: sql.NVarChar(128), value: ACTOR }
      }
    );
    const transferredAssignmentId = Number(transferResult.recordset[0]?.PositionAssignmentId);
    if (!Number.isSafeInteger(transferredAssignmentId)) {
      throw new Error("Transfer procedure returned no assignment ID.");
    }

    const assertions = await new sql.Request(transaction).query(`
      SELECT
        (SELECT COUNT_BIG(*) FROM dbo.PositionAssignment WHERE PositionAssignmentId IN (${firstAssignmentId}, ${secondAssignmentId}) ) AS tested_assignment_rows,
        (SELECT COUNT_BIG(*) FROM dbo.PositionAssignment WHERE PositionAssignmentId = ${secondAssignmentId} AND IsCancelled = 1) AS cancelled_rows,
        (SELECT COUNT_BIG(*) FROM dbo.PositionAssignment WHERE PositionAssignmentId = ${transferredAssignmentId}) AS transfer_rows,
        (SELECT COUNT_BIG(*) FROM dbo.PositionAssignment WHERE PositionAssignmentId = ${Number(transferFixture.PositionAssignmentId)} AND EffectiveTo = CONVERT(date, '${EFFECTIVE_DATE}', 23)) AS closed_transfer_source_rows;
    `);
    const result = assertions.recordset[0];
    if (
      Number(result.tested_assignment_rows) !== 2
      || Number(result.cancelled_rows) !== 1
      || Number(result.transfer_rows) !== 1
      || Number(result.closed_transfer_source_rows) !== 1
    ) {
      throw new Error(`Procedure assertions failed: ${JSON.stringify(result)}`);
    }

    await transaction.rollback();
    started = false;

    const after = await pool.request().query(`
      SELECT
        COUNT_BIG(*) AS assignment_count,
        SUM(CASE WHEN IsCancelled = 1 THEN 1 ELSE 0 END) AS cancelled_count,
        SUM(CASE WHEN EffectiveTo IS NOT NULL THEN 1 ELSE 0 END) AS ended_count
      FROM dbo.PositionAssignment;
    `);
    const afterRow = after.recordset[0];
    if (
      Number(afterRow.assignment_count) !== 4614
      || Number(afterRow.cancelled_count) !== 0
      || Number(afterRow.ended_count) !== 0
    ) {
      throw new Error(`Rollback did not restore the opening balance: ${JSON.stringify(afterRow)}`);
    }

    console.log(JSON.stringify({
      status: "passed-and-rolled-back",
      procedures: ["assign", "end", "cancel", "transfer"],
      liveAssignmentCountAfterRollback: Number(afterRow.assignment_count),
      persistentTestRows: 0
    }, null, 2));
  } finally {
    if (started) {
      try {
        await transaction.rollback();
      } catch (_error) {
        // Preserve the original failure; connection close releases transaction-owned locks.
      }
    }
    await pool.close();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
