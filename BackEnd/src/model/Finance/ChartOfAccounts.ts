import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";
import {
  ACCOUNT_CLASS_NAMES,
  ANALYTIC_TEMPLATES,
  LEGACY_ACCOUNT_TYPES
} from "./chartOfAccounts.constants";

export interface ChartOfAccountsAttributes {
  Id: number;
  NewAccountCode: string;
  Type: string | null;
  LegacyAcct: string | null;
  CleanDescription: string;
  LegacyDescription: string | null;
  AccountClassName: string;
  AccountGroupCode: string;
  AccountGroupName: string;
  SuggestedModule: string | null;
  AnalyticTemplate: string | null;
  IsActive: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface ChartOfAccountsCreationAttributes
  extends Omit<ChartOfAccountsAttributes, "Id" | "IsActive" | "CreatedAt" | "UpdatedAt"> {
  Id?: CreationOptional<number>;
  IsActive?: CreationOptional<boolean>;
  CreatedAt?: CreationOptional<Date>;
  UpdatedAt?: CreationOptional<Date>;
}

export class ChartOfAccounts
  extends Model<InferAttributes<ChartOfAccounts>, InferCreationAttributes<ChartOfAccounts>>
  implements ChartOfAccountsAttributes
{
  declare Id: CreationOptional<number>;
  declare NewAccountCode: string;
  declare Type: string | null;
  declare LegacyAcct: string | null;
  declare CleanDescription: string;
  declare LegacyDescription: string | null;
  declare AccountClassName: string;
  declare AccountGroupCode: string;
  declare AccountGroupName: string;
  declare SuggestedModule: string | null;
  declare AnalyticTemplate: string | null;
  declare IsActive: CreationOptional<boolean>;
  declare CreatedAt: CreationOptional<Date>;
  declare UpdatedAt: CreationOptional<Date>;
}

export const initChartOfAccountsModel = (sequelize: Sequelize): typeof ChartOfAccounts => {
  ChartOfAccounts.init(
    {
      Id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      NewAccountCode: {
        type: DataTypes.STRING(30),
        allowNull: false
      },
      Type: {
        type: DataTypes.STRING(5),
        allowNull: true
      },
      LegacyAcct: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      CleanDescription: {
        type: DataTypes.STRING(500),
        allowNull: false
      },
      LegacyDescription: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      AccountClassName: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      AccountGroupCode: {
        type: DataTypes.STRING(10),
        allowNull: false
      },
      AccountGroupName: {
        type: DataTypes.STRING(200),
        allowNull: false
      },
      SuggestedModule: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      AnalyticTemplate: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      IsActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
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
      modelName: "ChartOfAccounts",
      tableName: "ChartOfAccounts",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [
        {
          name: "PK_ChartOfAccounts",
          unique: true,
          fields: ["Id"]
        },
        {
          name: "UX_ChartOfAccounts_NewAccountCode",
          unique: true,
          fields: ["NewAccountCode"]
        },
        {
          name: "IX_ChartOfAccounts_AccountGroupCode",
          fields: ["AccountGroupCode"]
        },
        {
          name: "IX_ChartOfAccounts_IsActive",
          fields: ["IsActive"]
        },
        {
          name: "IX_ChartOfAccounts_LegacyAcct",
          fields: ["LegacyAcct"]
        }
      ],
      validate: {
        typeAllowed() {
          if (this.Type && !LEGACY_ACCOUNT_TYPES.includes(this.Type as never)) {
            throw new Error("Type is not an allowed value");
          }
        },
        accountClassNameAllowed() {
          if (!ACCOUNT_CLASS_NAMES.includes(String(this.AccountClassName))) {
            throw new Error("AccountClassName is not an allowed value");
          }
        },
        analyticTemplateAllowed() {
          if (this.AnalyticTemplate && !ANALYTIC_TEMPLATES.includes(this.AnalyticTemplate as never)) {
            throw new Error("AnalyticTemplate is not an allowed value");
          }
        }
      }
    }
  );

  return ChartOfAccounts;
};
