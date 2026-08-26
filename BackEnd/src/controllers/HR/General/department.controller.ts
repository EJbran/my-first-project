import { Op, QueryTypes } from "sequelize";
import { Department } from "../../../model/General";
import {
  DepartmentPayload,
  normalizeDepartmentPayload,
  validateDepartmentPayload
} from "../../../validators/General/department.validator";

const { sequelize } = require("../../../config/database");

type RequestLike = {
  params?: Record<string, string>;
  query?: Record<string, string | undefined>;
  body?: Record<string, unknown>;
};

type ResponseLike = {
  status: (statusCode: number) => ResponseLike;
  json: (payload: Record<string, unknown>) => unknown;
};

type NextLike = (error?: unknown) => void;

type DatabaseErrorLike = {
  name?: unknown;
  original?: { number?: unknown; code?: unknown };
  parent?: { number?: unknown; code?: unknown };
};

const isForeignKeyConstraintError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const candidate = error as DatabaseErrorLike;
  const databaseError = candidate.original ?? candidate.parent;
  return candidate.name === "SequelizeForeignKeyConstraintError"
    || Number(databaseError?.number) === 547;
};

const listAttributes = [
  "Id",
  "DepartmentName_Arabic",
  "DepartmentName_English",
  "DepartmentType",
  "AttachedNumber",
  "DepartmentAddress",
  "DepartmentPhone",
  "DepartmentExtenstion"
];

const MAX_HIERARCHY_LEADER_DEPARTMENTS = 64;
const SQL_SERVER_INT_MAX = 2_147_483_647;

type HierarchyLeaderRow = {
  DepartmentId: unknown;
  ExpectedLineLevel: unknown;
  ExactCandidateCount: unknown;
  LeadershipCandidateCount: unknown;
  ResolutionStatus: unknown;
  EmployeeId: unknown;
  EmployeeNumber: unknown;
  DisplayName: unknown;
  NameEnglish: unknown;
  NameArabic: unknown;
  TitleEnglish: unknown;
  TitleArabic: unknown;
  LineLevelEnglish: unknown;
  ProfileImageUrl: unknown;
};

type ParsedDepartmentIds =
  | { success: true; ids: number[] }
  | { success: false; message: string };

const parseHierarchyLeaderDepartmentIds = (
  rawIds: string | undefined
): ParsedDepartmentIds => {
  if (!rawIds?.trim()) {
    return {
      success: false,
      message: "ids must contain one or more comma-separated department IDs"
    };
  }

  const tokens = rawIds.split(",").map((token) => token.trim());
  if (
    tokens.some((token) => !/^[1-9]\d*$/.test(token))
  ) {
    return {
      success: false,
      message: "Every department ID must be a positive integer"
    };
  }

  const ids = Array.from(new Set(tokens.map(Number)));
  if (
    ids.some((id) =>
      !Number.isSafeInteger(id)
      || id <= 0
      || id > SQL_SERVER_INT_MAX
    )
  ) {
    return {
      success: false,
      message: "Every department ID must be a valid SQL Server integer"
    };
  }

  if (ids.length > MAX_HIERARCHY_LEADER_DEPARTMENTS) {
    return {
      success: false,
      message: `A maximum of ${MAX_HIERARCHY_LEADER_DEPARTMENTS} department IDs is allowed`
    };
  }

  return { success: true, ids };
};

const nullableText = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
};

export const getDepartmentHierarchyLeaders = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  const parsed = parseHierarchyLeaderDepartmentIds(req.query?.ids);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.message
    });
  }

  const replacements: Record<string, number> = {};
  const requestedDepartmentValues = parsed.ids
    .map((departmentId, index) => {
      replacements[`departmentId${index}`] = departmentId;
      return `(:departmentId${index}, ${index})`;
    })
    .join(",\n");

  try {
    const rows = await sequelize.query(
      `
        WITH requestedDepartments ([DepartmentId], [RequestOrder]) AS (
          SELECT requested.[DepartmentId], requested.[RequestOrder]
          FROM (VALUES
            ${requestedDepartmentValues}
          ) AS requested ([DepartmentId], [RequestOrder])
        ),
        normalizedDepartments AS (
          SELECT
            requested.[RequestOrder],
            department.[Id] AS [DepartmentId],
            LOWER(
              LTRIM(RTRIM(COALESCE(department.[DepartmentType], N'')))
            ) COLLATE Latin1_General_100_CI_AI AS [NormalizedDepartmentType]
          FROM requestedDepartments AS requested
          INNER JOIN [dbo].[Departments] AS department
            ON department.[Id] = requested.[DepartmentId]
        ),
        departmentScope AS (
          SELECT
            department.[RequestOrder],
            department.[DepartmentId],
            CASE
              WHEN department.[NormalizedDepartmentType] LIKE N'%top management%'
                OR department.[NormalizedDepartmentType] LIKE N'%chairman%'
                THEN N'Board Committee Chairman'
              WHEN department.[NormalizedDepartmentType] LIKE N'%committee member%'
                OR department.[NormalizedDepartmentType] = N'member'
                THEN N'Board Committee Member'
              WHEN department.[NormalizedDepartmentType] LIKE N'%manager%'
                OR department.[NormalizedDepartmentType] = N'department'
                THEN N'Department Manager'
              WHEN department.[NormalizedDepartmentType] LIKE N'%division%'
                OR department.[NormalizedDepartmentType] = N'supervisor'
                THEN N'Supervisor'
              WHEN department.[NormalizedDepartmentType] LIKE N'%coordinator%'
                OR department.[NormalizedDepartmentType] LIKE N'%coordination unit%'
                THEN N'Coordinator'
              WHEN department.[NormalizedDepartmentType] LIKE N'%section%'
                THEN N'Section Head'
              WHEN department.[NormalizedDepartmentType] = N'unit'
                OR department.[NormalizedDepartmentType] LIKE N'%unit supervisor%'
                THEN N'Unit Supervisor'
              ELSE NULL
            END AS [ExpectedLineLevel]
          FROM normalizedDepartments AS department
        ),
        candidatePositions AS (
          SELECT
            scope.[DepartmentId],
            employee.[ID_Employee] AS [EmployeeId],
            CONVERT(nvarchar(100), employee.[Ref_Employee]) AS [EmployeeNumber],
            NULLIF(LTRIM(RTRIM(employee.[EmployeeName_En])), N'') AS [NameEnglish],
            NULLIF(LTRIM(RTRIM(employee.[EmployeeName])), N'') AS [NameArabic],
            COALESCE(
              NULLIF(LTRIM(RTRIM(employee.[EmployeeName_En])), N''),
              NULLIF(LTRIM(RTRIM(employee.[EmployeeName])), N''),
              N'Employee ' + CONVERT(nvarchar(30), employee.[ID_Employee])
            ) AS [DisplayName],
            NULLIF(
              LTRIM(RTRIM(CONVERT(nvarchar(4000), job.[Job_Name_EN]))),
              N''
            ) AS [TitleEnglish],
            NULLIF(
              LTRIM(RTRIM(CONVERT(nvarchar(4000), job.[Job_Name_AR]))),
              N''
            ) AS [TitleArabic],
            lineLevel.[EnglishDescription] AS [LineLevelEnglish],
            lineLevel.[SortLine] AS [LineLevelSort],
            position.[Id] AS [PositionId],
            position.[Position_DateCreation] AS [PositionDateCreation],
            position.[Status] AS [PositionStatus],
            CASE
              WHEN scope.[ExpectedLineLevel] IS NOT NULL
                AND lineLevel.[EnglishDescription] COLLATE Latin1_General_100_CI_AI
                  = scope.[ExpectedLineLevel] COLLATE Latin1_General_100_CI_AI
                THEN CONVERT(bigint, 1)
              ELSE CONVERT(bigint, 0)
            END AS [IsExact]
          FROM departmentScope AS scope
          INNER JOIN [dbo].[Employee] AS employee
            ON employee.[Department_Id] = scope.[DepartmentId]
          INNER JOIN [dbo].[Position] AS position
            ON position.[EmployeeId] = employee.[ID_Employee]
          INNER JOIN [dbo].[LineLevel] AS lineLevel
            ON lineLevel.[Line_ID] = position.[LineLevelId]
          LEFT JOIN [dbo].[jobs] AS job
            ON job.[Job_ID] = position.[Job_ID]
          WHERE lineLevel.[SortLine] >= 0
            AND (
              TRY_CONVERT(int, employee.[State]) = 1
              OR LOWER(
                LTRIM(RTRIM(CONVERT(nvarchar(20), employee.[State])))
              ) COLLATE Latin1_General_100_CI_AI IN (N'true', N'active')
            )
        ),
        rankedEmployeeCandidates AS (
          SELECT
            candidate.*,
            ROW_NUMBER() OVER (
              PARTITION BY candidate.[DepartmentId], candidate.[EmployeeId]
              ORDER BY
                candidate.[IsExact] DESC,
                CASE
                  WHEN LOWER(
                    LTRIM(RTRIM(COALESCE(candidate.[PositionStatus], N'')))
                  ) COLLATE Latin1_General_100_CI_AI = N'active'
                    THEN 0
                  ELSE 1
                END,
                candidate.[LineLevelSort] DESC,
                candidate.[PositionDateCreation] DESC,
                candidate.[PositionId] DESC
            ) AS [EmployeePositionRank]
          FROM candidatePositions AS candidate
        ),
        leaderCandidates AS (
          SELECT
            candidate.[DepartmentId],
            candidate.[EmployeeId],
            candidate.[EmployeeNumber],
            candidate.[DisplayName],
            candidate.[NameEnglish],
            candidate.[NameArabic],
            candidate.[TitleEnglish],
            candidate.[TitleArabic],
            candidate.[LineLevelEnglish],
            candidate.[IsExact]
          FROM rankedEmployeeCandidates AS candidate
          WHERE candidate.[EmployeePositionRank] = 1
        ),
        candidateSummary AS (
          SELECT
            candidate.[DepartmentId],
            COUNT_BIG(*) AS [LeadershipCandidateCount],
            SUM(candidate.[IsExact]) AS [ExactCandidateCount]
          FROM leaderCandidates AS candidate
          GROUP BY candidate.[DepartmentId]
        ),
        uniqueLeaders AS (
          SELECT candidate.*
          FROM leaderCandidates AS candidate
          INNER JOIN candidateSummary AS summary
            ON summary.[DepartmentId] = candidate.[DepartmentId]
            AND summary.[ExactCandidateCount] = 1
          WHERE candidate.[IsExact] = 1
        )
        SELECT
          scope.[DepartmentId],
          scope.[ExpectedLineLevel],
          COALESCE(summary.[ExactCandidateCount], 0) AS [ExactCandidateCount],
          COALESCE(summary.[LeadershipCandidateCount], 0) AS [LeadershipCandidateCount],
          CASE
            WHEN scope.[ExpectedLineLevel] IS NULL THEN N'unsupported-type'
            WHEN COALESCE(summary.[ExactCandidateCount], 0) > 1 THEN N'ambiguous'
            WHEN COALESCE(summary.[ExactCandidateCount], 0) = 1 THEN N'resolved'
            ELSE N'unassigned'
          END AS [ResolutionStatus],
          leader.[EmployeeId],
          leader.[EmployeeNumber],
          leader.[DisplayName],
          leader.[NameEnglish],
          leader.[NameArabic],
          COALESCE(leader.[TitleEnglish], leader.[LineLevelEnglish])
            AS [TitleEnglish],
          leader.[TitleArabic],
          leader.[LineLevelEnglish],
          CAST(NULL AS nvarchar(2048)) AS [ProfileImageUrl]
        FROM departmentScope AS scope
        LEFT JOIN candidateSummary AS summary
          ON summary.[DepartmentId] = scope.[DepartmentId]
        LEFT JOIN uniqueLeaders AS leader
          ON leader.[DepartmentId] = scope.[DepartmentId]
        ORDER BY scope.[RequestOrder];
      `,
      {
        replacements,
        type: QueryTypes.SELECT,
        raw: true
      }
    ) as HierarchyLeaderRow[];

    const foundDepartmentIds = new Set(
      rows.map((row) => Number(row.DepartmentId))
    );
    const missingDepartmentIds = parsed.ids.filter(
      (departmentId) => !foundDepartmentIds.has(departmentId)
    );

    return res.status(200).json({
      success: true,
      data: rows.map((row) => {
        const employeeId = Number(row.EmployeeId);
        const hasResolvedLeader = Number.isSafeInteger(employeeId) && employeeId > 0;

        return {
          departmentId: Number(row.DepartmentId),
          status: nullableText(row.ResolutionStatus) ?? "unassigned",
          expectedLineLevel: nullableText(row.ExpectedLineLevel),
          exactCandidateCount: Number(row.ExactCandidateCount ?? 0),
          leadershipCandidateCount: Number(row.LeadershipCandidateCount ?? 0),
          leader: hasResolvedLeader
            ? {
                employeeId,
                employeeNumber: nullableText(row.EmployeeNumber),
                displayName: nullableText(row.DisplayName) ?? `Employee ${employeeId}`,
                nameEnglish: nullableText(row.NameEnglish),
                nameArabic: nullableText(row.NameArabic),
                titleEnglish: nullableText(row.TitleEnglish),
                titleArabic: nullableText(row.TitleArabic),
                lineLevelEnglish: nullableText(row.LineLevelEnglish),
                profileImageUrl: nullableText(row.ProfileImageUrl)
              }
            : null
        };
      }),
      missingDepartmentIds
    });
  } catch (error) {
    return next(error);
  }
};

export const listDepartments = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const search = req.query?.search?.trim();
    const where = search
      ? {
          [Op.or]: [
            { DepartmentName_English: { [Op.like]: `%${search}%` } },
            { DepartmentName_Arabic: { [Op.like]: `%${search}%` } },
            { DepartmentType: { [Op.like]: `%${search}%` } },
            { DepartmentAddress: { [Op.like]: `%${search}%` } },
            { DepartmentPhone: { [Op.like]: `%${search}%` } },
            { DepartmentExtenstion: { [Op.like]: `%${search}%` } }
          ]
        }
      : undefined;

    const rows = await Department.findAll({
      where,
      attributes: listAttributes,
      order: [["DepartmentName_English", "ASC"]]
    });

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return next(error);
  }
};

export const getDepartmentById = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const row = await Department.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }

    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const createDepartment = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const payload = normalizeDepartmentPayload({ ...(req.body || {}) } as DepartmentPayload);
    const errors = validateDepartmentPayload(payload);

    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const row = await Department.create(payload as never);
    return res.status(201).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const updateDepartment = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const row = await Department.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }

    const payload = normalizeDepartmentPayload({
      ...row.get({ plain: true }),
      ...(req.body || {})
    } as DepartmentPayload);

    const errors = validateDepartmentPayload(payload);
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    await row.update(payload);
    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const deleteDepartment = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const row = await Department.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }

    await row.destroy();
    return res.status(200).json({ success: true, message: "Department deleted" });
  } catch (error) {
    if (isForeignKeyConstraintError(error)) {
      return res.status(409).json({
        success: false,
        message: "Department cannot be deleted because it is assigned or referenced",
        code: "DEPARTMENT_IN_USE"
      });
    }
    return next(error);
  }
};
