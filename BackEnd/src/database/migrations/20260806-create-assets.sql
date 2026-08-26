SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.Assets', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Assets
  (
    AssetID BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Assets PRIMARY KEY,
    AssetCode NVARCHAR(50) NOT NULL,
    AssetDescription NVARCHAR(200) NOT NULL,
    CategoryID BIGINT NOT NULL,
    SubLocationID INT NOT NULL,
    DepartmentID INT NOT NULL,
    PurchaseDate DATE NOT NULL,
    InsertedDate DATE NOT NULL,
    PurchaseCost DECIMAL(18, 2) NOT NULL,
    BookValue DECIMAL(18, 2) NOT NULL,
    OpeningBalanceBookValue DECIMAL(18, 2) NOT NULL,
    DepreciationValue DECIMAL(18, 2) NOT NULL,
    NetValue DECIMAL(18, 2) NOT NULL,
    ResponsibleID INT NOT NULL,
    ResponsibleNote NVARCHAR(50) NULL,
    Status NVARCHAR(50) NOT NULL
  );
END;

COMMIT TRANSACTION;
