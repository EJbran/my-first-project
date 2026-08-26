"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  buildVacationSchemaQueryPlan,
  quoteSqlIdentifier
} = require("../src/services/HR/vacationSchema.service");

const columns = (definitions) => definitions.map(([columnName, dataType], index) => ({
  columnName,
  dataType,
  ordinal: index + 1
}));

const vacationColumns = columns([
  ["VacationKey", "bigint"],
  ["EmployeeNumber", "nvarchar"],
  ["ID_CodeTimeSheet", "int"],
  ["VacationDateStart", "date"],
  ["CustomApprovalNote", "nvarchar"],
  ["UnexpectedNumericValue", "decimal"]
]);
const timeSheetCodeColumns = columns([
  ["Id", "int"],
  ["Code", "nvarchar"],
  ["Code_Description", "nvarchar"],
  ["Name_Arabic", "nvarchar"]
]);

const plan = buildVacationSchemaQueryPlan(
  vacationColumns,
  timeSheetCodeColumns
);

assert.deepEqual(
  plan.columns.map((column) => column.key),
  vacationColumns.map((column) => column.columnName),
  "Vacation metadata must preserve every real column in database ordinal order"
);
for (const column of vacationColumns) {
  const expected = `vacation.${quoteSqlIdentifier(column.columnName)} AS ${quoteSqlIdentifier(column.columnName)}`;
  assert.ok(
    plan.projection.includes(expected),
    `Projection must preserve raw Vacation column ${column.columnName}`
  );
}
assert.equal(plan.referenceColumn?.columnName, "EmployeeNumber");
assert.equal(plan.idColumn?.columnName, "VacationKey");
assert.equal(plan.codeReferenceColumn?.columnName, "ID_CodeTimeSheet");
assert.equal(plan.timeSheetCodeIdColumn?.columnName, "Id");
assert.equal(plan.timeSheetCodeResolution, "available");
assert.match(plan.lookupClause, /\bOUTER APPLY\b/);
assert.match(plan.lookupClause, /\bSELECT TOP \(1\)/);
assert.match(plan.lookupClause, /\[dbo\]\.\[TimeSheetCode\]/);
assert.match(plan.lookupClause, /vacation\.\[ID_CodeTimeSheet\]/);
assert.ok(
  plan.resolvedColumns.some((column) => column.key === "ResolvedTimeSheetCodeId")
);
assert.ok(
  plan.resolvedColumns.some((column) => column.key === "TimeSheetCode_Id")
);
assert.ok(
  plan.resolvedColumns.some((column) => column.key === "TimeSheetCode_Code")
);
assert.ok(
  plan.resolvedColumns.some(
    (column) => column.key === "TimeSheetCode_Code_Description"
  )
);
assert.ok(
  plan.resolvedColumns.some((column) => column.key === "ResolvedTimeSheetCode")
);
assert.ok(
  plan.resolvedColumns.some(
    (column) => column.key === "ResolvedTimeSheetCodeDescription"
  )
);
assert.ok(plan.resolvedColumns.some((column) => column.key === "TimeSheetCode"));
assert.ok(
  plan.resolvedColumns.some(
    (column) => column.key === "TimeSheetCodeDescription"
  )
);
assert.equal(
  plan.resolvedColumns.find(
    (column) => column.key === "ResolvedTimeSheetCodeDescription"
  )?.dataType,
  "nvarchar"
);

const unavailableLookupPlan = buildVacationSchemaQueryPlan(
  columns([
    ["Id", "int"],
    ["ID_Employee", "nvarchar"],
    ["Id_CodeTimeSheet", "int"],
    ["AdditionalCompanyField", "nvarchar"]
  ]),
  []
);
assert.equal(unavailableLookupPlan.timeSheetCodeResolution, "table-unavailable");
assert.equal(unavailableLookupPlan.lookupClause, "");
assert.ok(
  unavailableLookupPlan.projection.some(
    (expression) =>
      expression === "vacation.[AdditionalCompanyField] AS [AdditionalCompanyField]"
  )
);
assert.ok(
  unavailableLookupPlan.projection.some(
    (expression) =>
      expression.includes("CAST(NULL AS nvarchar(4000))")
      && expression.includes("[ResolvedTimeSheetCodeId]")
  ),
  "Missing lookup source must not prevent raw Vacation rows from loading"
);

const collisionPlan = buildVacationSchemaQueryPlan(
  columns([
    ["Id", "int"],
    ["ID_Employee", "nvarchar"],
    ["Id_CodeTimeSheet", "int"],
    ["TimeSheetCode", "nvarchar"],
    ["ResolvedTimeSheetCodeId", "int"]
  ]),
  timeSheetCodeColumns
);
assert.ok(
  collisionPlan.resolvedColumns.some(
    (column) => column.key === "ResolvedTimeSheetCodeId_Lookup2"
  ),
  "Resolved aliases must move aside instead of overwriting real Vacation fields"
);
assert.equal(
  collisionPlan.resolvedColumns.filter(
    (column) => column.key.toLowerCase() === "timesheetcode"
  ).length,
  0,
  "Compatibility lookup aliases must not overwrite real Vacation fields"
);

assert.equal(
  quoteSqlIdentifier("Unexpected]Column"),
  "[Unexpected]]Column]",
  "Metadata-derived SQL identifiers must always be bracket escaped"
);

const exactForeignKeyPlan = buildVacationSchemaQueryPlan(
  columns([
    ["Id", "int"],
    ["ID_Employee", "nvarchar"],
    ["ID_CodeTimeSheet", "int"]
  ]),
  columns([
    ["Id", "int"],
    ["ID_CodeTimeSheet", "int"],
    ["Code", "nvarchar"]
  ])
);
assert.equal(
  exactForeignKeyPlan.timeSheetCodeIdColumn?.columnName,
  "ID_CodeTimeSheet",
  "An exact TimeSheetCode key-name match must win over a generic Id column"
);

const controllerSource = fs.readFileSync(
  path.resolve(__dirname, "../src/controllers/HR/vacation.controller.ts"),
  "utf8"
);
assert.match(
  controllerSource,
  /buildVacationSchemaQueryPlan\(\s*schemaMetadata\.vacationColumns,\s*schemaMetadata\.timeSheetCodeColumns\s*\)/
);
assert.match(
  controllerSource,
  /SELECT \$\{schemaPlan\.projection\.join\([\s\S]*FROM \[dbo\]\.\[Vacation\] AS vacation[\s\S]*\$\{schemaPlan\.lookupClause\}/
);
assert.match(controllerSource, /columns:\s*schemaPlan\.columns/);
assert.match(controllerSource, /resolvedColumns:\s*schemaPlan\.resolvedColumns/);
assert.match(controllerSource, /pagination:\s*\{/);

console.log(JSON.stringify({
  success: true,
  vacationColumnsProjected: plan.columns.length,
  resolvedColumnsProjected: plan.resolvedColumns.length,
  lookupStrategy: "OUTER APPLY TOP (1)",
  collisionProtectionVerified: true,
  unavailableLookupFallbackVerified: true
}, null, 2));
