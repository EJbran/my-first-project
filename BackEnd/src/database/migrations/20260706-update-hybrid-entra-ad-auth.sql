SET XACT_ABORT ON;
BEGIN TRANSACTION;

/*
  Safe migration for existing databases.
  - No table drops
  - No data deletion
  - Guarded by OBJECT_ID / COL_LENGTH / sys checks
*/

/* -----------------------------
   dbo.AuthDomains
----------------------------- */
IF OBJECT_ID('dbo.AuthDomains', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.AuthDomains
  (
    Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuthDomains PRIMARY KEY,
    DomainName NVARCHAR(100) NOT NULL,
    NetbiosName NVARCHAR(50) NULL,
    AuthMethod NVARCHAR(30) NOT NULL,
    AuthorityUrl NVARCHAR(500) NULL,
    TenantId NVARCHAR(100) NULL,
    ClientId NVARCHAR(100) NULL,
    LdapServer NVARCHAR(255) NULL,
    LdapPort INT NULL,
    BaseDn NVARCHAR(500) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_AuthDomains_IsActive DEFAULT (1),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_AuthDomains_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_AuthDomains_UpdatedAt DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID('dbo.CK_AuthDomains_AuthMethod', 'C') IS NULL
BEGIN
  ALTER TABLE dbo.AuthDomains
  WITH NOCHECK
  ADD CONSTRAINT CK_AuthDomains_AuthMethod
  CHECK (AuthMethod IN ('OIDC', 'ADFS', 'LDAP', 'LDAPS', 'KERBEROS'));
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.AuthDomains')
    AND name = 'UX_AuthDomains_DomainName'
)
BEGIN
  CREATE UNIQUE INDEX UX_AuthDomains_DomainName
    ON dbo.AuthDomains (DomainName);
END;

/* -----------------------------
   dbo.Users
----------------------------- */
IF COL_LENGTH('dbo.Users', 'AuthDomainId') IS NULL
BEGIN
  ALTER TABLE dbo.Users ADD AuthDomainId BIGINT NULL;
END;

IF COL_LENGTH('dbo.Users', 'SamAccountName') IS NULL
BEGIN
  ALTER TABLE dbo.Users ADD SamAccountName NVARCHAR(100) NULL;
END;

IF COL_LENGTH('dbo.Users', 'UserPrincipalName') IS NULL
BEGIN
  ALTER TABLE dbo.Users ADD UserPrincipalName NVARCHAR(255) NULL;
END;

IF COL_LENGTH('dbo.Users', 'DistinguishedName') IS NULL
BEGIN
  ALTER TABLE dbo.Users ADD DistinguishedName NVARCHAR(500) NULL;
END;

IF COL_LENGTH('dbo.Users', 'ObjectGuid') IS NULL
BEGIN
  ALTER TABLE dbo.Users ADD ObjectGuid UNIQUEIDENTIFIER NULL;
END;

IF COL_LENGTH('dbo.Users', 'IsAdSynced') IS NULL
BEGIN
  ALTER TABLE dbo.Users
    ADD IsAdSynced BIT NOT NULL
        CONSTRAINT DF_Users_IsAdSynced DEFAULT (0);
END;

IF COL_LENGTH('dbo.Users', 'LastAdSyncAt') IS NULL
BEGIN
  ALTER TABLE dbo.Users ADD LastAdSyncAt DATETIME2(0) NULL;
END;

IF OBJECT_ID('dbo.FK_Users_AuthDomains', 'F') IS NULL
   AND OBJECT_ID('dbo.Users', 'U') IS NOT NULL
   AND OBJECT_ID('dbo.AuthDomains', 'U') IS NOT NULL
BEGIN
  ALTER TABLE dbo.Users
  WITH CHECK
  ADD CONSTRAINT FK_Users_AuthDomains
  FOREIGN KEY (AuthDomainId) REFERENCES dbo.AuthDomains (Id);
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'UX_Users_Email'
)
BEGIN
  CREATE UNIQUE INDEX UX_Users_Email
  ON dbo.Users (Email)
  WHERE DeletedAt IS NULL;
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'UX_Users_Phone'
)
BEGIN
  CREATE UNIQUE INDEX UX_Users_Phone
  ON dbo.Users (Phone)
  WHERE Phone IS NOT NULL AND DeletedAt IS NULL;
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.Users')
    AND name = 'UX_Users_AuthProvider_Domain_Username'
)
BEGIN
  CREATE UNIQUE INDEX UX_Users_AuthProvider_Domain_Username
  ON dbo.Users (AuthProvider, DomainName, Username)
  WHERE DeletedAt IS NULL;
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.Users')
    AND name = 'UX_Users_AuthProvider_Domain_ExternalAuthId'
)
BEGIN
  CREATE UNIQUE INDEX UX_Users_AuthProvider_Domain_ExternalAuthId
  ON dbo.Users (AuthProvider, DomainName, ExternalAuthId)
  WHERE ExternalAuthId IS NOT NULL AND DeletedAt IS NULL;
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.Users')
    AND name = 'UX_Users_Domain_SamAccountName'
)
BEGIN
  CREATE UNIQUE INDEX UX_Users_Domain_SamAccountName
  ON dbo.Users (DomainName, SamAccountName)
  WHERE SamAccountName IS NOT NULL AND DeletedAt IS NULL;
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.Users')
    AND name = 'UX_Users_Domain_UserPrincipalName'
)
BEGIN
  CREATE UNIQUE INDEX UX_Users_Domain_UserPrincipalName
  ON dbo.Users (DomainName, UserPrincipalName)
  WHERE UserPrincipalName IS NOT NULL AND DeletedAt IS NULL;
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.Users')
    AND name = 'UX_Users_ObjectGuid'
)
BEGIN
  CREATE UNIQUE INDEX UX_Users_ObjectGuid
  ON dbo.Users (ObjectGuid)
  WHERE ObjectGuid IS NOT NULL AND DeletedAt IS NULL;
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.Users')
    AND name = 'IX_Users_AuthDomainId'
)
BEGIN
  CREATE INDEX IX_Users_AuthDomainId
  ON dbo.Users (AuthDomainId);
END;

IF OBJECT_ID('dbo.CK_Users_Password_By_Provider', 'C') IS NULL
BEGIN
  ALTER TABLE dbo.Users
  WITH NOCHECK
  ADD CONSTRAINT CK_Users_Password_By_Provider
  CHECK (
    (AuthProvider IN ('AD', 'LDAP', 'SSO') AND PasswordHash IS NULL)
    OR
    (AuthProvider = 'LOCAL' AND PasswordHash IS NOT NULL)
  );
END;

/* -----------------------------
   dbo.AdGroupRoleMappings
----------------------------- */
IF OBJECT_ID('dbo.AdGroupRoleMappings', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.AdGroupRoleMappings
  (
    Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AdGroupRoleMappings PRIMARY KEY,
    AuthDomainId BIGINT NOT NULL,
    AdGroupSid NVARCHAR(255) NULL,
    AdGroupName NVARCHAR(255) NOT NULL,
    EntraGroupObjectId UNIQUEIDENTIFIER NULL,
    RoleId BIGINT NOT NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_AdGroupRoleMappings_IsActive DEFAULT (1),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_AdGroupRoleMappings_CreatedAt DEFAULT SYSUTCDATETIME()
  );
END;

IF COL_LENGTH('dbo.AdGroupRoleMappings', 'EntraGroupObjectId') IS NULL
BEGIN
  ALTER TABLE dbo.AdGroupRoleMappings
  ADD EntraGroupObjectId UNIQUEIDENTIFIER NULL;
END;

IF EXISTS (
  SELECT 1
  FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.AdGroupRoleMappings')
    AND name = 'AdGroupSid'
    AND is_nullable = 0
)
BEGIN
  ALTER TABLE dbo.AdGroupRoleMappings
  ALTER COLUMN AdGroupSid NVARCHAR(255) NULL;
END;

IF OBJECT_ID('dbo.FK_AdGroupRoleMappings_AuthDomains', 'F') IS NULL
BEGIN
  ALTER TABLE dbo.AdGroupRoleMappings
  WITH CHECK
  ADD CONSTRAINT FK_AdGroupRoleMappings_AuthDomains
  FOREIGN KEY (AuthDomainId) REFERENCES dbo.AuthDomains (Id);
END;

IF OBJECT_ID('dbo.FK_AdGroupRoleMappings_Roles', 'F') IS NULL
BEGIN
  ALTER TABLE dbo.AdGroupRoleMappings
  WITH CHECK
  ADD CONSTRAINT FK_AdGroupRoleMappings_Roles
  FOREIGN KEY (RoleId) REFERENCES dbo.Roles (Id);
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.AdGroupRoleMappings')
    AND name = 'IX_AdGroupRoleMappings_EntraGroupObjectId'
)
BEGIN
  CREATE INDEX IX_AdGroupRoleMappings_EntraGroupObjectId
  ON dbo.AdGroupRoleMappings (EntraGroupObjectId)
  WHERE EntraGroupObjectId IS NOT NULL;
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.AdGroupRoleMappings')
    AND name = 'IX_AdGroupRoleMappings_AdGroupSid'
)
BEGIN
  CREATE INDEX IX_AdGroupRoleMappings_AdGroupSid
  ON dbo.AdGroupRoleMappings (AdGroupSid)
  WHERE AdGroupSid IS NOT NULL;
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.AdGroupRoleMappings')
    AND name = 'UX_AdGroupRoleMappings_Domain_EntraGroup_Role'
)
BEGIN
  CREATE UNIQUE INDEX UX_AdGroupRoleMappings_Domain_EntraGroup_Role
  ON dbo.AdGroupRoleMappings (AuthDomainId, EntraGroupObjectId, RoleId)
  WHERE EntraGroupObjectId IS NOT NULL;
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.AdGroupRoleMappings')
    AND name = 'UX_AdGroupRoleMappings_Domain_AdSid_Role'
)
BEGIN
  CREATE UNIQUE INDEX UX_AdGroupRoleMappings_Domain_AdSid_Role
  ON dbo.AdGroupRoleMappings (AuthDomainId, AdGroupSid, RoleId)
  WHERE AdGroupSid IS NOT NULL;
END;

/* -----------------------------
   dbo.MfaFactors
----------------------------- */
IF COL_LENGTH('dbo.MfaFactors', 'ManagedBy') IS NULL
BEGIN
  ALTER TABLE dbo.MfaFactors
  ADD ManagedBy NVARCHAR(30) NOT NULL
      CONSTRAINT DF_MfaFactors_ManagedBy DEFAULT ('ERP');
END;

IF OBJECT_ID('dbo.CK_MfaFactors_ManagedBy', 'C') IS NULL
BEGIN
  ALTER TABLE dbo.MfaFactors
  WITH NOCHECK
  ADD CONSTRAINT CK_MfaFactors_ManagedBy
  CHECK (ManagedBy IN ('ERP', 'ENTRA', 'ADFS'));
END;

/* -----------------------------
   dbo.UserSessions
----------------------------- */
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.UserSessions')
    AND name = 'UX_UserSessions_RefreshTokenHash'
)
BEGIN
  CREATE UNIQUE INDEX UX_UserSessions_RefreshTokenHash
  ON dbo.UserSessions (RefreshTokenHash);
END;

/* -----------------------------
   dbo.SecurityPolicies seed values
----------------------------- */
MERGE dbo.SecurityPolicies AS target
USING (
  SELECT 'LOCAL_LOGIN_ENABLED' AS PolicyCode, 'true' AS PolicyValue, 'Enable local break-glass logins' AS Description
  UNION ALL SELECT 'MAX_FAILED_LOGIN_ATTEMPTS', '5', 'Maximum failed login attempts before lockout'
  UNION ALL SELECT 'LOCKOUT_MINUTES', '15', 'Account lockout duration in minutes'
  UNION ALL SELECT 'SESSION_TIMEOUT_MINUTES', '60', 'Session inactivity timeout in minutes'
  UNION ALL SELECT 'REFRESH_TOKEN_DAYS', '7', 'Refresh token duration in days'
  UNION ALL SELECT 'REQUIRE_ENTRA_MFA', 'true', 'Require MFA enforced by Microsoft Entra'
  UNION ALL SELECT 'ALLOW_DIRECT_LDAP_LOGIN', 'false', 'Allow direct LDAP login for normal users'
  UNION ALL SELECT 'ENTRA_GROUP_SYNC_MODE', 'token_or_graph', 'Group sync source mode'
) AS source
ON target.PolicyCode = source.PolicyCode
WHEN NOT MATCHED THEN
  INSERT (PolicyCode, PolicyValue, Description, IsActive, UpdatedAt)
  VALUES (source.PolicyCode, source.PolicyValue, source.Description, 1, SYSUTCDATETIME())
WHEN MATCHED AND (target.PolicyValue IS NULL OR target.PolicyValue = '') THEN
  UPDATE SET target.PolicyValue = source.PolicyValue,
             target.Description = source.Description,
             target.UpdatedAt = SYSUTCDATETIME();

/*
  UpdatedAt handling:
  Sequelize models in this project manage UpdatedAt at application level.
  No triggers are created by this migration.
*/

COMMIT TRANSACTION;
