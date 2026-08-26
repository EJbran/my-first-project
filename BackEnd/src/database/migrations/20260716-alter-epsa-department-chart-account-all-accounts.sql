/*
  Align dbo.EPSA_Department_ChartAccount for All Accounts mode:
  - ChartAccountId nullable
  - IsAllAccounts bit
  - Filtered unique indexes

  Does NOT recreate existing tables.
*/

SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF COL_LENGTH('dbo.EPSA_Department_ChartAccount', 'IsAllAccounts') IS NULL
BEGIN
  ALTER TABLE dbo.EPSA_Department_ChartAccount
    ADD IsAllAccounts BIT NOT NULL
      CONSTRAINT DF_EPSA_Department_ChartAccount_IsAllAccounts DEFAULT (0);
END;

IF EXISTS (
  SELECT 1
  FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.EPSA_Department_ChartAccount')
    AND name = 'ChartAccountId'
    AND is_nullable = 0
)
BEGIN
  ALTER TABLE dbo.EPSA_Department_ChartAccount
    ALTER COLUMN ChartAccountId BIGINT NULL;
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.EPSA_Department_ChartAccount')
    AND name = 'UX_EPSA_Department_ChartAccount_AllAccounts_Active'
)
BEGIN
  CREATE UNIQUE INDEX UX_EPSA_Department_ChartAccount_AllAccounts_Active
    ON dbo.EPSA_Department_ChartAccount (EPSAId, DepartmentId)
    WHERE IsActive = 1 AND IsAllAccounts = 1;
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.EPSA_Department_ChartAccount')
    AND name = 'UX_EPSA_Department_ChartAccount_Selected_Active'
)
BEGIN
  CREATE UNIQUE INDEX UX_EPSA_Department_ChartAccount_Selected_Active
    ON dbo.EPSA_Department_ChartAccount (EPSAId, DepartmentId, ChartAccountId)
    WHERE IsActive = 1 AND IsAllAccounts = 0 AND ChartAccountId IS NOT NULL;
END;

COMMIT TRANSACTION;
