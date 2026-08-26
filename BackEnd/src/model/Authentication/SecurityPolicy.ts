import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";
import type { User } from "./User";

export interface SecurityPolicyAttributes {
  Id: number;
  PolicyCode: string;
  PolicyValue: string;
  Description: string | null;
  IsActive: boolean;
  UpdatedBy: number | null;
  UpdatedAt: Date;
}

export interface SecurityPolicyCreationAttributes
  extends Omit<SecurityPolicyAttributes, "Id" | "IsActive" | "UpdatedAt"> {
  Id?: CreationOptional<number>;
  IsActive?: CreationOptional<boolean>;
  UpdatedAt?: CreationOptional<Date>;
}

export class SecurityPolicy
  extends Model<
    InferAttributes<SecurityPolicy>,
    InferCreationAttributes<SecurityPolicy>
  >
  implements SecurityPolicyAttributes
{
  declare Id: CreationOptional<number>;
  declare PolicyCode: string;
  declare PolicyValue: string;
  declare Description: string | null;
  declare IsActive: CreationOptional<boolean>;
  declare UpdatedBy: ForeignKey<User["Id"]> | null;
  declare UpdatedAt: CreationOptional<Date>;
}

export const initSecurityPolicyModel = (
  sequelize: Sequelize
): typeof SecurityPolicy => {
  SecurityPolicy.init(
    {
      Id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },
      PolicyCode: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
      },
      PolicyValue: {
        type: DataTypes.STRING(2000),
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
      UpdatedBy: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      UpdatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: "SecurityPolicy",
      tableName: "SecurityPolicies",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [
        {
          name: "UQ_SecurityPolicy_PolicyCode",
          unique: true,
          fields: ["PolicyCode"]
        }
      ]
    }
  );

  return SecurityPolicy;
};
