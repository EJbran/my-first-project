import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";

export type LocationAccessMode = "ALL" | "INCLUDE" | "EXCLUDE";

export interface EpsaDepartmentChartAccountAttributes {
  Id: number;
  EPSAId: number;
  DepartmentId: number;
  ChartAccountId: number | null;
  /** NULL when LocationAccessMode = ALL */
  LocationID: number | null;
  LocationAccessMode: LocationAccessMode;
  IsAllAccounts: boolean;
  IsActive: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface EpsaDepartmentChartAccountCreationAttributes
  extends Omit<
    EpsaDepartmentChartAccountAttributes,
    | "Id"
    | "LocationID"
    | "LocationAccessMode"
    | "IsAllAccounts"
    | "IsActive"
    | "CreatedAt"
    | "UpdatedAt"
  > {
  Id?: CreationOptional<number>;
  LocationID?: CreationOptional<number | null>;
  LocationAccessMode?: CreationOptional<LocationAccessMode>;
  IsAllAccounts?: CreationOptional<boolean>;
  IsActive?: CreationOptional<boolean>;
  CreatedAt?: CreationOptional<Date>;
  UpdatedAt?: CreationOptional<Date>;
}

export class EpsaDepartmentChartAccount
  extends Model<
    InferAttributes<EpsaDepartmentChartAccount>,
    InferCreationAttributes<EpsaDepartmentChartAccount>
  >
  implements EpsaDepartmentChartAccountAttributes
{
  declare Id: CreationOptional<number>;
  declare EPSAId: number;
  declare DepartmentId: number;
  declare ChartAccountId: number | null;
  declare LocationID: CreationOptional<number | null>;
  declare LocationAccessMode: CreationOptional<LocationAccessMode>;
  declare IsAllAccounts: CreationOptional<boolean>;
  declare IsActive: CreationOptional<boolean>;
  declare CreatedAt: CreationOptional<Date>;
  declare UpdatedAt: CreationOptional<Date>;
}

export const initEpsaDepartmentChartAccountModel = (
  sequelize: Sequelize
): typeof EpsaDepartmentChartAccount => {
  EpsaDepartmentChartAccount.init(
    {
      Id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      EPSAId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      DepartmentId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      ChartAccountId: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      LocationID: {
        type: DataTypes.BIGINT,
        allowNull: true,
        field: "LocationID"
      },
      LocationAccessMode: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "ALL",
        field: "LocationAccessMode"
      },
      IsAllAccounts: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
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
      modelName: "EpsaDepartmentChartAccount",
      tableName: "EPSA_Department_ChartAccount",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [
        {
          name: "PK_EPSA_Department_ChartAccount",
          unique: true,
          fields: ["Id"]
        },
        {
          name: "IX_EPSA_Department_ChartAccount_EPSAId",
          fields: ["EPSAId"]
        },
        {
          name: "IX_EPSA_Department_ChartAccount_DepartmentId",
          fields: ["DepartmentId"]
        },
        {
          name: "IX_EPSA_Department_ChartAccount_ChartAccountId",
          fields: ["ChartAccountId"]
        },
        {
          name: "IX_EPSA_Department_ChartAccount_LocationID",
          fields: ["LocationID"]
        },
        {
          name: "IX_EPSA_Department_ChartAccount_LocationAccessMode",
          fields: ["LocationAccessMode"]
        },
        {
          name: "IX_EPSA_Department_ChartAccount_IsActive",
          fields: ["IsActive"]
        }
      ]
    }
  );

  return EpsaDepartmentChartAccount;
};
