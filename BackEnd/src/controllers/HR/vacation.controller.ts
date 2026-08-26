import { QueryTypes } from "sequelize";
import { parseVacationListQuery } from "../../validators/HR/vacation.validator";
import {
  buildVacationSchemaQueryPlan,
  type DatabaseColumnMetadata
} from "../../services/HR/vacationSchema.service";

const { sequelize } = require("../../config/database");

type RequestLike = {
  params?: Record<string, string | undefined>;
  query?: Record<string, unknown>;
};

type ResponseLike = {
  status: (statusCode: number) => ResponseLike;
  json: (payload: Record<string, unknown>) => unknown;
};

type NextLike = (error?: unknown) => void;

type VacationColumnMetadataRow = {
  tableName: "Vacation" | "TimeSheetCode";
  columnName: string;
  dataType: string;
  ordinal: unknown;
};

type VacationSchemaMetadata = {
  vacationColumns: DatabaseColumnMetadata[];
  timeSheetCodeColumns: DatabaseColumnMetadata[];
};

const quoteIdentifier = (identifier: string): string =>
  `[${identifier.replace(/]/g, "]]")}]`;

const isZeroReference = (value: string): boolean => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric === 0;
};

const VACATION_SCHEMA_CACHE_TTL_MS = 60_000;
let vacationSchemaCache:
  | { expiresAt: number; value: VacationSchemaMetadata }
  | undefined;
let vacationSchemaLoad: Promise<VacationSchemaMetadata> | undefined;

const normalizeColumnMetadata = (
  row: VacationColumnMetadataRow
): DatabaseColumnMetadata | null => {
  const columnName = String(row.columnName ?? "").trim();
  const dataType = String(row.dataType ?? "").trim();
  const ordinal = Number(row.ordinal);
  if (
    !columnName
    || !dataType
    || !Number.isSafeInteger(ordinal)
    || ordinal <= 0
  ) {
    return null;
  }

  return { columnName, dataType, ordinal };
};

const loadVacationSchemaMetadata = async (): Promise<VacationSchemaMetadata> => {
  if (vacationSchemaCache && vacationSchemaCache.expiresAt > Date.now()) {
    return vacationSchemaCache.value;
  }
  if (vacationSchemaLoad) return vacationSchemaLoad;

  vacationSchemaLoad = (async () => {
    const metadataRows = await sequelize.query(
      `
        SELECT
          CASE
            WHEN columnMetadata.[object_id] = OBJECT_ID(N'dbo.Vacation', N'U')
              THEN N'Vacation'
            ELSE N'TimeSheetCode'
          END AS [tableName],
          columnMetadata.[name] AS [columnName],
          TYPE_NAME(columnMetadata.[user_type_id]) AS [dataType],
          columnMetadata.[column_id] AS [ordinal]
        FROM sys.columns AS columnMetadata
        WHERE columnMetadata.[object_id] IN (
          OBJECT_ID(N'dbo.Vacation', N'U'),
          OBJECT_ID(N'dbo.TimeSheetCode', N'U')
        )
        ORDER BY
          CASE
            WHEN columnMetadata.[object_id] = OBJECT_ID(N'dbo.Vacation', N'U')
              THEN 1
            ELSE 2
          END,
          columnMetadata.[column_id];
      `,
      { type: QueryTypes.SELECT, raw: true }
    ) as VacationColumnMetadataRow[];

    const value: VacationSchemaMetadata = {
      vacationColumns: [],
      timeSheetCodeColumns: []
    };
    for (const row of metadataRows) {
      const column = normalizeColumnMetadata(row);
      if (!column) continue;
      if (row.tableName === "Vacation") value.vacationColumns.push(column);
      if (row.tableName === "TimeSheetCode") {
        value.timeSheetCodeColumns.push(column);
      }
    }

    vacationSchemaCache = {
      expiresAt: Date.now() + VACATION_SCHEMA_CACHE_TTL_MS,
      value
    };
    return value;
  })();

  try {
    return await vacationSchemaLoad;
  } finally {
    vacationSchemaLoad = undefined;
  }
};

export const getEmployeeVacations = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const employeeId = Number(req.params?.id);
    if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Employee ID must be a positive integer"
      });
    }

    const parsedQuery = parseVacationListQuery(req.query ?? {});
    if (!parsedQuery.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid vacation query",
        errors: parsedQuery.errors
      });
    }

    const employeeRows = await sequelize.query(
      `
        SELECT TOP (1) [ID_Employee], [Ref_Employee]
        FROM [dbo].[Employee]
        WHERE [ID_Employee] = :employeeId;
      `,
      {
        replacements: { employeeId },
        type: QueryTypes.SELECT,
        raw: true
      }
    ) as Array<Record<string, unknown>>;

    const employee = employeeRows[0];
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    const employeeNumber = String(employee.Ref_Employee ?? "").trim();
    if (!employeeNumber || isZeroReference(employeeNumber)) {
      return res.status(422).json({
        success: false,
        message: "Employee does not have a valid employee number for vacation records",
        code: "VACATION_EMPLOYEE_REFERENCE_MISSING"
      });
    }

    const schemaMetadata = await loadVacationSchemaMetadata();
    if (schemaMetadata.vacationColumns.length === 0) {
      return res.status(503).json({
        success: false,
        message: "The dbo.Vacation source is not available",
        code: "VACATION_SOURCE_UNAVAILABLE"
      });
    }

    const schemaPlan = buildVacationSchemaQueryPlan(
      schemaMetadata.vacationColumns,
      schemaMetadata.timeSheetCodeColumns
    );
    if (!schemaPlan.referenceColumn || !schemaPlan.idColumn) {
      return res.status(503).json({
        success: false,
        message: "dbo.Vacation is missing its employee reference or record ID column",
        code: "VACATION_SCHEMA_INCOMPATIBLE"
      });
    }

    const orderParts = [
      schemaPlan.startColumn
        ? `vacation.${quoteIdentifier(schemaPlan.startColumn.columnName)} DESC`
        : null,
      `vacation.${quoteIdentifier(schemaPlan.idColumn.columnName)} DESC`
    ].filter((part): part is string => Boolean(part));

    const { page, pageSize } = parsedQuery.value;
    const offset = (page - 1) * pageSize;
    const replacements = { employeeNumber, offset, pageSize };
    const referenceExpression = `
      LTRIM(RTRIM(TRY_CONVERT(nvarchar(4000), vacation.${quoteIdentifier(schemaPlan.referenceColumn.columnName)})))
        COLLATE DATABASE_DEFAULT
      = :employeeNumber COLLATE DATABASE_DEFAULT
    `.trim();

    const [countRows, vacationRows] = await Promise.all([
      sequelize.query(
        `
          SELECT COUNT_BIG(*) AS [total]
          FROM [dbo].[Vacation] AS vacation
          WHERE ${referenceExpression};
        `,
        { replacements, type: QueryTypes.SELECT, raw: true }
      ) as Promise<Array<{ total: unknown }>>,
      sequelize.query(
        `
          SELECT ${schemaPlan.projection.join(",\n                 ")}
          FROM [dbo].[Vacation] AS vacation
          ${schemaPlan.lookupClause}
          WHERE ${referenceExpression}
          ORDER BY ${orderParts.join(", ")}
          OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY;
        `,
        { replacements, type: QueryTypes.SELECT, raw: true }
      ) as Promise<Array<Record<string, unknown>>>
    ]);

    const total = Number(countRows[0]?.total ?? 0);
    if (!Number.isSafeInteger(total) || total < 0) {
      throw new Error("Vacation search returned an invalid total row count");
    }

    return res.status(200).json({
      success: true,
      message: "Employee vacation records loaded successfully",
      data: vacationRows,
      columns: schemaPlan.columns,
      resolvedColumns: schemaPlan.resolvedColumns,
      sources: {
        vacation: "dbo.Vacation",
        timeSheetCode: "dbo.TimeSheetCode",
        timeSheetCodeResolution: schemaPlan.timeSheetCodeResolution,
        codeReferenceColumn: schemaPlan.codeReferenceColumn?.columnName ?? null,
        codeLookupIdColumn: schemaPlan.timeSheetCodeIdColumn?.columnName ?? null
      },
      pagination: {
        page,
        pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    return next(error);
  }
};
