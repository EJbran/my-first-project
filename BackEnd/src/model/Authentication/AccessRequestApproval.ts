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
  ACCESS_REQUEST_APPROVAL_DECISIONS,
  AccessRequestApprovalDecision
} from "../types/auth.enums";
import type { AccessRequest } from "./AccessRequest";
import type { User } from "./User";

export interface AccessRequestApprovalAttributes {
  Id: number;
  AccessRequestId: number;
  ApproverUserId: number;
  ApprovalLevel: number;
  Decision: AccessRequestApprovalDecision;
  Comment: string | null;
  DecisionAt: Date | null;
}

export interface AccessRequestApprovalCreationAttributes
  extends Omit<AccessRequestApprovalAttributes, "Id" | "ApprovalLevel" | "Decision"> {
  Id?: CreationOptional<number>;
  ApprovalLevel?: CreationOptional<number>;
  Decision?: CreationOptional<AccessRequestApprovalDecision>;
}

export class AccessRequestApproval
  extends Model<
    InferAttributes<AccessRequestApproval>,
    InferCreationAttributes<AccessRequestApproval>
  >
  implements AccessRequestApprovalAttributes
{
  declare Id: CreationOptional<number>;
  declare AccessRequestId: ForeignKey<AccessRequest["Id"]>;
  declare ApproverUserId: ForeignKey<User["Id"]>;
  declare ApprovalLevel: CreationOptional<number>;
  declare Decision: CreationOptional<AccessRequestApprovalDecision>;
  declare Comment: string | null;
  declare DecisionAt: Date | null;
}

export const initAccessRequestApprovalModel = (
  sequelize: Sequelize
): typeof AccessRequestApproval => {
  AccessRequestApproval.init(
    {
      Id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },
      AccessRequestId: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      ApproverUserId: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      ApprovalLevel: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      Decision: {
        type: DataTypes.ENUM(...ACCESS_REQUEST_APPROVAL_DECISIONS),
        allowNull: false,
        defaultValue: "PENDING"
      },
      Comment: {
        type: DataTypes.STRING(1000),
        allowNull: true
      },
      DecisionAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "AccessRequestApproval",
      tableName: "AccessRequestApproval",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [
        {
          name: "IX_AccessRequestApproval_AccessRequestId",
          fields: ["AccessRequestId"]
        },
        {
          name: "IX_AccessRequestApproval_ApproverUserId",
          fields: ["ApproverUserId"]
        }
      ]
    }
  );

  return AccessRequestApproval;
};
