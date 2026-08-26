/*
  Create dbo.SubLocation table.
  Relation:
    SubLocation.LocationId -> Location.ID_Location
*/

IF OBJECT_ID(N'dbo.SubLocation', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.SubLocation (
    Id INT IDENTITY(1,1) NOT NULL,
    Name NVARCHAR(200) NOT NULL,
    Type NVARCHAR(50) NULL,
    LocationId INT NOT NULL,
    CONSTRAINT PK_SubLocation PRIMARY KEY CLUSTERED (Id ASC),
    CONSTRAINT FK_SubLocation_Location
      FOREIGN KEY (LocationId)
      REFERENCES dbo.Location(ID_Location)
  );
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID(N'dbo.SubLocation')
    AND name = N'IX_SubLocation_LocationId'
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_SubLocation_LocationId
    ON dbo.SubLocation (LocationId);
END;
