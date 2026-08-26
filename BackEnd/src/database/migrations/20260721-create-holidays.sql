SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.Holidays', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Holidays
  (
    HolidayId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Holidays PRIMARY KEY,
    HolidayCode NVARCHAR(50) NULL,
    HolidayNameAr NVARCHAR(200) NOT NULL,
    HolidayNameEn NVARCHAR(200) NULL,
    HolidayType NVARCHAR(30) NOT NULL,
    HolidayDate DATE NOT NULL,
    IsFixedDate BIT NOT NULL CONSTRAINT DF_Holidays_IsFixedDate DEFAULT (1),
    IsActive BIT NOT NULL CONSTRAINT DF_Holidays_IsActive DEFAULT (1),
    Description NVARCHAR(1000) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Holidays_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(0) NULL
  );
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.Holidays')
    AND name = 'IX_Holidays_HolidayDate'
)
BEGIN
  CREATE INDEX IX_Holidays_HolidayDate ON dbo.Holidays (HolidayDate);
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.Holidays')
    AND name = 'IX_Holidays_IsActive'
)
BEGIN
  CREATE INDEX IX_Holidays_IsActive ON dbo.Holidays (IsActive);
END;

COMMIT;
