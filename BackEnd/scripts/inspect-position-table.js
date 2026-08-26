require("dotenv").config();

const { connectWithMssql } = require("../src/config/database");

const main = async () => {
  const pool = await connectWithMssql();
  try {
    const result = await pool.request().query(`
      SELECT
        c.column_id,
        c.name AS column_name,
        t.name AS data_type,
        c.max_length,
        c.precision,
        c.scale,
        c.is_nullable,
        c.is_identity,
        c.is_computed,
        dc.definition AS default_definition
      FROM sys.columns AS c
      JOIN sys.types AS t ON c.user_type_id = t.user_type_id
      LEFT JOIN sys.default_constraints AS dc ON c.default_object_id = dc.object_id
      WHERE c.object_id = OBJECT_ID(N'dbo.Position')
      ORDER BY c.column_id;

      SELECT
        i.name AS index_name,
        i.is_unique,
        i.is_primary_key,
        STRING_AGG(c.name, ',') WITHIN GROUP (ORDER BY ic.key_ordinal) AS columns
      FROM sys.indexes AS i
      JOIN sys.index_columns AS ic
        ON i.object_id = ic.object_id
       AND i.index_id = ic.index_id
       AND ic.is_included_column = 0
      JOIN sys.columns AS c
        ON c.object_id = ic.object_id
       AND c.column_id = ic.column_id
      WHERE i.object_id = OBJECT_ID(N'dbo.Position')
      GROUP BY i.name, i.is_unique, i.is_primary_key;

      SELECT COUNT_BIG(*) AS row_count FROM dbo.Position;

      SELECT TOP (10) * FROM dbo.Position ORDER BY 1;

      SELECT
        fk.name AS foreign_key_name,
        OBJECT_SCHEMA_NAME(fk.parent_object_id) AS parent_schema,
        OBJECT_NAME(fk.parent_object_id) AS parent_table,
        pc.name AS parent_column,
        OBJECT_SCHEMA_NAME(fk.referenced_object_id) AS referenced_schema,
        OBJECT_NAME(fk.referenced_object_id) AS referenced_table,
        rc.name AS referenced_column
      FROM sys.foreign_keys AS fk
      JOIN sys.foreign_key_columns AS fkc ON fkc.constraint_object_id = fk.object_id
      JOIN sys.columns AS pc
        ON pc.object_id = fkc.parent_object_id
       AND pc.column_id = fkc.parent_column_id
      JOIN sys.columns AS rc
        ON rc.object_id = fkc.referenced_object_id
       AND rc.column_id = fkc.referenced_column_id
      WHERE fk.parent_object_id = OBJECT_ID(N'dbo.Position')
         OR fk.referenced_object_id = OBJECT_ID(N'dbo.Position');
    `);
    console.log(JSON.stringify({
      columns: result.recordsets[0],
      indexes: result.recordsets[1],
      rowCount: Number(result.recordsets[2][0].row_count),
      sample: result.recordsets[3],
      foreignKeys: result.recordsets[4]
    }, null, 2));
  } finally {
    await pool.close();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
