import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";
import {
  ACCESS_REQUEST_STATUSES,
  ACCESS_REQUEST_TYPES,
  AccessRequestStatus,
  AccessRequestType
} from "../types/auth.enums";
import type { Permission } from "./Permission";
import type { Role } from "./Role";
import type { User } from "./User";

export interface AccessRequestAttributes {
  Id: number;
  RequestedForUserId: number;
  RequestedByUserId: number;
  RequestType: AccessRequestType;
  RoleId: number | null;
  PermissionId: number | null;
  Reason: string | null;
  Status: AccessRequestStatus;
  CreatedAt: Date;
  CompletedAt: Date | null;
}

export interface AccessRequestCreationAttributes
  extends Omit<AccessRequestAttributes, "Id" | "Status" | "CreatedAt"> {
  Id?: CreationOptional<number>;
  Status?: CreationOptional<AccessRequestStatus>;
  CreatedAt?: CreationOptional<Date>;
}

export class AccessRequest
  extends Model<
    InferAttributes<AccessRequest>,
    InferCreationAttributes<AccessRequest>
  >
  implements AccessRequestAttributes
{
  declare Id: CreationOptional<number>;
  declare RequestedForUserId: ForeignKey<User["Id"]>;
  declare RequestedByUserId: ForeignKey<User["Id"]>;
  declare RequestType: AccessRequestType;
  declare RoleId: ForeignKey<Role["Id"]> | null;
  declare PermissionId: ForeignKey<Permission["Id"]> | null;
  declare Reason: string | null;
  declare Status: CreationOptional<AccessRequestStatus>;
  declare CreatedAt: CreationOptional<Date>;
  declare CompletedAt: Date | null;
}

export const initAccessRequestModel = (
  sequelize: Sequelize
): typeof AccessRequest => {
  AccessRequest.init(
    {
      Id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },
      RequestedForUserId: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      RequestedByUserId: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      RequestType: {
        type: DataTypes.ENUM(...ACCESS_REQUEST_TYPES),
        allowNull: false
      },
      RoleId: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      PermissionId: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      Reason: {
        type: DataTypes.STRING(1000),
        allowNull: true
      },
      Status: {
        type: DataTypes.ENUM(...ACCESS_REQUEST_STATUSES),
        allowNull: false,
        defaultValue: "PENDING"
      },
      CreatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      CompletedAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "AccessRequest",
      tableName: "AccessRequest",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      validate: {
        roleOrPermissionExclusively() {
          const hasRole = Boolean(this.RoleId);
          const hasPermission = Boolean(this.PermissionId);
          if (hasRole === hasPermission) {
            throw new Error("Exactly one of RoleId or PermissionId must be provided");
          }
        }
      },
      indexes: [
        {
          name: "IX_AccessRequest_RequestedForUserId",
          fields: ["RequestedForUserId"]
        },
        {
          name: "IX_AccessRequest_Status",
          fields: ["Status"]
        }
      ]
    }
  );

  return AccessRequest;
};
