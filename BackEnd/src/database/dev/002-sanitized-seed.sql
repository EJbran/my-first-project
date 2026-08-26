SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;

INSERT INTO [dbo].[Location] (
  [LocationName_ar], [LocationName_en], [LocationCode], [LocationInMap]
)
SELECT seed.[ArabicName], seed.[EnglishName], seed.[Code], NULL
FROM (VALUES
  (N'طرابلس', N'Tripoli Office', N'TRP'),
  (N'أمل', N'Amal Field', N'AML'),
  (N'السرير', N'Sarir Field', N'SRR'),
  (N'رأس لانوف', N'Ras Lanuf', N'RLF')
) AS seed([ArabicName], [EnglishName], [Code])
WHERE NOT EXISTS (
  SELECT 1 FROM [dbo].[Location] AS existing WHERE existing.[LocationCode] = seed.[Code]
);

INSERT INTO [dbo].[Departments] (
  [DepartmentName_Arabic], [DepartmentName_English], [DepartmentType],
  [AttachedNumber], [DepartmentAddress], [DepartmentPhone], [DepartmentExtenstion]
)
SELECT
  seed.[ArabicName], seed.[EnglishName], seed.[Type], NULL,
  N'Development database', N'000-0000', seed.[Extension]
FROM (VALUES
  (N'الموارد البشرية', N'Human Resources', N'Support', N'100'),
  (N'المالية', N'Finance', N'Support', N'200'),
  (N'تقنية المعلومات', N'Information Technology', N'Support', N'300'),
  (N'الصيانة', N'Maintenance', N'Operations', N'400'),
  (N'العمليات', N'Operations', N'Operations', N'500'),
  (N'الصحة والسلامة والبيئة', N'HSE', N'Assurance', N'600')
) AS seed([ArabicName], [EnglishName], [Type], [Extension])
WHERE NOT EXISTS (
  SELECT 1
  FROM [dbo].[Departments] AS existing
  WHERE existing.[DepartmentName_English] = seed.[EnglishName]
);

INSERT INTO [dbo].[jobs] (
  [Job_ID], [Job_Name_AR], [Job_Name_EN], [Job_Family], [Career_Level],
  [Role_Criticality], [Role_Purpose], [Key_Accountabilities],
  [Typical_Deliverables], [Minimum_Education_Benchmark],
  [Preferred_Qualifications], [Minimum_Experience_Benchmark],
  [Technical_Competencies], [Behavioral_Competencies],
  [HSE_Process_Safety_Accountabilities],
  [Mandatory_Training_Licences_Benchmark], [Applicable_Standards_Procedures],
  [Decision_Authority], [Supervisory_Scope], [Key_Interfaces],
  [Work_Environment_and_Schedule], [Physical_Medical_Fitness],
  [Competency_Assurance_Method], [KPI_Benchmark], [Required_Languages],
  [Language_Level_CEFR], [Job_Type], [Profile_Validation_Owner]
)
SELECT
  seed.[JobId], seed.[ArabicName], seed.[EnglishName], seed.[Family], seed.[Level],
  seed.[Criticality],
  CONCAT(N'Development role profile for ', seed.[EnglishName], N'.'),
  N'Plan assigned work; maintain accurate records; follow approved controls; communicate risks and progress; improve the work process.',
  N'Approved plans, controlled records, status reports, handovers and completed actions.',
  N'Relevant accredited qualification or equivalent demonstrated competence.',
  N'Role-relevant professional certification or equivalent advanced development.',
  N'Experience appropriate to the assigned scope and career level.',
  N'Role knowledge; data quality; safe execution; problem solving; controlled documentation.',
  N'Accountability; teamwork; communication; learning; attention to detail.',
  N'Apply company HSE and process-safety controls; stop and escalate unsafe work.',
  N'Company induction, HSE essentials and role-specific mandatory training.',
  N'Approved company policies, procedures, technical standards and controlled work instructions.',
  N'Make decisions within delegated authority and escalate exceptions to the accountable manager.',
  N'Scope depends on the approved position and may include assigned employees or contractors.',
  N'Functional management, peer departments, employees, suppliers and approved contractors.',
  N'Office or operational location according to the assigned position and work schedule.',
  N'Fitness appropriate to the assigned work environment and occupational-health requirements.',
  N'Qualification review, observed practice, work evidence and periodic performance assessment.',
  N'Safety, quality, delivery, compliance, data accuracy and agreed service performance.',
  N'Arabic and English as required by the role.',
  N'Role-dependent working proficiency benchmark.',
  seed.[JobType],
  N'Position Owner; HR Job Evaluation; Functional Authority'
FROM (VALUES
  (1, N'مستشار ثاني', N'Advisor II', N'General Professional Services', N'Senior Expert / Advisory', N'Review Required', N'Advisory — General Professional Services'),
  (2, N'مشرف مواد مخزن طرابلس', N'Tripoli Warehouse Materials Supervisor', N'Materials, Warehouse & Inventory', N'Frontline Management', N'Support-Critical', N'Supervisory — Materials, Warehouse & Inventory'),
  (3, N'محاسب ثاني', N'Accountant II', N'Finance & Accounting', N'Professional', N'Business-Critical', N'Professional — Finance & Accounting'),
  (4, N'أخصائي ميكانيكا ثاني', N'Mechanical Specialist II', N'Mechanical & General Maintenance', N'Professional', N'Safety-Critical', N'Professional — Mechanical & General Maintenance'),
  (5, N'كبير أخصائيين محاسبة', N'Senior Accounting Specialist', N'Finance & Accounting', N'Senior Professional / Technical', N'Business-Critical', N'Professional — Finance & Accounting'),
  (6, N'أخصائي توثيق أول', N'Documentation Specialist I', N'Records & Documentation', N'Professional', N'Support-Critical', N'Professional — Records & Documentation'),
  (7, N'كبير أخصائيين خدمات', N'Senior Services Specialist', N'Facilities & General Services', N'Senior Professional / Technical', N'Support-Critical', N'Professional — Facilities & General Services'),
  (8, N'كبير أخصائيين نظم حاسب آلي', N'Senior Computer Systems Specialist', N'IT, Systems & Software', N'Senior Professional / Technical', N'Business-Critical', N'Professional — IT, Systems & Software')
) AS seed(
  [JobId], [ArabicName], [EnglishName], [Family], [Level], [Criticality], [JobType]
)
WHERE NOT EXISTS (
  SELECT 1 FROM [dbo].[jobs] AS existing WHERE existing.[Job_ID] = seed.[JobId]
);

-- Upgrade records created by an earlier version of the synthetic seed without
-- overwriting any non-empty values subsequently edited through the application.
UPDATE [dbo].[jobs]
SET
  [Preferred_Qualifications] = CASE WHEN NULLIF(LTRIM(RTRIM([Preferred_Qualifications])), N'') IS NULL THEN N'Role-relevant professional certification or equivalent advanced development.' ELSE [Preferred_Qualifications] END,
  [HSE_Process_Safety_Accountabilities] = CASE WHEN NULLIF(LTRIM(RTRIM([HSE_Process_Safety_Accountabilities])), N'') IS NULL THEN N'Apply company HSE and process-safety controls; stop and escalate unsafe work.' ELSE [HSE_Process_Safety_Accountabilities] END,
  [Mandatory_Training_Licences_Benchmark] = CASE WHEN NULLIF(LTRIM(RTRIM([Mandatory_Training_Licences_Benchmark])), N'') IS NULL THEN N'Company induction, HSE essentials and role-specific mandatory training.' ELSE [Mandatory_Training_Licences_Benchmark] END,
  [Applicable_Standards_Procedures] = CASE WHEN NULLIF(LTRIM(RTRIM([Applicable_Standards_Procedures])), N'') IS NULL THEN N'Approved company policies, procedures, technical standards and controlled work instructions.' ELSE [Applicable_Standards_Procedures] END,
  [Decision_Authority] = CASE WHEN NULLIF(LTRIM(RTRIM([Decision_Authority])), N'') IS NULL THEN N'Make decisions within delegated authority and escalate exceptions to the accountable manager.' ELSE [Decision_Authority] END,
  [Supervisory_Scope] = CASE WHEN NULLIF(LTRIM(RTRIM([Supervisory_Scope])), N'') IS NULL THEN N'Scope depends on the approved position and may include assigned employees or contractors.' ELSE [Supervisory_Scope] END,
  [Key_Interfaces] = CASE WHEN NULLIF(LTRIM(RTRIM([Key_Interfaces])), N'') IS NULL THEN N'Functional management, peer departments, employees, suppliers and approved contractors.' ELSE [Key_Interfaces] END,
  [Work_Environment_and_Schedule] = CASE WHEN NULLIF(LTRIM(RTRIM([Work_Environment_and_Schedule])), N'') IS NULL THEN N'Office or operational location according to the assigned position and work schedule.' ELSE [Work_Environment_and_Schedule] END,
  [Physical_Medical_Fitness] = CASE WHEN NULLIF(LTRIM(RTRIM([Physical_Medical_Fitness])), N'') IS NULL THEN N'Fitness appropriate to the assigned work environment and occupational-health requirements.' ELSE [Physical_Medical_Fitness] END,
  [Competency_Assurance_Method] = CASE WHEN NULLIF(LTRIM(RTRIM([Competency_Assurance_Method])), N'') IS NULL THEN N'Qualification review, observed practice, work evidence and periodic performance assessment.' ELSE [Competency_Assurance_Method] END,
  [KPI_Benchmark] = CASE WHEN NULLIF(LTRIM(RTRIM([KPI_Benchmark])), N'') IS NULL THEN N'Safety, quality, delivery, compliance, data accuracy and agreed service performance.' ELSE [KPI_Benchmark] END,
  [Required_Languages] = CASE WHEN NULLIF(LTRIM(RTRIM([Required_Languages])), N'') IS NULL THEN N'Arabic and English as required by the role.' ELSE [Required_Languages] END,
  [Language_Level_CEFR] = CASE WHEN NULLIF(LTRIM(RTRIM([Language_Level_CEFR])), N'') IS NULL THEN N'Role-dependent working proficiency benchmark.' ELSE [Language_Level_CEFR] END
WHERE [Job_ID] BETWEEN 1 AND 8;

WITH employeeSeed AS (
  SELECT *
  FROM (VALUES
    (N'1001', N'موظف تجريبي 001', N'Dev Employee 001', N'Male',   CAST('1988-03-14' AS date), CAST(1 AS bit), N'Permanent', CAST('2021-07-05' AS date), CAST(NULL AS date), N'Staff', N'Human Resources', N'TRP', N'Libyan', N'Tripoli', N'Tripoli', N'Grade 11', N'DEV-FIN-1001'),
    (N'1002', N'موظفة تجريبية 002', N'Dev Employee 002', N'Female', CAST('1985-09-22' AS date), CAST(1 AS bit), N'Permanent', CAST('2016-07-18' AS date), CAST(NULL AS date), N'Staff', N'Finance', N'TRP', N'Libyan', N'Misrata', N'Misrata', N'Grade 12', N'DEV-FIN-1002'),
    (N'1003', N'موظف تجريبي 003', N'Dev Employee 003', N'Male',   CAST('1979-12-09' AS date), CAST(1 AS bit), N'Permanent', CAST('2011-07-22' AS date), CAST(NULL AS date), N'Supervisor', N'Maintenance', N'AML', N'Libyan', N'Benghazi', N'Benghazi', N'Grade 14', N'DEV-FIN-1003'),
    (N'1004', N'موظفة تجريبية 004', N'Dev Employee 004', N'Female', CAST('1994-06-03' AS date), CAST(1 AS bit), N'Annual', CAST('2024-01-10' AS date), CAST('2027-01-09' AS date), N'Staff', N'Information Technology', N'TRP', N'Libyan', N'Tripoli', N'Tripoli', N'Grade 10', N'DEV-FIN-1004'),
    (N'1005', N'موظف تجريبي 005', N'Dev Employee 005', N'Male',   CAST('1991-01-26' AS date), CAST(1 AS bit), N'Permanent', CAST('2018-05-01' AS date), CAST(NULL AS date), N'Staff', N'Finance', N'TRP', N'Libyan', N'Zawiya', N'Zawiya', N'Grade 12', N'DEV-FIN-1005'),
    (N'1006', N'موظف تجريبي 006', N'Dev Employee 006', N'Male',   CAST('1982-11-11' AS date), CAST(1 AS bit), N'Permanent', CAST('2009-02-15' AS date), CAST(NULL AS date), N'Supervisor', N'Operations', N'SRR', N'Libyan', N'Ajdabiya', N'Ajdabiya', N'Grade 15', N'DEV-FIN-1006'),
    (N'1007', N'موظفة تجريبية 007', N'Dev Employee 007', N'Female', CAST('1997-04-17' AS date), CAST(1 AS bit), N'Annual', CAST('2025-03-02' AS date), CAST('2027-03-01' AS date), N'Staff', N'HSE', N'RLF', N'Libyan', N'Sirte', N'Sirte', N'Grade 9', N'DEV-FIN-1007'),
    (N'1008', N'موظف تجريبي 008', N'Dev Employee 008', N'Male',   CAST('1975-08-28' AS date), CAST(1 AS bit), N'Permanent', CAST('1999-10-20' AS date), CAST(NULL AS date), N'Manager', N'Operations', N'AML', N'Libyan', N'Derna', N'Derna', N'Grade 16', N'DEV-FIN-1008'),
    (N'1009', N'موظفة تجريبية 009', N'Dev Employee 009', N'Female', CAST('1989-02-07' AS date), CAST(1 AS bit), N'Permanent', CAST('2014-09-01' AS date), CAST(NULL AS date), N'Staff', N'Human Resources', N'TRP', N'Libyan', N'Tripoli', N'Tripoli', N'Grade 12', N'DEV-FIN-1009'),
    (N'1010', N'موظف تجريبي 010', N'Dev Employee 010', N'Male',   CAST('1999-10-30' AS date), CAST(1 AS bit), N'Training', CAST('2026-02-01' AS date), CAST('2027-01-31' AS date), N'Trainee', N'Information Technology', N'TRP', N'Libyan', N'Sabha', N'Sabha', N'Grade 8', N'DEV-FIN-1010'),
    (N'1011', N'موظفة تجريبية 011', N'Dev Employee 011', N'Female', CAST('1980-05-12' AS date), CAST(1 AS bit), N'Permanent', CAST('2004-06-13' AS date), CAST(NULL AS date), N'Supervisor', N'Maintenance', N'SRR', N'Libyan', N'Benghazi', N'Benghazi', N'Grade 14', N'DEV-FIN-1011'),
    (N'1012', N'موظف تجريبي 012', N'Dev Employee 012', N'Male',   CAST('1968-07-19' AS date), CAST(0 AS bit), N'Permanent', CAST('1993-04-25' AS date), CAST('2026-06-30' AS date), N'Staff', N'Finance', N'TRP', N'Libyan', N'Tripoli', N'Tripoli', N'Grade 13', N'DEV-FIN-1012')
  ) AS rows(
    [EmployeeNumber], [ArabicName], [EnglishName], [Gender], [BirthDate], [State],
    [ContractType], [ContractStart], [ContractEnd], [EmployeeType], [DepartmentName],
    [LocationCode], [Nationality], [PlaceOfBirth], [FamilyBookIssuer], [Degree], [FinanceNumber]
  )
)
INSERT INTO [dbo].[Employee] (
  [Ref_Employee], [EmployeeName], [EmployeeName_En], [Gender], [DateOFBirth],
  [Phone], [Email], [State], [Contract_Type], [Start_of_Contract], [End_of_contrat],
  [Type_Employee], [Department_Id], [Location_Id], [Nationality], [PlaceOFBirth],
  [FamilyBook_Issuer], [Degree_Employee], [Finance_Num], [YearSuppliment_YEAR],
  [YearSuppliment_MONTH], [Year_suppliment_Day], [Percent_takrim], [Stop_takrim]
)
SELECT
  seed.[EmployeeNumber], seed.[ArabicName], seed.[EnglishName], seed.[Gender], seed.[BirthDate],
  CONCAT(N'091-000-', seed.[EmployeeNumber]), CONCAT(N'dev.', seed.[EmployeeNumber], N'@example.test'),
  seed.[State], seed.[ContractType], seed.[ContractStart], seed.[ContractEnd], seed.[EmployeeType],
  department.[Id], location.[ID_Location], seed.[Nationality], seed.[PlaceOfBirth],
  seed.[FamilyBookIssuer], seed.[Degree], seed.[FinanceNumber], 0, 0, 0, 100, 0
FROM employeeSeed AS seed
INNER JOIN [dbo].[Departments] AS department
  ON department.[DepartmentName_English] = seed.[DepartmentName]
INNER JOIN [dbo].[Location] AS location
  ON location.[LocationCode] = seed.[LocationCode]
WHERE NOT EXISTS (
  SELECT 1
  FROM [dbo].[Employee] AS existing
  WHERE existing.[Ref_Employee] = seed.[EmployeeNumber]
);

WITH positionSeed AS (
  SELECT *
  FROM (VALUES
    (CAST(900001 AS bigint), N'Permanent', N'Professional', N'Grade 11', N'Active', CAST(1 AS int), N'1001'),
    (CAST(900002 AS bigint), N'Permanent', N'Frontline Management', N'Grade 14', N'Active', CAST(2 AS int), N'1003'),
    (CAST(900003 AS bigint), N'Permanent', N'Professional', N'Grade 12', N'Active', CAST(3 AS int), N'1002'),
    (CAST(900004 AS bigint), N'Permanent', N'Professional', N'Grade 13', N'Active', CAST(4 AS int), N'1011'),
    (CAST(900005 AS bigint), N'Permanent', N'Senior Professional', N'Grade 13', N'Active', CAST(5 AS int), N'1005'),
    (CAST(900006 AS bigint), N'Permanent', N'Professional', N'Grade 11', N'Active', CAST(6 AS int), N'1009'),
    (CAST(900007 AS bigint), N'Permanent', N'Senior Professional', N'Grade 13', N'Active', CAST(7 AS int), N'1006'),
    (CAST(900008 AS bigint), N'Permanent', N'Senior Professional', N'Grade 13', N'Active', CAST(8 AS int), N'1004'),
    (CAST(900009 AS bigint), N'Permanent', N'Professional', N'Grade 10', N'Active', CAST(6 AS int), N'1007'),
    (CAST(900010 AS bigint), N'Training', N'Entry', N'Grade 8', N'Active', CAST(8 AS int), N'1010'),
    (CAST(900011 AS bigint), N'Permanent', N'Management', N'Grade 16', N'Active', CAST(1 AS int), N'1008'),
    (CAST(900012 AS bigint), N'Permanent', N'Professional', N'Grade 13', N'Active', CAST(3 AS int), CAST(NULL AS nvarchar(50))),
    (CAST(900013 AS bigint), N'Permanent', N'Professional', N'Grade 12', N'Active', CAST(3 AS int), CAST(NULL AS nvarchar(50))),
    (CAST(900014 AS bigint), N'Permanent', N'Professional', N'Grade 13', N'Active', CAST(4 AS int), CAST(NULL AS nvarchar(50))),
    (CAST(900015 AS bigint), N'Permanent', N'Professional', N'Grade 10', N'Active', CAST(NULL AS int), CAST(NULL AS nvarchar(50)))
  ) AS rows(
    [PositionNumber], [PositionType], [PositionLevel], [PositionDegree], [Status], [JobId], [EmployeeNumber]
  )
)
INSERT INTO [dbo].[Position] (
  [Position_Number], [Position_Type], [PositionLevel], [Position_Degree],
  [Position_DateCreation], [Status], [Job_ID], [EmployeeId]
)
SELECT
  seed.[PositionNumber], seed.[PositionType], seed.[PositionLevel], seed.[PositionDegree],
  CONVERT(date, GETDATE()), seed.[Status], seed.[JobId], employee.[ID_Employee]
FROM positionSeed AS seed
LEFT JOIN [dbo].[Employee] AS employee
  ON employee.[Ref_Employee] = seed.[EmployeeNumber]
WHERE NOT EXISTS (
  SELECT 1
  FROM [dbo].[Position] AS existing
  WHERE existing.[Position_Number] = seed.[PositionNumber]
);

-- Archived employees do not occupy positions in the current-state model.
UPDATE position
SET position.[EmployeeId] = NULL,
    position.[Status] = N'Active'
FROM [dbo].[Position] AS position
INNER JOIN [dbo].[Employee] AS employee
  ON employee.[ID_Employee] = position.[EmployeeId]
WHERE position.[Position_Number] = 900012
  AND employee.[Ref_Employee] = N'1012'
  AND employee.[State] = 0;

COMMIT TRANSACTION;
