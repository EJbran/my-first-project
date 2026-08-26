import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";
import type { ApiClient } from "./ApiClient";
import type { User } from "./User";

export interface ApiClientSecretAttributes {
  Id: number;
  ApiClientId: number;
  SecretName: string | null;
  SecretHash: Buffer;
  IsActive: boolean;
  ExpiresAt: Date | null;
  CreatedBy: number | null;
  CreatedAt: Date;
  LastUsedAt: Date | null;
  RevokedBy: number | null;
  RevokedAt: Date | null;
}

export interface ApiClientSecretCreationAttributes
  extends Omit<ApiClientSecretAttributes, "Id" | "IsActive" | "CreatedAt"> {
  Id?: CreationOptional<number>;
  IsActive?: CreationOptional<boolean>;
  CreatedAt?: CreationOptional<Date>;
}

export class ApiClientSecret
  extends Model<
    InferAttributes<ApiClientSecret>,
    InferCreationAttributes<ApiClientSecret>
  >
  implements ApiClientSecretAttributes
{
  declare Id: CreationOptional<number>;
  declare ApiClientId: ForeignKey<ApiClient["Id"]>;
  declare SecretName: string | null;
  declare SecretHash: Buffer;
  declare IsActive: CreationOptional<boolean>;
  declare ExpiresAt: Date | null;
  declare CreatedBy: ForeignKey<User["Id"]> | null;
  declare CreatedAt: CreationOptional<Date>;
  declare LastUsedAt: Date | null;
  declare RevokedBy: ForeignKey<User["Id"]> | null;
  declare RevokedAt: Date | null;
}

export const initApiClientSecretModel = (
  sequelize: Sequelize
): typeof ApiClientSecret => {
  ApiClientSecret.init(
    {
      Id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },
      ApiClientId: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      SecretName: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      SecretHash: {
        type: DataTypes.BLOB,
        allowNull: false
      },
      IsActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      ExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      CreatedBy: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      CreatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      LastUsedAt: {
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
      }
    },
    {
      sequelize,
      modelName: "ApiClientSecret",
      tableName: "ApiClientSecret",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [
        {
          name: "IX_ApiClientSecret_ApiClientId",
          fields: ["ApiClientId"]
        }
      ]
    }
  );

  return ApiClientSecret;
};
