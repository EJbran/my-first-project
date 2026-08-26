const { QueryTypes, Transaction } = require("sequelize");
const { sequelize } = require("../src/config/database");

const apply = process.argv.includes("--apply");
const expectedCountArgument = process.argv.find((argument) =>
  argument.startsWith("--expected-count=")
);
const expectedCount = expectedCountArgument
  ? Number(expectedCountArgument.slice("--expected-count=".length))
  : null;

const exactZeroPredicate =
  "LTRIM(RTRIM(CONVERT(nvarchar(100), employee.[Ref_Employee]))) = N'0'";

const toSafeCount = (value, label) => {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error(`${label} returned an invalid count`);
  }
  return count;
};

const normalizeMetrics = (row) => ({
  employeeTotal: toSafeCount(row.EmployeeTotal, "Employee total"),
  zeroEmployeeTotal: toSafeCount(row.ZeroEmployeeTotal, "Zero employee total"),
  activeZeroEmployeeTotal: toSafeCount(
    row.ActiveZeroEmployeeTotal,
    "Active zero employee total"
  ),
  positionTotal: toSafeCount(row.PositionTotal, "Position total"),
  occupiedPositions: toSafeCount(row.OccupiedPositions, "Occupied positions"),
  vacantPositions: toSafeCount(row.VacantPositions, "Vacant positions"),
  missingJobPositions: toSafeCount(row.MissingJobPositions, "Missing-job positions"),
  positionsLinkedToZeroEmployees: toSafeCount(
    row.PositionsLinkedToZeroEmployees,
    "Positions linked to zero employees"
  ),
  orphanPositionEmployees: toSafeCount(
    row.OrphanPositionEmployees,
    "Orphan position employees"
  ),
  orphanPositionJobs: toSafeCount(row.OrphanPositionJobs, "Orphan position jobs"),
  jobTotal: toSafeCount(row.JobTotal, "Job total")
});

const readMetrics = async (transaction, lockEmployeeRows = false) => {
  const employeeHint = lockEmployeeRows ? "WITH (UPDLOCK, HOLDLOCK)" : "";
  const rows = await sequelize.query(
    `
      SELECT
        (SELECT COUNT_BIG(*) FROM [dbo].[Employee]) AS [EmployeeTotal],
        (
          SELECT COUNT_BIG(*)
          FROM [dbo].[Employee] AS employee ${employeeHint}
          WHERE ${exactZeroPredicate}
        ) AS [ZeroEmployeeTotal],
        (
          SELECT COUNT_BIG(*)
          FROM [dbo].[Employee] AS employee
          WHERE ${exactZeroPredicate}
            AND TRY_CONVERT(int, employee.[State]) = 1
        ) AS [ActiveZeroEmployeeTotal],
        (SELECT COUNT_BIG(*) FROM [dbo].[Position]) AS [PositionTotal],
        (
          SELECT COUNT_BIG(*)
          FROM [dbo].[Position]
          WHERE [EmployeeId] IS NOT NULL
        ) AS [OccupiedPositions],
        (
          SELECT COUNT_BIG(*)
          FROM [dbo].[Position]
          WHERE [EmployeeId] IS NULL
        ) AS [VacantPositions],
        (
          SELECT COUNT_BIG(*)
          FROM [dbo].[Position]
          WHERE [Job_ID] IS NULL
        ) AS [MissingJobPositions],
        (
          SELECT COUNT_BIG(*)
          FROM [dbo].[Position] AS position
          INNER JOIN [dbo].[Employee] AS employee
            ON employee.[ID_Employee] = position.[EmployeeId]
          WHERE ${exactZeroPredicate}
        ) AS [PositionsLinkedToZeroEmployees],
        (
          SELECT COUNT_BIG(*)
          FROM [dbo].[Position] AS position
          LEFT JOIN [dbo].[Employee] AS linkedEmployee
            ON linkedEmployee.[ID_Employee] = position.[EmployeeId]
          WHERE position.[EmployeeId] IS NOT NULL
            AND linkedEmployee.[ID_Employee] IS NULL
        ) AS [OrphanPositionEmployees],
        (
          SELECT COUNT_BIG(*)
          FROM [dbo].[Position] AS position
          LEFT JOIN [dbo].[jobs] AS linkedJob
            ON linkedJob.[Job_ID] = position.[Job_ID]
          WHERE position.[Job_ID] IS NOT NULL
            AND linkedJob.[Job_ID] IS NULL
        ) AS [OrphanPositionJobs],
        (SELECT COUNT_BIG(*) FROM [dbo].[jobs]) AS [JobTotal];
    `,
    {
      type: QueryTypes.SELECT,
      raw: true,
      transaction
    }
  );

  if (!rows[0]) throw new Error("Database metrics query returned no row");
  return normalizeMetrics(rows[0]);
};

const assertUnchanged = (before, after, key, label) => {
  if (before[key] !== after[key]) {
    throw new Error(`${label} changed from ${before[key]} to ${after[key]}`);
  }
};

const main = async () => {
  await sequelize.authenticate();

  if (!apply) {
    const metrics = await readMetrics(undefined, false);
    console.log(JSON.stringify({ mode: "preflight", metrics }, null, 2));
    return;
  }

  if (!Number.isSafeInteger(expectedCount) || expectedCount < 1) {
    throw new Error("--apply requires --expected-count=<positive integer>");
  }

  const result = await sequelize.transaction(
    { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
    async (transaction) => {
      const before = await readMetrics(transaction, true);

      if (before.zeroEmployeeTotal !== expectedCount) {
        throw new Error(
          `Target count changed: expected ${expectedCount}, found ${before.zeroEmployeeTotal}`
        );
      }
      if (before.positionsLinkedToZeroEmployees !== 0) {
        throw new Error(
          `${before.positionsLinkedToZeroEmployees} target employees are linked to positions`
        );
      }
      if (before.orphanPositionEmployees !== 0 || before.orphanPositionJobs !== 0) {
        throw new Error("Pre-existing orphan position references were detected");
      }

      const deletionRows = await sequelize.query(
        `
          DECLARE @Deleted TABLE ([ID_Employee] int NOT NULL);

          DELETE employee
          OUTPUT DELETED.[ID_Employee] INTO @Deleted ([ID_Employee])
          FROM [dbo].[Employee] AS employee
          WHERE ${exactZeroPredicate};

          SELECT COUNT_BIG(*) AS [DeletedCount] FROM @Deleted;
        `,
        {
          type: QueryTypes.SELECT,
          raw: true,
          transaction
        }
      );
      const deletedCount = toSafeCount(
        deletionRows[0]?.DeletedCount,
        "Deleted employee total"
      );
      if (deletedCount !== expectedCount) {
        throw new Error(`Deleted ${deletedCount} rows instead of ${expectedCount}`);
      }

      const after = await readMetrics(transaction, false);
      if (after.zeroEmployeeTotal !== 0) {
        throw new Error(`${after.zeroEmployeeTotal} zero-number employee rows remain`);
      }
      if (after.employeeTotal !== before.employeeTotal - deletedCount) {
        throw new Error("Employee total did not decrease by the deleted row count");
      }

      assertUnchanged(before, after, "positionTotal", "Position total");
      assertUnchanged(before, after, "occupiedPositions", "Occupied position total");
      assertUnchanged(before, after, "vacantPositions", "Vacant position total");
      assertUnchanged(before, after, "missingJobPositions", "Missing-job total");
      assertUnchanged(before, after, "jobTotal", "Job total");

      if (
        after.positionsLinkedToZeroEmployees !== 0 ||
        after.orphanPositionEmployees !== 0 ||
        after.orphanPositionJobs !== 0
      ) {
        throw new Error("Post-delete relationship verification failed");
      }

      return { deletedCount, before, after };
    }
  );

  console.log(JSON.stringify({ mode: "applied", ...result }, null, 2));
};

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
