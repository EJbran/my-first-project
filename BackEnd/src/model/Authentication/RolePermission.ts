import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";
import type { Permission } from "./Permission";
import type { Role } from "./Role";
import type { User } from "./User";

export interface RolePermissionAttributes {
  RoleId: number;
  PermissionId: number;
  GrantedBy: number | null;
  GrantedAt: Date;
}

export interface RolePermissionCreationAttributes
  extends Omit<RolePermissionAttributes, "GrantedAt"> {
  GrantedAt?: CreationOptional<Date>;
}

export class RolePermission
  extends Model<
    InferAttributes<RolePermission>,
    InferCreationAttributes<RolePermission>
  >
  implements RolePermissionAttributes
{
  declare RoleId: ForeignKey<Role["Id"]>;
  declare PermissionId: ForeignKey<Permission["Id"]>;
  declare GrantedBy: ForeignKey<User["Id"]> | null;
  declare GrantedAt: CreationOptional<Date>;
}

export const initRolePermissionModel = (
  sequelize: Sequelize
): typeof RolePermission => {
  RolePermission.init(
    {
      RoleId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true
      },
      PermissionId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true
      },
      GrantedBy: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      GrantedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: "RolePermission",
      tableName: "RolePermissions",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [
        {
          name: "IX_RolePermission_PermissionId",
          fields: ["PermissionId"]
        }
      ]
    }
  );

  return RolePermission;
};
