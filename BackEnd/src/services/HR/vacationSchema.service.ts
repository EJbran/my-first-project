export type DatabaseColumnMetadata = {
  columnName: string;
  dataType: string;
  ordinal: number;
};

export type ApiColumnMetadata = {
  key: string;
  label: string;
  dataType: string;
  ordinal: number;
};

type VacationCompatibilitySpec = {
  alias: string;
  candidates: string[];
};

type ResolvedProjection = ApiColumnMetadata & {
  expression: string;
};

export type VacationSchemaQueryPlan = {
  referenceColumn?: DatabaseColumnMetadata;
  idColumn?: DatabaseColumnMetadata;
  startColumn?: DatabaseColumnMetadata;
  codeReferenceColumn?: DatabaseColumnMetadata;
  timeSheetCodeIdColumn?: DatabaseColumnMetadata;
  projection: string[];
  lookupClause: string;
  columns: ApiColumnMetadata[];
  resolvedColumns: ApiColumnMetadata[];
  timeSheetCodeResolution: "available" | "table-unavailable" | "schema-incompatible";
};

const vacationCompatibilitySpecs: VacationCompatibilitySpec[] = [
  { alias: "Id", candidates: ["Id", "ID_Vacation", "VacationId"] },
  { alias: "Ref_Employee", candidates: ["Ref_Employee", "ID_Employee"] },
  { alias: "Id_CodeTimeSheet", candidates: ["Id_CodeTimeSheet", "ID_CodeTimeSheet"] },
  { alias: "VacationDate_Start", candidates: ["VacationDate_Start", "VacationDateStart"] },
  { alias: "VacationDate_End", candidates: ["VacationDate_End", "VacationDateEnd"] },
  { alias: "ReturnDate", candidates: ["ReturnDate", "Return_Date"] },
  { alias: "Num_VacationDays", candidates: ["Num_VacationDays", "VacationDays"] },
  { alias: "CreatedDate", candidates: ["CreatedDate", "Created_Date"] },
  { alias: "RemainingBalance", candidates: ["RemainingBalance", "Remaining_Balance"] },
  { alias: "State", candidates: ["State", "Status"] },
  { alias: "Cause", candidates: ["Cause", "Reason"] },
  { alias: "DeductedLeaveDays", candidates: ["DeductedLeaveDays", "Deducted_Leave_Days"] },
  { alias: "HolidayDays", candidates: ["HolidayDays", "Holiday_Days"] }
];

const vacationReferenceCandidates = [
  "Ref_Employee",
  "ID_Employee",
  "EmployeeId",
  "Employee_ID",
  "EmployeeNumber",
  "Employee_No"
];

const vacationIdCandidates = [
  "Id",
  "ID_Vacation",
  "VacationId",
  "Vacation_ID",
  "VacationKey"
];

const vacationCodeReferenceCandidates = [
  "Id_CodeTimeSheet",
  "ID_CodeTimeSheet",
  "CodeTimeSheetId",
  "TimeSheetCodeId",
  "TimeSheetCode_ID",
  "Ref_CodeTimeSheet"
];

const timeSheetCodeIdCandidates = [
  "Id",
  "ID",
  "Id_CodeTimeSheet",
  "ID_CodeTimeSheet",
  "CodeTimeSheetId",
  "TimeSheetCodeId",
  "TimeSheetCode_ID",
  "CodeId",
  "Ref_CodeTimeSheet"
];

const timeSheetCodeValueCandidates = [
  "Code",
  "TimeSheetCode",
  "CodeTimeSheet",
  "Code_TimeSheet",
  "Code_Name",
  "CodeName",
  "ShortCode",
  "Symbol"
];

const timeSheetCodeDescriptionCandidates = [
  "Description",
  "Code_Description",
  "CodeDescription",
  "TimeSheetCodeDescription",
  "Description_English",
  "EnglishDescription",
  "Details",
  "Name"
];

const timeSheetCodeEnglishCandidates = [
  "Name_English",
  "NameEnglish",
  "EnglishName",
  "Description_English",
  "EnglishDescription",
  "Description",
  "Name"
];

const timeSheetCodeArabicCandidates = [
  "Name_Arabic",
  "NameArabic",
  "ArabicName",
  "Description_Arabic",
  "ArabicDescription",
  "Arabic_Description"
];

const textualDataTypes = new Set([
  "char",
  "nchar",
  "varchar",
  "nvarchar",
  "text",
  "ntext"
]);

export const quoteSqlIdentifier = (identifier: string): string =>
  `[${identifier.replace(/]/g, "]]")}]`;

export const findDatabaseColumn = (
  columns: DatabaseColumnMetadata[],
  candidates: string[]
): DatabaseColumnMetadata | undefined => {
  const lookup = new Map(
    columns.map((column) => [column.columnName.toLocaleLowerCase("en-US"), column])
  );

  for (const candidate of candidates) {
    const match = lookup.get(candidate.toLocaleLowerCase("en-US"));
    if (match) return match;
  }

  return undefined;
};

const toApiColumn = (column: DatabaseColumnMetadata): ApiColumnMetadata => ({
  key: column.columnName,
  label: column.columnName,
  dataType: column.dataType,
  ordinal: column.ordinal
});

const firstTextColumn = (
  columns: DatabaseColumnMetadata[],
  excluded: Set<string>
): DatabaseColumnMetadata | undefined =>
  columns.find((column) =>
    textualDataTypes.has(column.dataType.toLocaleLowerCase("en-US"))
    && !excluded.has(column.columnName.toLocaleLowerCase("en-US"))
  );

const uniqueColumns = (
  columns: Array<DatabaseColumnMetadata | undefined>
): DatabaseColumnMetadata[] => {
  const seen = new Set<string>();
  return columns.filter((column): column is DatabaseColumnMetadata => {
    if (!column) return false;
    const key = column.columnName.toLocaleLowerCase("en-US");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const nullTextExpression = "CAST(NULL AS nvarchar(4000))";

export const buildVacationSchemaQueryPlan = (
  vacationColumns: DatabaseColumnMetadata[],
  timeSheetCodeColumns: DatabaseColumnMetadata[]
): VacationSchemaQueryPlan => {
  const orderedVacationColumns = [...vacationColumns]
    .sort((left, right) => left.ordinal - right.ordinal);
  const orderedTimeSheetCodeColumns = [...timeSheetCodeColumns]
    .sort((left, right) => left.ordinal - right.ordinal);

  const referenceColumn = findDatabaseColumn(
    orderedVacationColumns,
    vacationReferenceCandidates
  );
  const idColumn = findDatabaseColumn(orderedVacationColumns, vacationIdCandidates);
  const startColumn = findDatabaseColumn(
    orderedVacationColumns,
    ["VacationDate_Start", "VacationDateStart", "StartDate", "Date_Start"]
  );
  const codeReferenceColumn = findDatabaseColumn(
    orderedVacationColumns,
    vacationCodeReferenceCandidates
  );
  const timeSheetCodeIdColumn = findDatabaseColumn(
    orderedTimeSheetCodeColumns,
    codeReferenceColumn
      ? [codeReferenceColumn.columnName, ...timeSheetCodeIdCandidates]
      : timeSheetCodeIdCandidates
  );

  const projection = orderedVacationColumns.map((column) =>
    `vacation.${quoteSqlIdentifier(column.columnName)} AS ${quoteSqlIdentifier(column.columnName)}`
  );
  const occupiedAliases = new Set(
    orderedVacationColumns.map((column) =>
      column.columnName.toLocaleLowerCase("en-US")
    )
  );

  for (const spec of vacationCompatibilitySpecs) {
    const sourceColumn = findDatabaseColumn(orderedVacationColumns, spec.candidates);
    const aliasKey = spec.alias.toLocaleLowerCase("en-US");
    if (!sourceColumn || occupiedAliases.has(aliasKey)) continue;

    projection.push(
      `vacation.${quoteSqlIdentifier(sourceColumn.columnName)} AS ${quoteSqlIdentifier(spec.alias)}`
    );
    occupiedAliases.add(aliasKey);
  }

  const allocateAlias = (requestedAlias: string): string => {
    let alias = requestedAlias;
    let suffix = 2;
    while (occupiedAliases.has(alias.toLocaleLowerCase("en-US"))) {
      alias = `${requestedAlias}_Lookup${suffix}`;
      suffix += 1;
    }
    occupiedAliases.add(alias.toLocaleLowerCase("en-US"));
    return alias;
  };

  const lookupAvailable = Boolean(codeReferenceColumn && timeSheetCodeIdColumn);
  const excludedTextColumns = new Set<string>();
  if (timeSheetCodeIdColumn) {
    excludedTextColumns.add(
      timeSheetCodeIdColumn.columnName.toLocaleLowerCase("en-US")
    );
  }

  const explicitValueColumn = findDatabaseColumn(
    orderedTimeSheetCodeColumns,
    timeSheetCodeValueCandidates
  );
  const valueColumn = explicitValueColumn
    ?? firstTextColumn(orderedTimeSheetCodeColumns, excludedTextColumns)
    ?? timeSheetCodeIdColumn;
  if (valueColumn) {
    excludedTextColumns.add(valueColumn.columnName.toLocaleLowerCase("en-US"));
  }

  const explicitDescriptionColumn = findDatabaseColumn(
    orderedTimeSheetCodeColumns,
    timeSheetCodeDescriptionCandidates
  );
  const descriptionColumn = explicitDescriptionColumn
    ?? firstTextColumn(orderedTimeSheetCodeColumns, excludedTextColumns);
  const englishColumn = findDatabaseColumn(
    orderedTimeSheetCodeColumns,
    timeSheetCodeEnglishCandidates
  );
  const arabicColumn = findDatabaseColumn(
    orderedTimeSheetCodeColumns,
    timeSheetCodeArabicCandidates
  );

  const lookupColumns = lookupAvailable
    ? uniqueColumns(orderedTimeSheetCodeColumns)
    : [];
  const lookupAlias = "timeSheetCodeLookup";
  const lookupExpression = (
    column: DatabaseColumnMetadata | undefined
  ): string => lookupAvailable && column
    ? `${quoteSqlIdentifier(lookupAlias)}.${quoteSqlIdentifier(column.columnName)}`
    : nullTextExpression;

  const resolvedProjection: ResolvedProjection[] = [];
  const addResolvedProjection = (
    requestedAlias: string,
    label: string,
    sourceColumn: DatabaseColumnMetadata | undefined
  ): ResolvedProjection => {
    const alias = allocateAlias(requestedAlias);
    const item: ResolvedProjection = {
      key: alias,
      label,
      dataType: lookupAvailable && sourceColumn
        ? sourceColumn.dataType
        : "nvarchar",
      ordinal: orderedVacationColumns.length + resolvedProjection.length + 1,
      expression: lookupExpression(sourceColumn)
    };
    resolvedProjection.push(item);
    projection.push(
      `${item.expression} AS ${quoteSqlIdentifier(item.key)}`
    );
    return item;
  };

  if (lookupAvailable) {
    for (const column of orderedTimeSheetCodeColumns) {
      addResolvedProjection(
        `TimeSheetCode_${column.columnName}`,
        `Timesheet Code — ${column.columnName}`,
        column
      );
    }
  }

  addResolvedProjection(
    "ResolvedTimeSheetCodeId",
    "Timesheet Code ID",
    timeSheetCodeIdColumn
  );
  const resolvedCode = addResolvedProjection(
    "ResolvedTimeSheetCode",
    "Timesheet Code",
    valueColumn
  );
  const resolvedDescription = addResolvedProjection(
    "ResolvedTimeSheetCodeDescription",
    "Timesheet Code Description",
    descriptionColumn
  );
  addResolvedProjection(
    "ResolvedTimeSheetCodeNameEnglish",
    "Timesheet Code Name (English)",
    englishColumn
  );
  addResolvedProjection(
    "ResolvedTimeSheetCodeNameArabic",
    "Timesheet Code Name (Arabic)",
    arabicColumn
  );

  const addCompatibilityResolvedProjection = (
    requestedAlias: string,
    label: string,
    source: ResolvedProjection
  ) => {
    if (occupiedAliases.has(requestedAlias.toLocaleLowerCase("en-US"))) return;
    const alias = allocateAlias(requestedAlias);
    const item: ResolvedProjection = {
      key: alias,
      label,
      dataType: source.dataType,
      ordinal: orderedVacationColumns.length + resolvedProjection.length + 1,
      expression: source.expression
    };
    resolvedProjection.push(item);
    projection.push(
      `${item.expression} AS ${quoteSqlIdentifier(item.key)}`
    );
  };

  addCompatibilityResolvedProjection(
    "TimeSheetCode",
    "Timesheet Code",
    resolvedCode
  );
  addCompatibilityResolvedProjection(
    "TimeSheetCodeDescription",
    "Timesheet Code Description",
    resolvedDescription
  );

  const lookupClause = lookupAvailable
    ? `
          OUTER APPLY (
            SELECT TOP (1)
              ${lookupColumns.map((column) =>
                `timeSheetCode.${quoteSqlIdentifier(column.columnName)} AS ${quoteSqlIdentifier(column.columnName)}`
              ).join(",\n              ")}
            FROM [dbo].[TimeSheetCode] AS timeSheetCode
            WHERE NULLIF(
                    LTRIM(RTRIM(TRY_CONVERT(nvarchar(4000), timeSheetCode.${quoteSqlIdentifier(timeSheetCodeIdColumn!.columnName)}))),
                    N''
                  ) COLLATE DATABASE_DEFAULT
                = NULLIF(
                    LTRIM(RTRIM(TRY_CONVERT(nvarchar(4000), vacation.${quoteSqlIdentifier(codeReferenceColumn!.columnName)}))),
                    N''
                  ) COLLATE DATABASE_DEFAULT
          ) AS ${quoteSqlIdentifier(lookupAlias)}
      `.trim()
    : "";

  const timeSheetCodeResolution = lookupAvailable
    ? "available"
    : orderedTimeSheetCodeColumns.length === 0
      ? "table-unavailable"
      : "schema-incompatible";

  return {
    referenceColumn,
    idColumn,
    startColumn,
    codeReferenceColumn,
    timeSheetCodeIdColumn,
    projection,
    lookupClause,
    columns: orderedVacationColumns.map(toApiColumn),
    resolvedColumns: resolvedProjection.map(({ expression: _expression, ...column }) => column),
    timeSheetCodeResolution
  };
};
