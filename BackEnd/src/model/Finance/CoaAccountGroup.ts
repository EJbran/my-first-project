import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";
import { ACCOUNT_CLASS_CODES, ACCOUNT_CLASS_NAMES, ANALYTIC_TEMPLATES } from "./chartOfAccounts.constants";

export interface CoaAccountGroupAttributes {
  id_AccountGroupCode: number;
  AccountGroupCode: string;
  AccountClassCode: string;
  AccountClassName: string;
  AccountGroupName: string;
  DefaultSuggestedModule: string | null;
  DefaultAnalyticTemplate: string | null;
  AllowedAnalyticTemplates: string | null;
  IsActive: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface CoaAccountGroupCreationAttributes
  extends Omit<
    CoaAccountGroupAttributes,
    "id_AccountGroupCode" | "IsActive" | "CreatedAt" | "UpdatedAt"
  > {
  id_AccountGroupCode?: CreationOptional<number>;
  IsActive?: CreationOptional<boolean>;
  CreatedAt?: CreationOptional<Date>;
  UpdatedAt?: CreationOptional<Date>;
}

export class CoaAccountGroup
  extends Model<InferAttributes<CoaAccountGroup>, InferCreationAttributes<CoaAccountGroup>>
  implements CoaAccountGroupAttributes
{
  declare id_AccountGroupCode: CreationOptional<number>;
  declare AccountGroupCode: string;
  declare AccountClassCode: string;
  declare AccountClassName: string;
  declare AccountGroupName: string;
  declare DefaultSuggestedModule: string | null;
  declare DefaultAnalyticTemplate: string | null;
  declare AllowedAnalyticTemplates: string | null;
  declare IsActive: CreationOptional<boolean>;
  declare CreatedAt: CreationOptional<Date>;
  declare UpdatedAt: CreationOptional<Date>;
}

export const initCoaAccountGroupModel = (sequelize: Sequelize): typeof CoaAccountGroup => {
  CoaAccountGroup.init(
    {
      id_AccountGroupCode: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      AccountGroupCode: {
        type: DataTypes.STRING(10),
        allowNull: false
      },
      AccountClassCode: {
        type: DataTypes.STRING(10),
        allowNull: false
      },
      AccountClassName: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      AccountGroupName: {
        type: DataTypes.STRING(200),
        allowNull: false
      },
      DefaultSuggestedModule: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      DefaultAnalyticTemplate: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      AllowedAnalyticTemplates: {
        type: DataTypes.STRING(500),
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
      modelName: "CoaAccountGroup",
      tableName: "COA_AccountGroup",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [
        {
          name: "PK_COA_AccountGroup",
          unique: true,
          fields: ["id_AccountGroupCode"]
        },
        {
          name: "UQ_COA_AccountGroup_AccountGroupCode",
          unique: true,
          fields: ["AccountGroupCode"]
        },
        {
          name: "IX_COA_AccountGroup_IsActive",
          fields: ["IsActive"]
        }
      ],
      validate: {
        accountClassCodeAllowed() {
          if (!ACCOUNT_CLASS_CODES.includes(String(this.AccountClassCode))) {
            throw new Error("AccountClassCode is not an allowed value");
          }
        },
        accountClassNameAllowed() {
          if (!ACCOUNT_CLASS_NAMES.includes(String(this.AccountClassName))) {
            throw new Error("AccountClassName is not an allowed value");
          }
        },
        analyticTemplateAllowed() {
          if (
            this.DefaultAnalyticTemplate &&
            !ANALYTIC_TEMPLATES.includes(this.DefaultAnalyticTemplate as never)
          ) {
            throw new Error("DefaultAnalyticTemplate is not an allowed value");
          }
        }
      }
    }
  );

  return CoaAccountGroup;
};
