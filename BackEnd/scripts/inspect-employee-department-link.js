"use strict";

require("dotenv").config();

const { QueryTypes } = require("sequelize");
const { sequelize } = require("../src/config/database");

const asCount = (value) => Number(value || 0);

async function main() {
  await sequelize.authenticate();

  const [summaryRows, departmentUsage, foreignKeys, columns, indexes] =
    await Promise.all([
      sequelize.query(
        `
          SELECT
            COUNT_BIG(*) AS [totalEmployees],
            SUM(CASE WHEN employee.[Department_Id] IS NULL THEN 1 ELSE 0 END)
              AS [employeesWithoutDepartment],
            SUM(CASE WHEN employee.[Department_Id] IS NOT NULL THEN 1 ELSE 0 END)
              AS [employeesWithDepartment],
            SUM(CASE WHEN employee.[Department_Id] = 0 THEN 1 ELSE 0 END)
              AS [zeroDepartmentIds],
            SUM(CASE WHEN employee.[Department_Id] IS NOT NULL
                       AND department.[Id] IS NULL THEN 1 ELSE 0 END)
              AS [orphanDepartmentReferences],
            (SELECT COUNT_BIG(*) FROM [dbo].[Departments]) AS [totalDepartments]
          FROM [dbo].[Employee] AS employee
          LEFT JOIN [dbo].[Departments] AS department
            ON department.[Id] = employee.[Department_Id];
        `,
        { type: QueryTypes.SELECT, raw: true }
      ),
      sequelize.query(
        `
          SELECT
            employee.[Department_Id] AS [departmentId],
            department.[DepartmentName_English] AS [departmentNameEnglish],
            department.[DepartmentName_Arabic] AS [departmentNameArabic],
            COUNT_BIG(*) AS [employeeCount],
            CASE WHEN department.[Id] IS NULL THEN CAST(1 AS bit)
                 ELSE CAST(0 AS bit) END AS [isOrphan]
          FROM [dbo].[Employee] AS employee
          LEFT JOIN [dbo].[Departments] AS department
            ON department.[Id] = employee.[Department_Id]
          WHERE employee.[Department_Id] IS NOT NULL
          GROUP BY
            employee.[Department_Id],
            department.[Id],
            department.[DepartmentName_English],
            department.[DepartmentName_Arabic]
          ORDER BY [isOrphan] DESC, [employeeCount] DESC, [departmentId];
        `,
        { type: QueryTypes.SELECT, raw: true }
      ),
      sequelize.query(
        `
          SELECT
            foreignKey.[name] AS [foreignKeyName],
            fromColumn.[name] AS [fromColumn],
            OBJECT_SCHEMA_NAME(foreignKey.[referenced_object_id]) AS [toSchema],
            OBJECT_NAME(foreignKey.[referenced_object_id]) AS [toTable],
            toColumn.[name] AS [toColumn],
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
        { type: QueryTypes.SELECT, raw: true }
      ),
      sequelize.query(
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
        { type: QueryTypes.SELECT, raw: true }
      ),
      sequelize.query(
        `
          SELECT
            indexMetadata.[name] AS [indexName],
            indexMetadata.[is_unique] AS [isUnique],
            indexMetadata.[is_disabled] AS [isDisabled],
            indexColumn.[key_ordinal] AS [keyOrdinal]
          FROM sys.indexes AS indexMetadata
          INNER JOIN sys.index_columns AS indexColumn
            ON indexColumn.[object_id] = indexMetadata.[object_id]
           AND indexColumn.[index_id] = indexMetadata.[index_id]
          INNER JOIN sys.columns AS columnMetadata
            ON columnMetadata.[object_id] = indexColumn.[object_id]
           AND columnMetadata.[column_id] = indexColumn.[column_id]
          WHERE indexMetadata.[object_id] = OBJECT_ID(N'dbo.Employee')
            AND columnMetadata.[name] = N'Department_Id'
          ORDER BY indexMetadata.[name], indexColumn.[key_ordinal];
        `,
        { type: QueryTypes.SELECT, raw: true }
      )
    ]);

  const summary = {
    totalEmployees: asCount(summaryRows[0]?.totalEmployees),
    employeesWithoutDepartment: asCount(
      summaryRows[0]?.employeesWithoutDepartment
    ),
    employeesWithDepartment: asCount(summaryRows[0]?.employeesWithDepartment),
    zeroDepartmentIds: asCount(summaryRows[0]?.zeroDepartmentIds),
    orphanDepartmentReferences: asCount(
      summaryRows[0]?.orphanDepartmentReferences
    ),
    totalDepartments: asCount(summaryRows[0]?.totalDepartments)
  };

  console.log(
    JSON.stringify(
      {
        target: {
          database: process.env.DB_NAME,
          host: process.env.DB_HOST
        },
        summary,
        foreignKeys,
        indexes,
        columns,
        departmentUsage: departmentUsage.map((row) => ({
          ...row,
          departmentId: Number(row.departmentId),
          employeeCount: asCount(row.employeeCount)
        }))
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(
      "[employee-department-inspect] Failed:",
      error instanceof Error ? error.message : error
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => undefined);
  });
