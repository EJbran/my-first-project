/*
  Add LocationID to dbo.EPSA_Department_ChartAccount.
  LocationID NULL = All Locations (same idea as ChartAccountId NULL for All Accounts).

  Does NOT recreate existing tables.
*/

SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF COL_LENGTH('dbo.EPSA_Department_ChartAccount', 'LocationID') IS NULL
BEGIN
  ALTER TABLE dbo.EPSA_Department_ChartAccount
    ADD LocationID INT NULL;
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.EPSA_Department_ChartAccount')
    AND name = 'IX_EPSA_Department_ChartAccount_LocationID'
)
BEGIN
  CREATE INDEX IX_EPSA_Department_ChartAccount_LocationID
    ON dbo.EPSA_Department_ChartAccount (LocationID);
END;

/* Replace previous unique indexes so LocationID is part of uniqueness */
IF EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.EPSA_Department_ChartAccount')
    AND name = 'UX_EPSA_Department_ChartAccount_AllAccounts_Active'
)
BEGIN
  DROP INDEX UX_EPSA_Department_ChartAccount_AllAccounts_Active
    ON dbo.EPSA_Department_ChartAccount;
END;

IF EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.EPSA_Department_ChartAccount')
    AND name = 'UX_EPSA_Department_ChartAccount_Selected_Active'
)
BEGIN
  DROP INDEX UX_EPSA_Department_ChartAccount_Selected_Active
    ON dbo.EPSA_Department_ChartAccount;
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.EPSA_Department_ChartAccount')
    AND name = 'UX_EPSA_Department_ChartAccount_AllAccounts_AllLoc_Active'
)
BEGIN
  CREATE UNIQUE INDEX UX_EPSA_Department_ChartAccount_AllAccounts_AllLoc_Active
    ON dbo.EPSA_Department_ChartAccount (EPSAId, DepartmentId)
    WHERE IsActive = 1 AND IsAllAccounts = 1 AND LocationID IS NULL;
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.EPSA_Department_ChartAccount')
    AND name = 'UX_EPSA_Department_ChartAccount_AllAccounts_Loc_Active'
)
BEGIN
  CREATE UNIQUE INDEX UX_EPSA_Department_ChartAccount_AllAccounts_Loc_Active
    ON dbo.EPSA_Department_ChartAccount (EPSAId, DepartmentId, LocationID)
    WHERE IsActive = 1 AND IsAllAccounts = 1 AND LocationID IS NOT NULL;
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.EPSA_Department_ChartAccount')
    AND name = 'UX_EPSA_Department_ChartAccount_Selected_AllLoc_Active'
)
BEGIN
  CREATE UNIQUE INDEX UX_EPSA_Department_ChartAccount_Selected_AllLoc_Active
    ON dbo.EPSA_Department_ChartAccount (EPSAId, DepartmentId, ChartAccountId)
    WHERE IsActive = 1 AND IsAllAccounts = 0 AND ChartAccountId IS NOT NULL AND LocationID IS NULL;
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.EPSA_Department_ChartAccount')
    AND name = 'UX_EPSA_Department_ChartAccount_Selected_Loc_Active'
)
BEGIN
  CREATE UNIQUE INDEX UX_EPSA_Department_ChartAccount_Selected_Loc_Active
    ON dbo.EPSA_Department_ChartAccount (EPSAId, DepartmentId, ChartAccountId, LocationID)
    WHERE IsActive = 1 AND IsAllAccounts = 0 AND ChartAccountId IS NOT NULL AND LocationID IS NOT NULL;
END;

COMMIT TRANSACTION;
