SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
BEGIN TRANSACTION;

INSERT INTO [dbo].[TimeSheetCode] (
  [Code],
  [Code_Description]
)
SELECT
  seed.[Code],
  seed.[Code_Description]
FROM (VALUES
  (N'ANNUAL', N'Annual leave'),
  (N'MEDICAL', N'Medical leave'),
  (N'EMERGENCY', N'Emergency leave')
) AS seed(
  [Code],
  [Code_Description]
)
WHERE NOT EXISTS (
  SELECT 1
  FROM [dbo].[TimeSheetCode] AS existing
  WHERE existing.[Code] = seed.[Code]
);

WITH vacationSeed AS (
  SELECT *
  FROM (VALUES
    (N'1001', N'ANNUAL', CAST('2026-06-01' AS date), CAST('2026-06-10' AS date), CAST('2026-06-11' AS date), CAST(10.00 AS decimal(10,2)), CAST('2026-05-17T09:15:00' AS datetime2(0)), CAST(20.00 AS decimal(10,2)), N'Closed', N'Annual leave', CAST(10.00 AS decimal(10,2)), CAST(0.00 AS decimal(10,2))),
    (N'1001', N'ANNUAL', CAST('2025-12-21' AS date), CAST('2025-12-25' AS date), CAST('2025-12-28' AS date), CAST(5.00 AS decimal(10,2)), CAST('2025-12-03T11:30:00' AS datetime2(0)), CAST(30.00 AS decimal(10,2)), N'Closed', N'Annual leave', CAST(5.00 AS decimal(10,2)), CAST(2.00 AS decimal(10,2))),
    (N'1002', N'ANNUAL', CAST('2026-08-02' AS date), CAST('2026-08-13' AS date), CAST('2026-08-16' AS date), CAST(12.00 AS decimal(10,2)), CAST('2026-07-18T08:40:00' AS datetime2(0)), CAST(18.00 AS decimal(10,2)), N'Recorded', N'Annual leave', CAST(12.00 AS decimal(10,2)), CAST(2.00 AS decimal(10,2))),
    (N'1003', N'MEDICAL', CAST('2026-03-09' AS date), CAST('2026-03-11' AS date), CAST('2026-03-12' AS date), CAST(3.00 AS decimal(10,2)), CAST('2026-03-09T07:20:00' AS datetime2(0)), CAST(27.00 AS decimal(10,2)), N'Closed', N'Medical leave', CAST(3.00 AS decimal(10,2)), CAST(0.00 AS decimal(10,2))),
    (N'1004', N'ANNUAL', CAST('2026-07-26' AS date), CAST('2026-07-30' AS date), CAST('2026-08-02' AS date), CAST(5.00 AS decimal(10,2)), CAST('2026-07-19T13:05:00' AS datetime2(0)), CAST(13.00 AS decimal(10,2)), N'Recorded', N'Annual leave', CAST(5.00 AS decimal(10,2)), CAST(2.00 AS decimal(10,2))),
    (N'1005', N'EMERGENCY', CAST('2026-04-12' AS date), CAST('2026-04-12' AS date), CAST('2026-04-13' AS date), CAST(1.00 AS decimal(10,2)), CAST('2026-04-12T06:55:00' AS datetime2(0)), CAST(29.00 AS decimal(10,2)), N'Closed', N'Emergency leave', CAST(1.00 AS decimal(10,2)), CAST(0.00 AS decimal(10,2))),
    (N'1006', N'ANNUAL', CAST('2026-01-04' AS date), CAST('2026-01-22' AS date), CAST('2026-01-25' AS date), CAST(19.00 AS decimal(10,2)), CAST('2025-12-20T10:10:00' AS datetime2(0)), CAST(11.00 AS decimal(10,2)), N'Closed', N'Annual leave', CAST(19.00 AS decimal(10,2)), CAST(4.00 AS decimal(10,2))),
    (N'1007', N'MEDICAL', CAST('2026-05-05' AS date), CAST('2026-05-06' AS date), CAST('2026-05-07' AS date), CAST(2.00 AS decimal(10,2)), CAST('2026-05-05T08:05:00' AS datetime2(0)), CAST(28.00 AS decimal(10,2)), N'Closed', N'Medical leave', CAST(2.00 AS decimal(10,2)), CAST(0.00 AS decimal(10,2)))
  ) AS rows(
    [EmployeeNumber],
    [TimeSheetCode],
    [StartDate],
    [EndDate],
    [ReturnDate],
    [VacationDays],
    [CreatedDate],
    [RemainingBalance],
    [State],
    [Cause],
    [DeductedLeaveDays],
    [HolidayDays]
  )
)
INSERT INTO [dbo].[Vacation] (
  [ID_Employee],
  [Id_CodeTimeSheet],
  [VacationDate_Start],
  [VacationDate_End],
  [ReturnDate],
  [Num_VacationDays],
  [CreatedDate],
  [RemainingBalance],
  [State],
  [Cause],
  [DeductedLeaveDays],
  [HolidayDays]
)
SELECT
  seed.[EmployeeNumber],
  timeSheetCode.[ID],
  seed.[StartDate],
  seed.[EndDate],
  seed.[ReturnDate],
  seed.[VacationDays],
  seed.[CreatedDate],
  seed.[RemainingBalance],
  seed.[State],
  seed.[Cause],
  seed.[DeductedLeaveDays],
  seed.[HolidayDays]
FROM vacationSeed AS seed
INNER JOIN [dbo].[Employee] AS employee
  ON employee.[Ref_Employee] = seed.[EmployeeNumber]
CROSS APPLY (
  SELECT TOP (1) code.[ID]
  FROM [dbo].[TimeSheetCode] AS code
  WHERE code.[Code] = seed.[TimeSheetCode]
  ORDER BY code.[ID]
) AS timeSheetCode
WHERE NOT EXISTS (
  SELECT 1
  FROM [dbo].[Vacation] AS existing
  WHERE existing.[ID_Employee] = seed.[EmployeeNumber]
    AND existing.[VacationDate_Start] = seed.[StartDate]
    AND existing.[VacationDate_End] = seed.[EndDate]
    AND COALESCE(existing.[Id_CodeTimeSheet], -1) = timeSheetCode.[ID]
);

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
