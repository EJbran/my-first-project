"use strict";

const fs = require("fs");
const path = require("path");

const controllerPath = path.join(
  __dirname,
  "..",
  "src",
  "controllers",
  "HR",
  "employee.controller.ts"
);
const source = fs.readFileSync(controllerPath, "utf8");

const requiredAliases = [
  "ParentDepartmentId",
  "ParentDepartmentName_English",
  "ParentDepartmentName_Arabic",
  "ParentDepartmentType"
];

const assertContains = (sourceText, value, scope) => {
  if (!sourceText.includes(value)) {
    throw new Error(`${scope} is missing ${value}.`);
  }
};

const countOccurrences = (sourceText, value) =>
  sourceText.split(value).length - 1;

const getScope = (startMarker, endMarker) => {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`Could not find ${startMarker}.`);
  const end = endMarker ? source.indexOf(endMarker, start + startMarker.length) : source.length;
  if (end < 0) throw new Error(`Could not find ${endMarker}.`);
  return source.slice(start, end);
};

const hierarchyCte = getScope(
  "const departmentManagerHierarchyCte",
  "const hasDatabaseValue"
);
assertContains(hierarchyCte, "department.[AttachedNumber]", "Department hierarchy CTE");
assertContains(hierarchyCte, "FROM departmentAncestors", "Department hierarchy CTE");
assertContains(hierarchyCte, "CHARINDEX(", "Department hierarchy CTE cycle guard");
assertContains(hierarchyCte, "departmentAncestor.[AncestorDepth] < 63", "Department hierarchy CTE depth guard");
assertContains(hierarchyCte, "= N'manager'", "Department hierarchy CTE Manager rule");
assertContains(hierarchyCte, "ORDER BY departmentAncestor.[AncestorDepth]", "Nearest Manager selection");

const listSelect = getScope(
  "const buildEmployeeListSelectColumns",
  "const buildEmployeeListJoins"
);
const listJoins = getScope(
  "const buildEmployeeListJoins",
  "const buildEmployeeListQuery"
);
const searchQuery = getScope(
  "const buildEmployeeSearchQuery",
  "const buildVacantPositionSearchQuery"
);
const createQuery = getScope(
  "export const createEmployee",
  "type EmployeeUpdateResult"
);
const updateQuery = getScope(
  "export const updateEmployee",
  "export const deleteEmployee"
);
const profileQuery = getScope("export const getEmployeeById");

for (const alias of requiredAliases) {
  assertContains(listSelect, `quoteIdentifier("${alias}")`, "Employee list projection");
  assertContains(searchQuery, `"${alias}"`, "Paginated search projection");
  assertContains(createQuery, `AS [${alias}]`, "Employee create response");
  assertContains(updateQuery, `AS [${alias}]`, "Employee update response");
  assertContains(profileQuery, `AS [${alias}]`, "Employee profile response");
}

assertContains(
  listJoins,
  "parentDepartment.[AssignedDepartmentId] = department.[Id]",
  "Employee list parent department join"
);
assertContains(createQuery, "WITH ${departmentManagerHierarchyCte}", "Employee create query");
assertContains(updateQuery, "WITH ${departmentManagerHierarchyCte}", "Employee update query");
assertContains(profileQuery, "WITH ${departmentManagerHierarchyCte}", "Employee profile query");
assertContains(profileQuery, "OPTION (MAXRECURSION 64)", "Employee profile recursion guard");

const projectionList = searchQuery.slice(
  searchQuery.indexOf("const projectionAliases"),
  searchQuery.indexOf("const orderBy")
);
for (const alias of requiredAliases) {
  const count = countOccurrences(projectionList, `"${alias}"`);
  if (count !== 1) {
    throw new Error(`Paginated projection contains ${alias} ${count} times; expected once.`);
  }
}

console.log(
  JSON.stringify(
    {
      passed: true,
      hierarchyRule: "nearest Manager ancestor, including the assigned unit",
      cycleGuard: true,
      depthCap: 63,
      responsePaths: ["list", "search", "create", "update", "profile"],
      aliases: requiredAliases
    },
    null,
    2
  )
);
