import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";
import { USER_DEVICE_TYPES, UserDeviceType } from "../types/auth.enums";
import type { User } from "./User";

export interface UserDeviceAttributes {
  Id: number;
  UserId: number;
  DeviceId: string;
  DeviceName: string | null;
  DeviceType: UserDeviceType | null;
  Platform: string | null;
  AppVersion: string | null;
  IsTrusted: boolean;
  IsActive: boolean;
  LastUsedAt: Date | null;
  CreatedAt: Date;
}

export interface UserDeviceCreationAttributes
  extends Omit<
    UserDeviceAttributes,
    "Id" | "IsTrusted" | "IsActive" | "CreatedAt"
  > {
  Id?: CreationOptional<number>;
  IsTrusted?: CreationOptional<boolean>;
  IsActive?: CreationOptional<boolean>;
  CreatedAt?: CreationOptional<Date>;
}

export class UserDevice
  extends Model<InferAttributes<UserDevice>, InferCreationAttributes<UserDevice>>
  implements UserDeviceAttributes
{
  declare Id: CreationOptional<number>;
  declare UserId: ForeignKey<User["Id"]>;
  declare DeviceId: string;
  declare DeviceName: string | null;
  declare DeviceType: UserDeviceType | null;
  declare Platform: string | null;
  declare AppVersion: string | null;
  declare IsTrusted: CreationOptional<boolean>;
  declare IsActive: CreationOptional<boolean>;
  declare LastUsedAt: Date | null;
  declare CreatedAt: CreationOptional<Date>;
}

export const initUserDeviceModel = (sequelize: Sequelize): typeof UserDevice => {
  UserDevice.init(
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
      DeviceId: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      DeviceName: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      DeviceType: {
        type: DataTypes.ENUM(...USER_DEVICE_TYPES),
        allowNull: true
      },
      Platform: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      AppVersion: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      IsTrusted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      IsActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      LastUsedAt: {
        type: DataTypes.DATE,
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
      modelName: "UserDevice",
      tableName: "UserDevice",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [
        {
          name: "UQ_UserDevice_UserId_DeviceId",
          unique: true,
          fields: ["UserId", "DeviceId"]
        },
        {
          name: "IX_UserDevice_UserId",
          fields: ["UserId"]
        }
      ]
    }
  );

  return UserDevice;
};
