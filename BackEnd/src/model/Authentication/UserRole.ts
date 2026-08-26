import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";
import type { Role } from "./Role";
import type { User } from "./User";

export interface UserRoleAttributes {
  UserId: number;
  RoleId: number;
  AssignedBy: number | null;
  AssignedAt: Date;
  IsActive: boolean;
  RevokedBy: number | null;
  RevokedAt: Date | null;
  RevokedReason: string | null;
}

export interface UserRoleCreationAttributes
  extends Omit<UserRoleAttributes, "AssignedAt" | "IsActive"> {
  AssignedAt?: CreationOptional<Date>;
  IsActive?: CreationOptional<boolean>;
}

export class UserRole
  extends Model<InferAttributes<UserRole>, InferCreationAttributes<UserRole>>
  implements UserRoleAttributes
{
  declare UserId: ForeignKey<User["Id"]>;
  declare RoleId: ForeignKey<Role["Id"]>;
  declare AssignedBy: ForeignKey<User["Id"]> | null;
  declare AssignedAt: CreationOptional<Date>;
  declare IsActive: CreationOptional<boolean>;
  declare RevokedBy: ForeignKey<User["Id"]> | null;
  declare RevokedAt: Date | null;
  declare RevokedReason: string | null;
}

export const initUserRoleModel = (sequelize: Sequelize): typeof UserRole => {
  UserRole.init(
    {
      UserId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true
      },
      RoleId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true
      },
      AssignedBy: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      AssignedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      IsActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      RevokedBy: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      RevokedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      RevokedReason: {
        type: DataTypes.STRING(500),
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "UserRole",
      tableName: "UserRoles",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [
        {
          name: "IX_UserRole_RoleId",
          fields: ["RoleId"]
        }
      ]
    }
  );

  return UserRole;
};
