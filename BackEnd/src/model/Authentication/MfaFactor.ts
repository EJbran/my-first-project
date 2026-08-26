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
  MFA_FACTOR_TYPES,
  MFA_MANAGED_BY,
  MfaFactorType,
  MfaManagedBy
} from "../types/auth.enums";
import type { User } from "./User";

export interface MfaFactorAttributes {
  Id: number;
  UserId: number;
  FactorType: MfaFactorType;
  ManagedBy: MfaManagedBy;
  SecretEncrypted: Buffer | null;
  FriendlyName: string | null;
  IsEnabled: boolean;
  IsVerified: boolean;
  CreatedAt: Date;
  VerifiedAt: Date | null;
  LastUsedAt: Date | null;
}

export interface MfaFactorCreationAttributes
  extends Omit<
    MfaFactorAttributes,
    "Id" | "ManagedBy" | "IsEnabled" | "IsVerified" | "CreatedAt"
  > {
  Id?: CreationOptional<number>;
  ManagedBy?: CreationOptional<MfaManagedBy>;
  IsEnabled?: CreationOptional<boolean>;
  IsVerified?: CreationOptional<boolean>;
  CreatedAt?: CreationOptional<Date>;
}

export class MfaFactor
  extends Model<InferAttributes<MfaFactor>, InferCreationAttributes<MfaFactor>>
  implements MfaFactorAttributes
{
  declare Id: CreationOptional<number>;
  declare UserId: ForeignKey<User["Id"]>;
  declare FactorType: MfaFactorType;
  declare ManagedBy: CreationOptional<MfaManagedBy>;
  declare SecretEncrypted: Buffer | null;
  declare FriendlyName: string | null;
  declare IsEnabled: CreationOptional<boolean>;
  declare IsVerified: CreationOptional<boolean>;
  declare CreatedAt: CreationOptional<Date>;
  declare VerifiedAt: Date | null;
  declare LastUsedAt: Date | null;
}

export const initMfaFactorModel = (sequelize: Sequelize): typeof MfaFactor => {
  MfaFactor.init(
    {
      Id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },
      UserId: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      FactorType: {
        type: DataTypes.ENUM(...MFA_FACTOR_TYPES),
        allowNull: false
      },
      ManagedBy: {
        type: DataTypes.ENUM(...MFA_MANAGED_BY),
        allowNull: false,
        defaultValue: "ERP"
      },
      SecretEncrypted: {
        type: DataTypes.BLOB,
        allowNull: true
      },
      FriendlyName: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      IsEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      IsVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      CreatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      VerifiedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      LastUsedAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "MfaFactor",
      tableName: "MfaFactors",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [
        {
          name: "IX_MfaFactor_UserId",
          fields: ["UserId"]
        }
      ]
    }
  );

  return MfaFactor;
};
