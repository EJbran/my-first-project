import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";

export interface AFEAttributes {
  Id: number;
  SourceLineNo: number | null;
  ImportBatchNo: string | null;
  AFENo: string;
  AFEDescription: string;
  AFEDescriptionArabic: string | null;
  LegacyDescription: string | null;
  LegacyLocationCode: string | null;
  LegacyDepartmentCode: string | null;
  LegacyDepartmentName: string | null;
  EPSAId: number | null;
  DepartmentId: number | null;
  LocationId: number | null;
  AFEType: string;
  AFECategory: string | null;
  ProjectNature: string | null;
  Priority: string | null;
  StartDate: string | Date | null;
  EndDate: string | Date | null;
  PlannedStartDate: string | Date | null;
  PlannedEndDate: string | Date | null;
  CurrencyCode: string;
  EstimatedBudget: number | null;
  ApprovedBudget: number | null;
  CommittedAmount: number;
  ActualAmount: number;
  DefaultChartAccountId: number | null;
  IsBudgetControlled: boolean;
  IsCapitalizable: boolean | null;
  RequiresAFEOnTransaction: boolean;
  Status: string;
  IsActive: boolean;
  Notes: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface AFECreationAttributes
  extends Omit<
    AFEAttributes,
    | "Id"
    | "CommittedAmount"
    | "ActualAmount"
    | "IsBudgetControlled"
    | "RequiresAFEOnTransaction"
    | "IsActive"
    | "CreatedAt"
    | "UpdatedAt"
  > {
  Id?: CreationOptional<number>;
  CommittedAmount?: CreationOptional<number>;
  ActualAmount?: CreationOptional<number>;
  IsBudgetControlled?: CreationOptional<boolean>;
  RequiresAFEOnTransaction?: CreationOptional<boolean>;
  IsActive?: CreationOptional<boolean>;
  CreatedAt?: CreationOptional<Date>;
  UpdatedAt?: CreationOptional<Date>;
}

export class AFE
  extends Model<InferAttributes<AFE>, InferCreationAttributes<AFE>>
  implements AFEAttributes
{
  declare Id: CreationOptional<number>;
  declare SourceLineNo: number | null;
  declare ImportBatchNo: string | null;
  declare AFENo: string;
  declare AFEDescription: string;
  declare AFEDescriptionArabic: string | null;
  declare LegacyDescription: string | null;
  declare LegacyLocationCode: string | null;
  declare LegacyDepartmentCode: string | null;
  declare LegacyDepartmentName: string | null;
  declare EPSAId: number | null;
  declare DepartmentId: number | null;
  declare LocationId: number | null;
  declare AFEType: string;
  declare AFECategory: string | null;
  declare ProjectNature: string | null;
  declare Priority: string | null;
  declare StartDate: string | Date | null;
  declare EndDate: string | Date | null;
  declare PlannedStartDate: string | Date | null;
  declare PlannedEndDate: string | Date | null;
  declare CurrencyCode: string;
  declare EstimatedBudget: number | null;
  declare ApprovedBudget: number | null;
  declare CommittedAmount: CreationOptional<number>;
  declare ActualAmount: CreationOptional<number>;
  declare DefaultChartAccountId: number | null;
  declare IsBudgetControlled: CreationOptional<boolean>;
  declare IsCapitalizable: boolean | null;
  declare RequiresAFEOnTransaction: CreationOptional<boolean>;
  declare Status: string;
  declare IsActive: CreationOptional<boolean>;
  declare Notes: string | null;
  declare CreatedAt: CreationOptional<Date>;
  declare UpdatedAt: CreationOptional<Date>;
}

export const initAFEModel = (sequelize: Sequelize): typeof AFE => {
  AFE.init(
    {
      Id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      SourceLineNo: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      ImportBatchNo: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      AFENo: {
        type: DataTypes.STRING(50),
        allowNull: false
        // Intentionally NOT unique — legacy AFENo may be duplicated across rows.
      },
      AFEDescription: {
        type: DataTypes.STRING(500),
        allowNull: false
      },
      AFEDescriptionArabic: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      LegacyDescription: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      LegacyLocationCode: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      LegacyDepartmentCode: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      LegacyDepartmentName: {
        type: DataTypes.STRING(200),
        allowNull: true
      },
      EPSAId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      DepartmentId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      LocationId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      AFEType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "GENERAL"
      },
      AFECategory: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      ProjectNature: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      Priority: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      StartDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      EndDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      PlannedStartDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      PlannedEndDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      CurrencyCode: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: "LYD"
      },
      EstimatedBudget: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: true
      },
      ApprovedBudget: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: true
      },
      CommittedAmount: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0
      },
      ActualAmount: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0
      },
      DefaultChartAccountId: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      IsBudgetControlled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      IsCapitalizable: {
        type: DataTypes.BOOLEAN,
        allowNull: true
      },
      RequiresAFEOnTransaction: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      Status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "ACTIVE"
      },
      IsActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      Notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      CreatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      UpdatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: "AFE",
      tableName: "AFE",
      schema: "dbo",
      timestamps: true,
      createdAt: "CreatedAt",
      updatedAt: "UpdatedAt",
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [
        {
          name: "PK_AFE",
          unique: true,
          fields: ["Id"]
        }
        // Do NOT add a unique index on AFENo — duplicates are valid legacy data.
      ]
    }
  );

  return AFE;
};
