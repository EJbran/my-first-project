import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";

export interface PermissionAttributes {
  Id: number;
  Code: string;
  Module: string;
  ActionName: string;
  Description: string | null;
  IsActive: boolean;
  CreatedAt: Date;
}

export interface PermissionCreationAttributes
  extends Omit<PermissionAttributes, "Id" | "CreatedAt"> {
  Id?: CreationOptional<number>;
  CreatedAt?: CreationOptional<Date>;
}

export class Permission
  extends Model<InferAttributes<Permission>, InferCreationAttributes<Permission>>
  implements PermissionAttributes
{
  declare Id: CreationOptional<number>;
  declare Code: string;
  declare Module: string;
  declare ActionName: string;
  declare Description: string | null;
  declare IsActive: CreationOptional<boolean>;
  declare CreatedAt: CreationOptional<Date>;
}

export const initPermissionModel = (sequelize: Sequelize): typeof Permission => {
  Permission.init(
    {
      Id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },
      Code: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
      },
      Module: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      ActionName: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      Description: {
        type: DataTypes.STRING(1000),
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
      }
    },
    {
      sequelize,
      modelName: "Permission",
      tableName: "Permissions",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [
        {
          name: "UQ_Permission_Code",
          unique: true,
          fields: ["Code"]
        },
        {
          name: "IX_Permission_Module",
          fields: ["Module"]
        }
      ]
    }
  );

  return Permission;
};
