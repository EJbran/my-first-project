import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";

export interface PermissionGroupAttributes {
  Id: number;
  GroupCode: string;
  GroupName: string;
  Module: string;
  Description: string | null;
  CreatedAt: Date;
}

export interface PermissionGroupCreationAttributes
  extends Omit<PermissionGroupAttributes, "Id" | "CreatedAt"> {
  Id?: CreationOptional<number>;
  CreatedAt?: CreationOptional<Date>;
}

export class PermissionGroup
  extends Model<
    InferAttributes<PermissionGroup>,
    InferCreationAttributes<PermissionGroup>
  >
  implements PermissionGroupAttributes
{
  declare Id: CreationOptional<number>;
  declare GroupCode: string;
  declare GroupName: string;
  declare Module: string;
  declare Description: string | null;
  declare CreatedAt: CreationOptional<Date>;
}

export const initPermissionGroupModel = (
  sequelize: Sequelize
): typeof PermissionGroup => {
  PermissionGroup.init(
    {
      Id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },
      GroupCode: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
      },
      GroupName: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      Module: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      Description: {
        type: DataTypes.STRING(1000),
        allowNull: true
      },
      CreatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: "PermissionGroup",
      tableName: "PermissionGroup",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [
        {
          name: "UQ_PermissionGroup_GroupCode",
          unique: true,
          fields: ["GroupCode"]
        }
      ]
    }
  );

  return PermissionGroup;
};
