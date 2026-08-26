SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
BEGIN TRANSACTION;

WITH lineLevelSeed AS (
  SELECT *
  FROM (VALUES
    (CAST(2 AS int), CAST(6 AS int), N'رئيس لجنة الإدارة', N'Board Committee Chairman'),
    (CAST(3 AS int), CAST(5 AS int), N'عضو لجنة إدارة', N'Board Committee Member'),
    (CAST(4 AS int), CAST(4 AS int), N'مدير إدارة', N'Department Manager'),
    (CAST(5 AS int), CAST(3 AS int), N'مراقب', N'Supervisor'),
    (CAST(6 AS int), CAST(2 AS int), N'منسق', N'Coordinator'),
    (CAST(7 AS int), CAST(1 AS int), N'رئيس قسم', N'Section Head'),
    (CAST(8 AS int), CAST(0 AS int), N'مشرف وحدة', N'Unit Supervisor'),
    (CAST(9 AS int), CAST(-1 AS int), N'', N'Employee')
  ) AS rows(
    [Line_ID], [SortLine], [ArabicDescription], [EnglishDescription]
  )
)
UPDATE lineLevel
SET
  lineLevel.[SortLine] = seed.[SortLine],
  lineLevel.[ArabicDescription] = seed.[ArabicDescription],
  lineLevel.[EnglishDescription] = seed.[EnglishDescription]
FROM [dbo].[LineLevel] AS lineLevel
INNER JOIN lineLevelSeed AS seed
  ON seed.[Line_ID] = lineLevel.[Line_ID];

WITH lineLevelSeed AS (
  SELECT *
  FROM (VALUES
    (CAST(2 AS int), CAST(6 AS int), N'رئيس لجنة الإدارة', N'Board Committee Chairman'),
    (CAST(3 AS int), CAST(5 AS int), N'عضو لجنة إدارة', N'Board Committee Member'),
    (CAST(4 AS int), CAST(4 AS int), N'مدير إدارة', N'Department Manager'),
    (CAST(5 AS int), CAST(3 AS int), N'مراقب', N'Supervisor'),
    (CAST(6 AS int), CAST(2 AS int), N'منسق', N'Coordinator'),
    (CAST(7 AS int), CAST(1 AS int), N'رئيس قسم', N'Section Head'),
    (CAST(8 AS int), CAST(0 AS int), N'مشرف وحدة', N'Unit Supervisor'),
    (CAST(9 AS int), CAST(-1 AS int), N'', N'Employee')
  ) AS rows(
    [Line_ID], [SortLine], [ArabicDescription], [EnglishDescription]
  )
)
INSERT INTO [dbo].[LineLevel] (
  [Line_ID], [SortLine], [ArabicDescription], [EnglishDescription]
)
SELECT
  seed.[Line_ID],
  seed.[SortLine],
  seed.[ArabicDescription],
  seed.[EnglishDescription]
FROM lineLevelSeed AS seed
WHERE NOT EXISTS (
  SELECT 1
  FROM [dbo].[LineLevel] AS existing
  WHERE existing.[Line_ID] = seed.[Line_ID]
);

/*
  Classify only positions that do not already have an explicit line level.
  The rule order is intentional: specific bilingual titles take precedence
  over generic manager/supervisor titles, and unmatched jobs are Employees.
*/
WITH cleanedJobTitles AS (
  SELECT
    job.[Job_ID],
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
      REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        LOWER(COALESCE(CONVERT(nvarchar(4000), job.[Job_Name_EN]), N'')),
        N'-', N' '), N'_', N' '), N'/', N' '), N'.', N' '),
        N',', N' '), N'(', N' '), N')', N' '), N':', N' '),
        N';', N' '), N'–', N' '), N'—', N' '), NCHAR(9), N' ')
      COLLATE Latin1_General_100_CI_AI AS [EnglishTitle],
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
      REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        COALESCE(CONVERT(nvarchar(4000), job.[Job_Name_AR]), N''),
        N'-', N' '), N'_', N' '), N'/', N' '), N'.', N' '),
        N',', N' '), N'(', N' '), N')', N' '), N':', N' '),
        N';', N' '), N'–', N' '), N'—', N' '), NCHAR(9), N' '),
        N'ـ', N' ')
      COLLATE Arabic_100_CI_AI AS [ArabicTitle]
  FROM [dbo].[jobs] AS job
),
normalizedJobTitles AS (
  SELECT
    [Job_ID],
    N' ' + REPLACE(REPLACE(REPLACE([EnglishTitle], N'  ', N' '), N'  ', N' '), N'  ', N' ') + N' '
      AS [EnglishTitle],
    N' ' + REPLACE(REPLACE(REPLACE([ArabicTitle], N'  ', N' '), N'  ', N' '), N'  ', N' ') + N' '
      AS [ArabicTitle]
  FROM cleanedJobTitles
),
classifiedJobs AS (
  SELECT
    [Job_ID],
    CASE
      WHEN [EnglishTitle] LIKE N'% chairman %'
        OR (
          [EnglishTitle] LIKE N'% chair %'
          AND (
            [EnglishTitle] LIKE N'% committee %'
            OR [EnglishTitle] LIKE N'% board %'
          )
        )
        OR [ArabicTitle] LIKE N'% رئيس لجنة %'
        OR [ArabicTitle] LIKE N'% رئيس اللجنة %'
        OR [ArabicTitle] LIKE N'% رئيس مجلس الإدارة %'
        THEN CAST(2 AS int)
      WHEN (
          [EnglishTitle] LIKE N'% committee %'
          AND [EnglishTitle] LIKE N'% member %'
        )
        OR [ArabicTitle] LIKE N'% عضو لجنة %'
        OR [ArabicTitle] LIKE N'% عضو اللجنة %'
        THEN CAST(3 AS int)
      WHEN [EnglishTitle] LIKE N'% manager %'
        OR [ArabicTitle] LIKE N'% مدير %'
        OR [ArabicTitle] LIKE N'% مديرة %'
        THEN CAST(4 AS int)
      WHEN [EnglishTitle] LIKE N'% section head %'
        OR (
          [EnglishTitle] LIKE N'% head of %'
          AND [EnglishTitle] LIKE N'% section %'
        )
        OR [ArabicTitle] LIKE N'% رئيس قسم %'
        OR [ArabicTitle] LIKE N'% رئيس القسم %'
        THEN CAST(7 AS int)
      WHEN [EnglishTitle] LIKE N'% unit supervisor %'
        OR (
          [EnglishTitle] LIKE N'% supervisor of %'
          AND [EnglishTitle] LIKE N'% unit %'
        )
        OR [ArabicTitle] LIKE N'% مشرف وحدة %'
        OR [ArabicTitle] LIKE N'% مشرف الوحدة %'
        THEN CAST(8 AS int)
      WHEN [EnglishTitle] LIKE N'% coordinator %'
        OR [ArabicTitle] LIKE N'% منسق %'
        OR [ArabicTitle] LIKE N'% منسقة %'
        THEN CAST(6 AS int)
      WHEN [EnglishTitle] LIKE N'% supervisor %'
        OR [ArabicTitle] LIKE N'% مراقب %'
        OR [ArabicTitle] LIKE N'% مشرف %'
        OR [ArabicTitle] LIKE N'% مشرفة %'
        THEN CAST(5 AS int)
      ELSE CAST(9 AS int)
    END AS [Line_ID]
  FROM normalizedJobTitles
)
UPDATE position
SET position.[LineLevelId] = lineLevel.[Line_ID]
FROM [dbo].[Position] AS position
INNER JOIN classifiedJobs AS classification
  ON classification.[Job_ID] = position.[Job_ID]
INNER JOIN [dbo].[LineLevel] AS lineLevel
  ON lineLevel.[Line_ID] = classification.[Line_ID]
WHERE position.[LineLevelId] IS NULL;

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
