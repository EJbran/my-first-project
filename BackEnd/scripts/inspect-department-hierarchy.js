"use strict";

require("dotenv").config();

const { QueryTypes } = require("sequelize");
const { sequelize } = require("../src/config/database");

async function main() {
  const [summaryRows, typeRows, sampleRows, employeeRows] = await Promise.all([
    sequelize.query(
      `
        SELECT
          COUNT_BIG(*) AS [totalDepartments],
          SUM(CASE WHEN department.[AttachedNumber] IS NULL THEN 1 ELSE 0 END)
            AS [withoutAttachedNumber],
          SUM(CASE WHEN parentDepartment.[Id] IS NOT NULL THEN 1 ELSE 0 END)
            AS [attachedNumberMatchesDepartment]
        FROM [dbo].[Departments] AS department
        LEFT JOIN [dbo].[Departments] AS parentDepartment
          ON parentDepartment.[Id] = department.[AttachedNumber];
      `,
      { type: QueryTypes.SELECT, raw: true }
    ),
    sequelize.query(
      `
        SELECT
          department.[DepartmentType],
          COUNT_BIG(*) AS [rowCount],
          SUM(CASE WHEN department.[AttachedNumber] IS NULL THEN 1 ELSE 0 END)
            AS [withoutAttachedNumber],
          SUM(CASE WHEN parentDepartment.[Id] IS NOT NULL THEN 1 ELSE 0 END)
            AS [withMatchedParent]
        FROM [dbo].[Departments] AS department
        LEFT JOIN [dbo].[Departments] AS parentDepartment
          ON parentDepartment.[Id] = department.[AttachedNumber]
        GROUP BY department.[DepartmentType]
        ORDER BY [rowCount] DESC;
      `,
      { type: QueryTypes.SELECT, raw: true }
    ),
    sequelize.query(
      `
        SELECT TOP (100)
          department.[Id] AS [assignedUnitId],
          department.[DepartmentName_English] AS [assignedUnitNameEnglish],
          department.[DepartmentName_Arabic] AS [assignedUnitNameArabic],
          department.[DepartmentType] AS [assignedUnitType],
          department.[AttachedNumber],
          parentDepartment.[Id] AS [immediateParentId],
          parentDepartment.[DepartmentName_English] AS [immediateParentNameEnglish],
          parentDepartment.[DepartmentName_Arabic] AS [immediateParentNameArabic],
          parentDepartment.[DepartmentType] AS [immediateParentType],
          parentDepartment.[AttachedNumber] AS [parentAttachedNumber]
        FROM [dbo].[Departments] AS department
        LEFT JOIN [dbo].[Departments] AS parentDepartment
          ON parentDepartment.[Id] = department.[AttachedNumber]
        WHERE department.[AttachedNumber] IS NOT NULL
        ORDER BY
          CASE WHEN parentDepartment.[Id] IS NULL THEN 0 ELSE 1 END,
          department.[AttachedNumber],
          department.[Id];
      `,
      { type: QueryTypes.SELECT, raw: true }
    ),
    sequelize.query(
      `
        SELECT TOP (50)
          employee.[ID_Employee] AS [employeeId],
          employee.[Ref_Employee] AS [employeeNumber],
          COALESCE(employee.[EmployeeName_En], employee.[EmployeeName])
            AS [employeeName],
          department.[Id] AS [assignedUnitId],
          department.[DepartmentName_English] AS [assignedUnitNameEnglish],
          department.[DepartmentType] AS [assignedUnitType],
          department.[AttachedNumber],
          parentDepartment.[Id] AS [immediateParentId],
          parentDepartment.[DepartmentName_English] AS [immediateParentNameEnglish],
          parentDepartment.[DepartmentType] AS [immediateParentType]
        FROM [dbo].[Employee] AS employee
        INNER JOIN [dbo].[Departments] AS department
          ON department.[Id] = employee.[Department_Id]
        LEFT JOIN [dbo].[Departments] AS parentDepartment
          ON parentDepartment.[Id] = department.[AttachedNumber]
        WHERE department.[AttachedNumber] IS NOT NULL
        ORDER BY employee.[Ref_Employee], employee.[ID_Employee];
      `,
      { type: QueryTypes.SELECT, raw: true }
    )
  ]);

  console.log(
    JSON.stringify(
      {
        summary: summaryRows[0],
        departmentTypes: typeRows,
        hierarchySamples: sampleRows,
        employeeSamples: employeeRows
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(
      "[department-hierarchy-inspect] Failed:",
      error instanceof Error ? error.message : error
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => undefined);
  });
