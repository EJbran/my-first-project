SET XACT_ABORT ON;
BEGIN TRANSACTION;

/*
  Relation table only (idempotent):
  - dbo.EPSA_Department_ChartAccount

  Does NOT create or modify:
  - dbo.EPSA
  - dbo.Departments
  - dbo.ChartOfAccounts
*/

IF OBJECT_ID('dbo.EPSA_Department_ChartAccount', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.EPSA_Department_ChartAccount
  (
    Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_EPSA_Department_ChartAccount PRIMARY KEY,
    EPSAId INT NOT NULL,
    DepartmentId INT NOT NULL,
    ChartAccountId BIGINT NOT NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_EPSA_Department_ChartAccount_IsActive DEFAULT (1),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_EPSA_Department_ChartAccount_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_EPSA_Department_ChartAccount_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_EPSA_Department_ChartAccount_EPSA
      FOREIGN KEY (EPSAId) REFERENCES dbo.EPSA (Id),
    CONSTRAINT FK_EPSA_Department_ChartAccount_Department
      FOREIGN KEY (DepartmentId) REFERENCES dbo.Departments (Id),
    CONSTRAINT FK_EPSA_Department_ChartAccount_ChartAccount
      FOREIGN KEY (ChartAccountId) REFERENCES dbo.ChartOfAccounts (Id)
  );
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.EPSA_Department_ChartAccount')
    AND name = 'IX_EPSA_Department_ChartAccount_EPSAId'
)
BEGIN
  CREATE INDEX IX_EPSA_Department_ChartAccount_EPSAId
    ON dbo.EPSA_Department_ChartAccount (EPSAId);
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.EPSA_Department_ChartAccount')
    AND name = 'IX_EPSA_Department_ChartAccount_DepartmentId'
)
BEGIN
  CREATE INDEX IX_EPSA_Department_ChartAccount_DepartmentId
    ON dbo.EPSA_Department_ChartAccount (DepartmentId);
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.EPSA_Department_ChartAccount')
    AND name = 'IX_EPSA_Department_ChartAccount_ChartAccountId'
)
BEGIN
  CREATE INDEX IX_EPSA_Department_ChartAccount_ChartAccountId
    ON dbo.EPSA_Department_ChartAccount (ChartAccountId);
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.EPSA_Department_ChartAccount')
    AND name = 'IX_EPSA_Department_ChartAccount_IsActive'
)
BEGIN
  CREATE INDEX IX_EPSA_Department_ChartAccount_IsActive
    ON dbo.EPSA_Department_ChartAccount (IsActive);
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.EPSA_Department_ChartAccount')
    AND name = 'UX_EPSA_Department_ChartAccount_Active'
)
BEGIN
  CREATE UNIQUE INDEX UX_EPSA_Department_ChartAccount_Active
    ON dbo.EPSA_Department_ChartAccount (EPSAId, DepartmentId, ChartAccountId)
    WHERE IsActive = 1;
END;

COMMIT TRANSACTION;
