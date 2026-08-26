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

IF SCHEMA_ID(N'dbo') IS NULL EXEC(N'CREATE SCHEMA [dbo]');

IF OBJECT_ID(N'[dbo].[Location]', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[Location] (
    [ID_Location] int IDENTITY(1,1) NOT NULL,
    [LocationName_ar] nvarchar(200) NULL,
    [LocationName_en] nvarchar(200) NOT NULL,
    [LocationCode] nvarchar(50) NOT NULL,
    [LocationInMap] varbinary(max) NULL,
    CONSTRAINT [PK_Location] PRIMARY KEY CLUSTERED ([ID_Location])
  );
END;

IF OBJECT_ID(N'[dbo].[Departments]', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[Departments] (
    [Id] int IDENTITY(1,1) NOT NULL,
    [DepartmentName_Arabic] nvarchar(2000) NOT NULL,
    [DepartmentName_English] nvarchar(2000) NOT NULL,
    [DepartmentType] nvarchar(100) NULL,
    [AttachedNumber] int NULL,
    [DepartmentAddress] nvarchar(2000) NOT NULL,
    [DepartmentPhone] nvarchar(2000) NOT NULL,
    [DepartmentExtenstion] nvarchar(2000) NOT NULL,
    CONSTRAINT [PK_Departments] PRIMARY KEY CLUSTERED ([Id])
  );
END;

IF OBJECT_ID(N'[dbo].[jobs]', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[jobs] (
    [Job_ID] int NOT NULL,
    [Job_Name_AR] nvarchar(max) NOT NULL CONSTRAINT [DF_jobs_Job_Name_AR] DEFAULT N'',
    [Job_Name_EN] nvarchar(max) NOT NULL CONSTRAINT [DF_jobs_Job_Name_EN] DEFAULT N'',
    [Job_Family] nvarchar(max) NOT NULL CONSTRAINT [DF_jobs_Job_Family] DEFAULT N'',
    [Career_Level] nvarchar(max) NOT NULL CONSTRAINT [DF_jobs_Career_Level] DEFAULT N'',
    [Role_Criticality] nvarchar(max) NOT NULL CONSTRAINT [DF_jobs_Role_Criticality] DEFAULT N'',
    [Role_Purpose] nvarchar(max) NOT NULL CONSTRAINT [DF_jobs_Role_Purpose] DEFAULT N'',
    [Key_Accountabilities] nvarchar(max) NOT NULL CONSTRAINT [DF_jobs_Key_Accountabilities] DEFAULT N'',
    [Typical_Deliverables] nvarchar(max) NOT NULL CONSTRAINT [DF_jobs_Typical_Deliverables] DEFAULT N'',
    [Minimum_Education_Benchmark] nvarchar(max) NOT NULL CONSTRAINT [DF_jobs_Minimum_Education] DEFAULT N'',
    [Preferred_Qualifications] nvarchar(max) NOT NULL CONSTRAINT [DF_jobs_Preferred_Qualifications] DEFAULT N'',
    [Minimum_Experience_Benchmark] nvarchar(max) NOT NULL CONSTRAINT [DF_jobs_Minimum_Experience] DEFAULT N'',
    [Technical_Competencies] nvarchar(max) NOT NULL CONSTRAINT [DF_jobs_Technical_Competencies] DEFAULT N'',
    [Behavioral_Competencies] nvarchar(max) NOT NULL CONSTRAINT [DF_jobs_Behavioral_Competencies] DEFAULT N'',
    [HSE_Process_Safety_Accountabilities] nvarchar(max) NOT NULL CONSTRAINT [DF_jobs_HSE] DEFAULT N'',
    [Mandatory_Training_Licences_Benchmark] nvarchar(max) NOT NULL CONSTRAINT [DF_jobs_Mandatory_Training] DEFAULT N'',
    [Applicable_Standards_Procedures] nvarchar(max) NOT NULL CONSTRAINT [DF_jobs_Standards] DEFAULT N'',
    [Decision_Authority] nvarchar(max) NOT NULL CONSTRAINT [DF_jobs_Decision_Authority] DEFAULT N'',
    [Supervisory_Scope] nvarchar(max) NOT NULL CONSTRAINT [DF_jobs_Supervisory_Scope] DEFAULT N'',
    [Key_Interfaces] nvarchar(max) NOT NULL CONSTRAINT [DF_jobs_Key_Interfaces] DEFAULT N'',
    [Work_Environment_and_Schedule] nvarchar(max) NOT NULL CONSTRAINT [DF_jobs_Work_Environment] DEFAULT N'',
    [Physical_Medical_Fitness] nvarchar(max) NOT NULL CONSTRAINT [DF_jobs_Physical_Fitness] DEFAULT N'',
    [Competency_Assurance_Method] nvarchar(max) NOT NULL CONSTRAINT [DF_jobs_Competency_Assurance] DEFAULT N'',
    [KPI_Benchmark] nvarchar(max) NOT NULL CONSTRAINT [DF_jobs_KPI] DEFAULT N'',
    [Required_Languages] nvarchar(max) NOT NULL CONSTRAINT [DF_jobs_Required_Languages] DEFAULT N'',
    [Language_Level_CEFR] nvarchar(max) NOT NULL CONSTRAINT [DF_jobs_Language_Level] DEFAULT N'',
    [Job_Type] nvarchar(max) NOT NULL CONSTRAINT [DF_jobs_Job_Type] DEFAULT N'',
    [Profile_Validation_Owner] nvarchar(max) NOT NULL CONSTRAINT [DF_jobs_Profile_Owner] DEFAULT N'',
    CONSTRAINT [PK_jobs] PRIMARY KEY CLUSTERED ([Job_ID])
  );
END;

IF OBJECT_ID(N'[dbo].[LineLevel]', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[LineLevel] (
    [Line_ID] int NOT NULL,
    [SortLine] int NOT NULL,
    [ArabicDescription] nvarchar(200) NOT NULL,
    [EnglishDescription] nvarchar(200) NOT NULL,
    CONSTRAINT [PK_LineLevel] PRIMARY KEY CLUSTERED ([Line_ID])
  );
END;

IF OBJECT_ID(N'[dbo].[Employee]', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[Employee] (
    [ID_Employee] int IDENTITY(1,1) NOT NULL,
    [Ref_Employee] nvarchar(50) NULL,
    [EmployeeName] nvarchar(200) NULL,
    [EmployeeName_En] nvarchar(200) NOT NULL,
    [Gender] nvarchar(50) NULL,
    [DateOFBirth] date NULL,
    [Phone] nvarchar(50) NULL,
    [Email] nvarchar(255) NULL,
    [State] bit NULL CONSTRAINT [DF_Employee_State] DEFAULT (1),
    [Contract_Type] nvarchar(100) NULL,
    [Start_of_Contract] date NULL,
    [Type_Employee] nvarchar(100) NULL,
    [Department_Id] int NULL,
    [Location_Id] int NULL,
    [Address] nvarchar(500) NULL,
    [Notes] nvarchar(max) NULL,
    [Marital_Status] nvarchar(50) NULL,
    [Nationality] nvarchar(100) NULL,
    [MotherName] nvarchar(100) NULL,
    [PlaceOFBirth] nvarchar(100) NULL,
    [Blood_type] nvarchar(10) NULL,
    [Children_Number] int NULL,
    [IS_FOREINGHT] bit NULL,
    [NationalNumber] nvarchar(100) NULL,
    [Registration_Num] nvarchar(50) NULL,
    [FamilyBook_No] nvarchar(50) NULL,
    [FamilyBook_Issuer] nvarchar(150) NULL,
    [FamilyPage_Num] nvarchar(50) NULL,
    [FamilyPageBook_Num] nvarchar(50) NULL,
    [IdentityCard_Num] nvarchar(50) NULL,
    [IdentityCard_Issuer] nvarchar(150) NULL,
    [Passport_Num] nvarchar(50) NULL,
    [PassportExpiryDate] date NULL,
    [Passport_Issuer] nvarchar(150) NULL,
    [DateVisa_End] date NULL,
    [IS_DrivingLicense] bit NULL,
    [DrivingLicense_Num] nvarchar(50) NULL,
    [End_of_contrat] date NULL,
    [Period_Contract] nvarchar(50) NULL,
    [WorkSystem] nvarchar(100) NULL,
    [WorkSystem_Description] nvarchar(max) NULL,
    [Time_Start] nvarchar(50) NULL,
    [Time_End] nvarchar(50) NULL,
    [Degree_Employee] nvarchar(100) NULL,
    [IS_OK_POUR_MALAK] bit NULL,
    [AssignedPosition_Id] int NULL,
    [AssignedPositionDegree] nvarchar(100) NULL,
    [AssignedPositionNum] nvarchar(100) NULL,
    [SecondedPosition_Id] int NULL,
    [SecondedPositionDegree] nvarchar(100) NULL,
    [SecondedPositionNum] int NULL,
    [AppointmentDecision_Number] nvarchar(500) NULL,
    [AppointmentDecision_Date] date NULL,
    [AppointmentDecision_Issuer] nvarchar(500) NULL,
    [CompanyDecision_Number] nvarchar(500) NULL,
    [CompanyDecision_Date] date NULL,
    [AppointmentType] nvarchar(100) NULL,
    [Type_END_CONTRACT] nvarchar(150) NULL,
    [Finance_Num] nvarchar(50) NULL,
    [INAS_Type] nvarchar(100) NULL,
    [INAS_Number] nvarchar(max) NULL,
    [Bank] int NULL,
    [BankAccount_Number] nvarchar(150) NULL,
    [Base_Salary] decimal(18,3) NULL,
    [FieldAllowance] int NULL,
    [EducationalQualification_AsHiring] nvarchar(200) NULL,
    [AcademicQualification_AsTime] nvarchar(200) NULL,
    [GraduationDate] nvarchar(100) NULL,
    [Specialization] nvarchar(200) NULL,
    [CurrentQualification_Date] nvarchar(50) NULL,
    [VacationTransfer_Date] date NULL,
    [Vacation_balance] nvarchar(100) NULL,
    [Year_suppliment_Day] int NULL CONSTRAINT [DF_Employee_SupplementDay] DEFAULT (0),
    [DateYear_Suppliment] date NULL,
    [YearSuppliment_YEAR] int NULL CONSTRAINT [DF_Employee_SupplementYear] DEFAULT (0),
    [YearSuppliment_MONTH] int NULL CONSTRAINT [DF_Employee_SupplementMonth] DEFAULT (0),
    [PracticeLicense_Start] date NULL,
    [PracticeLicense_End] date NULL,
    [ZONNE] nvarchar(100) NULL,
    [IS_EMPRENTED] bit NULL,
    [TYPE_TRAVAIL_WARDIA] nvarchar(100) NULL,
    [Stop_takrim] bit NULL CONSTRAINT [DF_Employee_StopTakrim] DEFAULT (0),
    [Notes_Stop_takrim] nvarchar(max) NULL,
    [Percent_takrim] decimal(18,3) NULL CONSTRAINT [DF_Employee_PercentTakrim] DEFAULT (100),
    [Date_urgent_takrim] date NULL,
    [OLD_EMP_NUM2] nvarchar(50) NULL,
    [OLD_EMP_NUM3] nvarchar(50) NULL,
    [OLD_EMP_NUM4] nvarchar(50) NULL,
    [OLD_EMP_NUM5] nvarchar(50) NULL,
    [OLD_JobId3] int NULL,
    [OLD_JobDEGREE_3] nvarchar(100) NULL,
    [OLD_JobNum3] nvarchar(100) NULL,
    [OLD_JobId4] nvarchar(200) NULL,
    [OLD_JobDEGREE_4] nvarchar(100) NULL,
    [OLD_JobNum4] nvarchar(50) NULL,
    [OLD_JobId5] nvarchar(200) NULL,
    [OLD_JobDEGREE_5] nvarchar(100) NULL,
    [OLD_JobNum5] nvarchar(50) NULL,
    [Tadawul_No] nvarchar(50) NULL,
    [MedicalSymptoms] nvarchar(max) NULL,
    [SuitNumber] nvarchar(50) NULL,
    [ShoesNumber] nvarchar(50) NULL,
    [Comment_one] nvarchar(max) NULL,
    CONSTRAINT [PK_Employee] PRIMARY KEY CLUSTERED ([ID_Employee]),
    CONSTRAINT [CK_Employee_Ref_NotZero]
      CHECK (
        [Ref_Employee] IS NULL
        OR (
          LEN(LTRIM(RTRIM([Ref_Employee]))) > 0
          AND (
            TRY_CONVERT(decimal(38, 10), LTRIM(RTRIM([Ref_Employee]))) IS NULL
            OR TRY_CONVERT(decimal(38, 10), LTRIM(RTRIM([Ref_Employee]))) <> 0
          )
        )
      ),
    CONSTRAINT [CK_Employee_Supplement_Nonnegative]
      CHECK (
        COALESCE([YearSuppliment_YEAR], 0) >= 0
        AND COALESCE([YearSuppliment_MONTH], 0) >= 0
        AND COALESCE([Year_suppliment_Day], 0) >= 0
      )
  );
END;

IF OBJECT_ID(N'[dbo].[Position]', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[Position] (
    [Id] int IDENTITY(1,1) NOT NULL,
    [Position_Number] bigint NULL,
    [PositionLevel] nvarchar(50) NULL,
    [Position_Degree] nvarchar(50) NULL,
    [Position_DateCreation] date NULL,
    [Status] nvarchar(50) NULL,
    [Position_Type] nvarchar(50) NULL,
    [EmployeeId] int NULL,
    [Job_ID] int NULL,
    [LineLevelId] int NULL,
    CONSTRAINT [PK_Position] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [CK_Position_EmployeeId_Positive]
      CHECK ([EmployeeId] IS NULL OR [EmployeeId] > 0)
  );
END;

IF COL_LENGTH(N'dbo.Position', N'LineLevelId') IS NULL
BEGIN
  ALTER TABLE [dbo].[Position] ADD [LineLevelId] int NULL;
END;

IF EXISTS (
  SELECT 1
  FROM sys.foreign_keys AS foreignKey
  WHERE foreignKey.[parent_object_id] = OBJECT_ID(N'dbo.Employee')
    AND foreignKey.[name] = N'FK_Employee_Departments'
    AND (
      foreignKey.[referenced_object_id] <> OBJECT_ID(N'dbo.Departments')
      OR foreignKey.[delete_referential_action] <> 0
      OR foreignKey.[update_referential_action] <> 0
      OR (
        SELECT COUNT_BIG(*)
        FROM sys.foreign_key_columns AS constraintColumn
        WHERE constraintColumn.[constraint_object_id] = foreignKey.[object_id]
      ) <> 1
      OR NOT EXISTS (
        SELECT 1
        FROM sys.foreign_key_columns AS foreignKeyColumn
        WHERE foreignKeyColumn.[constraint_object_id] = foreignKey.[object_id]
          AND foreignKeyColumn.[parent_column_id] = COLUMNPROPERTY(
            OBJECT_ID(N'dbo.Employee'), N'Department_Id', N'ColumnId'
          )
          AND foreignKeyColumn.[referenced_column_id] = COLUMNPROPERTY(
            OBJECT_ID(N'dbo.Departments'), N'Id', N'ColumnId'
          )
      )
    )
)
  THROW 51020, N'FK_Employee_Departments exists with an unexpected definition.', 1;

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE [parent_object_id] = OBJECT_ID(N'dbo.Employee')
    AND [name] = N'FK_Employee_Departments'
)
  ALTER TABLE [dbo].[Employee] WITH CHECK ADD CONSTRAINT [FK_Employee_Departments]
    FOREIGN KEY ([Department_Id]) REFERENCES [dbo].[Departments] ([Id]);

ALTER TABLE [dbo].[Employee] WITH CHECK
  CHECK CONSTRAINT [FK_Employee_Departments];

IF NOT EXISTS (
  SELECT 1 FROM sys.foreign_keys WHERE [name] = N'FK_Employee_Location'
)
  ALTER TABLE [dbo].[Employee] WITH CHECK ADD CONSTRAINT [FK_Employee_Location]
    FOREIGN KEY ([Location_Id]) REFERENCES [dbo].[Location] ([ID_Location]);

IF NOT EXISTS (
  SELECT 1 FROM sys.foreign_keys WHERE [name] = N'FK_Position_Employee'
)
  ALTER TABLE [dbo].[Position] WITH CHECK ADD CONSTRAINT [FK_Position_Employee]
    FOREIGN KEY ([EmployeeId]) REFERENCES [dbo].[Employee] ([ID_Employee]);

IF NOT EXISTS (
  SELECT 1 FROM sys.foreign_keys WHERE [name] = N'FK_Position_Jobs'
)
  ALTER TABLE [dbo].[Position] WITH CHECK ADD CONSTRAINT [FK_Position_Jobs]
    FOREIGN KEY ([Job_ID]) REFERENCES [dbo].[jobs] ([Job_ID]);

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE [parent_object_id] = OBJECT_ID(N'[dbo].[Position]')
    AND [name] = N'FK_Position_LineLevel'
)
BEGIN
  ALTER TABLE [dbo].[Position] WITH CHECK ADD CONSTRAINT [FK_Position_LineLevel]
    FOREIGN KEY ([LineLevelId]) REFERENCES [dbo].[LineLevel] ([Line_ID]);
  ALTER TABLE [dbo].[Position] CHECK CONSTRAINT [FK_Position_LineLevel];
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE [object_id] = OBJECT_ID(N'[dbo].[Location]')
    AND [name] = N'UX_Location_LocationCode'
)
  CREATE UNIQUE INDEX [UX_Location_LocationCode]
    ON [dbo].[Location] ([LocationCode]);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE [object_id] = OBJECT_ID(N'[dbo].[Employee]')
    AND [name] = N'UX_Employee_Ref_Employee'
)
  CREATE UNIQUE INDEX [UX_Employee_Ref_Employee]
    ON [dbo].[Employee] ([Ref_Employee])
    WHERE [Ref_Employee] IS NOT NULL;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE [object_id] = OBJECT_ID(N'[dbo].[Employee]')
    AND [name] = N'IX_Employee_Department_Id'
)
  CREATE INDEX [IX_Employee_Department_Id]
    ON [dbo].[Employee] ([Department_Id]);

IF EXISTS (
  SELECT 1
  FROM sys.indexes AS indexMetadata
  WHERE indexMetadata.[object_id] = OBJECT_ID(N'dbo.Employee')
    AND indexMetadata.[name] = N'IX_Employee_Department_Id'
    AND (
      indexMetadata.[is_disabled] = 1
      OR indexMetadata.[is_unique] = 1
      OR indexMetadata.[has_filter] = 1
      OR (
        SELECT COUNT_BIG(*)
        FROM sys.index_columns AS keyColumn
        WHERE keyColumn.[object_id] = indexMetadata.[object_id]
          AND keyColumn.[index_id] = indexMetadata.[index_id]
          AND keyColumn.[key_ordinal] > 0
      ) <> 1
      OR NOT EXISTS (
        SELECT 1
        FROM sys.index_columns AS departmentKey
        WHERE departmentKey.[object_id] = indexMetadata.[object_id]
          AND departmentKey.[index_id] = indexMetadata.[index_id]
          AND departmentKey.[column_id] = COLUMNPROPERTY(
            OBJECT_ID(N'dbo.Employee'), N'Department_Id', N'ColumnId'
          )
          AND departmentKey.[key_ordinal] = 1
      )
    )
)
  THROW 51021, N'IX_Employee_Department_Id exists with an unexpected definition.', 1;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE [object_id] = OBJECT_ID(N'[dbo].[Employee]')
    AND [name] = N'IX_Employee_Location_Id'
)
  CREATE INDEX [IX_Employee_Location_Id]
    ON [dbo].[Employee] ([Location_Id]);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE [object_id] = OBJECT_ID(N'[dbo].[Position]')
    AND [name] = N'UX_Position_EmployeeId_Occupied'
)
  CREATE UNIQUE INDEX [UX_Position_EmployeeId_Occupied]
    ON [dbo].[Position] ([EmployeeId])
    WHERE [EmployeeId] IS NOT NULL;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE [object_id] = OBJECT_ID(N'[dbo].[Position]')
    AND [name] = N'IX_Position_Job_ID'
)
  CREATE INDEX [IX_Position_Job_ID] ON [dbo].[Position] ([Job_ID]);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE [object_id] = OBJECT_ID(N'[dbo].[Position]')
    AND [name] = N'IX_Position_Position_Number'
)
  CREATE INDEX [IX_Position_Position_Number] ON [dbo].[Position] ([Position_Number]);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE [object_id] = OBJECT_ID(N'[dbo].[Position]')
    AND [name] = N'IX_Position_LineLevelId'
)
  CREATE INDEX [IX_Position_LineLevelId] ON [dbo].[Position] ([LineLevelId]);

EXEC(N'
CREATE OR ALTER VIEW [dbo].[vw_CurrentEmployeePosition]
AS
SELECT
  position.[EmployeeId],
  position.[Id] AS [PositionId],
  position.[Position_Number],
  position.[PositionLevel],
  position.[Position_Degree],
  position.[Position_DateCreation],
  position.[Status] AS [PositionStatus],
  position.[Position_Type],
  position.[Job_ID],
  job.[Job_Name_AR],
  job.[Job_Name_EN]
FROM [dbo].[Position] AS position
LEFT JOIN [dbo].[jobs] AS job ON job.[Job_ID] = position.[Job_ID]
WHERE position.[EmployeeId] IS NOT NULL;
');

EXEC(N'
CREATE OR ALTER VIEW [dbo].[vw_VacantPositions]
AS
SELECT
  position.[Id] AS [PositionId],
  position.[Position_Number],
  position.[PositionLevel],
  position.[Position_Degree],
  position.[Position_DateCreation],
  position.[Status],
  position.[Position_Type],
  position.[Job_ID],
  job.[Job_Name_AR],
  job.[Job_Name_EN]
FROM [dbo].[Position] AS position
LEFT JOIN [dbo].[jobs] AS job ON job.[Job_ID] = position.[Job_ID]
WHERE position.[EmployeeId] IS NULL;
');

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
