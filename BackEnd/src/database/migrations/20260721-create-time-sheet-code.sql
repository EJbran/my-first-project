SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.TimeSheetCode', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.TimeSheetCode
  (
    ID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TimeSheetCode PRIMARY KEY,
    Code_Description NVARCHAR(50) NULL,
    Code NVARCHAR(20) NULL
  );
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.TimeSheetCode')
    AND name = 'IX_TimeSheetCode_Code'
)
BEGIN
  CREATE INDEX IX_TimeSheetCode_Code ON dbo.TimeSheetCode (Code);
END;

COMMIT;
