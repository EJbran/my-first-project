SET XACT_ABORT ON;
BEGIN TRANSACTION;

/*
  Chart of Accounts master data (existing DB tables):
  - dbo.COA_AccountGroup
  - dbo.ChartOfAccounts

  This script is idempotent and only creates tables/indexes if missing.
*/

/* -----------------------------
   dbo.COA_AccountGroup
----------------------------- */
IF OBJECT_ID('dbo.COA_AccountGroup', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.COA_AccountGroup
  (
    AccountGroupCode NVARCHAR(10) NOT NULL,
    AccountClassCode NVARCHAR(10) NOT NULL,
    AccountClassName NVARCHAR(100) NOT NULL,
    AccountGroupName NVARCHAR(200) NOT NULL,
    DefaultSuggestedModule NVARCHAR(100) NULL,
    DefaultAnalyticTemplate NVARCHAR(100) NULL,
    AllowedAnalyticTemplates NVARCHAR(500) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_COA_AccountGroup_IsActive DEFAULT (1),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_COA_AccountGroup_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_COA_AccountGroup_UpdatedAt DEFAULT SYSUTCDATETIME(),
    id_AccountGroupCode INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_COA_AccountGroup PRIMARY KEY,
    CONSTRAINT UQ_COA_AccountGroup_AccountGroupCode UNIQUE (AccountGroupCode)
  );
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.COA_AccountGroup')
    AND name = 'IX_COA_AccountGroup_IsActive'
)
BEGIN
  CREATE INDEX IX_COA_AccountGroup_IsActive
    ON dbo.COA_AccountGroup (IsActive);
END;

/* -----------------------------
   dbo.ChartOfAccounts
----------------------------- */
IF OBJECT_ID('dbo.ChartOfAccounts', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.ChartOfAccounts
  (
    Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ChartOfAccounts PRIMARY KEY,
    NewAccountCode NVARCHAR(30) NOT NULL,
    Type NVARCHAR(5) NULL,
    LegacyAcct NVARCHAR(20) NULL,
    CleanDescription NVARCHAR(500) NOT NULL,
    LegacyDescription NVARCHAR(500) NULL,
    AccountClassName NVARCHAR(100) NOT NULL,
    AccountGroupCode NVARCHAR(10) NOT NULL,
    AccountGroupName NVARCHAR(200) NOT NULL,
    SuggestedModule NVARCHAR(100) NULL,
    AnalyticTemplate NVARCHAR(100) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_ChartOfAccounts_IsActive DEFAULT (1),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ChartOfAccounts_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ChartOfAccounts_UpdatedAt DEFAULT SYSUTCDATETIME()
  );
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.ChartOfAccounts')
    AND name = 'UX_ChartOfAccounts_NewAccountCode'
)
BEGIN
  CREATE UNIQUE INDEX UX_ChartOfAccounts_NewAccountCode
    ON dbo.ChartOfAccounts (NewAccountCode);
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.ChartOfAccounts')
    AND name = 'IX_ChartOfAccounts_AccountGroupCode'
)
BEGIN
  CREATE INDEX IX_ChartOfAccounts_AccountGroupCode
    ON dbo.ChartOfAccounts (AccountGroupCode);
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.ChartOfAccounts')
    AND name = 'IX_ChartOfAccounts_IsActive'
)
BEGIN
  CREATE INDEX IX_ChartOfAccounts_IsActive
    ON dbo.ChartOfAccounts (IsActive);
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.ChartOfAccounts')
    AND name = 'IX_ChartOfAccounts_LegacyAcct'
)
BEGIN
  CREATE INDEX IX_ChartOfAccounts_LegacyAcct
    ON dbo.ChartOfAccounts (LegacyAcct);
END;

COMMIT TRANSACTION;
