import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";

export interface RoleAttributes {
  Id: number;
  Name: string;
  Description: string | null;
  IsSystemRole: boolean;
  IsActive: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface RoleCreationAttributes
  extends Omit<RoleAttributes, "Id" | "CreatedAt" | "UpdatedAt"> {
  Id?: CreationOptional<number>;
  CreatedAt?: CreationOptional<Date>;
  UpdatedAt?: CreationOptional<Date>;
}

export class Role
  extends Model<InferAttributes<Role>, InferCreationAttributes<Role>>
  implements RoleAttributes
{
  declare Id: CreationOptional<number>;
  declare Name: string;
  declare Description: string | null;
  declare IsSystemRole: CreationOptional<boolean>;
  declare IsActive: CreationOptional<boolean>;
  declare CreatedAt: CreationOptional<Date>;
  declare UpdatedAt: CreationOptional<Date>;
}

export const initRoleModel = (sequelize: Sequelize): typeof Role => {
  Role.init(
    {
      Id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },
      Name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
      },
      Description: {
        type: DataTypes.STRING(1000),
        allowNull: true
      },
      IsSystemRole: {
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
      modelName: "Role",
      tableName: "Roles",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [
        {
          name: "UQ_Role_Name",
          unique: true,
          fields: ["Name"]
        }
      ]
    }
  );

  return Role;
};
