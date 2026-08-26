require("dotenv").config();

const sql = require("mssql");
const { connectWithMssql } = require("../src/config/database");

const inspect = async (request) => {
  const result = await request.query(`
    SELECT
      c.name AS column_name,
      t.name AS data_type,
      c.max_length,
      c.is_nullable,
      c.is_identity,
      c.is_computed
    FROM sys.columns AS c
    JOIN sys.types AS t ON c.user_type_id = t.user_type_id
    WHERE c.object_id = OBJECT_ID(N'dbo.Position')
      AND c.name IN (N'EmployeeId', N'Ref_Employee')
    ORDER BY c.column_id;

    SELECT
      COUNT_BIG(*) AS row_count,
      SUM(CASE WHEN [Ref_Employee] IS NULL THEN 1 ELSE 0 END) AS null_ref_rows,
      SUM(CASE WHEN [Ref_Employee] = 0 THEN 1 ELSE 0 END) AS vacancy_rows,
      SUM(CASE WHEN [EmployeeId] IS NULL THEN 1 ELSE 0 END) AS null_employee_id_rows,
      SUM(CASE WHEN [EmployeeId] IS NOT NULL
                    AND ([Ref_Employee] IS NULL OR [EmployeeId] <> [Ref_Employee])
               THEN 1 ELSE 0 END) AS conflict_rows
    FROM [dbo].[Position];

    ;WITH target_column AS (
      SELECT c.object_id, c.column_id
      FROM sys.columns AS c
      WHERE c.object_id = OBJECT_ID(N'dbo.Position')
        AND c.name = N'Ref_Employee'
    )
    SELECT dependency_type, dependency_name
    FROM (
      SELECT
        N'INDEX' AS dependency_type,
        i.name AS dependency_name
      FROM target_column AS target
      JOIN sys.index_columns AS ic
        ON ic.object_id = target.object_id
       AND ic.column_id = target.column_id
      JOIN sys.indexes AS i
        ON i.object_id = ic.object_id
       AND i.index_id = ic.index_id

      UNION ALL

      SELECT
        N'FOREIGN_KEY',
        fk.name
      FROM target_column AS target
      JOIN sys.foreign_key_columns AS fkc
        ON (fkc.parent_object_id = target.object_id AND fkc.parent_column_id = target.column_id)
        OR (fkc.referenced_object_id = target.object_id AND fkc.referenced_column_id = target.column_id)
      JOIN sys.foreign_keys AS fk ON fk.object_id = fkc.constraint_object_id

      UNION ALL

      SELECT
        N'DEFAULT_CONSTRAINT',
        dc.name
      FROM target_column AS target
      JOIN sys.default_constraints AS dc
        ON dc.parent_object_id = target.object_id
       AND dc.parent_column_id = target.column_id

      UNION ALL

      SELECT DISTINCT
        N'EXPRESSION_DEPENDENCY',
        COALESCE(OBJECT_SCHEMA_NAME(sed.referencing_id) + N'.', N'')
          + COALESCE(OBJECT_NAME(sed.referencing_id), N'unknown')
      FROM target_column AS target
      JOIN sys.sql_expression_dependencies AS sed
        ON sed.referenced_id = target.object_id
       AND sed.referenced_minor_id = target.column_id

      UNION ALL

      SELECT
        N'STATISTIC',
        st.name
      FROM target_column AS target
      JOIN sys.stats_columns AS sc
        ON sc.object_id = target.object_id
       AND sc.column_id = target.column_id
      JOIN sys.stats AS st
        ON st.object_id = sc.object_id
       AND st.stats_id = sc.stats_id
    ) AS dependencies;
  `);
  return {
    columns: result.recordsets[0],
    counts: result.recordsets[1][0],
    dependencies: result.recordsets[2],
    dependencyCount: result.recordsets[2].length
  };
};

const assertReady = (inspection) => {
  const columns = new Map(inspection.columns.map((column) => [column.column_name, column]));
  for (const name of ["EmployeeId", "Ref_Employee"]) {
    const column = columns.get(name);
    if (
      !column ||
      column.data_type !== "int" ||
      !Boolean(column.is_nullable) ||
      Boolean(column.is_identity) ||
      Boolean(column.is_computed)
    ) {
      throw new Error(`dbo.Position.${name} must be a nullable, non-identity INT column.`);
    }
  }
  if (Number(inspection.counts.conflict_rows) !== 0) {
    throw new Error(
      `EmployeeId already conflicts with Ref_Employee in ${inspection.counts.conflict_rows} rows.`
    );
  }
  if (inspection.dependencyCount !== 0) {
    throw new Error(
      `Ref_Employee has ${inspection.dependencyCount} database dependencies: ` +
      inspection.dependencies
        .map((dependency) => `${dependency.dependency_type} ${dependency.dependency_name}`)
        .join(", ")
    );
  }
};

const verifyConsolidated = async (request, expected) => {
  const result = await request.query(`
    SELECT
      COUNT_BIG(*) AS row_count,
      SUM(CASE WHEN [EmployeeId] IS NULL THEN 1 ELSE 0 END) AS null_employee_id_rows,
      SUM(CASE WHEN [EmployeeId] = 0 THEN 1 ELSE 0 END) AS vacancy_rows
    FROM [dbo].[Position];

    SELECT COUNT_BIG(*) AS ref_employee_column_count
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.Position')
      AND name = N'Ref_Employee';

    SELECT
      c.name AS column_name,
      t.name AS data_type,
      c.is_nullable,
      c.is_identity,
      c.is_computed
    FROM sys.columns AS c
    JOIN sys.types AS t ON c.user_type_id = t.user_type_id
    WHERE c.object_id = OBJECT_ID(N'dbo.Position')
      AND c.name = N'EmployeeId';
  `);
  const counts = result.recordsets[0][0];
  if (
    Number(counts.row_count) !== expected.rowCount ||
    Number(counts.null_employee_id_rows) !== expected.nullRows ||
    Number(counts.vacancy_rows) !== expected.vacancyRows
  ) {
    throw new Error("Post-consolidation EmployeeId counts do not match Ref_Employee source counts.");
  }
  if (Number(result.recordsets[1][0].ref_employee_column_count) !== 0) {
    throw new Error("Ref_Employee still exists after consolidation.");
  }
  const employeeId = result.recordsets[2][0];
  if (
    !employeeId ||
    employeeId.data_type !== "int" ||
    !Boolean(employeeId.is_nullable) ||
    Boolean(employeeId.is_identity) ||
    Boolean(employeeId.is_computed)
  ) {
    throw new Error("EmployeeId schema changed unexpectedly.");
  }
  return {
    rowCount: Number(counts.row_count),
    nullEmployeeIdRows: Number(counts.null_employee_id_rows),
    vacancyRows: Number(counts.vacancy_rows),
    refEmployeeColumnExists: false
  };
};

const main = async () => {
  const apply = process.argv.slice(2).includes("--apply");
  const pool = await connectWithMssql();
  try {
    const initial = await inspect(pool.request());
    assertReady(initial);
    const expected = {
      rowCount: Number(initial.counts.row_count),
      nullRows: Number(initial.counts.null_ref_rows),
      vacancyRows: Number(initial.counts.vacancy_rows)
    };

    if (!apply) {
      console.log(JSON.stringify({
        mode: "dry-run",
        target: "dbo.Position",
        sourceColumn: "Ref_Employee",
        destinationColumn: "EmployeeId",
        ...expected,
        currentNullEmployeeIdRows: Number(initial.counts.null_employee_id_rows),
        conflictRows: Number(initial.counts.conflict_rows),
        dependencyCount: initial.dependencyCount,
        dependencies: initial.dependencies,
        message: "Consolidation validation passed. No database changes were made."
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
      const locked = await inspect(new sql.Request(transaction));
      assertReady(locked);
      if (
        Number(locked.counts.row_count) !== expected.rowCount ||
        Number(locked.counts.null_ref_rows) !== expected.nullRows ||
        Number(locked.counts.vacancy_rows) !== expected.vacancyRows
      ) {
        throw new Error("Position data changed after the dry-run inspection.");
      }

      await new sql.Request(transaction).query(`
        UPDATE [dbo].[Position]
        SET [EmployeeId] = [Ref_Employee];

        IF EXISTS (
          SELECT 1
          FROM [dbo].[Position]
          WHERE ([EmployeeId] IS NULL AND [Ref_Employee] IS NOT NULL)
             OR ([EmployeeId] IS NOT NULL AND [Ref_Employee] IS NULL)
             OR [EmployeeId] <> [Ref_Employee]
        )
          THROW 50001, 'EmployeeId copy verification failed.', 1;

        ALTER TABLE [dbo].[Position] DROP COLUMN [Ref_Employee];
      `);

      const verification = await verifyConsolidated(new sql.Request(transaction), expected);
      await transaction.commit();
      transactionStarted = false;
      console.log(JSON.stringify({
        mode: "applied",
        target: "dbo.Position",
        copiedFrom: "Ref_Employee",
        retainedColumn: "EmployeeId",
        droppedColumn: "Ref_Employee",
        verification,
        message: "Employee references were consolidated and verified before commit."
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
