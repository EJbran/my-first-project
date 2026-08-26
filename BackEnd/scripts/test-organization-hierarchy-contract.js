"use strict";

require("dotenv").config();
require("ts-node/register/transpile-only");

const fs = require("node:fs");
const path = require("node:path");
const {
  assembleOrganizationHierarchy,
  parseOrganizationHierarchyQuery
} = require("../src/controllers/HR/organization.controller");

const backendRoot = path.resolve(__dirname, "..");
const controllerSource = fs.readFileSync(
  path.join(
    backendRoot,
    "src",
    "controllers",
    "HR",
    "organization.controller.ts"
  ),
  "utf8"
);
const routeSource = fs.readFileSync(
  path.join(
    backendRoot,
    "src",
    "routes",
    "HR",
    "organization.routes.ts"
  ),
  "utf8"
);
const serverSource = fs.readFileSync(
  path.join(backendRoot, "src", "server.js"),
  "utf8"
);

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const findNode = (result, departmentId) =>
  result.nodes.find((node) => node.departmentId === departmentId);

const defaultQuery = parseOrganizationHierarchyQuery(undefined);
assert(defaultQuery.success, "Default hierarchy query should be valid.");
assert(defaultQuery.rootId === null, "Default rootId should include configured roots.");
assert(defaultQuery.maxDepth === 8, "Default maxDepth should be 8.");

const explicitQuery = parseOrganizationHierarchyQuery({
  rootId: "1",
  maxDepth: "0"
});
assert(explicitQuery.success, "Explicit valid hierarchy query should pass.");
assert(explicitQuery.rootId === 1, "Explicit rootId was not parsed.");
assert(explicitQuery.maxDepth === 0, "maxDepth=0 should be supported.");

for (const query of [
  { rootId: "0" },
  { rootId: "-1" },
  { rootId: "1.5" },
  { rootId: ["1"] },
  { maxDepth: "-1" },
  { maxDepth: "64" },
  { maxDepth: "1.5" },
  { maxDepth: ["4"] }
]) {
  assert(
    !parseOrganizationHierarchyQuery(query).success,
    `Invalid hierarchy query was accepted: ${JSON.stringify(query)}`
  );
}

const departments = [
  {
    DepartmentId: 10,
    ParentDepartmentId: null,
    DepartmentNameEnglish: "Chairman Office",
    DepartmentNameArabic: null,
    DepartmentType: "Top Management"
  },
  {
    DepartmentId: 5,
    ParentDepartmentId: 0,
    DepartmentNameEnglish: "Unsupported Root",
    DepartmentNameArabic: null,
    DepartmentType: "Other"
  },
  {
    DepartmentId: 20,
    ParentDepartmentId: 10,
    DepartmentNameEnglish: "IT",
    DepartmentNameArabic: null,
    DepartmentType: "Department"
  },
  {
    DepartmentId: 30,
    ParentDepartmentId: 20,
    DepartmentNameEnglish: "Systems",
    DepartmentNameArabic: null,
    DepartmentType: "Section"
  },
  {
    DepartmentId: 40,
    ParentDepartmentId: 30,
    DepartmentNameEnglish: "Support",
    DepartmentNameArabic: null,
    DepartmentType: "Unit"
  },
  {
    DepartmentId: 50,
    ParentDepartmentId: 999,
    DepartmentNameEnglish: "Direct Orphan",
    DepartmentNameArabic: null,
    DepartmentType: "Coordinator"
  },
  {
    DepartmentId: 60,
    ParentDepartmentId: 50,
    DepartmentNameEnglish: "Orphan Descendant",
    DepartmentNameArabic: null,
    DepartmentType: "Department"
  },
  {
    DepartmentId: 70,
    ParentDepartmentId: 71,
    DepartmentNameEnglish: "Cycle A",
    DepartmentNameArabic: null,
    DepartmentType: "Division"
  },
  {
    DepartmentId: 71,
    ParentDepartmentId: 70,
    DepartmentNameEnglish: "Cycle B",
    DepartmentNameArabic: null,
    DepartmentType: "Division"
  }
];

const employeeCounts = [
  {
    DepartmentId: 20,
    DirectEmployeeCount: "3",
    ActiveEmployeeCount: "2"
  }
];

const candidate = (overrides) => ({
  DepartmentId: 10,
  EmployeeId: 100,
  EmployeeNumber: "E-100",
  DisplayName: "Leader 100",
  NameEnglish: "Leader 100",
  NameArabic: null,
  TitleEnglish: "Chairman",
  TitleArabic: null,
  LineLevelEnglish: "Board Committee Chairman",
  LineLevelSort: 100,
  PositionId: 1,
  PositionDateCreation: "2025-01-01T00:00:00.000Z",
  PositionStatus: "Active",
  ...overrides
});

const candidates = [
  candidate({
    TitleEnglish: "Exact but inactive",
    PositionId: 1,
    PositionStatus: "Inactive",
    PositionDateCreation: "2026-01-01T00:00:00.000Z"
  }),
  candidate({
    TitleEnglish: "Non-exact but active",
    LineLevelEnglish: "Department Manager",
    LineLevelSort: 500,
    PositionId: 2,
    PositionStatus: "Active",
    PositionDateCreation: "2026-02-01T00:00:00.000Z"
  }),
  candidate({
    TitleEnglish: "Exact active dated",
    PositionId: 3,
    PositionStatus: "Active",
    PositionDateCreation: "2024-01-01T00:00:00.000Z"
  }),
  candidate({
    TitleEnglish: "Exact active null date",
    PositionId: 999,
    PositionStatus: "Active",
    PositionDateCreation: null
  }),
  candidate({
    EmployeeId: 101,
    EmployeeNumber: "E-101",
    DisplayName: "Candidate 101",
    LineLevelEnglish: "Department Manager"
  }),
  candidate({
    DepartmentId: 20,
    EmployeeId: 200,
    EmployeeNumber: "E-200",
    DisplayName: "Manager 200",
    LineLevelEnglish: "Department Manager",
    TitleEnglish: null
  }),
  candidate({
    DepartmentId: 20,
    EmployeeId: 201,
    EmployeeNumber: "E-201",
    DisplayName: "Manager 201",
    LineLevelEnglish: "department manager",
    PositionStatus: "Inactive"
  }),
  candidate({
    DepartmentId: 5,
    EmployeeId: 500,
    EmployeeNumber: "E-500",
    DisplayName: "Unsupported Candidate",
    LineLevelEnglish: "Department Manager"
  }),
  candidate({
    DepartmentId: 40,
    EmployeeId: 400,
    EmployeeNumber: "E-400",
    DisplayName: "Unit Supervisor",
    LineLevelEnglish: "Unit Supervisor",
    TitleEnglish: "Lower position ID",
    PositionId: 4,
    PositionDateCreation: null
  }),
  candidate({
    DepartmentId: 40,
    EmployeeId: 400,
    EmployeeNumber: "E-400",
    DisplayName: "Unit Supervisor",
    LineLevelEnglish: "Unit Supervisor",
    TitleEnglish: "Higher position ID",
    PositionId: 5,
    PositionDateCreation: null
  })
];

const fullResult = assembleOrganizationHierarchy(
  departments,
  employeeCounts,
  candidates,
  {
    rootId: null,
    maxDepth: 8
  }
);
assert(fullResult, "Default hierarchy assembly unexpectedly failed.");
assert(
  JSON.stringify(fullResult.meta.rootDepartmentIds) === JSON.stringify([5, 10]),
  "Root ordering or default-root selection changed."
);
assert(
  JSON.stringify(fullResult.nodes.map((node) => node.departmentId))
    === JSON.stringify([5, 10, 20, 30, 40]),
  "Hierarchy ordering or orphan exclusion changed."
);
assert(
  JSON.stringify(fullResult.meta.orphanDepartmentIds) === JSON.stringify([50]),
  "Only direct broken-parent departments should be reported as orphans."
);
assert(fullResult.meta.nodeCount === 5, "Default node count is incorrect.");
assert(!fullResult.meta.truncatedByMaxDepth, "Full hierarchy should not be truncated.");

const chairman = findNode(fullResult, 10);
assert(chairman.leaderStatus === "resolved", "Chairman should resolve.");
assert(chairman.leadershipCandidateCount === 2, "Candidates must be deduped by employee.");
assert(chairman.exactCandidateCount === 1, "Multiple positions for one employee are not ambiguity.");
assert(chairman.leader.employeeId === 100, "Wrong chairman employee resolved.");
assert(
  chairman.leader.titleEnglish === "Exact active dated",
  "Position ordering must be exact, active, sort, non-null/latest date, then ID."
);

const department = findNode(fullResult, 20);
assert(department.directEmployeeCount === 3, "Direct employee count was not preserved.");
assert(department.activeEmployeeCount === 2, "Active employee count was not preserved.");
assert(department.childDepartmentCount === 1, "Raw direct child count is incorrect.");
assert(department.leaderStatus === "ambiguous", "Two exact employees must be ambiguous.");
assert(department.exactCandidateCount === 2, "Exact candidate count is incorrect.");
assert(department.leader === null, "Ambiguous nodes must not expose a leader.");

const unsupported = findNode(fullResult, 5);
assert(unsupported.leaderStatus === "unsupported-type", "Unsupported type status changed.");
assert(unsupported.leadershipCandidateCount === 1, "Unsupported candidates should still be counted.");
assert(unsupported.exactCandidateCount === 0, "Unsupported type cannot have exact candidates.");

const section = findNode(fullResult, 30);
assert(section.leaderStatus === "unassigned", "Supported node without leader must be unassigned.");

const unit = findNode(fullResult, 40);
assert(unit.leaderStatus === "resolved", "Unit supervisor should resolve.");
assert(
  unit.leader.titleEnglish === "Higher position ID",
  "Position ID must break ties when both creation dates are null."
);

const shallowResult = assembleOrganizationHierarchy(
  departments,
  employeeCounts,
  candidates,
  {
    rootId: 20,
    maxDepth: 0
  }
);
assert(shallowResult.nodes.length === 1, "maxDepth=0 must return only the explicit root.");
assert(shallowResult.nodes[0].parentDepartmentId === 10, "Explicit root must retain its parent ID.");
assert(shallowResult.nodes[0].childDepartmentCount === 1, "Child count must not be depth-filtered.");
assert(shallowResult.meta.truncatedByMaxDepth, "Boundary child should mark result truncated.");
assert(
  JSON.stringify(shallowResult.meta.orphanDepartmentIds) === JSON.stringify([50]),
  "Orphan metadata must stay global for subtree requests."
);

const cycleResult = assembleOrganizationHierarchy(
  departments,
  [],
  [],
  {
    rootId: 70,
    maxDepth: 63
  }
);
assert(
  JSON.stringify(cycleResult.nodes.map((node) => node.departmentId))
    === JSON.stringify([70, 71]),
  "Cycle-safe traversal must emit each path node once and terminate."
);

assert(
  assembleOrganizationHierarchy(departments, [], [], {
    rootId: 404,
    maxDepth: 8
  }) === null,
  "Missing explicit root must be reported to the controller."
);

for (const requiredSource of [
  "await Promise.all([",
  "FROM [dbo].[Departments] AS department",
  "GROUP BY employee.[Department_Id]",
  "INNER JOIN [dbo].[Position] AS position",
  "INNER JOIN [dbo].[LineLevel] AS lineLevel",
  "LEFT JOIN [dbo].[jobs] AS job",
  "assembleOrganizationHierarchy("
]) {
  assert(
    controllerSource.includes(requiredSource),
    `Optimized hierarchy source is missing: ${requiredSource}`
  );
}
assert(
  !controllerSource.includes("WITH departmentTree"),
  "Recursive department CTE should not be used by the optimized endpoint."
);
assert(
  !controllerSource.includes("OPTION (MAXRECURSION"),
  "MAXRECURSION should not be needed after TypeScript traversal."
);
assert(
  routeSource.includes('"/api/organization/hierarchy"'),
  "Organization hierarchy route path is missing."
);
assert(
  routeSource.includes("authenticate,"),
  "Organization hierarchy route must be authenticated."
);
assert(
  serverSource.includes("app.use(organizationRoutes)"),
  "Organization hierarchy routes are not registered in server.js."
);

console.log(
  JSON.stringify(
    {
      passed: true,
      endpoint: "GET /api/organization/hierarchy",
      authenticated: true,
      defaultMaxDepth: defaultQuery.maxDepth,
      strategy: "three parallel flat queries plus TypeScript assembly",
      pureAssemblyCases: {
        rootsAndOrdering: true,
        depthBoundary: true,
        globalOrphans: true,
        cycleSafety: true,
        leaderResolution: true
      }
    },
    null,
    2
  )
);
