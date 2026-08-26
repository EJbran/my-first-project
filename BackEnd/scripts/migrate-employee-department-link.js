"use strict";

require("dotenv").config();

const { QueryTypes, Transaction } = require("sequelize");
const { sequelize } = require("../src/config/database");

const APPLY_CONFIRMATION = "EMPLOYEE_DEPARTMENT_LINK";
const EXPECTED_DATABASE = "P_HAROUGE";
const args = new Set(process.argv.slice(2));
const shouldApply = args.has("--apply");
const confirmation = process.argv
  .slice(2)
  .find((argument) => argument.startsWith("--confirm="))
  ?.slice("--confirm=".length);

const toCount = (value, label) => {
  const result = Number(value || 0);
  if (!Number.isSafeInteger(result) || result < 0) {
    throw new Error(`${label} returned an invalid count.`);
  }
  return result;
};

const loadState = async (transaction) => {
  const queryOptions = {
    type: QueryTypes.SELECT,
    raw: true,
    ...(transaction ? { transaction } : {})
  };

  const summaryRows = await sequelize.query(
        `
          SELECT
            COUNT_BIG(*) AS [totalEmployees],
            SUM(CASE WHEN employee.[Department_Id] IS NULL THEN 1 ELSE 0 END)
              AS [employeesWithoutDepartment],
            SUM(CASE WHEN employee.[Department_Id] IS NOT NULL THEN 1 ELSE 0 END)
              AS [employeesWithDepartment],
            SUM(CASE WHEN employee.[Department_Id] IS NOT NULL
                       AND department.[Id] IS NULL THEN 1 ELSE 0 END)
              AS [orphanDepartmentReferences],
            (SELECT COUNT_BIG(*) FROM [dbo].[Departments]) AS [totalDepartments]
          FROM [dbo].[Employee] AS employee
          LEFT JOIN [dbo].[Departments] AS department
            ON department.[Id] = employee.[Department_Id];
        `,
        queryOptions
      );
  const columnRows = await sequelize.query(
        `
          SELECT
            OBJECT_NAME(columnMetadata.[object_id]) AS [tableName],
            columnMetadata.[name] AS [columnName],
            typeMetadata.[name] AS [dataType],
            columnMetadata.[max_length] AS [maxLength],
            columnMetadata.[is_nullable] AS [isNullable]
          FROM sys.columns AS columnMetadata
          INNER JOIN sys.types AS typeMetadata
            ON typeMetadata.[user_type_id] = columnMetadata.[user_type_id]
          WHERE (
              columnMetadata.[object_id] = OBJECT_ID(N'dbo.Employee')
              AND columnMetadata.[name] = N'Department_Id'
            )
            OR (
              columnMetadata.[object_id] = OBJECT_ID(N'dbo.Departments')
              AND columnMetadata.[name] = N'Id'
            );
        `,
        queryOptions
      );
  const foreignKeyRows = await sequelize.query(
        `
          SELECT
            foreignKey.[name] AS [foreignKeyName],
            fromColumn.[name] AS [fromColumn],
            OBJECT_SCHEMA_NAME(foreignKey.[referenced_object_id]) AS [toSchema],
            OBJECT_NAME(foreignKey.[referenced_object_id]) AS [toTable],
            toColumn.[name] AS [toColumn],
            (
              SELECT COUNT_BIG(*)
              FROM sys.foreign_key_columns AS constraintColumn
              WHERE constraintColumn.[constraint_object_id] = foreignKey.[object_id]
            ) AS [constraintColumnCount],
            foreignKey.[is_disabled] AS [isDisabled],
            foreignKey.[is_not_trusted] AS [isNotTrusted],
            foreignKey.[delete_referential_action_desc] AS [onDelete],
            foreignKey.[update_referential_action_desc] AS [onUpdate]
          FROM sys.foreign_keys AS foreignKey
          INNER JOIN sys.foreign_key_columns AS foreignKeyColumn
            ON foreignKeyColumn.[constraint_object_id] = foreignKey.[object_id]
          INNER JOIN sys.columns AS fromColumn
            ON fromColumn.[object_id] = foreignKeyColumn.[parent_object_id]
           AND fromColumn.[column_id] = foreignKeyColumn.[parent_column_id]
          INNER JOIN sys.columns AS toColumn
            ON toColumn.[object_id] = foreignKeyColumn.[referenced_object_id]
           AND toColumn.[column_id] = foreignKeyColumn.[referenced_column_id]
          WHERE foreignKey.[parent_object_id] = OBJECT_ID(N'dbo.Employee')
            AND fromColumn.[name] = N'Department_Id';
        `,
        queryOptions
      );
  const indexRows = await sequelize.query(
        `
          SELECT
            indexMetadata.[name] AS [indexName],
            indexMetadata.[is_disabled] AS [isDisabled]
          FROM sys.indexes AS indexMetadata
          INNER JOIN sys.index_columns AS indexColumn
            ON indexColumn.[object_id] = indexMetadata.[object_id]
           AND indexColumn.[index_id] = indexMetadata.[index_id]
          INNER JOIN sys.columns AS columnMetadata
            ON columnMetadata.[object_id] = indexColumn.[object_id]
           AND columnMetadata.[column_id] = indexColumn.[column_id]
          WHERE indexMetadata.[object_id] = OBJECT_ID(N'dbo.Employee')
            AND columnMetadata.[name] = N'Department_Id'
            AND indexColumn.[key_ordinal] = 1;
        `,
        queryOptions
      );

  const employeeColumn = columnRows.find(
    (row) =>
      String(row.tableName).toLowerCase() === "employee"
      && String(row.columnName).toLowerCase() === "department_id"
  );
  const departmentColumn = columnRows.find(
    (row) =>
      String(row.tableName).toLowerCase() === "departments"
      && String(row.columnName).toLowerCase() === "id"
  );

  if (!employeeColumn || !departmentColumn) {
    throw new Error("Employee.Department_Id or Departments.Id is missing.");
  }
  if (
    String(employeeColumn.dataType).toLowerCase() !== "int"
    || String(departmentColumn.dataType).toLowerCase() !== "int"
  ) {
    throw new Error(
      "Employee.Department_Id and Departments.Id must both be SQL Server int columns."
    );
  }

  return {
    summary: {
      totalEmployees: toCount(summaryRows[0]?.totalEmployees, "totalEmployees"),
      employeesWithoutDepartment: toCount(
        summaryRows[0]?.employeesWithoutDepartment,
        "employeesWithoutDepartment"
      ),
      employeesWithDepartment: toCount(
        summaryRows[0]?.employeesWithDepartment,
        "employeesWithDepartment"
      ),
      orphanDepartmentReferences: toCount(
        summaryRows[0]?.orphanDepartmentReferences,
        "orphanDepartmentReferences"
      ),
      totalDepartments: toCount(
        summaryRows[0]?.totalDepartments,
        "totalDepartments"
      )
    },
    columns: {
      employeeDepartment: employeeColumn,
      departmentId: departmentColumn
    },
    foreignKeys: foreignKeyRows,
    indexes: indexRows
  };
};

const applyMigration = async () =>
  sequelize.transaction(
    { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
    async (transaction) => {
      await sequelize.query(
        `
          DECLARE @applicationLockResult int;
          EXEC @applicationLockResult = sys.sp_getapplock
            @Resource = N'HERP_Employee_Department_Link_Migration',
            @LockMode = N'Exclusive',
            @LockOwner = N'Transaction',
            @LockTimeout = 15000;

          IF @applicationLockResult < 0
            THROW 51010, N'Could not obtain the employee-department migration lock.', 1;

          IF OBJECT_ID(N'dbo.Employee', N'U') IS NULL
            THROW 51011, N'dbo.Employee is missing.', 1;

          IF OBJECT_ID(N'dbo.Departments', N'U') IS NULL
            THROW 51012, N'dbo.Departments is missing.', 1;

          IF COL_LENGTH(N'dbo.Employee', N'Department_Id') IS NULL
            THROW 51013, N'dbo.Employee.Department_Id is missing.', 1;

          IF EXISTS (
            SELECT 1
            FROM [dbo].[Employee] AS employee WITH (UPDLOCK, HOLDLOCK)
            LEFT JOIN [dbo].[Departments] AS department WITH (HOLDLOCK)
              ON department.[Id] = employee.[Department_Id]
            WHERE employee.[Department_Id] IS NOT NULL
              AND department.[Id] IS NULL
          )
            THROW 51014, N'Employee contains invalid Department_Id values.', 1;

          IF EXISTS (
            SELECT 1
            FROM sys.foreign_keys
            WHERE [parent_object_id] = OBJECT_ID(N'dbo.Employee')
              AND [name] = N'FK_Employee_Departments'
              AND [referenced_object_id] <> OBJECT_ID(N'dbo.Departments')
          )
            THROW 51015, N'FK_Employee_Departments already exists with a different target.', 1;

          IF NOT EXISTS (
            SELECT 1
            FROM sys.foreign_key_columns AS foreignKeyColumn
            WHERE foreignKeyColumn.[parent_object_id] = OBJECT_ID(N'dbo.Employee')
              AND foreignKeyColumn.[parent_column_id] = COLUMNPROPERTY(
                OBJECT_ID(N'dbo.Employee'),
                N'Department_Id',
                N'ColumnId'
              )
              AND foreignKeyColumn.[referenced_object_id] = OBJECT_ID(N'dbo.Departments')
              AND foreignKeyColumn.[referenced_column_id] = COLUMNPROPERTY(
                OBJECT_ID(N'dbo.Departments'),
                N'Id',
                N'ColumnId'
              )
          )
          BEGIN
            ALTER TABLE [dbo].[Employee] WITH CHECK
              ADD CONSTRAINT [FK_Employee_Departments]
              FOREIGN KEY ([Department_Id])
              REFERENCES [dbo].[Departments] ([Id]);
          END;

          IF EXISTS (
            SELECT 1
            FROM sys.foreign_keys
            WHERE [parent_object_id] = OBJECT_ID(N'dbo.Employee')
              AND [name] = N'FK_Employee_Departments'
          )
          BEGIN
            ALTER TABLE [dbo].[Employee] WITH CHECK
              CHECK CONSTRAINT [FK_Employee_Departments];
          END;

          IF NOT EXISTS (
            SELECT 1
            FROM sys.indexes
            WHERE [object_id] = OBJECT_ID(N'dbo.Employee')
              AND [name] = N'IX_Employee_Department_Id'
          )
          BEGIN
            CREATE INDEX [IX_Employee_Department_Id]
              ON [dbo].[Employee] ([Department_Id]);
          END;
        `,
        { transaction }
      );

      const state = await loadState(transaction);
      const exactForeignKeys = state.foreignKeys.filter(
        (foreignKey) =>
          String(foreignKey.fromColumn).toLowerCase() === "department_id"
          && String(foreignKey.toSchema).toLowerCase() === "dbo"
          && String(foreignKey.toTable).toLowerCase() === "departments"
          && String(foreignKey.toColumn).toLowerCase() === "id"
      );
      const usableIndexes = state.indexes.filter(
        (index) =>
          String(index.indexName).toLowerCase() ===
            "ix_employee_department_id"
          && !index.isDisabled
      );

      if (
        state.summary.orphanDepartmentReferences !== 0
        || exactForeignKeys.length !== 1
        || exactForeignKeys.some(
          (foreignKey) =>
            foreignKey.isDisabled
            || foreignKey.isNotTrusted
            || Number(foreignKey.constraintColumnCount) !== 1
            || String(foreignKey.onDelete).toUpperCase() !== "NO_ACTION"
            || String(foreignKey.onUpdate).toUpperCase() !== "NO_ACTION"
        )
        || usableIndexes.length !== 1
      ) {
        throw new Error(
          `Employee-department verification failed: ${JSON.stringify({
            summary: state.summary,
            exactForeignKeys,
            usableIndexes
          })}`
        );
      }

      return state;
    }
  );

async function main() {
  if (shouldApply && confirmation !== APPLY_CONFIRMATION) {
    throw new Error(
      `Apply requires --confirm=${APPLY_CONFIRMATION}. Run without --apply for a read-only preview.`
    );
  }
  if (
    shouldApply
    && String(process.env.DB_NAME || "").trim().toUpperCase()
      !== EXPECTED_DATABASE
  ) {
    throw new Error(
      `Apply is restricted to the ${EXPECTED_DATABASE} database.`
    );
  }

  await sequelize.authenticate();
  const before = await loadState();
  console.log(
    JSON.stringify(
      {
        mode: shouldApply ? "apply" : "preflight",
        target: {
          database: process.env.DB_NAME,
          host: process.env.DB_HOST
        },
        before
      },
      null,
      2
    )
  );

  if (!shouldApply) {
    console.log(
      `[employee-departments] Preflight only. Apply with --apply --confirm=${APPLY_CONFIRMATION}.`
    );
    return;
  }

  if (before.summary.orphanDepartmentReferences !== 0) {
    throw new Error(
      "Apply stopped because Employee contains invalid Department_Id values."
    );
  }

  const after = await applyMigration();
  console.log(
    JSON.stringify(
      {
        status: "APPLIED",
        verification: {
          summary: after.summary,
          foreignKeys: after.foreignKeys,
          indexes: after.indexes
        }
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(
      "[employee-departments] Failed:",
      error instanceof Error ? error.message : error
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => undefined);
  });
