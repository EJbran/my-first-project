import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";

export interface BankAttributes {
  Id: number;
  BankId: number | null;
  Branch: string | null;
  SerialNum_Id: number | null;
  GLCreditAccount: string | null;
}

export interface BankCreationAttributes extends Omit<BankAttributes, "Id"> {
  Id?: CreationOptional<number>;
}

export class Bank
  extends Model<InferAttributes<Bank>, InferCreationAttributes<Bank>>
  implements BankAttributes
{
  declare Id: CreationOptional<number>;
  declare BankId: number | null;
  declare Branch: string | null;
  declare SerialNum_Id: number | null;
  declare GLCreditAccount: string | null;
}

export const initBankModel = (sequelize: Sequelize): typeof Bank => {
  Bank.init(
    {
      Id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      BankId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      Branch: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      SerialNum_Id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      GLCreditAccount: {
        type: DataTypes.STRING(50),
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "Bank",
      tableName: "Bank",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [
        {
          name: "PK_Bank",
          unique: true,
          fields: ["Id"]
        }
      ]
    }
  );

  return Bank;
};
