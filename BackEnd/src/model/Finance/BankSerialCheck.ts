import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";

export interface BankSerialCheckAttributes {
  ID_BANK_SERIAL_CHECKS: number;
  From_Check: string | null;
  To_Check: string | null;
  Creation_date: Date | string | null;
  BANKID: number | null;
}

export interface BankSerialCheckCreationAttributes
  extends Omit<BankSerialCheckAttributes, "ID_BANK_SERIAL_CHECKS"> {
  ID_BANK_SERIAL_CHECKS?: CreationOptional<number>;
}

export class BankSerialCheck
  extends Model<InferAttributes<BankSerialCheck>, InferCreationAttributes<BankSerialCheck>>
  implements BankSerialCheckAttributes
{
  declare ID_BANK_SERIAL_CHECKS: CreationOptional<number>;
  declare From_Check: string | null;
  declare To_Check: string | null;
  declare Creation_date: Date | string | null;
  declare BANKID: number | null;
}

export const initBankSerialCheckModel = (sequelize: Sequelize): typeof BankSerialCheck => {
  BankSerialCheck.init(
    {
      ID_BANK_SERIAL_CHECKS: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      From_Check: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      To_Check: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      Creation_date: {
        type: DataTypes.DATE,
        allowNull: true
      },
      BANKID: {
        type: DataTypes.INTEGER,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "BankSerialCheck",
      tableName: "BANK_SERIAL_CHECKS",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [
        {
          name: "PK_BANK_SERIAL_CHECKS",
          unique: true,
          fields: ["ID_BANK_SERIAL_CHECKS"]
        }
      ]
    }
  );

  return BankSerialCheck;
};
