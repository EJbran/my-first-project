import { QueryTypes, type Transaction } from "sequelize";
import {
  employeeExtendedUpdateFieldDefinitions,
  normalizeEmployeeCreatePayload,
  normalizeEmployeeUpdatePayload,
  validateEmployeeCreatePayload,
  validateEmployeeUpdatePayload,
  type EmployeeExtendedUpdateField
} from "../../validators/HR/employee.validator";
import {
  parseEmployeeSearchQuery,
  type EmployeeSearchQuery
} from "../../validators/HR/employeeSearch.validator";
import { validateAssignPositionPayload } from "../../validators/HR/position.validator";

const { sequelize } = require("../../config/database");

type RequestLike = {
  params?: Record<string, string | undefined>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  user?: {
    id?: number;
    username?: string;
    email?: string;
  };
};

type ResponseLike = {
  status: (statusCode: number) => ResponseLike;
  json: (payload: Record<string, unknown>) => unknown;
};

type NextLike = (error?: unknown) => void;

type DatabaseErrorLike = {
  name?: unknown;
  message?: unknown;
  original?: {
    number?: unknown;
    code?: unknown;
    message?: unknown;
  };
  parent?: {
    number?: unknown;
    code?: unknown;
    message?: unknown;
  };
};

const isForeignKeyConstraintError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;

  const candidate = error as DatabaseErrorLike;
  const databaseError = candidate.original ?? candidate.parent;
  const name = typeof candidate.name === "string" ? candidate.name : "";
  const message = [candidate.message, databaseError?.message]
    .filter((value): value is string => typeof value === "string")
    .join(" ");

  return name === "SequelizeForeignKeyConstraintError"
    || Number(databaseError?.number) === 547
    || (
      databaseError?.code === "EREQUEST"
      && /REFERENCE constraint|FOREIGN KEY constraint/i.test(message)
    );
};

const getDatabaseBusinessRuleError = (
  error: unknown
): { status: number; message: string; code: string } | null => {
  if (!error || typeof error !== "object") return null;

  const candidate = error as DatabaseErrorLike;
  const databaseError = candidate.original ?? candidate.parent;
  const number = Number(databaseError?.number);
  if (!Number.isFinite(number) || number < 50000 || number > 59999) return null;

  const message = [databaseError?.message, candidate.message]
    .find((value): value is string => typeof value === "string" && Boolean(value.trim()))
    ?.trim() || "The position operation was rejected";
  const status = /not found|does not exist/i.test(message)
    ? 404
    : /already|occupied|not available|unavailable|open assignment|overlap|conflict|concurr|rowversion|changed/i.test(message)
      ? 409
      : 400;

  return {
    status,
    message,
    code: status === 409 ? "POSITION_CONFLICT" : "POSITION_OPERATION_REJECTED"
  };
};

type EmployeeListRecord = {
  ID_Employee: unknown;
  Ref_Employee: unknown;
  EmployeeName: unknown;
  EmployeeName_En: unknown;
  Email: unknown;
  Gender: unknown;
  Nationality: unknown;
  DateOFBirth: unknown;
  PlaceOFBirth: unknown;
  FamilyBook_Issuer: unknown;
  Job_Id: unknown;
  ResolvedJobName: unknown;
  ResolvedJobName_AR: unknown;
  CurrentPositionId: unknown;
  CurrentPositionNumber: unknown;
  CurrentPositionType: unknown;
  CurrentPositionLevel: unknown;
  CurrentPositionDegree: unknown;
  CurrentLineLevelId: unknown;
  CurrentLineLevelSort: unknown;
  CurrentLineLevelName_EN: unknown;
  CurrentLineLevelName_AR: unknown;
  Contract_Type: unknown;
  Type_Employee: unknown;
  State: unknown;
  Department_Id: unknown;
  ResolvedDepartmentId: unknown;
  DepartmentName_English: unknown;
  DepartmentName_Arabic: unknown;
  DepartmentType: unknown;
  DepartmentAttachedNumber: unknown;
  DepartmentAddress: unknown;
  DepartmentPhone: unknown;
  DepartmentExtenstion: unknown;
  ParentDepartmentId: unknown;
  ParentDepartmentName_English: unknown;
  ParentDepartmentName_Arabic: unknown;
  ParentDepartmentType: unknown;
  Location_Id: unknown;
  LocationName_ar: unknown;
  LocationName_en: unknown;
  Start_of_Contract: unknown;
  End_of_contrat: unknown;
  YearSuppliment_YEAR: unknown;
  YearSuppliment_MONTH: unknown;
  Year_suppliment_Day: unknown;
};

type EmployeeColumnMetadata = {
  COLUMN_NAME: string;
};

type ReferenceColumnMetadata = EmployeeColumnMetadata & {
  TABLE_NAME: string;
};

type BankForeignKeyMetadata = {
  BankForeignKeyColumn: string;
  BankGeneralIdColumn: string;
};

type DatabaseRow = Record<string, unknown>;

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

const employeeListColumnSpecs = [
  { alias: "ID_Employee", candidates: ["ID_Employee", "Employee_Id", "EmployeeId"] },
  { alias: "Ref_Employee", candidates: ["Ref_Employee", "Employee_Number", "EmployeeNumber"] },
  { alias: "EmployeeName", candidates: ["EmployeeName", "Employee_Name"] },
  { alias: "EmployeeName_En", candidates: ["EmployeeName_En", "EmployeeName_EN", "Employee_Name_En"] },
  { alias: "Email", candidates: ["Email", "EmployeeEmail"] },
  { alias: "Gender", candidates: ["Gender", "EmployeeGender", "Sex"] },
  { alias: "Nationality", candidates: ["Nationality", "EmployeeNationality"] },
  { alias: "DateOFBirth", candidates: ["DateOFBirth", "DateOfBirth", "Date_of_Birth", "BirthDate"] },
  { alias: "PlaceOFBirth", candidates: ["PlaceOFBirth", "PlaceOfBirth", "Place_of_Birth"] },
  { alias: "FamilyBook_Issuer", candidates: ["FamilyBook_Issuer", "FamilyBookIssuer"] },
  { alias: "Job_Id", candidates: ["Job_Id", "ID_Job", "JobId"] },
  { alias: "Contract_Type", candidates: ["Contract_Type", "ContractType"] },
  { alias: "Type_Employee", candidates: ["Type_Employee", "Employee_Type", "EmployeeType"] },
  { alias: "State", candidates: ["State", "EmployeeState", "IsActive"] },
  { alias: "Department_Id", candidates: ["Department_Id", "ID_Department", "DepartmentId"] },
  { alias: "Location_Id", candidates: ["location_id", "Location_Id", "ID_Location", "LocationId"] },
  { alias: "Start_of_Contract", candidates: ["Start_of_Contract", "Contract_Start_Date", "StartContractDate"] },
  { alias: "End_of_contrat", candidates: ["End_of_contrat", "End_of_contract", "Contract_End_Date", "EndContractDate"] },
  { alias: "YearSuppliment_YEAR", candidates: ["YearSuppliment_YEAR", "YearSupplement_YEAR"] },
  { alias: "YearSuppliment_MONTH", candidates: ["YearSuppliment_MONTH", "YearSupplement_MONTH"] },
  { alias: "Year_suppliment_Day", candidates: ["Year_suppliment_Day", "YearSuppliment_Day", "YearSupplement_Day"] }
] as const;

const quoteIdentifier = (identifier: string): string => `[${identifier.replace(/]/g, "]]")}]`;

/*
 * Employee.Department_Id stores the employee's most specific organizational
 * unit. Departments.AttachedNumber points to that unit's immediate parent.
 * The business-facing "department" is the nearest Manager node in the chain,
 * which may be the assigned node itself.
 *
 * The visited path protects reads from malformed cycles. The explicit depth
 * cap is a second guard and is well above the known company hierarchy depth.
 */
const departmentManagerHierarchyCte = `
  departmentAncestors (
    [AssignedDepartmentId],
    [AncestorDepartmentId],
    [ParentDepartmentId],
    [AncestorDepth],
    [VisitedPath]
  ) AS (
    SELECT
      department.[Id],
      department.[Id],
      department.[AttachedNumber],
      CAST(0 AS int),
      CAST(N'|' + CONVERT(nvarchar(20), department.[Id]) + N'|' AS nvarchar(max))
    FROM [dbo].[Departments] AS department

    UNION ALL

    SELECT
      departmentAncestor.[AssignedDepartmentId],
      parentDepartment.[Id],
      parentDepartment.[AttachedNumber],
      departmentAncestor.[AncestorDepth] + 1,
      CAST(
        departmentAncestor.[VisitedPath]
        + CONVERT(nvarchar(20), parentDepartment.[Id])
        + N'|'
        AS nvarchar(max)
      )
    FROM departmentAncestors AS departmentAncestor
    INNER JOIN [dbo].[Departments] AS parentDepartment
      ON parentDepartment.[Id] = departmentAncestor.[ParentDepartmentId]
    WHERE departmentAncestor.[AncestorDepth] < 63
      AND CHARINDEX(
        N'|' + CONVERT(nvarchar(20), parentDepartment.[Id]) + N'|',
        departmentAncestor.[VisitedPath]
      ) = 0
  ),
  resolvedParentDepartments AS (
    SELECT
      rankedDepartment.[AssignedDepartmentId],
      rankedDepartment.[Id],
      rankedDepartment.[DepartmentName_English],
      rankedDepartment.[DepartmentName_Arabic],
      rankedDepartment.[DepartmentType]
    FROM (
      SELECT
        departmentAncestor.[AssignedDepartmentId],
        ancestorDepartment.[Id],
        ancestorDepartment.[DepartmentName_English],
        ancestorDepartment.[DepartmentName_Arabic],
        ancestorDepartment.[DepartmentType],
        ROW_NUMBER() OVER (
          PARTITION BY departmentAncestor.[AssignedDepartmentId]
          ORDER BY departmentAncestor.[AncestorDepth], ancestorDepartment.[Id]
        ) AS [DepartmentRank]
      FROM departmentAncestors AS departmentAncestor
      INNER JOIN [dbo].[Departments] AS ancestorDepartment
        ON ancestorDepartment.[Id] = departmentAncestor.[AncestorDepartmentId]
      WHERE LOWER(LTRIM(RTRIM(COALESCE(ancestorDepartment.[DepartmentType], N''))))
        = N'manager'
    ) AS rankedDepartment
    WHERE rankedDepartment.[DepartmentRank] = 1
  )
`;

const hasDatabaseValue = (value: unknown): boolean =>
  value !== null && value !== undefined && String(value).trim() !== "";

const findColumn = (columns: string[], candidates: string[]): string | undefined => {
  const available = new Map(columns.map((column) => [column.toLowerCase(), column]));
  return candidates
    .map((candidate) => available.get(candidate.toLowerCase()))
    .find((candidate): candidate is string => Boolean(candidate));
};

const findRowValue = (row: DatabaseRow | undefined, candidates: string[]): unknown => {
  if (!row) return undefined;
  const available = new Map(Object.entries(row).map(([key, value]) => [key.toLowerCase(), value]));
  return candidates
    .map((candidate) => available.get(candidate.toLowerCase()))
    .find(hasDatabaseValue);
};

const normalizeIdentifier = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

const findRelatedIdColumn = (columns: string[], relationNames: string[]): string | undefined => {
  const normalizedRelations = relationNames.map(normalizeIdentifier);

  return columns.find((column) => {
    const normalizedColumn = normalizeIdentifier(column);
    return normalizedRelations.some((relation) =>
      normalizedColumn === relation
      || normalizedColumn === `${relation}id`
      || normalizedColumn === `id${relation}`
    );
  });
};

const findFirstDescriptiveText = (row: DatabaseRow | undefined): unknown => {
  if (!row) return undefined;

  const entries = Object.entries(row).filter(([column, value]) =>
    hasDatabaseValue(value)
    && typeof value === "string"
    && !normalizeIdentifier(column).startsWith("id")
    && !normalizeIdentifier(column).endsWith("id")
  );

  return entries.find(([column]) => normalizeIdentifier(column).includes("name"))?.[1]
    ?? entries[0]?.[1];
};

const normalizeArabicWord = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .toLocaleLowerCase();

const deriveBranchName = (
  bankNameValue: unknown,
  fullBankNameValue: unknown,
  explicitBranchValue: unknown
): unknown => {
  if (hasDatabaseValue(explicitBranchValue)) return explicitBranchValue;
  if (!hasDatabaseValue(fullBankNameValue)) return null;
  if (!hasDatabaseValue(bankNameValue)) return fullBankNameValue;

  const bankWords = String(bankNameValue).trim().split(/\s+/);
  const fullNameWords = String(fullBankNameValue).trim().split(/\s+/);
  const hasBankPrefix = bankWords.length <= fullNameWords.length
    && bankWords.every((word, index) =>
      normalizeArabicWord(word) === normalizeArabicWord(fullNameWords[index])
    );

  if (!hasBankPrefix) return fullBankNameValue;

  const branchName = fullNameWords.slice(bankWords.length).join(" ").trim();
  return branchName || fullBankNameValue;
};

const loadReferenceRow = async (
  tableName: string | undefined,
  idColumn: string | undefined,
  idValue: unknown
): Promise<DatabaseRow | undefined> => {
  if (!tableName || !idColumn || !hasDatabaseValue(idValue)) return undefined;

  const rows = await sequelize.query(
    `
      SELECT TOP (1) *
      FROM [dbo].${quoteIdentifier(tableName)}
      WHERE ${quoteIdentifier(idColumn)} = :idValue;
    `,
    {
      replacements: { idValue },
      type: QueryTypes.SELECT,
      raw: true
    }
  ) as DatabaseRow[];

  return rows[0];
};

const resolveEmployeeBankDetails = async (employee: DatabaseRow): Promise<DatabaseRow> => {
  const [metadata, bankForeignKeys] = await Promise.all([
    sequelize.query(
      `
        SELECT TABLE_NAME, COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo'
          AND LOWER(TABLE_NAME) IN ('bank', 'bankgeneral');
      `,
      {
        type: QueryTypes.SELECT,
        raw: true
      }
    ) as Promise<ReferenceColumnMetadata[]>,
    sequelize.query(
      `
        SELECT
          bankColumn.name AS BankForeignKeyColumn,
          bankGeneralColumn.name AS BankGeneralIdColumn
        FROM sys.foreign_key_columns AS relation
        INNER JOIN sys.tables AS bankTable
          ON bankTable.object_id = relation.parent_object_id
        INNER JOIN sys.schemas AS bankSchema
          ON bankSchema.schema_id = bankTable.schema_id
        INNER JOIN sys.columns AS bankColumn
          ON bankColumn.object_id = relation.parent_object_id
          AND bankColumn.column_id = relation.parent_column_id
        INNER JOIN sys.tables AS bankGeneralTable
          ON bankGeneralTable.object_id = relation.referenced_object_id
        INNER JOIN sys.schemas AS bankGeneralSchema
          ON bankGeneralSchema.schema_id = bankGeneralTable.schema_id
        INNER JOIN sys.columns AS bankGeneralColumn
          ON bankGeneralColumn.object_id = relation.referenced_object_id
          AND bankGeneralColumn.column_id = relation.referenced_column_id
        WHERE bankSchema.name = 'dbo'
          AND bankGeneralSchema.name = 'dbo'
          AND LOWER(bankTable.name) = 'bank'
          AND LOWER(bankGeneralTable.name) = 'bankgeneral';
      `,
      {
        type: QueryTypes.SELECT,
        raw: true
      }
    ) as Promise<BankForeignKeyMetadata[]>
  ]);

  const bankTableName = metadata.find((column) => column.TABLE_NAME.toLowerCase() === "bank")?.TABLE_NAME;
  const bankGeneralTableName = metadata.find((column) => column.TABLE_NAME.toLowerCase() === "bankgeneral")?.TABLE_NAME;
  const bankColumns = metadata
    .filter((column) => column.TABLE_NAME.toLowerCase() === "bank")
    .map((column) => column.COLUMN_NAME);
  const bankGeneralColumns = metadata
    .filter((column) => column.TABLE_NAME.toLowerCase() === "bankgeneral")
    .map((column) => column.COLUMN_NAME);

  const employeeBankId = findRowValue(employee, ["Bank", "Bank_Id", "ID_Bank", "bank_id"]);

  const bankIdColumn = findColumn(bankColumns, ["Id", "ID", "Bank_Id", "ID_Bank", "bank_id"]);
  const bankRecord = await loadReferenceRow(bankTableName, bankIdColumn, employeeBankId);
  const bankForeignKey = bankForeignKeys[0];
  const bankGeneralForeignKeyColumn = bankForeignKey?.BankForeignKeyColumn
    ?? findColumn(bankColumns, [
      "BankGeneral_Id",
      "Bankgeneral_Id",
      "ID_BankGeneral",
      "BankGeneralId",
      "bankgeneral_id",
      "GeneralBank_Id",
      "BankGeneral",
      "GeneralBank"
    ])
    ?? findRelatedIdColumn(bankColumns, ["BankGeneral", "GeneralBank"]);
  const resolvedBankGeneralId = bankGeneralForeignKeyColumn
    ? findRowValue(bankRecord, [bankGeneralForeignKeyColumn])
    : undefined;

  const bankGeneralIdColumn = bankForeignKey?.BankGeneralIdColumn ?? findColumn(bankGeneralColumns, [
    "Id",
    "ID",
    "BankGeneral_Id",
    "ID_BankGeneral",
    "BankGeneralId",
    "bankgeneral_id",
    "BankGeneral",
    "GeneralBank"
  ]) ?? findRelatedIdColumn(bankGeneralColumns, ["BankGeneral", "GeneralBank"]);
  const bankGeneralRecord = await loadReferenceRow(
    bankGeneralTableName,
    bankGeneralIdColumn,
    resolvedBankGeneralId
  );

  const resolvedBankGeneralName = findRowValue(bankGeneralRecord, [
    "BankName",
    "Bank_Name",
    "Name_Bank",
    "Name",
    "BankGeneralName",
    "BankName_en",
    "Bank_Name_en",
    "BankName_ar",
    "Bank_Name_ar",
    "ArabicName",
    "Name_ar"
  ]) ?? findFirstDescriptiveText(bankGeneralRecord) ?? null;
  const resolvedBankFullName = findRowValue(bankRecord, [
    "FullName",
    "BankFullName",
    "Full_Name",
    "Bank_Name",
    "BankName",
    "Name",
    "BankName_en",
    "BankName_ar"
  ]) ?? null;
  const explicitBranchName = findRowValue(bankRecord, [
    "Branch",
    "BranchName",
    "Branch_Name",
    "BankBranch",
    "Bank_Branch",
    "BranchName_en",
    "BranchName_ar"
  ]);

  return {
    ...employee,
    ResolvedBankId: employeeBankId ?? null,
    ResolvedBankGeneralId: resolvedBankGeneralId ?? null,
    ResolvedBankGeneralName: resolvedBankGeneralName,
    ResolvedBankFullName: resolvedBankFullName,
    ResolvedBankBranch: deriveBranchName(
      resolvedBankGeneralName,
      resolvedBankFullName,
      explicitBranchName
    )
  };
};

type EmployeeListColumnAlias = (typeof employeeListColumnSpecs)[number]["alias"];

type ResolvedEmployeeListColumn = {
  alias: EmployeeListColumnAlias;
  actualColumn: string | undefined;
};

type EmployeeColumnPlan = {
  resolvedColumns: ResolvedEmployeeListColumn[];
  byAlias: Map<EmployeeListColumnAlias, string | undefined>;
  employeeIdColumn: string;
};

type EmployeeSearchRow = EmployeeListRecord & {
  __TotalRows: unknown;
  __HasRow: unknown;
};

type EmployeeSearchOptionRow = {
  OptionGroup: unknown;
  Value: unknown;
  Label: unknown;
};

const SEARCH_COLLATION = "Arabic_100_CI_AI";

const resolveEmployeeColumnPlan = async (): Promise<EmployeeColumnPlan> => {
  const metadata = await sequelize.query(
    `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'employee';
    `,
    {
      type: QueryTypes.SELECT,
      raw: true
    }
  ) as EmployeeColumnMetadata[];

  const availableColumns = new Map(
    metadata.map((column) => [column.COLUMN_NAME.toLowerCase(), column.COLUMN_NAME])
  );

  const resolvedColumns: ResolvedEmployeeListColumn[] = employeeListColumnSpecs.map((spec) => {
    const actualColumn = spec.candidates
      .map((candidate) => availableColumns.get(candidate.toLowerCase()))
      .find((candidate): candidate is string => Boolean(candidate));

    return {
      alias: spec.alias,
      actualColumn
    };
  });

  const employeeIdColumn = resolvedColumns.find((column) => column.alias === "ID_Employee")?.actualColumn;
  if (!employeeIdColumn) {
    throw new Error("dbo.employee does not contain a supported employee ID column");
  }

  return {
    resolvedColumns,
    byAlias: new Map(resolvedColumns.map((column) => [column.alias, column.actualColumn])),
    employeeIdColumn
  };
};

const employeeColumnExpression = (
  plan: EmployeeColumnPlan,
  alias: EmployeeListColumnAlias,
  tableAlias = "employee"
): string => {
  const actualColumn = plan.byAlias.get(alias);
  return actualColumn ? `${tableAlias}.${quoteIdentifier(actualColumn)}` : "NULL";
};

const employeeTextExpression = (
  plan: EmployeeColumnPlan,
  alias: EmployeeListColumnAlias,
  tableAlias = "employee"
): string => `LTRIM(RTRIM(CONVERT(NVARCHAR(4000), ${employeeColumnExpression(plan, alias, tableAlias)})))`;

const collatedTextExpression = (expression: string): string =>
  `(${expression}) COLLATE ${SEARCH_COLLATION}`;

const normalizedGenderKeyExpression = (expression: string): string => {
  const characterReplacements: Array<[number, number | null]> = [
    [0x0623, 0x0627], // ALEF WITH HAMZA ABOVE -> ALEF
    [0x0625, 0x0627], // ALEF WITH HAMZA BELOW -> ALEF
    [0x0622, 0x0627], // ALEF WITH MADDA ABOVE -> ALEF
    [0x0671, 0x0627], // ALEF WASLA -> ALEF
    [0x0649, 0x064a], // ALEF MAKSURA -> YEH
    [0x06cc, 0x064a], // FARSI YEH -> YEH
    [0x0624, 0x0648], // WAW WITH HAMZA -> WAW
    [0x0626, 0x064a], // YEH WITH HAMZA -> YEH
    [0x0629, 0x0647], // TEH MARBUTA -> HEH
    [0x06a9, 0x0643], // KEHEH -> KAF
    [0x0640, null], // TATWEEL
    [0x200c, null], // ZERO WIDTH NON-JOINER
    [0x200d, null], // ZERO WIDTH JOINER
    [0xfeff, null] // ZERO WIDTH NO-BREAK SPACE
  ];

  const normalized = characterReplacements.reduce(
    (current, [source, replacement]) =>
      `REPLACE(${current}, NCHAR(${source}), ${replacement === null ? "N''" : `NCHAR(${replacement})`})`,
    `LOWER(COALESCE(${expression}, N''))`
  );

  return collatedTextExpression(normalized);
};

const buildEmployeeListSelectColumns = (plan: EmployeeColumnPlan): string[] => {
  const selectColumns = plan.resolvedColumns.map(({ alias, actualColumn }) =>
    alias === "Job_Id"
      ? `currentPosition.[Job_ID] AS ${quoteIdentifier(alias)}`
      : actualColumn
      ? `employee.${quoteIdentifier(actualColumn)} AS ${quoteIdentifier(alias)}`
      : `CAST(NULL AS NVARCHAR(1)) AS ${quoteIdentifier(alias)}`
  );

  const locationIdColumn = plan.byAlias.get("Location_Id");
  selectColumns.push(
    `COALESCE(currentJob.[Job_Name_EN], currentJob.[Job_Name_AR]) AS ${quoteIdentifier("ResolvedJobName")}`
  );
  selectColumns.push(
    `currentJob.[Job_Name_AR] AS ${quoteIdentifier("ResolvedJobName_AR")}`
  );
  selectColumns.push(
    `currentPosition.[Id] AS ${quoteIdentifier("CurrentPositionId")}`,
    `currentPosition.[Position_Number] AS ${quoteIdentifier("CurrentPositionNumber")}`,
    `currentPosition.[Position_Type] AS ${quoteIdentifier("CurrentPositionType")}`,
    `currentPosition.[PositionLevel] AS ${quoteIdentifier("CurrentPositionLevel")}`,
    `currentPosition.[Position_Degree] AS ${quoteIdentifier("CurrentPositionDegree")}`,
    `currentPosition.[LineLevelId] AS ${quoteIdentifier("CurrentLineLevelId")}`,
    `currentLineLevel.[SortLine] AS ${quoteIdentifier("CurrentLineLevelSort")}`,
    `currentLineLevel.[EnglishDescription] AS ${quoteIdentifier("CurrentLineLevelName_EN")}`,
    `currentLineLevel.[ArabicDescription] AS ${quoteIdentifier("CurrentLineLevelName_AR")}`
  );
  const departmentIdColumn = plan.byAlias.get("Department_Id");
  selectColumns.push(
    departmentIdColumn
      ? `department.[Id] AS ${quoteIdentifier("ResolvedDepartmentId")}`
      : `CAST(NULL AS int) AS ${quoteIdentifier("ResolvedDepartmentId")}`,
    departmentIdColumn
      ? `department.[DepartmentName_English] AS ${quoteIdentifier("DepartmentName_English")}`
      : `CAST(NULL AS nvarchar(1)) AS ${quoteIdentifier("DepartmentName_English")}`,
    departmentIdColumn
      ? `department.[DepartmentName_Arabic] AS ${quoteIdentifier("DepartmentName_Arabic")}`
      : `CAST(NULL AS nvarchar(1)) AS ${quoteIdentifier("DepartmentName_Arabic")}`,
    departmentIdColumn
      ? `department.[DepartmentType] AS ${quoteIdentifier("DepartmentType")}`
      : `CAST(NULL AS nvarchar(1)) AS ${quoteIdentifier("DepartmentType")}`,
    departmentIdColumn
      ? `department.[AttachedNumber] AS ${quoteIdentifier("DepartmentAttachedNumber")}`
      : `CAST(NULL AS int) AS ${quoteIdentifier("DepartmentAttachedNumber")}`,
    departmentIdColumn
      ? `department.[DepartmentAddress] AS ${quoteIdentifier("DepartmentAddress")}`
      : `CAST(NULL AS nvarchar(1)) AS ${quoteIdentifier("DepartmentAddress")}`,
    departmentIdColumn
      ? `department.[DepartmentPhone] AS ${quoteIdentifier("DepartmentPhone")}`
      : `CAST(NULL AS nvarchar(1)) AS ${quoteIdentifier("DepartmentPhone")}`,
    departmentIdColumn
      ? `department.[DepartmentExtenstion] AS ${quoteIdentifier("DepartmentExtenstion")}`
      : `CAST(NULL AS nvarchar(1)) AS ${quoteIdentifier("DepartmentExtenstion")}`,
    departmentIdColumn
      ? `parentDepartment.[Id] AS ${quoteIdentifier("ParentDepartmentId")}`
      : `CAST(NULL AS int) AS ${quoteIdentifier("ParentDepartmentId")}`,
    departmentIdColumn
      ? `parentDepartment.[DepartmentName_English] AS ${quoteIdentifier("ParentDepartmentName_English")}`
      : `CAST(NULL AS nvarchar(1)) AS ${quoteIdentifier("ParentDepartmentName_English")}`,
    departmentIdColumn
      ? `parentDepartment.[DepartmentName_Arabic] AS ${quoteIdentifier("ParentDepartmentName_Arabic")}`
      : `CAST(NULL AS nvarchar(1)) AS ${quoteIdentifier("ParentDepartmentName_Arabic")}`,
    departmentIdColumn
      ? `parentDepartment.[DepartmentType] AS ${quoteIdentifier("ParentDepartmentType")}`
      : `CAST(NULL AS nvarchar(1)) AS ${quoteIdentifier("ParentDepartmentType")}`
  );
  selectColumns.push(
    locationIdColumn
      ? `location.${quoteIdentifier("LocationName_en")} AS ${quoteIdentifier("LocationName_en")}`
      : `CAST(NULL AS NVARCHAR(1)) AS ${quoteIdentifier("LocationName_en")}`
  );
  selectColumns.push(
    locationIdColumn
      ? `location.${quoteIdentifier("LocationName_ar")} AS ${quoteIdentifier("LocationName_ar")}`
      : `CAST(NULL AS NVARCHAR(1)) AS ${quoteIdentifier("LocationName_ar")}`
  );

  return selectColumns;
};

const buildEmployeeListJoins = (plan: EmployeeColumnPlan): string => {
  const locationIdColumn = plan.byAlias.get("Location_Id");
  const departmentIdColumn = plan.byAlias.get("Department_Id");
  const locationJoin = locationIdColumn
    ? `LEFT JOIN [dbo].[Location] AS location
         ON employee.${quoteIdentifier(locationIdColumn)} = location.${quoteIdentifier("ID_Location")}`
    : "";
  const departmentJoin = departmentIdColumn
    ? `LEFT JOIN [dbo].[Departments] AS department
         ON employee.${quoteIdentifier(departmentIdColumn)} = department.[Id]
       LEFT JOIN resolvedParentDepartments AS parentDepartment
         ON parentDepartment.[AssignedDepartmentId] = department.[Id]`
    : "";
  const positionJoin = `LEFT JOIN [dbo].[Position] AS currentPosition
         ON currentPosition.[EmployeeId] = employee.${quoteIdentifier(plan.employeeIdColumn)}
       LEFT JOIN [dbo].[jobs] AS currentJob
         ON currentJob.[Job_ID] = currentPosition.[Job_ID]
       LEFT JOIN [dbo].[LineLevel] AS currentLineLevel
         ON currentLineLevel.[Line_ID] = currentPosition.[LineLevelId]`;

  return [locationJoin, departmentJoin, positionJoin].filter(Boolean).join("\n    ");
};

const buildEmployeeListQuery = async (): Promise<string> => {
  const plan = await resolveEmployeeColumnPlan();
  const selectColumns = buildEmployeeListSelectColumns(plan);
  const joins = buildEmployeeListJoins(plan);
  const referenceColumn = plan.byAlias.get("Ref_Employee");
  const employeeWhere = referenceColumn
    ? `WHERE TRY_CONVERT(decimal(38,10), NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(100), employee.${quoteIdentifier(referenceColumn)}))), N'')) IS NULL
         OR TRY_CONVERT(decimal(38,10), NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(100), employee.${quoteIdentifier(referenceColumn)}))), N'')) <> 0`
    : "";

  return `
    WITH ${departmentManagerHierarchyCte}
    SELECT ${selectColumns.join(",\n      ")}
    FROM [dbo].[employee] AS employee
    ${joins}
    ${employeeWhere}
    ORDER BY employee.${quoteIdentifier(plan.employeeIdColumn)} ASC
    OPTION (MAXRECURSION 64);
  `;
};

const normalizeEmployeeSearchKey = (value: string): string =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")
    .replace(/[\u0649\u06CC]/g, "\u064A")
    .replace(/\u0624/g, "\u0648")
    .replace(/\u0626/g, "\u064A")
    .replace(/\u0629/g, "\u0647")
    .replace(/\u06A9/g, "\u0643")
    .replace(/[\u200C\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const escapeSqlLikePattern = (value: string): string =>
  value
    .replace(/~/g, "~~")
    .replace(/%/g, "~%")
    .replace(/_/g, "~_")
    .replace(/\[/g, "~[");

const currentTripoliDate = (): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Tripoli",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
};

type EmployeeSearchSqlExpressions = {
  employeeId: string;
  referenceText: string;
  stateText: string;
  jobIdText: string;
  jobNameText: string;
  locationIdText: string;
  locationNameEnglishText: string;
  locationNameArabicText: string;
  departmentIdText: string;
  departmentNameEnglishText: string;
  departmentNameArabicText: string;
  genderText: string;
  dateOfBirth: string;
  contractStart: string;
  contractEnd: string;
  isVacancy: string;
  isEmployee: string;
  isUnknownKind: string;
  isOnLeaveEmployee: string;
  isActiveEmployee: string;
  isArchivedEmployee: string;
  genderCategory: string;
  jobIsUnassigned: string;
  locationIsUnassigned: string;
  departmentIsUnassigned: string;
};

const buildEmployeeSearchSqlExpressions = (
  plan: EmployeeColumnPlan
): EmployeeSearchSqlExpressions => {
  const employeeId = employeeColumnExpression(plan, "ID_Employee");
  const referenceText = employeeTextExpression(plan, "Ref_Employee");
  const stateText = employeeTextExpression(plan, "State");
  const stateKey = collatedTextExpression(`LOWER(COALESCE(${stateText}, N''))`);
  const referenceNumber = `TRY_CONVERT(DECIMAL(38, 10), NULLIF(${referenceText}, N''))`;
  const isVacancy = `(${referenceNumber} = 0)`;
  const isEmployee = `(
    NULLIF(${referenceText}, N'') IS NOT NULL
    AND (${referenceNumber} IS NULL OR ${referenceNumber} <> 0)
  )`;
  const isUnknownKind = `(NULLIF(${referenceText}, N'') IS NULL)`;
  const isOnLeaveState = `(
    ${stateKey} LIKE N'%leave%'
    OR ${stateKey} LIKE N'%vacation%'
    OR ${stateKey} LIKE N'%\u0627\u062c\u0627\u0632%'
  )`;
  const activeState = `(
    COALESCE(TRY_CONVERT(INT, ${employeeColumnExpression(plan, "State")}), -1) = 1
    OR ${stateKey} IN (N'1', N'true', N'active', N'current', N'working', N'employed')
    OR ${stateKey} LIKE N'%\u0634\u063a\u0627\u0644%'
  )`;
  const archivedState = `(
    COALESCE(TRY_CONVERT(INT, ${employeeColumnExpression(plan, "State")}), -1) = 0
    OR ${stateKey} IN (N'0', N'false', N'archived', N'inactive', N'stopped')
    OR ${stateKey} LIKE N'%\u0645\u062a\u0648\u0642\u0641%'
  )`;
  const isOnLeaveEmployee = `(${isEmployee} AND ${isOnLeaveState})`;
  const isActiveEmployee = `(${isEmployee} AND NOT ${isOnLeaveState} AND ${activeState})`;
  const isArchivedEmployee = `(${isEmployee} AND NOT ${isOnLeaveState} AND ${archivedState})`;

  const genderText = employeeTextExpression(plan, "Gender");
  const genderKey = normalizedGenderKeyExpression(genderText);
  const genderCategory = `CASE
    WHEN ${genderKey} IN (N'male', N'm', N'\u0630\u0643\u0631', N'\u062f\u0643\u0631') THEN N'male'
    WHEN ${genderKey} IN (N'female', N'f', N'\u0627\u0646\u062b\u064a') THEN N'female'
    ELSE N'unknown'
  END`;

  const jobIdText = "LTRIM(RTRIM(CONVERT(NVARCHAR(4000), currentPosition.[Job_ID])))";
  const jobNameText = "LTRIM(RTRIM(CONVERT(NVARCHAR(4000), COALESCE(currentJob.[Job_Name_EN], currentJob.[Job_Name_AR]))))";
  const jobNumericId = `TRY_CONVERT(BIGINT, NULLIF(${jobIdText}, N''))`;
  const jobIsUnassigned = `(
    ${jobNumericId} IS NULL
    OR ${jobNumericId} <= 0
    OR NULLIF(${jobNameText}, N'') IS NULL
  )`;

  const locationIdText = employeeTextExpression(plan, "Location_Id");
  const locationNameEnglishText = plan.byAlias.get("Location_Id")
    ? "LTRIM(RTRIM(CONVERT(NVARCHAR(4000), location.[LocationName_en])))"
    : "CAST(NULL AS NVARCHAR(1))";
  const locationNameArabicText = plan.byAlias.get("Location_Id")
    ? "LTRIM(RTRIM(CONVERT(NVARCHAR(4000), location.[LocationName_ar])))"
    : "CAST(NULL AS NVARCHAR(1))";
  const locationNumericId = `TRY_CONVERT(BIGINT, NULLIF(${locationIdText}, N''))`;
  const locationIsUnassigned = `(
    ${locationNumericId} IS NULL
    OR ${locationNumericId} <= 0
    OR (
      NULLIF(${locationNameEnglishText}, N'') IS NULL
      AND NULLIF(${locationNameArabicText}, N'') IS NULL
    )
  )`;

  const departmentIdText = employeeTextExpression(plan, "Department_Id");
  const departmentNameEnglishText = plan.byAlias.get("Department_Id")
    ? "LTRIM(RTRIM(CONVERT(NVARCHAR(4000), department.[DepartmentName_English])))"
    : "CAST(NULL AS NVARCHAR(1))";
  const departmentNameArabicText = plan.byAlias.get("Department_Id")
    ? "LTRIM(RTRIM(CONVERT(NVARCHAR(4000), department.[DepartmentName_Arabic])))"
    : "CAST(NULL AS NVARCHAR(1))";
  const departmentNumericId = `TRY_CONVERT(BIGINT, NULLIF(${departmentIdText}, N''))`;
  const departmentIsUnassigned = `(
    ${departmentNumericId} IS NULL
    OR ${departmentNumericId} <= 0
    OR (
      NULLIF(${departmentNameEnglishText}, N'') IS NULL
      AND NULLIF(${departmentNameArabicText}, N'') IS NULL
    )
  )`;

  return {
    employeeId,
    referenceText,
    stateText,
    jobIdText,
    jobNameText,
    locationIdText,
    locationNameEnglishText,
    locationNameArabicText,
    departmentIdText,
    departmentNameEnglishText,
    departmentNameArabicText,
    genderText,
    dateOfBirth: `TRY_CONVERT(DATE, ${employeeColumnExpression(plan, "DateOFBirth")})`,
    contractStart: `TRY_CONVERT(DATE, ${employeeColumnExpression(plan, "Start_of_Contract")})`,
    contractEnd: `TRY_CONVERT(DATE, ${employeeColumnExpression(plan, "End_of_contrat")})`,
    isVacancy,
    isEmployee,
    isUnknownKind,
    isOnLeaveEmployee,
    isActiveEmployee,
    isArchivedEmployee,
    genderCategory,
    jobIsUnassigned,
    locationIsUnassigned,
    departmentIsUnassigned
  };
};

const unknownTextPredicate = (textExpression: string): string => {
  const key = collatedTextExpression(`LOWER(COALESCE(${textExpression}, N''))`);
  return `(
    NULLIF(${textExpression}, N'') IS NULL
    OR ${key} IN (
      N'unknown', N'none', N'null', N'n/a', N'na',
      N'\u0644\u0627 \u064a\u0648\u062c\u062f',
      N'\u063a\u064a\u0631 \u0645\u0639\u0644\u0648\u0645',
      N'\u063a\u064a\u0631 \u0645\u0639\u0631\u0648\u0641'
    )
  )`;
};

type EmployeeSearchQueryPlan = {
  sql: string;
  replacements: Record<string, string | number>;
};

const buildEmployeeSearchQuery = (
  plan: EmployeeColumnPlan,
  query: EmployeeSearchQuery
): EmployeeSearchQueryPlan => {
  const expressions = buildEmployeeSearchSqlExpressions(plan);
  const predicates: string[] = [`(${expressions.isEmployee} OR ${expressions.isUnknownKind})`];
  const replacements: Record<string, string | number> = {
    offset: (query.page - 1) * query.pageSize,
    pageSize: query.pageSize,
    asOf: query.asOf ?? currentTripoliDate()
  };
  const asOfDate = "CONVERT(DATE, :asOf, 23)";

  if (query.search) {
    const normalizedSearch = query.search.trim();

    if (/^\d+$/.test(normalizedSearch)) {
      replacements.employeeNumberSearch = normalizedSearch;
      predicates.push(
        `${collatedTextExpression(expressions.referenceText)} = :employeeNumberSearch`
      );
    } else {
      const searchableExpressions = [
        expressions.referenceText,
        employeeTextExpression(plan, "EmployeeName"),
        employeeTextExpression(plan, "EmployeeName_En"),
        employeeTextExpression(plan, "Email"),
        expressions.genderText,
        employeeTextExpression(plan, "Nationality"),
        employeeTextExpression(plan, "PlaceOFBirth"),
        employeeTextExpression(plan, "FamilyBook_Issuer"),
        expressions.locationNameEnglishText,
        expressions.locationNameArabicText,
        expressions.departmentNameEnglishText,
        expressions.departmentNameArabicText,
        expressions.jobNameText,
        employeeTextExpression(plan, "Type_Employee"),
        employeeTextExpression(plan, "Contract_Type")
      ];

      normalizedSearch.split(/\s+/).filter(Boolean).forEach((term, index) => {
        const key = `searchTerm${index}`;
        replacements[key] = `%${escapeSqlLikePattern(term)}%`;
        predicates.push(`(
          ${searchableExpressions.map((expression) =>
            `${collatedTextExpression(expression)} LIKE :${key} ESCAPE N'~'`
          ).join("\n          OR ")}
        )`);
      });
    }
  }

  if (query.employeeNumber) {
    replacements.employeeNumber = query.employeeNumber;
    predicates.push(`${collatedTextExpression(expressions.referenceText)} = :employeeNumber`);
  }

  if (query.status) {
    const statusPredicates: Record<NonNullable<EmployeeSearchQuery["status"]>, string> = {
      employee: expressions.isEmployee,
      current: `(${expressions.isActiveEmployee} OR ${expressions.isOnLeaveEmployee})`,
      active: expressions.isActiveEmployee,
      "on-leave": expressions.isOnLeaveEmployee,
      archived: expressions.isArchivedEmployee,
      vacancy: expressions.isVacancy,
      unknown: `(
        ${expressions.isUnknownKind}
        OR (
          ${expressions.isEmployee}
          AND NOT ${expressions.isActiveEmployee}
          AND NOT ${expressions.isOnLeaveEmployee}
          AND NOT ${expressions.isArchivedEmployee}
        )
      )`
    };
    predicates.push(statusPredicates[query.status]);
  }

  if (query.locationId === "unassigned") {
    predicates.push(expressions.locationIsUnassigned);
  } else if (query.locationId !== null) {
    replacements.locationId = query.locationId;
    predicates.push(`TRY_CONVERT(BIGINT, NULLIF(${expressions.locationIdText}, N'')) = :locationId`);
  }

  if (query.departmentId === "unassigned") {
    predicates.push(expressions.departmentIsUnassigned);
  } else if (query.departmentId !== null) {
    replacements.departmentId = query.departmentId;
    predicates.push(
      `TRY_CONVERT(BIGINT, NULLIF(${expressions.departmentIdText}, N'')) = :departmentId`
    );
  }

  if (query.jobId === "unassigned") {
    predicates.push(expressions.jobIsUnassigned);
  } else if (query.jobId !== null) {
    replacements.jobId = query.jobId;
    predicates.push(`TRY_CONVERT(BIGINT, NULLIF(${expressions.jobIdText}, N'')) = :jobId`);
  }

  if (query.gender) {
    const genderKey = normalizeEmployeeSearchKey(query.gender);
    if (["male", "female", "unknown"].includes(genderKey)) {
      replacements.gender = genderKey;
      predicates.push(`(${expressions.genderCategory}) = :gender`);
    } else {
      replacements.gender = query.gender;
      predicates.push(`${collatedTextExpression(expressions.genderText)} = :gender`);
    }
  }

  const addExactTextFilter = (
    alias: EmployeeListColumnAlias,
    value: string | null,
    replacementName: string
  ) => {
    if (!value) return;
    const textExpression = employeeTextExpression(plan, alias);
    if (["unknown", "unassigned", "missing"].includes(normalizeEmployeeSearchKey(value))) {
      predicates.push(unknownTextPredicate(textExpression));
      return;
    }
    replacements[replacementName] = value;
    predicates.push(`${collatedTextExpression(textExpression)} = :${replacementName}`);
  };

  if (query.nationality && normalizeEmployeeSearchKey(query.nationality) === "libya") {
    const nationalityText = collatedTextExpression(
      `LOWER(COALESCE(${employeeTextExpression(plan, "Nationality")}, N''))`
    );
    predicates.push(`${nationalityText} IN (
      N'libya', N'libyan', N'\u0644\u064a\u0628\u064a', N'\u0644\u064a\u0628\u064a\u0647', N'\u0644\u064a\u0628\u064a\u0627'
    )`);
  } else {
    addExactTextFilter("Nationality", query.nationality, "nationality");
  }
  addExactTextFilter("Type_Employee", query.employeeType, "employeeType");

  if (query.contractType) {
    const contractTypeKey = normalizeEmployeeSearchKey(query.contractType);
    const contractTypeText = collatedTextExpression(
      `LOWER(COALESCE(${employeeTextExpression(plan, "Contract_Type")}, N''))`
    );
    if (contractTypeKey === "annual") {
      predicates.push(`${contractTypeText} = N'\u0633\u0646\u0648\u064a'`);
    } else if (contractTypeKey === "full-time") {
      predicates.push(`${contractTypeText} = N'\u062f\u0648\u0627\u0645 \u0643\u0627\u0645\u0644'`);
    } else if (contractTypeKey === "training") {
      predicates.push(`${contractTypeText} LIKE N'%\u062a\u062f\u0631\u064a\u0628%'`);
    } else if (contractTypeKey === "fixed-term") {
      predicates.push(`(${contractTypeText} LIKE N'%\u0645\u0648\u0642\u062a%' OR ${contractTypeText} LIKE N'%\u0645\u0648\u0641\u062a%')`);
    } else if (contractTypeKey === "service-linked") {
      predicates.push(`(
        ${contractTypeText} LIKE N'%\u0631\u0628\u0637%'
        OR ${contractTypeText} LIKE N'%\u0631\u064a\u0637%'
        OR ${contractTypeText} LIKE N'%\u0636\u0645 \u0645\u062f\u0647%'
      )`);
    } else {
      const rawContractType = contractTypeKey.startsWith("other:")
        ? query.contractType.slice(query.contractType.indexOf(":") + 1)
        : query.contractType;
      addExactTextFilter("Contract_Type", rawContractType, "contractType");
    }
  }

  addExactTextFilter("PlaceOFBirth", query.placeOfBirth, "placeOfBirth");
  addExactTextFilter("FamilyBook_Issuer", query.familyBookIssuer, "familyBookIssuer");

  const ageExpression = `(
    DATEDIFF(YEAR, ${expressions.dateOfBirth}, ${asOfDate})
    - CASE
        WHEN DATEADD(YEAR, DATEDIFF(YEAR, ${expressions.dateOfBirth}, ${asOfDate}), ${expressions.dateOfBirth}) > ${asOfDate}
        THEN 1 ELSE 0
      END
  )`;
  const hasValidPastBirthDate = `(${expressions.dateOfBirth} IS NOT NULL AND ${expressions.dateOfBirth} <= ${asOfDate})`;

  if (query.ageMin !== null) {
    replacements.ageMin = query.ageMin;
    predicates.push(`(${hasValidPastBirthDate} AND ${ageExpression} >= :ageMin)`);
  }
  if (query.ageMax !== null) {
    replacements.ageMax = query.ageMax;
    predicates.push(`(${hasValidPastBirthDate} AND ${ageExpression} <= :ageMax)`);
  }

  if (query.ageBand) {
    if (query.ageBand === "unknown") {
      predicates.push(`NOT ${hasValidPastBirthDate}`);
    } else {
      const ageBandRanges: Record<Exclude<NonNullable<EmployeeSearchQuery["ageBand"]>, "unknown">, [number, number | null]> = {
        "under-25": [0, 24],
        "25-34": [25, 34],
        "35-44": [35, 44],
        "45-54": [45, 54],
        "55-plus": [55, null]
      };
      const [minimum, maximum] = ageBandRanges[query.ageBand];
      replacements.ageBandMinimum = minimum;
      const maximumPredicate = maximum === null
        ? ""
        : " AND " + ageExpression + " <= :ageBandMaximum";
      if (maximum !== null) replacements.ageBandMaximum = maximum;
      predicates.push(`(
        ${hasValidPastBirthDate}
        AND ${ageExpression} >= :ageBandMinimum${maximumPredicate}
      )`);
    }
  }

  const addDateBoundary = (
    dateExpression: string,
    value: string | null,
    replacementName: string,
    operator: ">=" | "<="
  ) => {
    if (!value) return;
    replacements[replacementName] = value;
    predicates.push(`${dateExpression} ${operator} CONVERT(DATE, :${replacementName}, 23)`);
  };
  addDateBoundary(expressions.contractStart, query.contractStartFrom, "contractStartFrom", ">=");
  addDateBoundary(expressions.contractStart, query.contractStartTo, "contractStartTo", "<=");
  addDateBoundary(expressions.contractEnd, query.contractEndFrom, "contractEndFrom", ">=");
  addDateBoundary(expressions.contractEnd, query.contractEndTo, "contractEndTo", "<=");

  const validContractChronology = `(
    ${expressions.contractStart} IS NULL
    OR ${expressions.contractEnd} IS NULL
    OR ${expressions.contractEnd} >= ${expressions.contractStart}
  )`;

  if (query.contractRisk) {
    const daysRemaining = `DATEDIFF(DAY, ${asOfDate}, ${expressions.contractEnd})`;
    const riskPredicates: Record<NonNullable<EmployeeSearchQuery["contractRisk"]>, string> = {
      expired: `${daysRemaining} < 0`,
      "within-30": `${daysRemaining} BETWEEN 0 AND 30`,
      "within-60": `${daysRemaining} BETWEEN 31 AND 60`,
      "within-90": `${daysRemaining} BETWEEN 61 AND 90`,
      "expiring-90": `${daysRemaining} BETWEEN 0 AND 90`,
      "within-180": `${daysRemaining} BETWEEN 91 AND 180`,
      "within-365": `${daysRemaining} BETWEEN 181 AND 365`,
      "over-90": `${daysRemaining} >= 91`,
      "over-180": `${daysRemaining} >= 181`,
      later: `${daysRemaining} >= 181`,
      "no-end-date": `${expressions.contractEnd} IS NULL`
    };
    predicates.push(`(
      ${expressions.isActiveEmployee}
      AND ${validContractChronology}
      AND ${riskPredicates[query.contractRisk]}
    )`);
  }

  if (query.seniorityMilestone !== null) {
    replacements.seniorityMilestone = query.seniorityMilestone;
    predicates.push(`(
      ${expressions.isActiveEmployee}
      AND ${expressions.contractStart} IS NOT NULL
      AND ${expressions.contractStart} <= ${asOfDate}
      AND DATEADD(YEAR, :seniorityMilestone, ${expressions.contractStart}) >= ${asOfDate}
      AND DATEADD(YEAR, :seniorityMilestone, ${expressions.contractStart}) < DATEADD(MONTH, 12, ${asOfDate})
    )`);
  }

  if (query.missingField) {
    const missingPredicates: Record<NonNullable<EmployeeSearchQuery["missingField"]>, string> = {
      job: expressions.jobIsUnassigned,
      department: expressions.departmentIsUnassigned,
      "work-location": expressions.locationIsUnassigned,
      "date-of-birth": `${expressions.dateOfBirth} IS NULL`,
      "place-of-birth": unknownTextPredicate(employeeTextExpression(plan, "PlaceOFBirth")),
      "family-book-issuer": unknownTextPredicate(employeeTextExpression(plan, "FamilyBook_Issuer")),
      nationality: `NULLIF(${employeeTextExpression(plan, "Nationality")}, N'') IS NULL`,
      "contract-start": `${expressions.contractStart} IS NULL`,
      gender: `NULLIF(${expressions.genderText}, N'') IS NULL`,
      "invalid-gender": `(
        NULLIF(${expressions.genderText}, N'') IS NOT NULL
        AND (${expressions.genderCategory}) = N'unknown'
      )`,
      "active-expired-contract": `(
        ${expressions.isActiveEmployee}
        AND ${validContractChronology}
        AND ${expressions.contractEnd} < ${asOfDate}
      )`,
      "contract-chronology": `(
        ${expressions.contractStart} IS NOT NULL
        AND ${expressions.contractEnd} IS NOT NULL
        AND ${expressions.contractEnd} < ${expressions.contractStart}
      )`
    };
    predicates.push(missingPredicates[query.missingField]);
  }

  const whereClause = predicates.length > 0 ? `WHERE ${predicates.join("\n      AND ")}` : "";
  const selectColumns = buildEmployeeListSelectColumns(plan);
  const projectionAliases = [
    ...plan.resolvedColumns.map((column) => column.alias),
    "ResolvedJobName",
    "ResolvedJobName_AR",
    "CurrentPositionId",
    "CurrentPositionNumber",
    "CurrentPositionType",
    "CurrentPositionLevel",
    "CurrentPositionDegree",
    "CurrentLineLevelId",
    "CurrentLineLevelSort",
    "CurrentLineLevelName_EN",
    "CurrentLineLevelName_AR",
    "ResolvedDepartmentId",
    "DepartmentName_English",
    "DepartmentName_Arabic",
    "DepartmentType",
    "DepartmentAttachedNumber",
    "DepartmentAddress",
    "DepartmentPhone",
    "DepartmentExtenstion",
    "ParentDepartmentId",
    "ParentDepartmentName_English",
    "ParentDepartmentName_Arabic",
    "ParentDepartmentType",
    "LocationName_en",
    "LocationName_ar"
  ];
  const orderBy = query.status === null || query.status === "employee"
    ? `[__ActivePriority] ASC, ${quoteIdentifier("ID_Employee")} ASC`
    : `${quoteIdentifier("ID_Employee")} ASC`;
  const outerProjection = projectionAliases
    .map((alias) => `paged.${quoteIdentifier(alias)}`)
    .join(",\n      ");

  return {
    replacements,
    sql: `
      WITH ${departmentManagerHierarchyCte},
      filtered AS (
        SELECT
          ${selectColumns.join(",\n          ")},
          CASE WHEN ${expressions.isActiveEmployee} THEN 0 ELSE 1 END AS [__ActivePriority]
        FROM [dbo].[employee] AS employee
        ${buildEmployeeListJoins(plan)}
        ${whereClause}
      ),
      totals AS (
        SELECT COUNT_BIG(1) AS [__TotalRows]
        FROM filtered
      ),
      paged AS (
        SELECT *
        FROM filtered
        ORDER BY ${orderBy}
        OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY
      )
      SELECT
        ${outerProjection},
        totals.[__TotalRows],
        CASE WHEN paged.${quoteIdentifier("ID_Employee")} IS NULL THEN 0 ELSE 1 END AS [__HasRow]
      FROM totals
      LEFT JOIN paged ON 1 = 1
      ORDER BY ${orderBy}
      OPTION (MAXRECURSION 64);
    `
  };
};

const buildVacantPositionSearchQuery = (query: EmployeeSearchQuery): EmployeeSearchQueryPlan => {
  const predicates: string[] = [];
  const replacements: Record<string, string | number> = {
    offset: (query.page - 1) * query.pageSize,
    pageSize: query.pageSize
  };

  if (query.search) {
    query.search.split(/\s+/).filter(Boolean).forEach((term, index) => {
      const key = `vacancySearch${index}`;
      replacements[key] = `%${escapeSqlLikePattern(term)}%`;
      predicates.push(`(
        CONVERT(nvarchar(50), vacancy.[Id]) COLLATE ${SEARCH_COLLATION} LIKE :${key} ESCAPE N'~'
        OR CONVERT(nvarchar(50), vacancy.[Position_Number]) COLLATE ${SEARCH_COLLATION} LIKE :${key} ESCAPE N'~'
        OR CONVERT(nvarchar(50), vacancy.[Job_ID]) COLLATE ${SEARCH_COLLATION} LIKE :${key} ESCAPE N'~'
        OR COALESCE(vacancyJob.[Job_Name_EN], N'') COLLATE ${SEARCH_COLLATION} LIKE :${key} ESCAPE N'~'
        OR COALESCE(vacancyJob.[Job_Name_AR], N'') COLLATE ${SEARCH_COLLATION} LIKE :${key} ESCAPE N'~'
      )`);
    });
  }

  if (query.jobId === "unassigned") {
    predicates.push("vacancy.[Job_ID] IS NULL");
  } else if (query.jobId !== null) {
    replacements.jobId = query.jobId;
    predicates.push("vacancy.[Job_ID] = :jobId");
  }

  if (query.missingField === "job") {
    predicates.push("vacancy.[Job_ID] IS NULL");
  } else if (query.missingField !== null) {
    predicates.push("1 = 0");
  }

  const incompatibleFilters = [
    query.employeeNumber,
    query.locationId,
    query.departmentId,
    query.gender,
    query.nationality,
    query.employeeType,
    query.contractType,
    query.placeOfBirth,
    query.familyBookIssuer,
    query.ageMin,
    query.ageMax,
    query.contractStartFrom,
    query.contractStartTo,
    query.contractEndFrom,
    query.contractEndTo,
    query.ageBand,
    query.contractRisk,
    query.seniorityMilestone
  ];
  if (incompatibleFilters.some((value) => value !== null && value !== undefined && value !== "")) {
    predicates.push("1 = 0");
  }

  const whereClause = predicates.length > 0 ? `WHERE ${predicates.join("\n      AND ")}` : "";

  return {
    replacements,
    sql: `
      WITH filtered AS (
        SELECT
          -vacancy.[Id] AS [ID_Employee],
          CAST(0 AS nvarchar(50)) AS [Ref_Employee],
          CAST(N'Vacant Position' AS nvarchar(100)) AS [EmployeeName],
          CAST(N'Vacant Position' AS nvarchar(100)) AS [EmployeeName_En],
          CAST(NULL AS nvarchar(150)) AS [Email],
          CAST(NULL AS nvarchar(20)) AS [Gender],
          CAST(NULL AS nvarchar(100)) AS [Nationality],
          CAST(NULL AS date) AS [DateOFBirth],
          CAST(NULL AS nvarchar(100)) AS [PlaceOFBirth],
          CAST(NULL AS nvarchar(150)) AS [FamilyBook_Issuer],
          vacancy.[Job_ID] AS [Job_Id],
          COALESCE(vacancyJob.[Job_Name_EN], vacancyJob.[Job_Name_AR]) AS [ResolvedJobName],
          vacancyJob.[Job_Name_AR] AS [ResolvedJobName_AR],
          vacancy.[Id] AS [CurrentPositionId],
          vacancy.[Position_Number] AS [CurrentPositionNumber],
          vacancy.[Position_Type] AS [CurrentPositionType],
          vacancy.[PositionLevel] AS [CurrentPositionLevel],
          vacancy.[Position_Degree] AS [CurrentPositionDegree],
          vacancy.[LineLevelId] AS [CurrentLineLevelId],
          vacancyLineLevel.[SortLine] AS [CurrentLineLevelSort],
          vacancyLineLevel.[EnglishDescription] AS [CurrentLineLevelName_EN],
          vacancyLineLevel.[ArabicDescription] AS [CurrentLineLevelName_AR],
          CAST(NULL AS nvarchar(100)) AS [Contract_Type],
          CAST(NULL AS nvarchar(100)) AS [Type_Employee],
          CAST(NULL AS bit) AS [State],
          CAST(NULL AS int) AS [Department_Id],
          CAST(NULL AS int) AS [ResolvedDepartmentId],
          CAST(NULL AS nvarchar(200)) AS [DepartmentName_English],
          CAST(NULL AS nvarchar(200)) AS [DepartmentName_Arabic],
          CAST(NULL AS nvarchar(100)) AS [DepartmentType],
          CAST(NULL AS int) AS [DepartmentAttachedNumber],
          CAST(NULL AS nvarchar(500)) AS [DepartmentAddress],
          CAST(NULL AS nvarchar(100)) AS [DepartmentPhone],
          CAST(NULL AS nvarchar(100)) AS [DepartmentExtenstion],
          CAST(NULL AS int) AS [ParentDepartmentId],
          CAST(NULL AS nvarchar(200)) AS [ParentDepartmentName_English],
          CAST(NULL AS nvarchar(200)) AS [ParentDepartmentName_Arabic],
          CAST(NULL AS nvarchar(100)) AS [ParentDepartmentType],
          CAST(NULL AS int) AS [Location_Id],
          CAST(NULL AS nvarchar(200)) AS [LocationName_ar],
          CAST(NULL AS nvarchar(200)) AS [LocationName_en],
          CAST(NULL AS date) AS [Start_of_Contract],
          CAST(NULL AS date) AS [End_of_contrat],
          CAST(NULL AS int) AS [YearSuppliment_YEAR],
          CAST(NULL AS int) AS [YearSuppliment_MONTH],
          CAST(NULL AS int) AS [Year_suppliment_Day]
        FROM [dbo].[Position] AS vacancy
        LEFT JOIN [dbo].[jobs] AS vacancyJob
          ON vacancyJob.[Job_ID] = vacancy.[Job_ID]
        LEFT JOIN [dbo].[LineLevel] AS vacancyLineLevel
          ON vacancyLineLevel.[Line_ID] = vacancy.[LineLevelId]
        WHERE vacancy.[EmployeeId] IS NULL
          ${whereClause ? `AND ${whereClause.slice(6)}` : ""}
      ),
      totals AS (
        SELECT COUNT_BIG(*) AS [__TotalRows] FROM filtered
      ),
      paged AS (
        SELECT * FROM filtered
        ORDER BY [CurrentPositionId]
        OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY
      )
      SELECT
        paged.*,
        totals.[__TotalRows],
        CASE WHEN paged.[CurrentPositionId] IS NULL THEN 0 ELSE 1 END AS [__HasRow]
      FROM totals
      LEFT JOIN paged ON 1 = 1
      ORDER BY paged.[CurrentPositionId];
    `
  };
};

const buildEmployeeSearchOptionsQuery = (plan: EmployeeColumnPlan): string => {
  const expressions = buildEmployeeSearchSqlExpressions(plan);
  const genericOptionSelect = (
    optionGroup: string,
    alias: EmployeeListColumnAlias
  ): string => {
    const textExpression = collatedTextExpression(employeeTextExpression(plan, alias));
    return `
      SELECT
        N'${optionGroup}' AS [OptionGroup],
        optionValue.[Value] AS [Value],
        optionValue.[Value] AS [Label]
      FROM [dbo].[employee] AS employee
      CROSS APPLY (VALUES (NULLIF(${textExpression}, N''))) AS optionValue([Value])
      WHERE optionValue.[Value] IS NOT NULL
      GROUP BY optionValue.[Value]
    `;
  };

  const assignedJobs = `
    SELECT
      N'jobs' AS [OptionGroup],
      CONVERT(NVARCHAR(30), position.[Job_ID]) AS [Value],
      COALESCE(job.[Job_Name_EN], job.[Job_Name_AR], N'Job #' + CONVERT(NVARCHAR(30), position.[Job_ID]))
        COLLATE ${SEARCH_COLLATION} AS [Label]
    FROM [dbo].[Position] AS position
    JOIN [dbo].[jobs] AS job ON job.[Job_ID] = position.[Job_ID]
    WHERE position.[Job_ID] IS NOT NULL
    GROUP BY position.[Job_ID], job.[Job_Name_EN], job.[Job_Name_AR]
  `;
  const unassignedJobs = `
    SELECT
      N'jobs' AS [OptionGroup],
      N'unassigned' AS [Value],
      N'Unassigned' COLLATE ${SEARCH_COLLATION} AS [Label]
    WHERE EXISTS (
      SELECT 1
      FROM [dbo].[Position] AS position
      WHERE position.[Job_ID] IS NULL
    )
  `;

  const locationNumericId = `TRY_CONVERT(BIGINT, NULLIF(${expressions.locationIdText}, N''))`;
  const assignedLocations = `
    SELECT
      N'workLocations' AS [OptionGroup],
      CONVERT(NVARCHAR(30), ${locationNumericId}) AS [Value],
      COALESCE(
        MAX(NULLIF(${expressions.locationNameEnglishText}, N'')),
        MAX(NULLIF(${expressions.locationNameArabicText}, N'')),
        N'Location #' + CONVERT(NVARCHAR(30), ${locationNumericId})
      ) COLLATE ${SEARCH_COLLATION} AS [Label]
    FROM [dbo].[employee] AS employee
    ${buildEmployeeListJoins(plan)}
    WHERE ${locationNumericId} > 0
      AND NOT ${expressions.locationIsUnassigned}
    GROUP BY ${locationNumericId}
  `;
  const unassignedLocations = `
    SELECT
      N'workLocations' AS [OptionGroup],
      N'unassigned' AS [Value],
      N'Unassigned' COLLATE ${SEARCH_COLLATION} AS [Label]
    WHERE EXISTS (
      SELECT 1
      FROM [dbo].[employee] AS employee
      ${buildEmployeeListJoins(plan)}
      WHERE ${expressions.locationIsUnassigned}
    )
  `;

  const assignedDepartments = `
    SELECT
      N'departments' AS [OptionGroup],
      CONVERT(NVARCHAR(30), department.[Id]) AS [Value],
      COALESCE(
        NULLIF(LTRIM(RTRIM(department.[DepartmentName_English])), N''),
        NULLIF(LTRIM(RTRIM(department.[DepartmentName_Arabic])), N''),
        N'Department #' + CONVERT(NVARCHAR(30), department.[Id])
      ) COLLATE ${SEARCH_COLLATION} AS [Label]
    FROM [dbo].[employee] AS employee
    ${buildEmployeeListJoins(plan)}
    WHERE department.[Id] IS NOT NULL
    GROUP BY
      department.[Id],
      department.[DepartmentName_English],
      department.[DepartmentName_Arabic]
  `;
  const unassignedDepartments = `
    SELECT
      N'departments' AS [OptionGroup],
      N'unassigned' AS [Value],
      N'Unassigned' COLLATE ${SEARCH_COLLATION} AS [Label]
  `;

  const genderOptions = `
    SELECT
      N'genders' AS [OptionGroup],
      (${expressions.genderCategory}) COLLATE ${SEARCH_COLLATION} AS [Value],
      CASE (${expressions.genderCategory})
        WHEN N'male' THEN N'Male'
        WHEN N'female' THEN N'Female'
        ELSE N'Unknown'
      END COLLATE ${SEARCH_COLLATION} AS [Label]
    FROM [dbo].[employee] AS employee
    GROUP BY (${expressions.genderCategory})
  `;

  const optionQueries = [
    assignedJobs,
    unassignedJobs,
    assignedLocations,
    unassignedLocations,
    assignedDepartments,
    unassignedDepartments,
    genderOptions,
    genericOptionSelect("nationalities", "Nationality"),
    genericOptionSelect("employeeTypes", "Type_Employee"),
    genericOptionSelect("contractTypes", "Contract_Type"),
    genericOptionSelect("placesOfBirth", "PlaceOFBirth"),
    genericOptionSelect("familyBookIssuers", "FamilyBook_Issuer")
  ];

  return `
    WITH ${departmentManagerHierarchyCte}
    SELECT optionRows.[OptionGroup], optionRows.[Value], optionRows.[Label]
    FROM (
      ${optionQueries.join("\n      UNION ALL\n")}
    ) AS optionRows
    ORDER BY optionRows.[OptionGroup] ASC, optionRows.[Label] ASC, optionRows.[Value] ASC
    OPTION (MAXRECURSION 64);
  `;
};

type EmployeeSearchOption = {
  value: string;
  label: string;
};

type EmployeeSearchOptions = {
  jobs: EmployeeSearchOption[];
  workLocations: EmployeeSearchOption[];
  departments: EmployeeSearchOption[];
  genders: EmployeeSearchOption[];
  nationalities: EmployeeSearchOption[];
  employeeTypes: EmployeeSearchOption[];
  contractTypes: EmployeeSearchOption[];
  placesOfBirth: EmployeeSearchOption[];
  familyBookIssuers: EmployeeSearchOption[];
};

const emptyEmployeeSearchOptions = (): EmployeeSearchOptions => ({
  jobs: [],
  workLocations: [],
  departments: [],
  genders: [],
  nationalities: [],
  employeeTypes: [],
  contractTypes: [],
  placesOfBirth: [],
  familyBookIssuers: []
});

const isEmployeeSearchOptionGroup = (
  value: string
): value is keyof EmployeeSearchOptions => [
  "jobs",
  "workLocations",
  "departments",
  "genders",
  "nationalities",
  "employeeTypes",
  "contractTypes",
  "placesOfBirth",
  "familyBookIssuers"
].includes(value);

export const searchEmployees = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const parsedQuery = parseEmployeeSearchQuery(req.query ?? {});
    if (!parsedQuery.success) {
      return res.status(400).json({
        success: false,
        message: "Employee search validation failed",
        errors: parsedQuery.errors
      });
    }

    const offset = (parsedQuery.value.page - 1) * parsedQuery.value.pageSize;
    if (!Number.isSafeInteger(offset) || offset < 0) {
      return res.status(400).json({
        success: false,
        message: "Employee search validation failed",
        errors: ["Requested page is too large"]
      });
    }

    const queryPlan = parsedQuery.value.status === "vacancy"
      ? buildVacantPositionSearchQuery(parsedQuery.value)
      : buildEmployeeSearchQuery(await resolveEmployeeColumnPlan(), parsedQuery.value);
    const rows = await sequelize.query(queryPlan.sql, {
      replacements: queryPlan.replacements,
      type: QueryTypes.SELECT,
      raw: true
    }) as EmployeeSearchRow[];

    const rawTotal = rows[0]?.__TotalRows ?? 0;
    const total = Number(rawTotal);
    if (!Number.isSafeInteger(total) || total < 0) {
      throw new Error("Employee search returned an invalid total row count");
    }

    const data = rows
      .filter((row) => Number(row.__HasRow) === 1)
      .map((row) => {
        const { __TotalRows: _totalRows, __HasRow: _hasRow, ...employee } = row;
        return employee;
      });

    return res.status(200).json({
      success: true,
      message: "Employees loaded successfully",
      data,
      pagination: {
        page: parsedQuery.value.page,
        pageSize: parsedQuery.value.pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / parsedQuery.value.pageSize)
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const getEmployeeSearchOptions = async (
  _req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const plan = await resolveEmployeeColumnPlan();
    const rows = await sequelize.query(buildEmployeeSearchOptionsQuery(plan), {
      type: QueryTypes.SELECT,
      raw: true
    }) as EmployeeSearchOptionRow[];
    const data = emptyEmployeeSearchOptions();
    const seen = new Map<keyof EmployeeSearchOptions, Set<string>>(
      (Object.keys(data) as Array<keyof EmployeeSearchOptions>).map((key) => [key, new Set<string>()])
    );

    rows.forEach((row) => {
      const group = String(row.OptionGroup ?? "").trim();
      const value = String(row.Value ?? "").trim();
      const label = String(row.Label ?? "").trim();
      if (!isEmployeeSearchOptionGroup(group) || !value || !label) return;

      const dedupeKey = normalizeEmployeeSearchKey(value);
      const groupSeen = seen.get(group);
      if (!groupSeen || groupSeen.has(dedupeKey)) return;
      groupSeen.add(dedupeKey);
      data[group].push({ value, label });
    });

    return res.status(200).json({
      success: true,
      message: "Employee search options loaded successfully",
      data
    });
  } catch (error) {
    return next(error);
  }
};

export const listEmployees = async (_req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const employeeListQuery = await buildEmployeeListQuery();
    const rows = await sequelize.query(employeeListQuery, {
      type: QueryTypes.SELECT,
      raw: true
    }) as EmployeeListRecord[];

    return res.status(200).json({
      success: true,
      message: "Employees loaded successfully",
      data: rows
    });
  } catch (error) {
    return next(error);
  }
};

export const createEmployee = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const payload = normalizeEmployeeCreatePayload(req.body ?? {});
    const errors = validateEmployeeCreatePayload(payload);

    const rawInitialAssignment = req.body?.positionAssignment;
    let initialPositionId: number | null = null;

    if (rawInitialAssignment !== undefined && rawInitialAssignment !== null) {
      if (
        typeof rawInitialAssignment !== "object"
        || Array.isArray(rawInitialAssignment)
      ) {
        errors.push("positionAssignment must be an object");
      } else {
        const parsedAssignment = validateAssignPositionPayload({
          ...(rawInitialAssignment as Record<string, unknown>),
          employeeId: 1
        });
        if (!parsedAssignment.success) {
          errors.push(...parsedAssignment.errors.map((error) => `positionAssignment.${error}`));
        } else {
          initialPositionId = parsedAssignment.value.positionId;
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Employee validation failed",
        errors
      });
    }

    const result = await sequelize.transaction(async (transaction: Transaction) => {
      if (initialPositionId !== null) {
        await acquirePositionMutationLock(transaction);
      }
      const existingEmployees = await sequelize.query(
        `
          SELECT TOP (1) [ID_Employee]
          FROM [dbo].[employee] WITH (UPDLOCK, HOLDLOCK)
          WHERE LTRIM(RTRIM([Ref_Employee])) = :employeeNumber;
        `,
        {
          replacements: { employeeNumber: payload.Ref_Employee },
          type: QueryTypes.SELECT,
          raw: true,
          transaction
        }
      ) as Array<{ ID_Employee: number }>;

      if (existingEmployees.length > 0) return { outcome: "duplicate" as const };

      if (payload.Location_Id !== null) {
        const locations = await sequelize.query(
          `
            SELECT TOP (1) [ID_Location]
            FROM [dbo].[Location] WITH (UPDLOCK, HOLDLOCK)
            WHERE [ID_Location] = :locationId;
          `,
          {
            replacements: { locationId: payload.Location_Id },
            type: QueryTypes.SELECT,
            raw: true,
            transaction
          }
        ) as Array<{ ID_Location: number }>;
        if (locations.length === 0) return { outcome: "invalid-location" as const };
      }

      if (payload.Department_Id !== null) {
        const departments = await sequelize.query(
          `
            SELECT TOP (1) [Id]
            FROM [dbo].[Departments] WITH (UPDLOCK, HOLDLOCK)
            WHERE [Id] = :departmentId;
          `,
          {
            replacements: { departmentId: payload.Department_Id },
            type: QueryTypes.SELECT,
            raw: true,
            transaction
          }
        ) as Array<{ Id: number }>;
        if (departments.length === 0) return { outcome: "invalid-department" as const };
      }

      if (initialPositionId !== null) {
        const positions = await sequelize.query(
          `
            SELECT TOP (1) [Id], [EmployeeId]
            FROM [dbo].[Position] WITH (UPDLOCK, HOLDLOCK)
            WHERE [Id] = :positionId;
          `,
          {
            replacements: { positionId: initialPositionId },
            type: QueryTypes.SELECT,
            raw: true,
            transaction
          }
        ) as Array<{ Id: number; EmployeeId: number | null }>;
        if (!positions[0]) return { outcome: "invalid-position" as const };
        if (positions[0].EmployeeId !== null) return { outcome: "occupied-position" as const };
      }

      const inserted = await sequelize.query(
        `
          INSERT INTO [dbo].[employee] (
            [Ref_Employee], [EmployeeName], [EmployeeName_En], [Gender],
            [DateOFBirth], [Phone], [Email], [State], [Contract_Type],
            [Start_of_Contract], [Type_Employee], [Location_Id], [Department_Id]
          )
          OUTPUT INSERTED.[ID_Employee]
          VALUES (
            :Ref_Employee, :EmployeeName, :EmployeeName_En, :Gender,
            :DateOFBirth, :Phone, :Email, :State, :Contract_Type,
            :Start_of_Contract, :Type_Employee, :Location_Id, :Department_Id
          );
        `,
        {
          replacements: payload,
          type: QueryTypes.SELECT,
          raw: true,
          transaction
        }
      ) as Array<{ ID_Employee: number }>;
      const employeeId = Number(inserted[0]?.ID_Employee);
      if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
        throw new Error("Employee insert did not return a valid employee ID");
      }

      if (initialPositionId !== null) {
        await sequelize.query(
          `
            UPDATE [dbo].[Position]
            SET [EmployeeId] = :employeeId
            WHERE [Id] = :positionId;
          `,
          {
            replacements: {
              positionId: initialPositionId,
              employeeId
            },
            type: QueryTypes.UPDATE,
            transaction
          }
        );
      }

      const createdRows = await sequelize.query(
        `
          WITH ${departmentManagerHierarchyCte}
          SELECT TOP (1)
            createdEmployee.[ID_Employee],
            createdEmployee.[Ref_Employee],
            createdEmployee.[EmployeeName],
            createdEmployee.[EmployeeName_En],
            createdEmployee.[Gender],
            createdEmployee.[DateOFBirth],
            createdEmployee.[Phone],
            createdEmployee.[Email],
            currentPosition.[Job_ID] AS [Job_Id],
            COALESCE(currentJob.[Job_Name_EN], currentJob.[Job_Name_AR]) AS [ResolvedJobName],
            currentJob.[Job_Name_AR] AS [ResolvedJobName_AR],
            currentPosition.[Id] AS [CurrentPositionId],
            currentPosition.[Position_Number] AS [CurrentPositionNumber],
            currentPosition.[Position_Type] AS [CurrentPositionType],
            currentPosition.[PositionLevel] AS [CurrentPositionLevel],
            currentPosition.[Position_Degree] AS [CurrentPositionDegree],
            currentPosition.[LineLevelId] AS [CurrentLineLevelId],
            currentLineLevel.[SortLine] AS [CurrentLineLevelSort],
            currentLineLevel.[EnglishDescription] AS [CurrentLineLevelName_EN],
            currentLineLevel.[ArabicDescription] AS [CurrentLineLevelName_AR],
            createdEmployee.[State],
            createdEmployee.[Contract_Type],
            createdEmployee.[Start_of_Contract],
            createdEmployee.[Type_Employee],
            createdEmployee.[Location_Id],
            createdEmployee.[Department_Id],
            department.[Id] AS [ResolvedDepartmentId],
            department.[DepartmentName_English],
            department.[DepartmentName_Arabic],
            department.[DepartmentType],
            department.[AttachedNumber] AS [DepartmentAttachedNumber],
            department.[DepartmentAddress],
            department.[DepartmentPhone],
            department.[DepartmentExtenstion],
            parentDepartment.[Id] AS [ParentDepartmentId],
            parentDepartment.[DepartmentName_English] AS [ParentDepartmentName_English],
            parentDepartment.[DepartmentName_Arabic] AS [ParentDepartmentName_Arabic],
            parentDepartment.[DepartmentType] AS [ParentDepartmentType],
            location.[LocationName_ar],
            location.[LocationName_en]
          FROM [dbo].[employee] AS createdEmployee
          LEFT JOIN [dbo].[Location] AS location
            ON createdEmployee.[Location_Id] = location.[ID_Location]
          LEFT JOIN [dbo].[Departments] AS department
            ON createdEmployee.[Department_Id] = department.[Id]
          LEFT JOIN resolvedParentDepartments AS parentDepartment
            ON parentDepartment.[AssignedDepartmentId] = department.[Id]
          LEFT JOIN [dbo].[Position] AS currentPosition
            ON createdEmployee.[ID_Employee] = currentPosition.[EmployeeId]
          LEFT JOIN [dbo].[jobs] AS currentJob
            ON currentJob.[Job_ID] = currentPosition.[Job_ID]
          LEFT JOIN [dbo].[LineLevel] AS currentLineLevel
            ON currentLineLevel.[Line_ID] = currentPosition.[LineLevelId]
          WHERE createdEmployee.[ID_Employee] = :employeeId
          OPTION (MAXRECURSION 64);
        `,
        {
          replacements: { employeeId },
          type: QueryTypes.SELECT,
          raw: true,
          transaction
        }
      ) as DatabaseRow[];

      return { outcome: "created" as const, employee: createdRows[0] };
    });

    if (result.outcome === "duplicate") {
      return res.status(409).json({
        success: false,
        message: `Employee number ${payload.Ref_Employee} already exists`
      });
    }

    if (result.outcome === "invalid-location") {
      return res.status(400).json({
        success: false,
        message: "Selected work location does not exist"
      });
    }

    if (result.outcome === "invalid-department") {
      return res.status(400).json({
        success: false,
        message: "Selected department does not exist",
        code: "DEPARTMENT_NOT_FOUND"
      });
    }

    if (result.outcome === "invalid-position") {
      return res.status(400).json({
        success: false,
        message: "Selected position does not exist"
      });
    }

    if (result.outcome === "occupied-position") {
      return res.status(409).json({
        success: false,
        message: "Selected position is already occupied",
        code: "POSITION_OCCUPIED"
      });
    }

    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: result.employee
    });
  } catch (error) {
    const businessRuleError = getDatabaseBusinessRuleError(error);
    if (businessRuleError) {
      return res.status(businessRuleError.status).json({
        success: false,
        message: businessRuleError.message,
        code: businessRuleError.code
      });
    }
    return next(error);
  }
};

type EmployeeUpdateResult =
  | { outcome: "not-found" }
  | { outcome: "duplicate" }
  | { outcome: "invalid-location" }
  | { outcome: "invalid-department" }
  | { outcome: "updated"; employee: DatabaseRow };

export const updateEmployee = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const employeeId = Number(req.params?.id);

    if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Employee ID must be a positive integer"
      });
    }

    const payload = normalizeEmployeeUpdatePayload(req.body ?? {});
    const errors = validateEmployeeUpdatePayload(payload);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Employee validation failed",
        errors
      });
    }

    const extendedUpdateFields = (
      Object.keys(employeeExtendedUpdateFieldDefinitions) as EmployeeExtendedUpdateField[]
    ).filter((field) => Object.prototype.hasOwnProperty.call(payload, field));
    const updateAssignments = [
      "[Ref_Employee] = :Ref_Employee",
      "[EmployeeName] = :EmployeeName",
      "[EmployeeName_En] = :EmployeeName_En",
      "[Gender] = :Gender",
      "[DateOFBirth] = :DateOFBirth",
      "[Phone] = :Phone",
      "[Email] = :Email",
      "[State] = :State",
      "[Contract_Type] = :Contract_Type",
      "[Start_of_Contract] = :Start_of_Contract",
      "[Type_Employee] = :Type_Employee",
      "[Location_Id] = :Location_Id",
      "[Department_Id] = :Department_Id",
      ...extendedUpdateFields.map((field) => `${quoteIdentifier(field)} = :${field}`)
    ].join(",\n              ");

    const result = await sequelize.transaction(
      async (transaction: Transaction): Promise<EmployeeUpdateResult> => {
        if (payload.State === false) {
          await acquirePositionMutationLock(transaction);
        }
        const currentEmployees = await sequelize.query(
          `
            SELECT TOP (1) [ID_Employee]
            FROM [dbo].[employee] WITH (UPDLOCK, HOLDLOCK)
            WHERE [ID_Employee] = :employeeId;
          `,
          {
            replacements: { employeeId },
            type: QueryTypes.SELECT,
            raw: true,
            transaction
          }
        ) as Array<{ ID_Employee: number }>;

        if (currentEmployees.length === 0) {
          return { outcome: "not-found" };
        }

        const duplicateEmployees = await sequelize.query(
          `
            SELECT TOP (1) [ID_Employee]
            FROM [dbo].[employee] WITH (UPDLOCK, HOLDLOCK)
            WHERE LTRIM(RTRIM([Ref_Employee])) = :employeeNumber
              AND [ID_Employee] <> :employeeId;
          `,
          {
            replacements: {
              employeeId,
              employeeNumber: payload.Ref_Employee
            },
            type: QueryTypes.SELECT,
            raw: true,
            transaction
          }
        ) as Array<{ ID_Employee: number }>;

        if (duplicateEmployees.length > 0) {
          return { outcome: "duplicate" };
        }

        if (payload.Location_Id !== null) {
          const locations = await sequelize.query(
            `
              SELECT TOP (1) [ID_Location]
              FROM [dbo].[Location] WITH (UPDLOCK, HOLDLOCK)
              WHERE [ID_Location] = :locationId;
            `,
            {
              replacements: { locationId: payload.Location_Id },
              type: QueryTypes.SELECT,
              raw: true,
              transaction
            }
          ) as Array<{ ID_Location: number }>;

          if (locations.length === 0) {
            return { outcome: "invalid-location" };
          }
        }

        if (payload.Department_Id !== null) {
          const departments = await sequelize.query(
            `
              SELECT TOP (1) [Id]
              FROM [dbo].[Departments] WITH (UPDLOCK, HOLDLOCK)
              WHERE [Id] = :departmentId;
            `,
            {
              replacements: { departmentId: payload.Department_Id },
              type: QueryTypes.SELECT,
              raw: true,
              transaction
            }
          ) as Array<{ Id: number }>;

          if (departments.length === 0) {
            return { outcome: "invalid-department" };
          }
        }

        await sequelize.query(
          `
            UPDATE [dbo].[employee]
            SET
              ${updateAssignments}
            WHERE [ID_Employee] = :employeeId;
          `,
          {
            replacements: { ...payload, employeeId },
            type: QueryTypes.UPDATE,
            transaction
          }
        );

        if (payload.State === false) {
          await sequelize.query(
            `
              SELECT [Id]
              FROM [dbo].[Position] WITH (UPDLOCK, HOLDLOCK)
              WHERE [EmployeeId] = :employeeId;

              UPDATE [dbo].[Position]
              SET [EmployeeId] = NULL
              WHERE [EmployeeId] = :employeeId;
            `,
            {
              replacements: { employeeId },
              type: QueryTypes.UPDATE,
              transaction
            }
          );
        }

        const updatedEmployees = await sequelize.query(
          `
            WITH ${departmentManagerHierarchyCte}
            SELECT TOP (1)
              updatedEmployee.*,
              currentPosition.[Job_ID] AS [Job_Id],
              COALESCE(currentJob.[Job_Name_EN], currentJob.[Job_Name_AR]) AS [ResolvedJobName],
              currentJob.[Job_Name_AR] AS [ResolvedJobName_AR],
              currentPosition.[Id] AS [CurrentPositionId],
              currentPosition.[Position_Number] AS [CurrentPositionNumber],
              currentPosition.[Position_Type] AS [CurrentPositionType],
              currentPosition.[PositionLevel] AS [CurrentPositionLevel],
              currentPosition.[Position_Degree] AS [CurrentPositionDegree],
              currentPosition.[LineLevelId] AS [CurrentLineLevelId],
              currentLineLevel.[SortLine] AS [CurrentLineLevelSort],
              currentLineLevel.[EnglishDescription] AS [CurrentLineLevelName_EN],
              currentLineLevel.[ArabicDescription] AS [CurrentLineLevelName_AR],
              department.[Id] AS [ResolvedDepartmentId],
              department.[DepartmentName_English],
              department.[DepartmentName_Arabic],
              department.[DepartmentType],
              department.[AttachedNumber] AS [DepartmentAttachedNumber],
              department.[DepartmentAddress],
              department.[DepartmentPhone],
              department.[DepartmentExtenstion],
              parentDepartment.[Id] AS [ParentDepartmentId],
              parentDepartment.[DepartmentName_English] AS [ParentDepartmentName_English],
              parentDepartment.[DepartmentName_Arabic] AS [ParentDepartmentName_Arabic],
              parentDepartment.[DepartmentType] AS [ParentDepartmentType],
              location.[LocationName_ar],
              location.[LocationName_en]
            FROM [dbo].[employee] AS updatedEmployee
            LEFT JOIN [dbo].[Location] AS location
              ON updatedEmployee.[Location_Id] = location.[ID_Location]
            LEFT JOIN [dbo].[Departments] AS department
              ON updatedEmployee.[Department_Id] = department.[Id]
            LEFT JOIN resolvedParentDepartments AS parentDepartment
              ON parentDepartment.[AssignedDepartmentId] = department.[Id]
            LEFT JOIN [dbo].[Position] AS currentPosition
              ON updatedEmployee.[ID_Employee] = currentPosition.[EmployeeId]
            LEFT JOIN [dbo].[jobs] AS currentJob
              ON currentJob.[Job_ID] = currentPosition.[Job_ID]
            LEFT JOIN [dbo].[LineLevel] AS currentLineLevel
              ON currentLineLevel.[Line_ID] = currentPosition.[LineLevelId]
            WHERE updatedEmployee.[ID_Employee] = :employeeId
            OPTION (MAXRECURSION 64);
          `,
          {
            replacements: { employeeId },
            type: QueryTypes.SELECT,
            raw: true,
            transaction
          }
        ) as DatabaseRow[];

        return {
          outcome: "updated",
          employee: updatedEmployees[0]
        };
      }
    );

    if (result.outcome === "not-found") {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    if (result.outcome === "duplicate") {
      return res.status(409).json({
        success: false,
        message: `Employee number ${payload.Ref_Employee} already exists`
      });
    }

    if (result.outcome === "invalid-location") {
      return res.status(400).json({
        success: false,
        message: "Selected work location does not exist"
      });
    }

    if (result.outcome === "invalid-department") {
      return res.status(400).json({
        success: false,
        message: "Selected department does not exist",
        code: "DEPARTMENT_NOT_FOUND"
      });
    }

    const employeeWithBankDetails = await resolveEmployeeBankDetails(result.employee);

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: employeeWithBankDetails
    });
  } catch (error) {
    return next(error);
  }
};

type EmployeeDeleteRecord = {
  ID_Employee: number;
  Ref_Employee: unknown;
  EmployeeName: unknown;
  EmployeeName_En: unknown;
};

type EmployeeDeleteResult =
  | { outcome: "not-found" }
  | { outcome: "vacancy" }
  | {
      outcome: "archived";
      employee: EmployeeDeleteRecord;
    };

export const deleteEmployee = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  const rawEmployeeId = req.params?.id;

  if (typeof rawEmployeeId !== "string" || !/^[1-9]\d*$/.test(rawEmployeeId)) {
    return res.status(400).json({
      success: false,
      message: "Employee ID must be a positive integer"
    });
  }

  const employeeId = Number(rawEmployeeId);

  if (!Number.isSafeInteger(employeeId)) {
    return res.status(400).json({
      success: false,
      message: "Employee ID must be a positive integer"
    });
  }

  try {
    const result = await sequelize.transaction(
      async (transaction: Transaction): Promise<EmployeeDeleteResult> => {
        await acquirePositionMutationLock(transaction);
        const employees = await sequelize.query(
          `
            SELECT TOP (1)
              [ID_Employee],
              [Ref_Employee],
              [EmployeeName],
              [EmployeeName_En]
            FROM [dbo].[employee] WITH (UPDLOCK, HOLDLOCK)
            WHERE [ID_Employee] = :employeeId;
          `,
          {
            replacements: { employeeId },
            type: QueryTypes.SELECT,
            raw: true,
            transaction
          }
        ) as EmployeeDeleteRecord[];

        const employee = employees[0];

        if (!employee) {
          return { outcome: "not-found" };
        }

        if (String(employee.Ref_Employee ?? "").trim() === "0") {
          return { outcome: "vacancy" };
        }

        await sequelize.query(
          `
            SELECT [Id]
            FROM [dbo].[Position] WITH (UPDLOCK, HOLDLOCK)
            WHERE [EmployeeId] = :employeeId;
          `,
          {
            replacements: { employeeId },
            type: QueryTypes.SELECT,
            raw: true,
            transaction
          }
        );

        await sequelize.query(
          `
            UPDATE [dbo].[Position]
            SET [EmployeeId] = NULL
            WHERE [EmployeeId] = :employeeId;
          `,
          {
            replacements: { employeeId },
            type: QueryTypes.UPDATE,
            transaction
          }
        );

        await sequelize.query(
          `
            UPDATE [dbo].[employee]
            SET [State] = 0
            WHERE [ID_Employee] = :employeeId;
          `,
          {
            replacements: { employeeId },
            type: QueryTypes.UPDATE,
            transaction
          }
        );

        return { outcome: "archived", employee };
      }
    );

    if (result.outcome === "not-found") {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    if (result.outcome === "vacancy") {
      return res.status(409).json({
        success: false,
        message: "Vacancy records cannot be deleted as employees",
        code: "EMPLOYEE_DELETE_VACANCY"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Employee archived successfully",
      data: {
        id: result.employee.ID_Employee,
        employeeNumber: result.employee.Ref_Employee,
        employeeName: result.employee.EmployeeName_En ?? result.employee.EmployeeName
      }
    });
  } catch (error) {
    if (isForeignKeyConstraintError(error)) {
      return res.status(409).json({
        success: false,
        message: "Employee cannot be deleted because other records still reference this employee",
        code: "EMPLOYEE_DELETE_CONFLICT"
      });
    }

    return next(error);
  }
};

export const getEmployeeById = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const employeeId = Number(req.params?.id);

    if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Employee ID must be a positive integer"
      });
    }

    const rows = await sequelize.query(
      `
        WITH ${departmentManagerHierarchyCte}
        SELECT TOP (1)
          employee.*,
          currentPosition.[Job_ID] AS [Job_Id],
          COALESCE(job.[Job_Name_EN], job.[Job_Name_AR]) AS [ResolvedJobName],
          job.[Job_Name_AR] AS [ResolvedJobName_AR],
          currentPosition.[Id] AS [CurrentPositionId],
          currentPosition.[Position_Number] AS [CurrentPositionNumber],
          currentPosition.[Position_Type] AS [CurrentPositionType],
          currentPosition.[PositionLevel] AS [CurrentPositionLevel],
          currentPosition.[Position_Degree] AS [CurrentPositionDegree],
          currentPosition.[LineLevelId] AS [CurrentLineLevelId],
          currentLineLevel.[SortLine] AS [CurrentLineLevelSort],
          currentLineLevel.[EnglishDescription] AS [CurrentLineLevelName_EN],
          currentLineLevel.[ArabicDescription] AS [CurrentLineLevelName_AR],
          department.[Id] AS [ResolvedDepartmentId],
          department.[DepartmentName_English],
          department.[DepartmentName_Arabic],
          department.[DepartmentType],
          department.[AttachedNumber] AS [DepartmentAttachedNumber],
          department.[DepartmentAddress],
          department.[DepartmentPhone],
          department.[DepartmentExtenstion],
          parentDepartment.[Id] AS [ParentDepartmentId],
          parentDepartment.[DepartmentName_English] AS [ParentDepartmentName_English],
          parentDepartment.[DepartmentName_Arabic] AS [ParentDepartmentName_Arabic],
          parentDepartment.[DepartmentType] AS [ParentDepartmentType],
          job.[Job_Name_AR],
          job.[Job_Name_EN],
          job.[Job_Family],
          job.[Career_Level],
          job.[Role_Criticality],
          job.[Role_Purpose],
          job.[Key_Accountabilities],
          job.[Typical_Deliverables],
          job.[Minimum_Education_Benchmark],
          job.[Preferred_Qualifications],
          job.[Minimum_Experience_Benchmark],
          job.[Technical_Competencies],
          job.[Behavioral_Competencies],
          job.[HSE_Process_Safety_Accountabilities],
          job.[Mandatory_Training_Licences_Benchmark],
          job.[Applicable_Standards_Procedures],
          job.[Decision_Authority],
          job.[Supervisory_Scope],
          job.[Key_Interfaces],
          job.[Work_Environment_and_Schedule],
          job.[Physical_Medical_Fitness],
          job.[Competency_Assurance_Method],
          job.[KPI_Benchmark],
          job.[Required_Languages],
          job.[Language_Level_CEFR],
          job.[Job_Type],
          job.[Profile_Validation_Owner],
          location.[ID_Location] AS [ResolvedLocationId],
          location.[LocationName_en] AS [ResolvedLocationName_en],
          location.[LocationName_ar] AS [ResolvedLocationName_ar],
          location.[LocationCode] AS [ResolvedLocationCode],
          CASE
            WHEN location.[LocationInMap] IS NULL THEN NULL
            ELSE 'Available'
          END AS [ResolvedLocationInMap]
        FROM [dbo].[employee] AS employee
        LEFT JOIN [dbo].[Location] AS location
          ON employee.[location_id] = location.[ID_Location]
        LEFT JOIN [dbo].[Departments] AS department
          ON employee.[Department_Id] = department.[Id]
        LEFT JOIN resolvedParentDepartments AS parentDepartment
          ON parentDepartment.[AssignedDepartmentId] = department.[Id]
        LEFT JOIN [dbo].[Position] AS currentPosition
          ON employee.[ID_Employee] = currentPosition.[EmployeeId]
        LEFT JOIN [dbo].[jobs] AS job
          ON currentPosition.[Job_ID] = job.[Job_ID]
        LEFT JOIN [dbo].[LineLevel] AS currentLineLevel
          ON currentLineLevel.[Line_ID] = currentPosition.[LineLevelId]
        WHERE employee.[ID_Employee] = :employeeId
        OPTION (MAXRECURSION 64);
      `,
      {
        replacements: { employeeId },
        type: QueryTypes.SELECT,
        raw: true
      }
    ) as Array<Record<string, unknown>>;

    const employee = rows[0];

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    const employeeWithBankDetails = await resolveEmployeeBankDetails(employee);

    return res.status(200).json({
      success: true,
      message: "Employee loaded successfully",
      data: employeeWithBankDetails
    });
  } catch (error) {
    return next(error);
  }
};
