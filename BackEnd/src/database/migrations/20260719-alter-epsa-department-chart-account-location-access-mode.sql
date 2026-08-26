/*
  Add LocationAccessMode to dbo.EPSA_Department_ChartAccount.
  Does NOT create a new table. Does NOT remove existing data.

  LocationAccessMode:
    ALL     + LocationID NULL  => all locations
    INCLUDE + LocationID set    => only that location
    EXCLUDE + LocationID set    => all locations except that location
*/

SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF COL_LENGTH('dbo.EPSA_Department_ChartAccount', 'LocationAccessMode') IS NULL
BEGIN
  ALTER TABLE dbo.EPSA_Department_ChartAccount
    ADD LocationAccessMode NVARCHAR(20) NOT NULL
      CONSTRAINT DF_EPSA_Department_ChartAccount_LocationAccessMode DEFAULT (N'ALL');
END;

/* Backfill from existing LocationID values */
UPDATE dbo.EPSA_Department_ChartAccount
SET LocationAccessMode = CASE
  WHEN LocationID IS NULL THEN N'ALL'
  ELSE N'INCLUDE'
END
WHERE LocationAccessMode IS NULL
   OR (
        LocationAccessMode = N'ALL'
        AND LocationID IS NOT NULL
      )
   OR (
        LocationAccessMode IN (N'INCLUDE', N'EXCLUDE')
        AND LocationID IS NULL
      );

/* Normalize inconsistent rows after add */
UPDATE dbo.EPSA_Department_ChartAccount
SET LocationAccessMode = N'ALL'
WHERE LocationID IS NULL
  AND LocationAccessMode <> N'ALL';

UPDATE dbo.EPSA_Department_ChartAccount
SET LocationAccessMode = N'INCLUDE'
WHERE LocationID IS NOT NULL
  AND LocationAccessMode = N'ALL';

IF EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE parent_object_id = OBJECT_ID('dbo.EPSA_Department_ChartAccount')
    AND name = 'CK_EPSA_Department_ChartAccount_LocationAccess'
)
BEGIN
  ALTER TABLE dbo.EPSA_Department_ChartAccount
    DROP CONSTRAINT CK_EPSA_Department_ChartAccount_LocationAccess;
END;

ALTER TABLE dbo.EPSA_Department_ChartAccount
  ADD CONSTRAINT CK_EPSA_Department_ChartAccount_LocationAccess CHECK (
    LocationAccessMode IN (N'ALL', N'INCLUDE', N'EXCLUDE')
    AND (
      (LocationAccessMode = N'ALL' AND LocationID IS NULL)
      OR (LocationAccessMode IN (N'INCLUDE', N'EXCLUDE') AND LocationID IS NOT NULL)
    )
  );

/* Drop older unique indexes that do not include LocationAccessMode */
IF EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.EPSA_Department_ChartAccount')
    AND name = 'UX_EPSA_Department_ChartAccount_AllAccounts_AllLoc_Active'
)
  DROP INDEX UX_EPSA_Department_ChartAccount_AllAccounts_AllLoc_Active
    ON dbo.EPSA_Department_ChartAccount;

IF EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.EPSA_Department_ChartAccount')
    AND name = 'UX_EPSA_Department_ChartAccount_AllAccounts_Loc_Active'
)
  DROP INDEX UX_EPSA_Department_ChartAccount_AllAccounts_Loc_Active
    ON dbo.EPSA_Department_ChartAccount;

IF EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.EPSA_Department_ChartAccount')
    AND name = 'UX_EPSA_Department_ChartAccount_Selected_AllLoc_Active'
)
  DROP INDEX UX_EPSA_Department_ChartAccount_Selected_AllLoc_Active
    ON dbo.EPSA_Department_ChartAccount;

IF EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.EPSA_Department_ChartAccount')
    AND name = 'UX_EPSA_Department_ChartAccount_Selected_Loc_Active'
)
  DROP INDEX UX_EPSA_Department_ChartAccount_Selected_Loc_Active
    ON dbo.EPSA_Department_ChartAccount;

IF EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.EPSA_Department_ChartAccount')
    AND name = 'UX_EPSA_Department_ChartAccount_AllAccounts_Active'
)
  DROP INDEX UX_EPSA_Department_ChartAccount_AllAccounts_Active
    ON dbo.EPSA_Department_ChartAccount;

IF EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.EPSA_Department_ChartAccount')
    AND name = 'UX_EPSA_Department_ChartAccount_Selected_Active'
)
  DROP INDEX UX_EPSA_Department_ChartAccount_Selected_Active
    ON dbo.EPSA_Department_ChartAccount;

/* ALL mode: one active row per EPSA + Dept + account scope */
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.EPSA_Department_ChartAccount')
    AND name = 'UX_EPSA_Dept_Chart_AllAccounts_ALL_Active'
)
BEGIN
  CREATE UNIQUE INDEX UX_EPSA_Dept_Chart_AllAccounts_ALL_Active
    ON dbo.EPSA_Department_ChartAccount (EPSAId, DepartmentId)
    WHERE IsActive = 1 AND IsAllAccounts = 1 AND LocationAccessMode = N'ALL';
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.EPSA_Department_ChartAccount')
    AND name = 'UX_EPSA_Dept_Chart_Selected_ALL_Active'
)
BEGIN
  CREATE UNIQUE INDEX UX_EPSA_Dept_Chart_Selected_ALL_Active
    ON dbo.EPSA_Department_ChartAccount (EPSAId, DepartmentId, ChartAccountId)
    WHERE IsActive = 1 AND IsAllAccounts = 0 AND ChartAccountId IS NOT NULL
      AND LocationAccessMode = N'ALL';
END;

/* INCLUDE / EXCLUDE: unique per location */
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.EPSA_Department_ChartAccount')
    AND name = 'UX_EPSA_Dept_Chart_AllAccounts_LocMode_Active'
)
BEGIN
  CREATE UNIQUE INDEX UX_EPSA_Dept_Chart_AllAccounts_LocMode_Active
    ON dbo.EPSA_Department_ChartAccount (EPSAId, DepartmentId, LocationAccessMode, LocationID)
    WHERE IsActive = 1 AND IsAllAccounts = 1
      AND LocationAccessMode IN (N'INCLUDE', N'EXCLUDE')
      AND LocationID IS NOT NULL;
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.EPSA_Department_ChartAccount')
    AND name = 'UX_EPSA_Dept_Chart_Selected_LocMode_Active'
)
BEGIN
  CREATE UNIQUE INDEX UX_EPSA_Dept_Chart_Selected_LocMode_Active
    ON dbo.EPSA_Department_ChartAccount (EPSAId, DepartmentId, ChartAccountId, LocationAccessMode, LocationID)
    WHERE IsActive = 1 AND IsAllAccounts = 0 AND ChartAccountId IS NOT NULL
      AND LocationAccessMode IN (N'INCLUDE', N'EXCLUDE')
      AND LocationID IS NOT NULL;
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.EPSA_Department_ChartAccount')
    AND name = 'IX_EPSA_Department_ChartAccount_LocationAccessMode'
)
BEGIN
  CREATE INDEX IX_EPSA_Department_ChartAccount_LocationAccessMode
    ON dbo.EPSA_Department_ChartAccount (LocationAccessMode);
END;

COMMIT TRANSACTION;
