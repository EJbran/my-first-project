SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;

BEGIN TRY
BEGIN TRANSACTION;

IF OBJECT_ID(N'[dbo].[TimeSheetCode]', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[TimeSheetCode] (
    [ID] int IDENTITY(1,1) NOT NULL,
    [Code] nvarchar(20) NULL,
    [Code_Description] nvarchar(50) NULL,
    CONSTRAINT [PK_TimeSheetCode] PRIMARY KEY CLUSTERED ([ID])
  );
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE [object_id] = OBJECT_ID(N'[dbo].[TimeSheetCode]')
    AND [name] = N'IX_TimeSheetCode_Code'
)
BEGIN
  CREATE INDEX [IX_TimeSheetCode_Code]
    ON [dbo].[TimeSheetCode] ([Code]);
END;

IF OBJECT_ID(N'[dbo].[Vacation]', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[Vacation] (
    [Id] int IDENTITY(1,1) NOT NULL,
    [ID_Employee] nvarchar(50) NOT NULL,
    [Id_CodeTimeSheet] int NULL,
    [VacationDate_Start] date NULL,
    [VacationDate_End] date NULL,
    [ReturnDate] date NULL,
    [Num_VacationDays] decimal(10,2) NULL,
    [CreatedDate] datetime2(0) NOT NULL
      CONSTRAINT [DF_Vacation_CreatedDate] DEFAULT SYSUTCDATETIME(),
    [RemainingBalance] decimal(10,2) NULL,
    [State] nvarchar(100) NULL,
    [Cause] nvarchar(500) NULL,
    [DeductedLeaveDays] decimal(10,2) NULL,
    [HolidayDays] decimal(10,2) NULL,
    CONSTRAINT [PK_Vacation] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [CK_Vacation_Days_Nonnegative]
      CHECK (
        COALESCE([Num_VacationDays], 0) >= 0
        AND COALESCE([RemainingBalance], 0) >= 0
        AND COALESCE([DeductedLeaveDays], 0) >= 0
        AND COALESCE([HolidayDays], 0) >= 0
      ),
    CONSTRAINT [CK_Vacation_Date_Order]
      CHECK (
        [VacationDate_Start] IS NULL
        OR [VacationDate_End] IS NULL
        OR [VacationDate_End] >= [VacationDate_Start]
      )
  );
END;
ELSE IF COL_LENGTH(N'dbo.Vacation', N'ID_Employee') IS NULL
  AND COL_LENGTH(N'dbo.Vacation', N'Ref_Employee') IS NOT NULL
BEGIN
  EXEC sys.sp_rename
    @objname = N'dbo.Vacation.Ref_Employee',
    @newname = N'ID_Employee',
    @objtype = N'COLUMN';
END;

IF COL_LENGTH(N'dbo.Vacation', N'ID_Employee') IS NULL
BEGIN
  THROW 51000, 'The local dbo.Vacation table has no compatible employee-number column.', 1;
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE [object_id] = OBJECT_ID(N'[dbo].[Vacation]')
    AND [name] = N'IX_Vacation_Employee_Start_Id'
)
BEGIN
  CREATE INDEX [IX_Vacation_Employee_Start_Id]
    ON [dbo].[Vacation] (
      [ID_Employee],
      [VacationDate_Start] DESC,
      [Id] DESC
    );
END;

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
