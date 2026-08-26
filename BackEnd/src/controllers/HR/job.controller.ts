import { QueryTypes, Transaction, type Transaction as SequelizeTransaction } from "sequelize";
import {
  JOB_TEXT_FIELDS,
  parseJobListQuery,
  parseJobOptionsQuery,
  validateCreateJobPayload,
  type JobSortDirection,
  type JobSortField
} from "../../validators/HR/job.validator";

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

const jobPositionCountsJoin = `
  LEFT JOIN (
    SELECT
      [Job_ID],
      COUNT_BIG(*) AS [TotalPositions],
      SUM(CASE WHEN [EmployeeId] IS NOT NULL THEN CONVERT(bigint, 1) ELSE 0 END)
        AS [OccupiedPositions],
      SUM(CASE WHEN [EmployeeId] IS NULL THEN CONVERT(bigint, 1) ELSE 0 END)
        AS [VacantPositions]
    FROM [dbo].[Position]
    WHERE [Job_ID] IS NOT NULL
    GROUP BY [Job_ID]
  ) AS positionCounts
    ON positionCounts.[Job_ID] = job.[Job_ID]
`;

const jobSummaryProjection = `
  job.[Job_ID],
  job.[Job_Name_AR],
  job.[Job_Name_EN],
  job.[Job_Family],
  job.[Career_Level],
  job.[Role_Criticality],
  job.[Job_Type],
  CONVERT(int, COALESCE(positionCounts.[TotalPositions], 0)) AS [TotalPositions],
  CONVERT(int, COALESCE(positionCounts.[OccupiedPositions], 0)) AS [OccupiedPositions],
  CONVERT(int, COALESCE(positionCounts.[VacantPositions], 0)) AS [VacantPositions]
`;

const jobDetailProjection = `
  ${["Job_ID", ...JOB_TEXT_FIELDS].map((field) => `job.[${field}]`).join(",\n  ")},
  CONVERT(int, COALESCE(positionCounts.[TotalPositions], 0)) AS [TotalPositions],
  CONVERT(int, COALESCE(positionCounts.[OccupiedPositions], 0)) AS [OccupiedPositions],
  CONVERT(int, COALESCE(positionCounts.[VacantPositions], 0)) AS [VacantPositions]
`;

const jobFilterSql = `
  (:searchPattern IS NULL
    OR CONVERT(nvarchar(20), job.[Job_ID]) LIKE :searchPattern ESCAPE N'~'
    OR job.[Job_Name_AR] LIKE :searchPattern ESCAPE N'~'
    OR job.[Job_Name_EN] LIKE :searchPattern ESCAPE N'~'
    OR job.[Job_Family] LIKE :searchPattern ESCAPE N'~'
    OR job.[Career_Level] LIKE :searchPattern ESCAPE N'~'
    OR job.[Job_Type] LIKE :searchPattern ESCAPE N'~'
    OR job.[Role_Criticality] LIKE :searchPattern ESCAPE N'~')
  AND (:jobFamily IS NULL OR job.[Job_Family] = :jobFamily)
  AND (:careerLevel IS NULL OR job.[Career_Level] = :careerLevel)
  AND (:jobType IS NULL OR job.[Job_Type] = :jobType)
  AND (:roleCriticality IS NULL OR job.[Role_Criticality] = :roleCriticality)
`;

const jobSortExpressions: Record<JobSortField, string> = {
  jobId: "job.[Job_ID]",
  jobTitle: "job.[Job_Name_EN]",
  jobFamily: "job.[Job_Family]",
  careerLevel: "job.[Career_Level]",
  jobType: "job.[Job_Type]",
  criticality: "job.[Role_Criticality]"
};

const jobSortDirections: Record<JobSortDirection, string> = {
  asc: "ASC",
  desc: "DESC"
};

const buildJobOrderSql = (
  sortBy: JobSortField,
  sortDirection: JobSortDirection
): string => {
  const primarySort = `${jobSortExpressions[sortBy]} ${jobSortDirections[sortDirection]}`;
  return sortBy === "jobId" ? primarySort : `${primarySort}, job.[Job_ID] ASC`;
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
  return Number.isSafeInteger(value) && value <= 2147483647
    ? { success: true, value }
    : { success: false, message: `${label} must be a valid SQL integer` };
};

const acquireJobCatalogLock = async (transaction: SequelizeTransaction): Promise<void> => {
  await sequelize.query(
    `
      DECLARE @LockResult int;
      EXEC @LockResult = sys.sp_getapplock
        @Resource = N'HERP:JobCatalog',
        @LockMode = N'Exclusive',
        @LockOwner = N'Transaction',
        @LockTimeout = 10000;
      IF @LockResult < 0
        THROW 52002, 'Could not acquire the job catalog update lock. Please retry.', 1;
    `,
    { type: QueryTypes.RAW, transaction }
  );
};

const getJobDetailRows = async (
  jobId: number,
  transaction?: SequelizeTransaction
): Promise<DatabaseRow[]> => sequelize.query(
  `
    SELECT
      ${jobDetailProjection}
    FROM [dbo].[jobs] AS job
    ${jobPositionCountsJoin}
    WHERE job.[Job_ID] = :jobId;
  `,
  {
    replacements: { jobId },
    type: QueryTypes.SELECT,
    raw: true,
    transaction
  }
) as Promise<DatabaseRow[]>;

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

export const listJobs = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  const parsed = parseJobListQuery(req.query ?? {});
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.errors });
  }

  const {
    page,
    pageSize,
    search,
    jobFamily,
    careerLevel,
    jobType,
    roleCriticality,
    sortBy,
    sortDirection
  } = parsed.value;
  const offset = (page - 1) * pageSize;
  const orderBySql = buildJobOrderSql(sortBy, sortDirection);
  const replacements = {
    searchPattern: escapeLikePattern(search),
    jobFamily,
    careerLevel,
    jobType,
    roleCriticality,
    offset,
    pageSize
  };

  try {
    const [countRows, rows, summaryRows] = await Promise.all([
      sequelize.query(
        `
          SELECT COUNT_BIG(*) AS [Total]
          FROM [dbo].[jobs] AS job
          WHERE ${jobFilterSql};
        `,
        { replacements, type: QueryTypes.SELECT, raw: true }
      ) as Promise<Array<{ Total: unknown }>>,
      sequelize.query(
        `
          SELECT
            ${jobSummaryProjection}
          FROM [dbo].[jobs] AS job
          ${jobPositionCountsJoin}
          WHERE ${jobFilterSql}
          ORDER BY ${orderBySql}
          OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY;
        `,
        { replacements, type: QueryTypes.SELECT, raw: true }
      ) as Promise<DatabaseRow[]>,
      sequelize.query(
        `
          SELECT
            COUNT_BIG(*) AS [TotalJobs],
            COUNT(DISTINCT CONVERT(nvarchar(4000), [Job_Family])) AS [JobFamilies],
            SUM(CASE
              WHEN [Role_Criticality] LIKE N'%Critical%'
                AND [Role_Criticality] NOT LIKE N'%Review Required%'
              THEN CONVERT(bigint, 1)
              ELSE 0
            END) AS [CriticalRoles],
            SUM(CASE
              WHEN [Role_Criticality] LIKE N'%Review Required%'
              THEN CONVERT(bigint, 1)
              ELSE 0
            END) AS [UnderReview]
          FROM [dbo].[jobs];
        `,
        { type: QueryTypes.SELECT, raw: true }
      ) as Promise<Array<{
        TotalJobs: unknown;
        JobFamilies: unknown;
        CriticalRoles: unknown;
        UnderReview: unknown;
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
        totalJobs: Number(summary?.TotalJobs ?? 0),
        jobFamilies: Number(summary?.JobFamilies ?? 0),
        criticalRoles: Number(summary?.CriticalRoles ?? 0),
        underReview: Number(summary?.UnderReview ?? 0)
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const getJobById = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  const parsed = parsePathId(req.params?.jobId, "Job ID");
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.message });
  }
  try {
    const rows = await getJobDetailRows(parsed.value);
    if (!rows[0]) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    return res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    return next(error);
  }
};

export const getJobOptions = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  const parsed = parseJobOptionsQuery(req.query ?? {});
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.errors });
  }
  const searchPattern = escapeLikePattern(parsed.value.search);

  try {
    const [jobs, jobFamilies, careerLevels, jobTypes, roleCriticalities] = await Promise.all([
      sequelize.query(
        `
          SELECT TOP (:limit)
            [Job_ID] AS [JobId],
            [Job_Name_EN],
            [Job_Name_AR],
            [Job_Family]
          FROM [dbo].[jobs]
          WHERE :searchPattern IS NULL
            OR CONVERT(nvarchar(20), [Job_ID]) LIKE :searchPattern ESCAPE N'~'
            OR [Job_Name_EN] LIKE :searchPattern ESCAPE N'~'
            OR [Job_Name_AR] LIKE :searchPattern ESCAPE N'~'
            OR [Job_Family] LIKE :searchPattern ESCAPE N'~'
          ORDER BY [Job_Name_EN], [Job_ID];
        `,
        {
          replacements: { limit: parsed.value.limit, searchPattern },
          type: QueryTypes.SELECT,
          raw: true
        }
      ) as Promise<DatabaseRow[]>,
      ...["Job_Family", "Career_Level", "Job_Type", "Role_Criticality"].map((column) =>
        sequelize.query(
          `
            SELECT DISTINCT CONVERT(nvarchar(4000), [${column}]) AS [Value]
            FROM [dbo].[jobs]
            WHERE NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(4000), [${column}]))), N'') IS NOT NULL
            ORDER BY [Value];
          `,
          { type: QueryTypes.SELECT, raw: true }
        ) as Promise<Array<{ Value: string }>>
      )
    ]);

    return res.status(200).json({
      success: true,
      data: {
        jobs,
        jobFamilies: jobFamilies.map((row) => row.Value),
        careerLevels: careerLevels.map((row) => row.Value),
        jobTypes: jobTypes.map((row) => row.Value),
        roleCriticalities: roleCriticalities.map((row) => row.Value)
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const createJob = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  const parsed = validateCreateJobPayload(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.errors });
  }

  try {
    const result = await sequelize.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
      async (transaction: SequelizeTransaction) => {
        await acquireJobCatalogLock(transaction);

        let jobId = parsed.value.Job_ID;
        if (jobId !== null) {
          const existingRows = await sequelize.query(
            `
              SELECT TOP (1) [Job_ID]
              FROM [dbo].[jobs] WITH (UPDLOCK, HOLDLOCK)
              WHERE [Job_ID] = :jobId;
            `,
            {
              replacements: { jobId },
              type: QueryTypes.SELECT,
              raw: true,
              transaction
            }
          ) as DatabaseRow[];
          if (existingRows[0]) return { outcome: "duplicate" as const, jobId };
        } else {
          const allocationRows = await sequelize.query(
            `
              SELECT
                CASE
                  WHEN COALESCE(MAX(CONVERT(bigint, [Job_ID])), 0) >= 2147483647 THEN NULL
                  ELSE CONVERT(int, COALESCE(MAX(CONVERT(bigint, [Job_ID])), 0) + 1)
                END AS [Job_ID]
              FROM [dbo].[jobs] WITH (UPDLOCK, HOLDLOCK);
            `,
            { type: QueryTypes.SELECT, raw: true, transaction }
          ) as Array<{ Job_ID: unknown }>;
          const allocated = Number(allocationRows[0]?.Job_ID);
          if (!Number.isSafeInteger(allocated) || allocated <= 0) {
            return { outcome: "id-exhausted" as const };
          }
          jobId = allocated;
        }

        const columns = ["Job_ID", ...JOB_TEXT_FIELDS];
        const replacements: Record<string, unknown> = { Job_ID: jobId };
        for (const field of JOB_TEXT_FIELDS) replacements[field] = parsed.value[field];

        await sequelize.query(
          `
            INSERT INTO [dbo].[jobs] (
              ${columns.map((column) => `[${column}]`).join(", ")}
            ) VALUES (
              ${columns.map((column) => `:${column}`).join(", ")}
            );
          `,
          { replacements, type: QueryTypes.INSERT, transaction }
        );

        return {
          outcome: "created" as const,
          data: (await getJobDetailRows(jobId, transaction))[0]
        };
      }
    );

    if (result.outcome === "duplicate") {
      return res.status(409).json({
        success: false,
        message: `Job ID ${result.jobId} already exists`,
        code: "JOB_ID_EXISTS"
      });
    }
    if (result.outcome === "id-exhausted") {
      return res.status(409).json({
        success: false,
        message: "No new Job ID can be allocated",
        code: "JOB_ID_EXHAUSTED"
      });
    }
    return res.status(201).json({
      success: true,
      message: "Job created successfully",
      data: result.data
    });
  } catch (error) {
    if (getSqlErrorNumber(error) === 52002) {
      return res.status(503).json({
        success: false,
        message: "The job catalog is temporarily busy. Please retry.",
        code: "CATALOG_BUSY"
      });
    }
    if ([2601, 2627].includes(getSqlErrorNumber(error) ?? -1)) {
      return res.status(409).json({
        success: false,
        message: "The selected Job ID already exists",
        code: "JOB_ID_EXISTS"
      });
    }
    return next(error);
  }
};
