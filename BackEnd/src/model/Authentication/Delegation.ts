import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";
import { DELEGATION_TYPES, DelegationType } from "../types/auth.enums";
import type { User } from "./User";

export interface DelegationAttributes {
  Id: number;
  FromUserId: number;
  ToUserId: number;
  DelegationType: DelegationType;
  Module: string | null;
  PermissionCode: string | null;
  WorkflowCode: string | null;
  StartAt: Date;
  EndAt: Date;
  Reason: string | null;
  IsActive: boolean;
  CreatedBy: number;
  CreatedAt: Date;
  ApprovedBy: number | null;
  ApprovedAt: Date | null;
  RevokedBy: number | null;
  RevokedAt: Date | null;
  RevokedReason: string | null;
}

export interface DelegationCreationAttributes
  extends Omit<DelegationAttributes, "Id" | "IsActive" | "CreatedAt"> {
  Id?: CreationOptional<number>;
  IsActive?: CreationOptional<boolean>;
  CreatedAt?: CreationOptional<Date>;
}

export class Delegation
  extends Model<InferAttributes<Delegation>, InferCreationAttributes<Delegation>>
  implements DelegationAttributes
{
  declare Id: CreationOptional<number>;
  declare FromUserId: ForeignKey<User["Id"]>;
  declare ToUserId: ForeignKey<User["Id"]>;
  declare DelegationType: DelegationType;
  declare Module: string | null;
  declare PermissionCode: string | null;
  declare WorkflowCode: string | null;
  declare StartAt: Date;
  declare EndAt: Date;
  declare Reason: string | null;
  declare IsActive: CreationOptional<boolean>;
  declare CreatedBy: ForeignKey<User["Id"]>;
  declare CreatedAt: CreationOptional<Date>;
  declare ApprovedBy: ForeignKey<User["Id"]> | null;
  declare ApprovedAt: Date | null;
  declare RevokedBy: ForeignKey<User["Id"]> | null;
  declare RevokedAt: Date | null;
  declare RevokedReason: string | null;
}

export const initDelegationModel = (sequelize: Sequelize): typeof Delegation => {
  Delegation.init(
    {
      Id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },
      FromUserId: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      ToUserId: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      DelegationType: {
        type: DataTypes.ENUM(...DELEGATION_TYPES),
        allowNull: false
      },
      Module: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      PermissionCode: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      WorkflowCode: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      StartAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      EndAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      Reason: {
        type: DataTypes.STRING(1000),
        allowNull: true
      },
      IsActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      CreatedBy: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      CreatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      ApprovedBy: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      ApprovedAt: {
        type: DataTypes.DATE,
        allowNull: true
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
        type: DataTypes.STRING(1000),
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "Delegation",
      tableName: "Delegation",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      validate: {
        endAfterStart() {
          const self = this as unknown as Delegation;
          if (self.EndAt <= self.StartAt) {
            throw new Error("EndAt must be greater than StartAt");
          }
        },
        differentUsers() {
          const self = this as unknown as Delegation;
          if (self.FromUserId === self.ToUserId) {
            throw new Error("FromUserId and ToUserId must be different");
          }
        }
      },
      indexes: [
        { name: "IX_Delegation_FromUserId", fields: ["FromUserId"] },
        { name: "IX_Delegation_ToUserId", fields: ["ToUserId"] },
        {
          name: "IX_Delegation_IsActive_StartAt_EndAt",
          fields: ["IsActive", "StartAt", "EndAt"]
        }
      ]
    }
  );

  return Delegation;
};
