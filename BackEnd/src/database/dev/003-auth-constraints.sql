SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
BEGIN TRANSACTION;

-- External identities must never carry a local password hash.
UPDATE [dbo].[Users]
SET [PasswordHash] = NULL
WHERE [AuthProvider] IN (N'AD', N'LDAP', N'SSO')
  AND [PasswordHash] IS NOT NULL;

IF EXISTS (
  SELECT 1
  FROM [dbo].[Users]
  WHERE [AuthProvider] = N'LOCAL'
    AND [PasswordHash] IS NULL
)
  THROW 51000, 'A LOCAL development user is missing PasswordHash.', 1;

IF OBJECT_ID(N'[dbo].[CK_Users_Password_By_Provider]', N'C') IS NOT NULL
  ALTER TABLE [dbo].[Users]
    DROP CONSTRAINT [CK_Users_Password_By_Provider];

ALTER TABLE [dbo].[Users] WITH CHECK
  ADD CONSTRAINT [CK_Users_Password_By_Provider]
  CHECK (
    ([AuthProvider] IN ('AD', 'LDAP', 'SSO') AND [PasswordHash] IS NULL)
    OR
    ([AuthProvider] = 'LOCAL' AND [PasswordHash] IS NOT NULL)
  );

ALTER TABLE [dbo].[Users]
  CHECK CONSTRAINT [CK_Users_Password_By_Provider];

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
