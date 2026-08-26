"use strict";

require("dotenv").config();

const { QueryTypes, Transaction } = require("sequelize");
const { sequelize } = require("../src/config/database");

const apply = process.argv.includes("--apply");

const targets = [
  {
    employeeId: 19246,
    employeeNumber: "310446",
    sourceDepartmentId: 1,
    targetDepartmentId: 4,
    expectedLineLevel: "Board Committee Member"
  },
  {
    employeeId: 19247,
    employeeNumber: "310447",
    sourceDepartmentId: 1,
    targetDepartmentId: 2,
    expectedLineLevel: "Board Committee Member"
  }
];

const employeeIds = targets.map((target) => target.employeeId);
const departmentIds = Array.from(
  new Set(
    targets.flatMap((target) => [
      target.sourceDepartmentId,
      target.targetDepartmentId
    ])
  )
);

const normalizeText = (value) => String(value ?? "").trim().toLowerCase();

const loadDepartments = (transaction) =>
  sequelize.query(
    `
      SELECT
        department.[Id] AS [departmentId],
        department.[AttachedNumber] AS [parentDepartmentId],
        department.[DepartmentName_English] AS [nameEnglish],
        department.[DepartmentName_Arabic] AS [nameArabic],
        department.[DepartmentType] AS [departmentType]
      FROM [dbo].[Departments] AS department
      WHERE department.[Id] IN (:departmentIds)
      ORDER BY department.[Id];
    `,
    {
      replacements: { departmentIds },
      type: QueryTypes.SELECT,
      raw: true,
      transaction
    }
  );

const loadEmployees = (transaction, lockRows = false) => {
  const lockHint = lockRows ? "WITH (UPDLOCK, HOLDLOCK)" : "";

  return sequelize.query(
    `
      SELECT
        employee.[ID_Employee] AS [employeeId],
        CONVERT(nvarchar(100), employee.[Ref_Employee]) AS [employeeNumber],
        employee.[EmployeeName_En] AS [nameEnglish],
        employee.[EmployeeName] AS [nameArabic],
        employee.[Department_Id] AS [departmentId],
        employee.[State] AS [state],
        position.[Id] AS [positionId],
        position.[Position_Number] AS [positionNumber],
        position.[Job_ID] AS [jobId],
        lineLevel.[EnglishDescription] AS [lineLevel],
        job.[Job_Name_EN] AS [jobEnglish],
        job.[Job_Name_AR] AS [jobArabic]
      FROM [dbo].[Employee] AS employee ${lockHint}
      LEFT JOIN [dbo].[Position] AS position
        ON position.[EmployeeId] = employee.[ID_Employee]
      LEFT JOIN [dbo].[LineLevel] AS lineLevel
        ON lineLevel.[Line_ID] = position.[LineLevelId]
      LEFT JOIN [dbo].[jobs] AS job
        ON job.[Job_ID] = position.[Job_ID]
      WHERE employee.[ID_Employee] IN (:employeeIds)
      ORDER BY employee.[ID_Employee], position.[Id];
    `,
    {
      replacements: { employeeIds },
      type: QueryTypes.SELECT,
      raw: true,
      transaction
    }
  );
};

const assertDepartments = (departments) => {
  if (departments.length !== departmentIds.length) {
    throw new Error(
      `Expected ${departmentIds.length} departments, found ${departments.length}`
    );
  }

  const departmentsById = new Map(
    departments.map((department) => [
      Number(department.departmentId),
      department
    ])
  );

  for (const target of targets) {
    const targetDepartment = departmentsById.get(target.targetDepartmentId);
    if (!targetDepartment) {
      throw new Error(
        `Target department ${target.targetDepartmentId} does not exist`
      );
    }

    if (Number(targetDepartment.parentDepartmentId) !== target.sourceDepartmentId) {
      throw new Error(
        `Department ${target.targetDepartmentId} is not attached to department ${target.sourceDepartmentId}`
      );
    }

    if (
      !normalizeText(targetDepartment.departmentType).includes("member")
    ) {
      throw new Error(
        `Department ${target.targetDepartmentId} is not classified as a member department`
      );
    }
  }
};

const assertEmployees = (employees) => {
  const rowsByEmployeeId = new Map();
  for (const row of employees) {
    const employeeId = Number(row.employeeId);
    const rows = rowsByEmployeeId.get(employeeId) ?? [];
    rows.push(row);
    rowsByEmployeeId.set(employeeId, rows);
  }

  for (const target of targets) {
    const rows = rowsByEmployeeId.get(target.employeeId) ?? [];
    if (rows.length !== 1) {
      throw new Error(
        `Employee ${target.employeeId} must have exactly one current position; found ${rows.length}`
      );
    }

    const row = rows[0];
    if (String(row.employeeNumber).trim() !== target.employeeNumber) {
      throw new Error(
        `Employee ${target.employeeId} has unexpected employee number ${row.employeeNumber}`
      );
    }

    const departmentId = Number(row.departmentId);
    if (
      departmentId !== target.sourceDepartmentId
      && departmentId !== target.targetDepartmentId
    ) {
      throw new Error(
        `Employee ${target.employeeId} has unexpected department ${row.departmentId}`
      );
    }

    if (
      normalizeText(row.lineLevel)
      !== normalizeText(target.expectedLineLevel)
    ) {
      throw new Error(
        `Employee ${target.employeeId} has unexpected line level ${row.lineLevel}`
      );
    }
  }
};

const verifyUniqueCommitteeLeaders = async (transaction) => {
  const rows = await sequelize.query(
    `
      SELECT
        employee.[Department_Id] AS [departmentId],
        COUNT_BIG(DISTINCT employee.[ID_Employee]) AS [leaderCount],
        MIN(employee.[ID_Employee]) AS [employeeId]
      FROM [dbo].[Employee] AS employee
      INNER JOIN [dbo].[Position] AS position
        ON position.[EmployeeId] = employee.[ID_Employee]
      INNER JOIN [dbo].[LineLevel] AS lineLevel
        ON lineLevel.[Line_ID] = position.[LineLevelId]
      WHERE employee.[Department_Id] IN (:targetDepartmentIds)
        AND lineLevel.[EnglishDescription]
          COLLATE Latin1_General_100_CI_AI = N'Board Committee Member'
        AND (
          TRY_CONVERT(int, employee.[State]) = 1
          OR LOWER(
            LTRIM(RTRIM(CONVERT(nvarchar(20), employee.[State])))
          ) COLLATE Latin1_General_100_CI_AI IN (N'true', N'active')
        )
      GROUP BY employee.[Department_Id]
      ORDER BY employee.[Department_Id];
    `,
    {
      replacements: {
        targetDepartmentIds: targets.map((target) => target.targetDepartmentId)
      },
      type: QueryTypes.SELECT,
      raw: true,
      transaction
    }
  );

  const rowsByDepartmentId = new Map(
    rows.map((row) => [Number(row.departmentId), row])
  );

  for (const target of targets) {
    const row = rowsByDepartmentId.get(target.targetDepartmentId);
    if (
      !row
      || Number(row.leaderCount) !== 1
      || Number(row.employeeId) !== target.employeeId
    ) {
      throw new Error(
        `Department ${target.targetDepartmentId} did not resolve uniquely to employee ${target.employeeId}`
      );
    }
  }
};

const main = async () => {
  await sequelize.authenticate();

  const departments = await loadDepartments();
  const employees = await loadEmployees();
  assertDepartments(departments);
  assertEmployees(employees);

  if (!apply) {
    console.log(
      JSON.stringify(
        {
          mode: "preflight",
          message: "Validation passed. No database changes were made.",
          departments,
          employees,
          plannedChanges: targets.map((target) => ({
            employeeId: target.employeeId,
            employeeNumber: target.employeeNumber,
            fromDepartmentId: target.sourceDepartmentId,
            toDepartmentId: target.targetDepartmentId
          }))
        },
        null,
        2
      )
    );
    return;
  }

  const result = await sequelize.transaction(
    { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
    async (transaction) => {
      const lockedEmployees = await loadEmployees(transaction, true);
      assertEmployees(lockedEmployees);

      const updateRows = await sequelize.query(
        `
          UPDATE employee
          SET employee.[Department_Id] = CASE employee.[ID_Employee]
            WHEN 19246 THEN 4
            WHEN 19247 THEN 2
            ELSE employee.[Department_Id]
          END
          OUTPUT
            INSERTED.[ID_Employee] AS [employeeId],
            CONVERT(nvarchar(100), INSERTED.[Ref_Employee])
              AS [employeeNumber],
            DELETED.[Department_Id] AS [previousDepartmentId],
            INSERTED.[Department_Id] AS [departmentId]
          FROM [dbo].[Employee] AS employee
          WHERE (
              employee.[ID_Employee] = 19246
              AND CONVERT(nvarchar(100), employee.[Ref_Employee]) = N'310446'
              AND employee.[Department_Id] IN (1, 4)
            )
            OR (
              employee.[ID_Employee] = 19247
              AND CONVERT(nvarchar(100), employee.[Ref_Employee]) = N'310447'
              AND employee.[Department_Id] IN (1, 2)
            );
        `,
        {
          type: QueryTypes.SELECT,
          raw: true,
          transaction
        }
      );

      if (updateRows.length !== targets.length) {
        throw new Error(
          `Expected to validate/update ${targets.length} employees; affected ${updateRows.length}`
        );
      }

      const updatedEmployees = await loadEmployees(transaction, false);
      assertEmployees(updatedEmployees);

      for (const target of targets) {
        const row = updatedEmployees.find(
          (employee) => Number(employee.employeeId) === target.employeeId
        );
        if (Number(row?.departmentId) !== target.targetDepartmentId) {
          throw new Error(
            `Employee ${target.employeeId} was not assigned to department ${target.targetDepartmentId}`
          );
        }
      }

      await verifyUniqueCommitteeLeaders(transaction);

      return { updateRows, updatedEmployees };
    }
  );

  console.log(
    JSON.stringify(
      {
        mode: "applied",
        message: "Committee member department assignments updated and verified.",
        ...result
      },
      null,
      2
    )
  );
};

main()
  .catch((error) => {
    console.error(
      "[committee-member-department-repair] Failed:",
      error instanceof Error ? error.message : String(error)
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => undefined);
  });
