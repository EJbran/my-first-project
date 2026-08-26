import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";
import { AUDIT_LOG_STATUSES, AuditLogStatus } from "../types/auth.enums";
import type { Delegation } from "./Delegation";
import type { User } from "./User";

export interface AuditLogAttributes {
  Id: number;
  ActorUserId: number | null;
  DelegatedFromUserId: number | null;
  DelegationId: number | null;
  Action: string;
  Module: string | null;
  EntityName: string | null;
  EntityId: string | null;
  Status: AuditLogStatus;
  OldData: string | null;
  NewData: string | null;
  RequestId: string | null;
  IpAddress: string | null;
  UserAgent: string | null;
  CreatedAt: Date;
}

export interface AuditLogCreationAttributes
  extends Omit<AuditLogAttributes, "Id" | "Status" | "CreatedAt"> {
  Id?: CreationOptional<number>;
  Status?: CreationOptional<AuditLogStatus>;
  CreatedAt?: CreationOptional<Date>;
}

export class AuditLog
  extends Model<InferAttributes<AuditLog>, InferCreationAttributes<AuditLog>>
  implements AuditLogAttributes
{
  declare Id: CreationOptional<number>;
  declare ActorUserId: ForeignKey<User["Id"]> | null;
  declare DelegatedFromUserId: ForeignKey<User["Id"]> | null;
  declare DelegationId: ForeignKey<Delegation["Id"]> | null;
  declare Action: string;
  declare Module: string | null;
  declare EntityName: string | null;
  declare EntityId: string | null;
  declare Status: CreationOptional<AuditLogStatus>;
  declare OldData: string | null;
  declare NewData: string | null;
  declare RequestId: string | null;
  declare IpAddress: string | null;
  declare UserAgent: string | null;
  declare CreatedAt: CreationOptional<Date>;
}

export const initAuditLogModel = (sequelize: Sequelize): typeof AuditLog => {
  AuditLog.init(
    {
      Id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },
      ActorUserId: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      DelegatedFromUserId: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      DelegationId: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      Action: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      Module: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      EntityName: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      EntityId: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      Status: {
        type: DataTypes.ENUM(...AUDIT_LOG_STATUSES),
        allowNull: false,
        defaultValue: "SUCCESS"
      },
      OldData: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      NewData: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      RequestId: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      IpAddress: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      UserAgent: {
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
      modelName: "AuditLog",
      tableName: "AuditLogs",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [
        { name: "IX_AuditLog_ActorUserId", fields: ["ActorUserId"] },
        { name: "IX_AuditLog_CreatedAt", fields: ["CreatedAt"] },
        { name: "IX_AuditLog_Module", fields: ["Module"] },
        { name: "IX_AuditLog_EntityName_EntityId", fields: ["EntityName", "EntityId"] },
        { name: "IX_AuditLog_RequestId", fields: ["RequestId"] }
      ]
    }
  );

  return AuditLog;
};
