import { QueryTypes, type Transaction } from "sequelize";
import {
  parsePositionListQuery,
  validateAssignPositionPayload,
  validateCreatePositionPayload,
  validateUpdatePositionPayload,
  validateReleasePositionPayload,
  validateTransferPositionPayload,
  type PositionSortDirection,
  type PositionSortField
} from "../../validators/HR/position.validator";
import { deriveLineLevelEnglishDescription } from "../../services/HR/lineLevel.service";

const { sequelize } = require("../../config/database");

type RequestLike = {
  params?: Record<string, string | undefined>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
};

type ResponseLike = {
  status: (statusCode: number) => ResponseLike;
  json: (payload: Record<string, unknown>) => unknown;
};

type NextLike = (error?: unknown) => void;
type DatabaseRow = Record<string, unknown>;

type PositionLockRow = {
  Id: number;
  EmployeeId: number | null;
};

type JobTitleRow = {
  Job_ID: unknown;
  Job_Name_AR: unknown;
  Job_Name_EN: unknown;
};

type LineLevelRow = {
  Line_ID: unknown;
};

const acquirePositionMutationLock = async (transaction: Transaction): Promise<void> => {
  await sequelize.query(
    `
      DECLARE @LockResult int;
      EXEC @LockResult = sys.sp_getapplock
        @Resource = N'HERP:PositionCurrentState',
        @LockMode = N'Exclusive',
        @LockOwner = N'Transaction',
        @LockTimeout = 10000;
      IF @LockResult < 0
        THROW 52001, 'Could not acquire the position update lock. Please retry.', 1;
    `,
    { type: QueryTypes.RAW, transaction }
  );
};

const positionProjection = `
  position.[Id] AS [PositionId],
  position.[EmployeeId],
  position.[Position_Number],
  position.[PositionLevel],
  position.[Position_Degree],
  position.[Position_DateCreation],
  position.[Status],
  position.[Position_Type],
  position.[Job_ID] AS [JobId],
  position.[LineLevelId],
  lineLevel.[SortLine] AS [LineLevelSort],
  lineLevel.[EnglishDescription] AS [LineLevelName_EN],
  lineLevel.[ArabicDescription] AS [LineLevelName_AR],
  job.[Job_Name_AR],
  job.[Job_Name_EN],
  job.[Job_Family],
  CONVERT(nvarchar(100), employee.[Ref_Employee]) AS [EmployeeNumber],
  employee.[EmployeeName_En] AS [EmployeeName_EN],
  employee.[EmployeeName] AS [EmployeeName_AR]
`;

const positionJoinSql = `
  LEFT JOIN [dbo].[jobs] AS job
    ON job.[Job_ID] = position.[Job_ID]
  LEFT JOIN [dbo].[LineLevel] AS lineLevel
    ON lineLevel.[Line_ID] = position.[LineLevelId]
  LEFT JOIN [dbo].[Employee] AS employee
    ON employee.[ID_Employee] = position.[EmployeeId]
`;

const positionFilterSql = `
  (:searchPattern IS NULL
    OR CONVERT(nvarchar(30), position.[Id]) LIKE :searchPattern ESCAPE N'~'
    OR CONVERT(nvarchar(30), position.[Position_Number]) LIKE :searchPattern ESCAPE N'~'
    OR position.[PositionLevel] LIKE :searchPattern ESCAPE N'~'
    OR position.[Position_Degree] LIKE :searchPattern ESCAPE N'~'
    OR position.[Status] LIKE :searchPattern ESCAPE N'~'
    OR position.[Position_Type] LIKE :searchPattern ESCAPE N'~'
    OR job.[Job_Name_AR] LIKE :searchPattern ESCAPE N'~'
    OR job.[Job_Name_EN] LIKE :searchPattern ESCAPE N'~'
    OR job.[Job_Family] LIKE :searchPattern ESCAPE N'~'
    OR CONVERT(nvarchar(100), employee.[Ref_Employee]) LIKE :searchPattern ESCAPE N'~'
    OR employee.[EmployeeName_En] LIKE :searchPattern ESCAPE N'~'
    OR employee.[EmployeeName] LIKE :searchPattern ESCAPE N'~')
  AND (:occupancy = N'all'
    OR (:occupancy = N'occupied' AND position.[EmployeeId] IS NOT NULL)
    OR (:occupancy = N'vacant' AND position.[EmployeeId] IS NULL))
  AND (:positionType IS NULL OR position.[Position_Type] = :positionType)
  AND (:jobId IS NULL OR position.[Job_ID] = :jobId)
  AND (:status IS NULL OR position.[Status] = :status)
`;

const positionSortExpressions: Record<PositionSortField, string> = {
  positionId: "position.[Id]",
  positionNumber: "position.[Position_Number]",
  job: "COALESCE(NULLIF(job.[Job_Name_EN], N''), NULLIF(job.[Job_Name_AR], N''), N'')",
  positionType: "position.[Position_Type]",
  positionLevel: "position.[PositionLevel]",
  employee: "COALESCE(NULLIF(employee.[EmployeeName_En], N''), NULLIF(employee.[EmployeeName], N''), CONVERT(nvarchar(100), employee.[Ref_Employee]), N'')",
  occupancy: "CASE WHEN position.[EmployeeId] IS NULL THEN 0 ELSE 1 END",
  dataStatus: "CASE WHEN position.[Job_ID] IS NULL THEN 1 ELSE 0 END"
};

const positionSortDirections: Record<PositionSortDirection, string> = {
  asc: "ASC",
  desc: "DESC"
};

const buildPositionOrderSql = (
  sortBy: PositionSortField,
  sortDirection: PositionSortDirection
): string => {
  const primarySort = `${positionSortExpressions[sortBy]} ${positionSortDirections[sortDirection]}`;
  return sortBy === "positionId" ? primarySort : `${primarySort}, position.[Id] ASC`;
};

const escapeLikePattern = (value: string | null): string | null => value === null
  ? null
  : `%${value.replace(/[~%_\[]/g, (character) => `~${character}`)}%`;

const parsePathId = (
  rawValue: string | undefined,
  label: string
): { success: true; value: number } | { success: false; message: string } => {
  if (!rawValue || !/^[1-9]\d*$/.test(rawValue)) {
    return { success: false, message: `${label} must be a positive integer` };
  }
  const value = Number(rawValue);
  return Number.isSafeInteger(value)
    ? { success: true, value }
    : { success: false, message: `${label} must be a positive integer` };
};

const getSqlErrorNumber = (error: unknown): number | null => {
  if (!error || typeof error !== "object") return null;
  const source = error as {
    number?: unknown;
    original?: { number?: unknown };
    parent?: { number?: unknown };
  };
  const value = source.number ?? source.original?.number ?? source.parent?.number;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

const handlePositionMutationError = (
  error: unknown,
  res: ResponseLike,
  next: NextLike
) => {
  if (getSqlErrorNumber(error) === 52001) {
    return res.status(503).json({
      success: false,
      message: "Position changes are temporarily busy. Please retry.",
      code: "POSITION_BUSY"
    });
  }
  return next(error);
};

const getCurrentPositionRows = async (
  employeeId: number,
  transaction?: Transaction
): Promise<DatabaseRow[]> => sequelize.query(
  `
    SELECT TOP (1)
      ${positionProjection}
    FROM [dbo].[Position] AS position
    ${positionJoinSql}
    WHERE position.[EmployeeId] = :employeeId
    ORDER BY position.[Id];
  `,
  {
    replacements: { employeeId },
    type: QueryTypes.SELECT,
    raw: true,
    transaction
  }
) as Promise<DatabaseRow[]>;

const getPositionRowsById = async (
  positionId: number,
  transaction?: Transaction
): Promise<DatabaseRow[]> => sequelize.query(
  `
    SELECT
      ${positionProjection}
    FROM [dbo].[Position] AS position
    ${positionJoinSql}
    WHERE position.[Id] = :positionId;
  `,
  {
    replacements: { positionId },
    type: QueryTypes.SELECT,
    raw: true,
    transaction
  }
) as Promise<DatabaseRow[]>;

const lockEmployee = async (
  employeeId: number,
  transaction: Transaction
): Promise<boolean> => {
  const rows = await sequelize.query(
    `
      SELECT TOP (1) [ID_Employee]
      FROM [dbo].[Employee] WITH (UPDLOCK, HOLDLOCK)
      WHERE [ID_Employee] = :employeeId;
    `,
    {
      replacements: { employeeId },
      type: QueryTypes.SELECT,
      raw: true,
      transaction
    }
  ) as Array<{ ID_Employee: number }>;
  return Boolean(rows[0]);
};

const lockPosition = async (
  positionId: number,
  transaction: Transaction
): Promise<PositionLockRow | null> => {
  const rows = await sequelize.query(
    `
      SELECT TOP (1) [Id], [EmployeeId]
      FROM [dbo].[Position] WITH (UPDLOCK, HOLDLOCK)
      WHERE [Id] = :positionId;
    `,
    {
      replacements: { positionId },
      type: QueryTypes.SELECT,
      raw: true,
      transaction
    }
  ) as PositionLockRow[];
  return rows[0] ?? null;
};

const lockEmployeePositions = async (
  employeeId: number,
  transaction: Transaction
): Promise<PositionLockRow[]> => sequelize.query(
  `
    SELECT [Id], [EmployeeId]
    FROM [dbo].[Position] WITH (UPDLOCK, HOLDLOCK)
    WHERE [EmployeeId] = :employeeId
    ORDER BY [Id];
  `,
  {
    replacements: { employeeId },
    type: QueryTypes.SELECT,
    raw: true,
    transaction
  }
) as Promise<PositionLockRow[]>;

export const listVacantPositions = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  const parsed = parsePositionListQuery(req.query ?? {});
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.errors });
  }

  const { page, pageSize, jobId } = parsed.value;
  const offset = (page - 1) * pageSize;

  try {
    const [countRows, rows] = await Promise.all([
      sequelize.query(
        `
          SELECT COUNT_BIG(*) AS [Total]
          FROM [dbo].[Position]
          WHERE [EmployeeId] IS NULL
            AND (:jobId IS NULL OR [Job_ID] = :jobId);
        `,
        {
          replacements: { jobId },
          type: QueryTypes.SELECT,
          raw: true
        }
      ) as Promise<Array<{ Total: unknown }>>,
      sequelize.query(
        `
          SELECT
            ${positionProjection}
          FROM [dbo].[Position] AS position
          ${positionJoinSql}
          WHERE position.[EmployeeId] IS NULL
            AND (:jobId IS NULL OR position.[Job_ID] = :jobId)
          ORDER BY position.[Id]
          OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY;
        `,
        {
          replacements: { jobId, offset, pageSize },
          type: QueryTypes.SELECT,
          raw: true
        }
      ) as Promise<DatabaseRow[]>
    ]);

    const total = Number(countRows[0]?.Total ?? 0);
    return res.status(200).json({
      success: true,
      data: rows,
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

export const listPositions = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  const parsed = parsePositionListQuery(req.query ?? {});
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.errors });
  }

  const {
    page,
    pageSize,
    search,
    occupancy,
    positionType,
    jobId,
    status,
    sortBy,
    sortDirection
  } = parsed.value;
  const offset = (page - 1) * pageSize;
  const orderBySql = buildPositionOrderSql(sortBy, sortDirection);
  const replacements = {
    searchPattern: escapeLikePattern(search),
    occupancy,
    positionType,
    jobId,
    status,
    offset,
    pageSize
  };

  try {
    const [countRows, rows, summaryRows] = await Promise.all([
      sequelize.query(
        `
          SELECT COUNT_BIG(*) AS [Total]
          FROM [dbo].[Position] AS position
          ${positionJoinSql}
          WHERE ${positionFilterSql};
        `,
        { replacements, type: QueryTypes.SELECT, raw: true }
      ) as Promise<Array<{ Total: unknown }>>,
      sequelize.query(
        `
          SELECT
            ${positionProjection}
          FROM [dbo].[Position] AS position
          ${positionJoinSql}
          WHERE ${positionFilterSql}
          ORDER BY ${orderBySql}
          OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY;
        `,
        { replacements, type: QueryTypes.SELECT, raw: true }
      ) as Promise<DatabaseRow[]>,
      sequelize.query(
        `
          SELECT
            COUNT_BIG(*) AS [Total],
            SUM(CASE WHEN [EmployeeId] IS NOT NULL THEN CONVERT(bigint, 1) ELSE 0 END)
              AS [Occupied],
            SUM(CASE WHEN [EmployeeId] IS NULL THEN CONVERT(bigint, 1) ELSE 0 END)
              AS [Vacant],
            SUM(CASE WHEN [Job_ID] IS NULL THEN CONVERT(bigint, 1) ELSE 0 END)
              AS [MissingJob]
          FROM [dbo].[Position];
        `,
        { type: QueryTypes.SELECT, raw: true }
      ) as Promise<Array<{
        Total: unknown;
        Occupied: unknown;
        Vacant: unknown;
        MissingJob: unknown;
      }>>
    ]);

    const total = Number(countRows[0]?.Total ?? 0);
    const summary = summaryRows[0];
    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / pageSize)
      },
      summary: {
        total: Number(summary?.Total ?? 0),
        occupied: Number(summary?.Occupied ?? 0),
        vacant: Number(summary?.Vacant ?? 0),
        missingJob: Number(summary?.MissingJob ?? 0)
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const getPositionOptions = async (
  _req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  const columns = ["Position_Type", "PositionLevel", "Position_Degree", "Status"] as const;
  try {
    const resultSets = await Promise.all(columns.map((column) =>
      sequelize.query(
        `
          SELECT DISTINCT CONVERT(nvarchar(50), [${column}]) AS [Value]
          FROM [dbo].[Position]
          WHERE NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(50), [${column}]))), N'') IS NOT NULL
          ORDER BY [Value];
        `,
        { type: QueryTypes.SELECT, raw: true }
      ) as Promise<Array<{ Value: string }>>
    ));
    return res.status(200).json({
      success: true,
      data: {
        positionTypes: resultSets[0].map((row) => row.Value),
        positionLevels: resultSets[1].map((row) => row.Value),
        positionDegrees: resultSets[2].map((row) => row.Value),
        statuses: resultSets[3].map((row) => row.Value)
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const getPositionById = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  const parsedPositionId = parsePathId(req.params?.positionId, "Position ID");
  if (!parsedPositionId.success) {
    return res.status(400).json({ success: false, message: parsedPositionId.message });
  }
  try {
    const rows = await getPositionRowsById(parsedPositionId.value);
    if (!rows[0]) {
      return res.status(404).json({ success: false, message: "Position not found" });
    }
    return res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    return next(error);
  }
};

export const createPosition = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  const parsed = validateCreatePositionPayload(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.errors });
  }

  try {
    const result = await sequelize.transaction(async (transaction: Transaction) => {
      await acquirePositionMutationLock(transaction);
      const jobRows = await sequelize.query(
        `
          SELECT TOP (1) [Job_ID], [Job_Name_AR], [Job_Name_EN]
          FROM [dbo].[jobs] WITH (UPDLOCK, HOLDLOCK)
          WHERE [Job_ID] = :jobId;
        `,
        {
          replacements: { jobId: parsed.value.jobId },
          type: QueryTypes.SELECT,
          raw: true,
          transaction
        }
      ) as JobTitleRow[];
      if (!jobRows[0]) return { outcome: "job-not-found" as const };

      const lineLevelDescription = deriveLineLevelEnglishDescription(
        jobRows[0].Job_Name_EN,
        jobRows[0].Job_Name_AR
      );
      const lineLevelRows = await sequelize.query(
        `
          SELECT TOP (1) [Line_ID]
          FROM [dbo].[LineLevel] WITH (HOLDLOCK)
          WHERE LTRIM(RTRIM([EnglishDescription])) = :lineLevelDescription;
        `,
        {
          replacements: { lineLevelDescription },
          type: QueryTypes.SELECT,
          raw: true,
          transaction
        }
      ) as LineLevelRow[];
      const lineLevelId = Number(lineLevelRows[0]?.Line_ID);
      if (!Number.isSafeInteger(lineLevelId) || lineLevelId <= 0) {
        return {
          outcome: "line-level-not-found" as const,
          lineLevelDescription
        };
      }

      const insertedRows = await sequelize.query(
        `
          INSERT INTO [dbo].[Position] (
            [Position_Number],
            [PositionLevel],
            [Position_Degree],
            [Position_DateCreation],
            [Status],
            [Position_Type],
            [EmployeeId],
            [Job_ID],
            [LineLevelId]
          )
          OUTPUT INSERTED.[Id] AS [PositionId]
          VALUES (
            :positionNumber,
            :positionLevel,
            :positionDegree,
            :positionDateCreation,
            :status,
            :positionType,
            NULL,
            :jobId,
            :lineLevelId
          );
        `,
        {
          replacements: { ...parsed.value, lineLevelId },
          type: QueryTypes.SELECT,
          raw: true,
          transaction
        }
      ) as Array<{ PositionId: unknown }>;

      const positionId = Number(insertedRows[0]?.PositionId);
      if (!Number.isSafeInteger(positionId) || positionId <= 0) {
        throw new Error("The new position ID was not returned by SQL Server");
      }
      return {
        outcome: "created" as const,
        data: (await getPositionRowsById(positionId, transaction))[0]
      };
    });

    if (result.outcome === "job-not-found") {
      return res.status(404).json({
        success: false,
        message: "Job not found",
        code: "JOB_NOT_FOUND"
      });
    }
    if (result.outcome === "line-level-not-found") {
      return res.status(500).json({
        success: false,
        message: `Required line level "${result.lineLevelDescription}" is not configured`,
        code: "LINE_LEVEL_NOT_CONFIGURED"
      });
    }
    return res.status(201).json({
      success: true,
      message: "Vacant position created successfully",
      data: result.data
    });
  } catch (error) {
    return handlePositionMutationError(error, res, next);
  }
};

export const updatePosition = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  const parsedPositionId = parsePathId(req.params?.positionId, "Position ID");
  if (!parsedPositionId.success) return res.status(400).json({ success: false, message: parsedPositionId.message });
  const parsed = validateUpdatePositionPayload(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ success: false, errors: parsed.errors });

  try {
    const result = await sequelize.transaction(async (transaction: Transaction) => {
      await acquirePositionMutationLock(transaction);
      const existing = await lockPosition(parsedPositionId.value, transaction);
      if (!existing) return { outcome: "not-found" as const };

      const jobRows = await sequelize.query(
        `SELECT TOP (1) [Job_ID], [Job_Name_AR], [Job_Name_EN]
         FROM [dbo].[jobs] WITH (UPDLOCK, HOLDLOCK) WHERE [Job_ID] = :jobId;`,
        { replacements: { jobId: parsed.value.jobId }, type: QueryTypes.SELECT, raw: true, transaction }
      ) as JobTitleRow[];
      if (!jobRows[0]) return { outcome: "job-not-found" as const };

      const lineLevelDescription = deriveLineLevelEnglishDescription(jobRows[0].Job_Name_EN, jobRows[0].Job_Name_AR);
      const lineLevelRows = await sequelize.query(
        `SELECT TOP (1) [Line_ID] FROM [dbo].[LineLevel] WITH (HOLDLOCK)
         WHERE LTRIM(RTRIM([EnglishDescription])) = :lineLevelDescription;`,
        { replacements: { lineLevelDescription }, type: QueryTypes.SELECT, raw: true, transaction }
      ) as LineLevelRow[];
      const lineLevelId = Number(lineLevelRows[0]?.Line_ID);
      if (!Number.isSafeInteger(lineLevelId) || lineLevelId <= 0) {
        return { outcome: "line-level-not-found" as const, lineLevelDescription };
      }

      await sequelize.query(
        `UPDATE [dbo].[Position]
         SET [Position_Number] = :positionNumber, [PositionLevel] = :positionLevel,
             [Position_Degree] = :positionDegree, [Position_DateCreation] = :positionDateCreation,
             [Status] = :status, [Position_Type] = :positionType,
             [Job_ID] = :jobId, [LineLevelId] = :lineLevelId
         WHERE [Id] = :positionId;`,
        { replacements: { ...parsed.value, positionId: parsedPositionId.value, lineLevelId }, type: QueryTypes.UPDATE, transaction }
      );
      return { outcome: "updated" as const, data: (await getPositionRowsById(parsedPositionId.value, transaction))[0] };
    });

    if (result.outcome === "not-found") return res.status(404).json({ success: false, message: "Position not found" });
    if (result.outcome === "job-not-found") return res.status(404).json({ success: false, message: "Job not found", code: "JOB_NOT_FOUND" });
    if (result.outcome === "line-level-not-found") return res.status(500).json({ success: false, message: `Required line level "${result.lineLevelDescription}" is not configured`, code: "LINE_LEVEL_NOT_CONFIGURED" });
    return res.status(200).json({ success: true, message: "Position updated successfully", data: result.data });
  } catch (error) {
    return handlePositionMutationError(error, res, next);
  }
};

export const deletePosition = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  const parsedPositionId = parsePathId(req.params?.positionId, "Position ID");
  if (!parsedPositionId.success) return res.status(400).json({ success: false, message: parsedPositionId.message });
  try {
    const result = await sequelize.transaction(async (transaction: Transaction) => {
      await acquirePositionMutationLock(transaction);
      const existing = await lockPosition(parsedPositionId.value, transaction);
      if (!existing) return "not-found" as const;
      if (existing.EmployeeId !== null) return "occupied" as const;
      await sequelize.query(
        `DELETE FROM [dbo].[Position] WHERE [Id] = :positionId;`,
        { replacements: { positionId: parsedPositionId.value }, type: QueryTypes.DELETE, transaction }
      );
      return "deleted" as const;
    });
    if (result === "not-found") return res.status(404).json({ success: false, message: "Position not found" });
    if (result === "occupied") return res.status(409).json({ success: false, message: "Occupied positions cannot be deleted", code: "POSITION_OCCUPIED" });
    return res.status(200).json({ success: true, message: "Position deleted successfully", data: { positionId: parsedPositionId.value } });
  } catch (error) {
    return handlePositionMutationError(error, res, next);
  }
};

export const getCurrentEmployeePosition = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  const parsedEmployeeId = parsePathId(req.params?.employeeId, "Employee ID");
  if (!parsedEmployeeId.success) {
    return res.status(400).json({ success: false, message: parsedEmployeeId.message });
  }

  try {
    const rows = await getCurrentPositionRows(parsedEmployeeId.value);
    if (!rows[0]) {
      return res.status(404).json({
        success: false,
        message: "This employee does not occupy a position"
      });
    }
    return res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    return next(error);
  }
};

export const assignEmployeeToPosition = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  const parsed = validateAssignPositionPayload(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.errors });
  }

  try {
    const result = await sequelize.transaction(async (transaction: Transaction) => {
      await acquirePositionMutationLock(transaction);
      if (!await lockEmployee(parsed.value.employeeId, transaction)) {
        return { outcome: "employee-not-found" as const };
      }

      const employeePositions = await lockEmployeePositions(parsed.value.employeeId, transaction);
      if (employeePositions.length > 0) {
        return { outcome: "employee-occupied" as const };
      }

      const position = await lockPosition(parsed.value.positionId, transaction);
      if (!position) return { outcome: "position-not-found" as const };
      if (position.EmployeeId !== null) return { outcome: "position-occupied" as const };

      await sequelize.query(
        `
          UPDATE [dbo].[Position]
          SET [EmployeeId] = :employeeId
          WHERE [Id] = :positionId;
        `,
        {
          replacements: parsed.value,
          type: QueryTypes.UPDATE,
          transaction
        }
      );

      return {
        outcome: "assigned" as const,
        data: (await getCurrentPositionRows(parsed.value.employeeId, transaction))[0]
      };
    });

    if (result.outcome === "employee-not-found") {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }
    if (result.outcome === "position-not-found") {
      return res.status(404).json({ success: false, message: "Position not found" });
    }
    if (result.outcome === "employee-occupied") {
      return res.status(409).json({
        success: false,
        message: "Employee already occupies a position",
        code: "EMPLOYEE_ALREADY_HAS_POSITION"
      });
    }
    if (result.outcome === "position-occupied") {
      return res.status(409).json({
        success: false,
        message: "Position is already occupied",
        code: "POSITION_OCCUPIED"
      });
    }

    return res.status(201).json({
      success: true,
      message: "Employee assigned to position successfully",
      data: result.data
    });
  } catch (error) {
    return handlePositionMutationError(error, res, next);
  }
};

export const transferEmployeePosition = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  const parsed = validateTransferPositionPayload(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.errors });
  }

  try {
    const result = await sequelize.transaction(async (transaction: Transaction) => {
      await acquirePositionMutationLock(transaction);
      if (!await lockEmployee(parsed.value.employeeId, transaction)) {
        return { outcome: "employee-not-found" as const };
      }

      const currentPositions = await lockEmployeePositions(parsed.value.employeeId, transaction);
      if (currentPositions.length === 0) return { outcome: "no-current-position" as const };

      const currentPosition = currentPositions[0];
      if (currentPosition.Id === parsed.value.positionId) {
        return {
          outcome: "transferred" as const,
          data: (await getCurrentPositionRows(parsed.value.employeeId, transaction))[0]
        };
      }

      const targetPosition = await lockPosition(parsed.value.positionId, transaction);
      if (!targetPosition) return { outcome: "position-not-found" as const };
      if (targetPosition.EmployeeId !== null) return { outcome: "position-occupied" as const };

      await sequelize.query(
        `
          UPDATE [dbo].[Position]
          SET [EmployeeId] = NULL
          WHERE [EmployeeId] = :employeeId;

          UPDATE [dbo].[Position]
          SET [EmployeeId] = :employeeId
          WHERE [Id] = :positionId;
        `,
        {
          replacements: parsed.value,
          type: QueryTypes.UPDATE,
          transaction
        }
      );

      return {
        outcome: "transferred" as const,
        data: (await getCurrentPositionRows(parsed.value.employeeId, transaction))[0]
      };
    });

    if (result.outcome === "employee-not-found") {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }
    if (result.outcome === "no-current-position") {
      return res.status(409).json({
        success: false,
        message: "Employee does not currently occupy a position",
        code: "EMPLOYEE_HAS_NO_POSITION"
      });
    }
    if (result.outcome === "position-not-found") {
      return res.status(404).json({ success: false, message: "Position not found" });
    }
    if (result.outcome === "position-occupied") {
      return res.status(409).json({
        success: false,
        message: "Position is already occupied",
        code: "POSITION_OCCUPIED"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Employee transferred successfully",
      data: result.data
    });
  } catch (error) {
    return handlePositionMutationError(error, res, next);
  }
};

export const releaseEmployeePosition = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  const parsed = validateReleasePositionPayload(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.errors });
  }

  try {
    const result = await sequelize.transaction(async (transaction: Transaction) => {
      await acquirePositionMutationLock(transaction);
      if (!await lockEmployee(parsed.value.employeeId, transaction)) {
        return { outcome: "employee-not-found" as const };
      }
      const positions = await lockEmployeePositions(parsed.value.employeeId, transaction);
      if (positions.length === 0) return { outcome: "no-current-position" as const };

      await sequelize.query(
        `
          UPDATE [dbo].[Position]
          SET [EmployeeId] = NULL
          WHERE [EmployeeId] = :employeeId;
        `,
        {
          replacements: parsed.value,
          type: QueryTypes.UPDATE,
          transaction
        }
      );
      return { outcome: "released" as const, positionId: positions[0].Id };
    });

    if (result.outcome === "employee-not-found") {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }
    if (result.outcome === "no-current-position") {
      return res.status(404).json({
        success: false,
        message: "Employee does not currently occupy a position"
      });
    }
    return res.status(200).json({
      success: true,
      message: "Position released successfully",
      data: { employeeId: parsed.value.employeeId, positionId: result.positionId }
    });
  } catch (error) {
    return handlePositionMutationError(error, res, next);
  }
};
