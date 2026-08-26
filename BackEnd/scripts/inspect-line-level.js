"use strict";

require("dotenv").config();

const { QueryTypes } = require("sequelize");
const { sequelize } = require("../src/config/database");

const quoteIdentifier = (identifier) => `[${String(identifier).replace(/]/g, "]]")}]`;

const normalizeTableName = (value) =>
  String(value || "").toLowerCase().replace(/[\s_-]+/g, "");

async function main() {
  const candidateTables = await sequelize.query(
    `
      SELECT
        schemaMetadata.[name] AS [schemaName],
        tableMetadata.[name] AS [tableName]
      FROM sys.tables AS tableMetadata
      INNER JOIN sys.schemas AS schemaMetadata
        ON schemaMetadata.[schema_id] = tableMetadata.[schema_id]
      WHERE LOWER(tableMetadata.[name]) LIKE N'%line%level%'
         OR LOWER(REPLACE(REPLACE(tableMetadata.[name], N'_', N''), N' ', N'')) = N'linelevel'
      ORDER BY schemaMetadata.[name], tableMetadata.[name];
    `,
    { type: QueryTypes.SELECT, raw: true }
  );

  const lineLevelTable = candidateTables.find(
    (row) =>
      String(row.schemaName).toLowerCase() === "dbo"
      && normalizeTableName(row.tableName) === "linelevel"
  );

  if (!lineLevelTable) {
    console.log(JSON.stringify({ candidateTables }, null, 2));
    throw new Error("A dbo LineLevel table could not be resolved unambiguously.");
  }

  const relevantTableNames = [
    String(lineLevelTable.tableName),
    "Position",
    "jobs",
    "Employee",
    "Departments"
  ];

  const columns = await sequelize.query(
    `
      SELECT
        tableMetadata.[name] AS [tableName],
        columnMetadata.[column_id] AS [ordinal],
        columnMetadata.[name] AS [columnName],
        typeMetadata.[name] AS [dataType],
        columnMetadata.[max_length] AS [maxLength],
        columnMetadata.[is_nullable] AS [isNullable],
        columnMetadata.[is_identity] AS [isIdentity]
      FROM sys.tables AS tableMetadata
      INNER JOIN sys.columns AS columnMetadata
        ON columnMetadata.[object_id] = tableMetadata.[object_id]
      INNER JOIN sys.types AS typeMetadata
        ON typeMetadata.[user_type_id] = columnMetadata.[user_type_id]
      WHERE tableMetadata.[schema_id] = SCHEMA_ID(N'dbo')
        AND tableMetadata.[name] IN (:relevantTableNames)
      ORDER BY tableMetadata.[name], columnMetadata.[column_id];
    `,
    {
      replacements: { relevantTableNames },
      type: QueryTypes.SELECT,
      raw: true
    }
  );

  const foreignKeys = await sequelize.query(
    `
      SELECT
        foreignKey.[name] AS [foreignKeyName],
        OBJECT_NAME(foreignKey.[parent_object_id]) AS [fromTable],
        fromColumn.[name] AS [fromColumn],
        OBJECT_NAME(foreignKey.[referenced_object_id]) AS [toTable],
        toColumn.[name] AS [toColumn],
        foreignKey.[is_disabled] AS [isDisabled],
        foreignKey.[is_not_trusted] AS [isNotTrusted]
      FROM sys.foreign_keys AS foreignKey
      INNER JOIN sys.foreign_key_columns AS foreignKeyColumn
        ON foreignKeyColumn.[constraint_object_id] = foreignKey.[object_id]
      INNER JOIN sys.columns AS fromColumn
        ON fromColumn.[object_id] = foreignKeyColumn.[parent_object_id]
       AND fromColumn.[column_id] = foreignKeyColumn.[parent_column_id]
      INNER JOIN sys.columns AS toColumn
        ON toColumn.[object_id] = foreignKeyColumn.[referenced_object_id]
       AND toColumn.[column_id] = foreignKeyColumn.[referenced_column_id]
      WHERE foreignKey.[parent_object_id] IN (
              OBJECT_ID(N'dbo.Position'),
              OBJECT_ID(N'dbo.Employee')
            )
         OR foreignKey.[referenced_object_id] = OBJECT_ID(
              :qualifiedLineLevelTable
            )
      ORDER BY [fromTable], [foreignKeyName];
    `,
    {
      replacements: {
        qualifiedLineLevelTable: `dbo.${String(lineLevelTable.tableName)}`
      },
      type: QueryTypes.SELECT,
      raw: true
    }
  );

  const qualifiedLineLevelTable =
    `${quoteIdentifier(lineLevelTable.schemaName)}.${quoteIdentifier(lineLevelTable.tableName)}`;
  const lineLevelRows = await sequelize.query(
    `SELECT TOP (100) * FROM ${qualifiedLineLevelTable};`,
    { type: QueryTypes.SELECT, raw: true }
  );
  const lineLevelCountRows = await sequelize.query(
    `SELECT COUNT_BIG(*) AS [count] FROM ${qualifiedLineLevelTable};`,
    { type: QueryTypes.SELECT, raw: true }
  );

  console.log(
    JSON.stringify(
      {
        resolvedTable: lineLevelTable,
        candidateTables,
        lineLevelCount: Number(lineLevelCountRows[0]?.count || 0),
        lineLevelRows,
        columns,
        foreignKeys
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(
      "[line-level-inspect] Failed:",
      error instanceof Error ? error.message : error
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => undefined);
  });
