import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";

export interface BankGeneralAttributes {
  Id: number;
  BackName: string | null;
}

export interface BankGeneralCreationAttributes extends Omit<BankGeneralAttributes, "Id"> {
  Id?: CreationOptional<number>;
}

export class BankGeneral
  extends Model<InferAttributes<BankGeneral>, InferCreationAttributes<BankGeneral>>
  implements BankGeneralAttributes
{
  declare Id: CreationOptional<number>;
  declare BackName: string | null;
}

export const initBankGeneralModel = (sequelize: Sequelize): typeof BankGeneral => {
  BankGeneral.init(
    {
      Id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      BackName: {
        type: DataTypes.STRING(200),
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "BankGeneral",
      tableName: "BankGeneral",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [
        {
          name: "PK_BankGeneral",
          unique: true,
          fields: ["Id"]
        }
      ]
    }
  );

  return BankGeneral;
};
