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

export interface UserSessionAttributes {
  Id: string;
  UserId: number;
  RefreshTokenHash: Buffer;
  DeviceName: string | null;
  DeviceId: string | null;
  IpAddress: string | null;
  UserAgent: string | null;
  IsRevoked: boolean;
  RevokedAt: Date | null;
  RevokedReason: string | null;
  ReplacedBySessionId: string | null;
  ExpiresAt: Date;
  CreatedAt: Date;
  LastUsedAt: Date | null;
}

export interface UserSessionCreationAttributes
  extends Omit<UserSessionAttributes, "Id" | "IsRevoked" | "CreatedAt"> {
  Id?: CreationOptional<string>;
  IsRevoked?: CreationOptional<boolean>;
  CreatedAt?: CreationOptional<Date>;
}

export class UserSession
  extends Model<InferAttributes<UserSession>, InferCreationAttributes<UserSession>>
  implements UserSessionAttributes
{
  declare Id: CreationOptional<string>;
  declare UserId: ForeignKey<User["Id"]>;
  declare RefreshTokenHash: Buffer;
  declare DeviceName: string | null;
  declare DeviceId: string | null;
  declare IpAddress: string | null;
  declare UserAgent: string | null;
  declare IsRevoked: CreationOptional<boolean>;
  declare RevokedAt: Date | null;
  declare RevokedReason: string | null;
  declare ReplacedBySessionId: ForeignKey<UserSession["Id"]> | null;
  declare ExpiresAt: Date;
  declare CreatedAt: CreationOptional<Date>;
  declare LastUsedAt: Date | null;
}

export const initUserSessionModel = (
  sequelize: Sequelize
): typeof UserSession => {
  UserSession.init(
    {
      Id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      UserId: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      RefreshTokenHash: {
        type: DataTypes.BLOB,
        allowNull: false,
        unique: true
      },
      DeviceName: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      DeviceId: {
        type: DataTypes.STRING(255),
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
      IsRevoked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      RevokedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      RevokedReason: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      ReplacedBySessionId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      ExpiresAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      CreatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      LastUsedAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "UserSession",
      tableName: "UserSessions",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [
        {
          name: "IX_UserSession_UserId",
          fields: ["UserId"]
        },
        {
          name: "IX_UserSession_ExpiresAt",
          fields: ["ExpiresAt"]
        },
        {
          name: "UX_UserSessions_RefreshTokenHash",
          unique: true,
          fields: ["RefreshTokenHash"]
        }
      ]
    }
  );

  return UserSession;
};
