import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";

export interface ApiClientAttributes {
  Id: number;
  ClientCode: string;
  ClientName: string;
  Description: string | null;
  IsActive: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface ApiClientCreationAttributes
  extends Omit<ApiClientAttributes, "Id" | "IsActive" | "CreatedAt" | "UpdatedAt"> {
  Id?: CreationOptional<number>;
  IsActive?: CreationOptional<boolean>;
  CreatedAt?: CreationOptional<Date>;
  UpdatedAt?: CreationOptional<Date>;
}

export class ApiClient
  extends Model<InferAttributes<ApiClient>, InferCreationAttributes<ApiClient>>
  implements ApiClientAttributes
{
  declare Id: CreationOptional<number>;
  declare ClientCode: string;
  declare ClientName: string;
  declare Description: string | null;
  declare IsActive: CreationOptional<boolean>;
  declare CreatedAt: CreationOptional<Date>;
  declare UpdatedAt: CreationOptional<Date>;
}

export const initApiClientModel = (sequelize: Sequelize): typeof ApiClient => {
  ApiClient.init(
    {
      Id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },
      ClientCode: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
      },
      ClientName: {
        type: DataTypes.STRING(255),
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
      CreatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      UpdatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: "ApiClient",
      tableName: "ApiClient",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [
        {
          name: "UQ_ApiClient_ClientCode",
          unique: true,
          fields: ["ClientCode"]
        }
      ]
    }
  );

  return ApiClient;
};
