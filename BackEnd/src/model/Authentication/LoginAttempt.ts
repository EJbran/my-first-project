import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";
import { USER_AUTH_PROVIDERS, UserAuthProvider } from "../types/auth.enums";
import type { User } from "./User";

export interface LoginAttemptAttributes {
  Id: number;
  UserId: number | null;
  Username: string | null;
  Email: string | null;
  AuthProvider: UserAuthProvider | null;
  IsSuccessful: boolean;
  FailureReason: string | null;
  IpAddress: string | null;
  UserAgent: string | null;
  CreatedAt: Date;
}

export interface LoginAttemptCreationAttributes
  extends Omit<LoginAttemptAttributes, "Id" | "CreatedAt"> {
  Id?: CreationOptional<number>;
  CreatedAt?: CreationOptional<Date>;
}

export class LoginAttempt
  extends Model<InferAttributes<LoginAttempt>, InferCreationAttributes<LoginAttempt>>
  implements LoginAttemptAttributes
{
  declare Id: CreationOptional<number>;
  declare UserId: ForeignKey<User["Id"]> | null;
  declare Username: string | null;
  declare Email: string | null;
  declare AuthProvider: UserAuthProvider | null;
  declare IsSuccessful: boolean;
  declare FailureReason: string | null;
  declare IpAddress: string | null;
  declare UserAgent: string | null;
  declare CreatedAt: CreationOptional<Date>;
}

export const initLoginAttemptModel = (
  sequelize: Sequelize
): typeof LoginAttempt => {
  LoginAttempt.init(
    {
      Id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },
      UserId: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      Username: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      Email: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      AuthProvider: {
        type: DataTypes.ENUM(...USER_AUTH_PROVIDERS),
        allowNull: true
      },
      IsSuccessful: {
        type: DataTypes.BOOLEAN,
        allowNull: false
      },
      FailureReason: {
        type: DataTypes.STRING(1000),
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
      modelName: "LoginAttempt",
      tableName: "LoginAttempts",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [
        { name: "IX_LoginAttempt_UserId", fields: ["UserId"] },
        { name: "IX_LoginAttempt_CreatedAt", fields: ["CreatedAt"] },
        { name: "IX_LoginAttempt_Username", fields: ["Username"] }
      ]
    }
  );

  return LoginAttempt;
};
