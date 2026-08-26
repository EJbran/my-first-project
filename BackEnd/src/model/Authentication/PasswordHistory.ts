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

export interface PasswordHistoryAttributes {
  Id: number;
  UserId: number;
  PasswordHash: string;
  CreatedAt: Date;
}

export interface PasswordHistoryCreationAttributes
  extends Omit<PasswordHistoryAttributes, "Id" | "CreatedAt"> {
  Id?: CreationOptional<number>;
  CreatedAt?: CreationOptional<Date>;
}

export class PasswordHistory
  extends Model<
    InferAttributes<PasswordHistory>,
    InferCreationAttributes<PasswordHistory>
  >
  implements PasswordHistoryAttributes
{
  declare Id: CreationOptional<number>;
  declare UserId: ForeignKey<User["Id"]>;
  declare PasswordHash: string;
  declare CreatedAt: CreationOptional<Date>;
}

export const initPasswordHistoryModel = (
  sequelize: Sequelize
): typeof PasswordHistory => {
  PasswordHistory.init(
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
      PasswordHash: {
        type: DataTypes.STRING(500),
        allowNull: false
      },
      CreatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: "PasswordHistory",
      tableName: "PasswordHistory",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [{ name: "IX_PasswordHistory_UserId", fields: ["UserId"] }]
    }
  );

  return PasswordHistory;
};
