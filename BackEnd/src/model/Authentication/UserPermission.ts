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
import type { User } from "./User";

export interface UserPermissionAttributes {
  UserId: number;
  PermissionId: number;
  IsGranted: boolean;
  Reason: string | null;
  GrantedBy: number | null;
  GrantedAt: Date;
  ExpiresAt: Date | null;
}

export interface UserPermissionCreationAttributes
  extends Omit<UserPermissionAttributes, "IsGranted" | "GrantedAt"> {
  IsGranted?: CreationOptional<boolean>;
  GrantedAt?: CreationOptional<Date>;
}

export class UserPermission
  extends Model<
    InferAttributes<UserPermission>,
    InferCreationAttributes<UserPermission>
  >
  implements UserPermissionAttributes
{
  declare UserId: ForeignKey<User["Id"]>;
  declare PermissionId: ForeignKey<Permission["Id"]>;
  declare IsGranted: CreationOptional<boolean>;
  declare Reason: string | null;
  declare GrantedBy: ForeignKey<User["Id"]> | null;
  declare GrantedAt: CreationOptional<Date>;
  declare ExpiresAt: Date | null;
}

export const initUserPermissionModel = (
  sequelize: Sequelize
): typeof UserPermission => {
  UserPermission.init(
    {
      UserId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true
      },
      PermissionId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true
      },
      IsGranted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      Reason: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      GrantedBy: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      GrantedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      ExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "UserPermission",
      tableName: "UserPermissions",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [
        {
          name: "IX_UserPermission_PermissionId",
          fields: ["PermissionId"]
        }
      ]
    }
  );

  return UserPermission;
};
