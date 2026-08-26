import { QueryTypes } from "sequelize";

const { sequelize } = require("../../config/database");

type RequestLike = {
  query?: Record<string, unknown>;
};

type ResponseLike = {
  status: (statusCode: number) => ResponseLike;
  json: (payload: Record<string, unknown>) => unknown;
};

type NextLike = (error?: unknown) => void;

type DepartmentRow = {
  DepartmentId: unknown;
  ParentDepartmentId: unknown;
  DepartmentNameEnglish: unknown;
  DepartmentNameArabic: unknown;
  DepartmentType: unknown;
};

type EmployeeCountRow = {
  DepartmentId: unknown;
  DirectEmployeeCount: unknown;
  ActiveEmployeeCount: unknown;
};

type LeadershipCandidateRow = {
  DepartmentId: unknown;
  EmployeeId: unknown;
  EmployeeNumber: unknown;
  DisplayName: unknown;
  NameEnglish: unknown;
  NameArabic: unknown;
  TitleEnglish: unknown;
  TitleArabic: unknown;
  LineLevelEnglish: unknown;
  LineLevelSort: unknown;
  PositionId: unknown;
  PositionDateCreation: unknown;
  PositionStatus: unknown;
};

type DepartmentRecord = {
  departmentId: number;
  parentDepartmentId: number | null;
  nameEnglish: string | null;
  nameArabic: string | null;
  departmentType: string | null;
};

type HierarchyEntry = {
  department: DepartmentRecord;
  depth: number;
};

export type OrganizationHierarchyQuery =
  | {
      success: true;
      rootId: number | null;
      maxDepth: number;
    }
  | {
      success: false;
      message: string;
    };

const DEFAULT_MAX_DEPTH = 8;
const MAX_HIERARCHY_DEPTH = 63;
const SQL_SERVER_INT_MAX = 2_147_483_647;

const nullableText = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
};

const nullablePositiveInteger = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const nonnegativeCount = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
};

const numericSortValue = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
};

const timestampSortValue = (value: unknown): number => {
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
  }

  const text = nullableText(value);
  if (!text) return Number.NEGATIVE_INFINITY;
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
};

const normalizeComparableText = (value: unknown): string => {
  const text = nullableText(value);
  if (!text) return "";

  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en-US");
};

const getExpectedLineLevel = (departmentType: unknown): string | null => {
  const normalized = normalizeComparableText(departmentType);

  if (
    normalized.includes("top management")
    || normalized.includes("chairman")
  ) {
    return "Board Committee Chairman";
  }

  if (
    normalized.includes("committee member")
    || normalized === "member"
  ) {
    return "Board Committee Member";
  }

  if (
    normalized.includes("manager")
    || normalized === "department"
  ) {
    return "Department Manager";
  }

  if (
    normalized.includes("division")
    || normalized === "supervisor"
  ) {
    return "Supervisor";
  }

  if (
    normalized.includes("coordinator")
    || normalized.includes("coordination unit")
  ) {
    return "Coordinator";
  }

  if (normalized.includes("section")) {
    return "Section Head";
  }

  if (
    normalized === "unit"
    || normalized.includes("unit supervisor")
  ) {
    return "Unit Supervisor";
  }

  return null;
};

const isExactCandidate = (
  candidate: LeadershipCandidateRow,
  expectedLineLevel: string | null
): boolean =>
  expectedLineLevel !== null
  && normalizeComparableText(candidate.LineLevelEnglish)
    === normalizeComparableText(expectedLineLevel);

const candidateIsPreferred = (
  candidate: LeadershipCandidateRow,
  current: LeadershipCandidateRow,
  expectedLineLevel: string | null
): boolean => {
  const candidateExact = isExactCandidate(candidate, expectedLineLevel);
  const currentExact = isExactCandidate(current, expectedLineLevel);
  if (candidateExact !== currentExact) return candidateExact;

  const candidateActive =
    normalizeComparableText(candidate.PositionStatus) === "active";
  const currentActive =
    normalizeComparableText(current.PositionStatus) === "active";
  if (candidateActive !== currentActive) return candidateActive;

  const candidateLineLevelSort =
    numericSortValue(candidate.LineLevelSort);
  const currentLineLevelSort =
    numericSortValue(current.LineLevelSort);
  if (candidateLineLevelSort !== currentLineLevelSort) {
    return candidateLineLevelSort > currentLineLevelSort;
  }

  const candidateTimestamp =
    timestampSortValue(candidate.PositionDateCreation);
  const currentTimestamp =
    timestampSortValue(current.PositionDateCreation);
  if (candidateTimestamp !== currentTimestamp) {
    return candidateTimestamp > currentTimestamp;
  }

  return numericSortValue(candidate.PositionId)
    > numericSortValue(current.PositionId);
};

const parseSingleQueryValue = (
  value: unknown
):
  | { provided: false }
  | { provided: true; value: string }
  | { provided: true; invalid: true } => {
  if (value === undefined) return { provided: false };
  if (typeof value !== "string") return { provided: true, invalid: true };
  return { provided: true, value: value.trim() };
};

export const parseOrganizationHierarchyQuery = (
  query: Record<string, unknown> | undefined
): OrganizationHierarchyQuery => {
  const rootIdValue = parseSingleQueryValue(query?.rootId);
  let rootId: number | null = null;

  if (rootIdValue.provided) {
    if (
      "invalid" in rootIdValue
      || !/^[1-9]\d*$/.test(rootIdValue.value)
    ) {
      return {
        success: false,
        message: "rootId must be a positive SQL Server integer"
      };
    }

    rootId = Number(rootIdValue.value);
    if (
      !Number.isSafeInteger(rootId)
      || rootId <= 0
      || rootId > SQL_SERVER_INT_MAX
    ) {
      return {
        success: false,
        message: "rootId must be a positive SQL Server integer"
      };
    }
  }

  const maxDepthValue = parseSingleQueryValue(query?.maxDepth);
  let maxDepth = DEFAULT_MAX_DEPTH;

  if (maxDepthValue.provided) {
    if (
      "invalid" in maxDepthValue
      || !/^(0|[1-9]\d*)$/.test(maxDepthValue.value)
    ) {
      return {
        success: false,
        message: `maxDepth must be an integer between 0 and ${MAX_HIERARCHY_DEPTH}`
      };
    }

    maxDepth = Number(maxDepthValue.value);
    if (
      !Number.isSafeInteger(maxDepth)
      || maxDepth < 0
      || maxDepth > MAX_HIERARCHY_DEPTH
    ) {
      return {
        success: false,
        message: `maxDepth must be an integer between 0 and ${MAX_HIERARCHY_DEPTH}`
      };
    }
  }

  return {
    success: true,
    rootId,
    maxDepth
  };
};

const buildDepartmentIndex = (rows: DepartmentRow[]) => {
  const departmentsById = new Map<number, DepartmentRecord>();

  for (const row of rows) {
    const departmentId = nullablePositiveInteger(row.DepartmentId);
    if (departmentId === null || departmentsById.has(departmentId)) continue;

    departmentsById.set(departmentId, {
      departmentId,
      parentDepartmentId: nullablePositiveInteger(row.ParentDepartmentId),
      nameEnglish: nullableText(row.DepartmentNameEnglish),
      nameArabic: nullableText(row.DepartmentNameArabic),
      departmentType: nullableText(row.DepartmentType)
    });
  }

  const childrenByParentId = new Map<number, number[]>();
  for (const department of departmentsById.values()) {
    if (department.parentDepartmentId === null) continue;

    const children =
      childrenByParentId.get(department.parentDepartmentId) ?? [];
    children.push(department.departmentId);
    childrenByParentId.set(department.parentDepartmentId, children);
  }

  for (const children of childrenByParentId.values()) {
    children.sort((left, right) => left - right);
  }

  return {
    departmentsById,
    childrenByParentId
  };
};

const buildHierarchy = (
  departmentsById: Map<number, DepartmentRecord>,
  childrenByParentId: Map<number, number[]>,
  rootId: number | null,
  maxDepth: number
): HierarchyEntry[] => {
  const rootIds = rootId === null
    ? Array.from(departmentsById.values())
        .filter((department) => department.parentDepartmentId === null)
        .map((department) => department.departmentId)
        .sort((left, right) => left - right)
    : [rootId];

  const queue = rootIds.map((departmentId) => ({
    departmentId,
    depth: 0,
    visitedPath: new Set([departmentId])
  }));
  const hierarchy: HierarchyEntry[] = [];

  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const current = queue[queueIndex];
    const department = departmentsById.get(current.departmentId);
    if (!department) continue;

    hierarchy.push({
      department,
      depth: current.depth
    });

    if (current.depth >= maxDepth) continue;

    const children = childrenByParentId.get(current.departmentId) ?? [];
    for (const childDepartmentId of children) {
      if (current.visitedPath.has(childDepartmentId)) continue;

      const visitedPath = new Set(current.visitedPath);
      visitedPath.add(childDepartmentId);
      queue.push({
        departmentId: childDepartmentId,
        depth: current.depth + 1,
        visitedPath
      });
    }
  }

  hierarchy.sort((left, right) => {
    if (left.depth !== right.depth) return left.depth - right.depth;

    const leftParentId = left.department.parentDepartmentId ?? 0;
    const rightParentId = right.department.parentDepartmentId ?? 0;
    if (leftParentId !== rightParentId) return leftParentId - rightParentId;

    return left.department.departmentId - right.department.departmentId;
  });

  return hierarchy;
};

const buildEmployeeCountIndex = (rows: EmployeeCountRow[]) => {
  const countsByDepartmentId = new Map<
    number,
    { directEmployeeCount: number; activeEmployeeCount: number }
  >();

  for (const row of rows) {
    const departmentId = nullablePositiveInteger(row.DepartmentId);
    if (departmentId === null) continue;

    countsByDepartmentId.set(departmentId, {
      directEmployeeCount: nonnegativeCount(row.DirectEmployeeCount),
      activeEmployeeCount: nonnegativeCount(row.ActiveEmployeeCount)
    });
  }

  return countsByDepartmentId;
};

const buildCandidateIndex = (rows: LeadershipCandidateRow[]) => {
  const candidatesByDepartmentId = new Map<
    number,
    LeadershipCandidateRow[]
  >();

  for (const row of rows) {
    const departmentId = nullablePositiveInteger(row.DepartmentId);
    const employeeId = nullablePositiveInteger(row.EmployeeId);
    if (departmentId === null || employeeId === null) continue;

    const candidates = candidatesByDepartmentId.get(departmentId) ?? [];
    candidates.push(row);
    candidatesByDepartmentId.set(departmentId, candidates);
  }

  return candidatesByDepartmentId;
};

const resolveDepartmentLeader = (
  department: DepartmentRecord,
  candidates: LeadershipCandidateRow[]
) => {
  const expectedLineLevel = getExpectedLineLevel(department.departmentType);
  const bestCandidateByEmployeeId = new Map<
    number,
    LeadershipCandidateRow
  >();

  for (const candidate of candidates) {
    const employeeId = nullablePositiveInteger(candidate.EmployeeId);
    if (employeeId === null) continue;

    const current = bestCandidateByEmployeeId.get(employeeId);
    if (
      !current
      || candidateIsPreferred(candidate, current, expectedLineLevel)
    ) {
      bestCandidateByEmployeeId.set(employeeId, candidate);
    }
  }

  const employeeCandidates = Array.from(bestCandidateByEmployeeId.values());
  const exactCandidates = expectedLineLevel === null
    ? []
    : employeeCandidates.filter((candidate) =>
        isExactCandidate(candidate, expectedLineLevel)
      );

  const leaderStatus = expectedLineLevel === null
    ? "unsupported-type"
    : exactCandidates.length > 1
      ? "ambiguous"
      : exactCandidates.length === 1
        ? "resolved"
        : "unassigned";
  const resolvedCandidate =
    exactCandidates.length === 1 ? exactCandidates[0] : null;
  const employeeId = resolvedCandidate
    ? nullablePositiveInteger(resolvedCandidate.EmployeeId)
    : null;

  return {
    leaderStatus,
    expectedLineLevel,
    exactCandidateCount: exactCandidates.length,
    leadershipCandidateCount: employeeCandidates.length,
    leader:
      resolvedCandidate && employeeId !== null
        ? {
            employeeId,
            employeeNumber: nullableText(resolvedCandidate.EmployeeNumber),
            displayName:
              nullableText(resolvedCandidate.DisplayName)
              ?? `Employee ${employeeId}`,
            nameEnglish: nullableText(resolvedCandidate.NameEnglish),
            nameArabic: nullableText(resolvedCandidate.NameArabic),
            titleEnglish:
              nullableText(resolvedCandidate.TitleEnglish)
              ?? nullableText(resolvedCandidate.LineLevelEnglish),
            titleArabic: nullableText(resolvedCandidate.TitleArabic),
            lineLevelEnglish:
              nullableText(resolvedCandidate.LineLevelEnglish),
            profileImageUrl: null
          }
        : null
  };
};

export const assembleOrganizationHierarchy = (
  departmentRows: DepartmentRow[],
  employeeCountRows: EmployeeCountRow[],
  candidateRows: LeadershipCandidateRow[],
  options: {
    rootId: number | null;
    maxDepth: number;
  }
) => {
  const {
    departmentsById,
    childrenByParentId
  } = buildDepartmentIndex(departmentRows);

  if (
    options.rootId !== null
    && !departmentsById.has(options.rootId)
  ) {
    return null;
  }

  const hierarchy = buildHierarchy(
    departmentsById,
    childrenByParentId,
    options.rootId,
    options.maxDepth
  );
  const countsByDepartmentId =
    buildEmployeeCountIndex(employeeCountRows);
  const candidatesByDepartmentId = buildCandidateIndex(candidateRows);

  const nodes = hierarchy.map(({ department, depth }) => {
    const counts = countsByDepartmentId.get(
      department.departmentId
    ) ?? {
      directEmployeeCount: 0,
      activeEmployeeCount: 0
    };
    const leaderResolution = resolveDepartmentLeader(
      department,
      candidatesByDepartmentId.get(department.departmentId) ?? []
    );

    return {
      departmentId: department.departmentId,
      parentDepartmentId: department.parentDepartmentId,
      depth,
      nameEnglish: department.nameEnglish,
      nameArabic: department.nameArabic,
      departmentType: department.departmentType,
      childDepartmentCount:
        childrenByParentId.get(department.departmentId)?.length ?? 0,
      directEmployeeCount: counts.directEmployeeCount,
      activeEmployeeCount: counts.activeEmployeeCount,
      ...leaderResolution
    };
  });

  const rootDepartmentIds = nodes
    .filter((node) => node.depth === 0)
    .map((node) => node.departmentId);
  const orphanDepartmentIds = Array.from(
    departmentsById.values()
  )
    .filter(
      (department) =>
        department.parentDepartmentId !== null
        && !departmentsById.has(department.parentDepartmentId)
    )
    .map((department) => department.departmentId)
    .sort((left, right) => left - right);
  const truncatedByMaxDepth = nodes.some(
    (node) =>
      node.depth === options.maxDepth
      && node.childDepartmentCount > 0
  );

  return {
    nodes,
    meta: {
      requestedRootId: options.rootId,
      maxDepth: options.maxDepth,
      nodeCount: nodes.length,
      rootDepartmentIds,
      orphanDepartmentIds,
      truncatedByMaxDepth
    }
  };
};

export const getOrganizationHierarchy = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  const parsed = parseOrganizationHierarchyQuery(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.message
    });
  }

  try {
    const [departmentRows, employeeCountRows, candidateRows] =
      await Promise.all([
        sequelize.query(
          `
            SELECT
              department.[Id] AS [DepartmentId],
              department.[AttachedNumber] AS [ParentDepartmentId],
              department.[DepartmentName_English]
                AS [DepartmentNameEnglish],
              department.[DepartmentName_Arabic]
                AS [DepartmentNameArabic],
              department.[DepartmentType]
            FROM [dbo].[Departments] AS department
            ORDER BY department.[Id];
          `,
          {
            type: QueryTypes.SELECT,
            raw: true
          }
        ) as Promise<DepartmentRow[]>,
        sequelize.query(
          `
            SELECT
              employee.[Department_Id] AS [DepartmentId],
              SUM(
                CASE
                  WHEN TRY_CONVERT(
                    decimal(38, 10),
                    NULLIF(
                      LTRIM(RTRIM(CONVERT(
                        nvarchar(100),
                        employee.[Ref_Employee]
                      ))),
                      N''
                    )
                  ) = 0
                    THEN CONVERT(bigint, 0)
                  ELSE CONVERT(bigint, 1)
                END
              ) AS [DirectEmployeeCount],
              SUM(
                CASE
                  WHEN TRY_CONVERT(
                    decimal(38, 10),
                    NULLIF(
                      LTRIM(RTRIM(CONVERT(
                        nvarchar(100),
                        employee.[Ref_Employee]
                      ))),
                      N''
                    )
                  ) = 0
                    THEN CONVERT(bigint, 0)
                  WHEN TRY_CONVERT(int, employee.[State]) = 1
                    OR LOWER(
                      LTRIM(RTRIM(CONVERT(
                        nvarchar(20),
                        employee.[State]
                      )))
                    ) COLLATE Latin1_General_100_CI_AI
                      IN (N'true', N'active')
                    THEN CONVERT(bigint, 1)
                  ELSE CONVERT(bigint, 0)
                END
              ) AS [ActiveEmployeeCount]
            FROM [dbo].[Employee] AS employee
            WHERE employee.[Department_Id] IS NOT NULL
            GROUP BY employee.[Department_Id];
          `,
          {
            type: QueryTypes.SELECT,
            raw: true
          }
        ) as Promise<EmployeeCountRow[]>,
        sequelize.query(
          `
            SELECT
              employee.[Department_Id] AS [DepartmentId],
              employee.[ID_Employee] AS [EmployeeId],
              CONVERT(nvarchar(100), employee.[Ref_Employee])
                AS [EmployeeNumber],
              COALESCE(
                NULLIF(LTRIM(RTRIM(employee.[EmployeeName_En])), N''),
                NULLIF(LTRIM(RTRIM(employee.[EmployeeName])), N''),
                N'Employee '
                  + CONVERT(nvarchar(30), employee.[ID_Employee])
              ) AS [DisplayName],
              NULLIF(LTRIM(RTRIM(employee.[EmployeeName_En])), N'')
                AS [NameEnglish],
              NULLIF(LTRIM(RTRIM(employee.[EmployeeName])), N'')
                AS [NameArabic],
              NULLIF(
                LTRIM(RTRIM(CONVERT(
                  nvarchar(4000),
                  job.[Job_Name_EN]
                ))),
                N''
              ) AS [TitleEnglish],
              NULLIF(
                LTRIM(RTRIM(CONVERT(
                  nvarchar(4000),
                  job.[Job_Name_AR]
                ))),
                N''
              ) AS [TitleArabic],
              lineLevel.[EnglishDescription] AS [LineLevelEnglish],
              lineLevel.[SortLine] AS [LineLevelSort],
              position.[Id] AS [PositionId],
              position.[Position_DateCreation]
                AS [PositionDateCreation],
              position.[Status] AS [PositionStatus]
            FROM [dbo].[Employee] AS employee
            INNER JOIN [dbo].[Position] AS position
              ON position.[EmployeeId] = employee.[ID_Employee]
            INNER JOIN [dbo].[LineLevel] AS lineLevel
              ON lineLevel.[Line_ID] = position.[LineLevelId]
            LEFT JOIN [dbo].[jobs] AS job
              ON job.[Job_ID] = position.[Job_ID]
            WHERE employee.[Department_Id] IS NOT NULL
              AND lineLevel.[SortLine] >= 0
              AND (
                TRY_CONVERT(int, employee.[State]) = 1
                OR LOWER(
                  LTRIM(RTRIM(CONVERT(
                    nvarchar(20),
                    employee.[State]
                  )))
                ) COLLATE Latin1_General_100_CI_AI
                  IN (N'true', N'active')
              );
          `,
          {
            type: QueryTypes.SELECT,
            raw: true
          }
        ) as Promise<LeadershipCandidateRow[]>
      ]);

    const assembled = assembleOrganizationHierarchy(
      departmentRows,
      employeeCountRows,
      candidateRows,
      {
        rootId: parsed.rootId,
        maxDepth: parsed.maxDepth
      }
    );

    if (!assembled) {
      return res.status(404).json({
        success: false,
        message: "Root department not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: assembled.nodes,
      meta: assembled.meta
    });
  } catch (error) {
    return next(error);
  }
};
