import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";

export interface EpsaAttributes {
  Id: number;
  InterstName: string;
  NOC: number | null;
  PC: number | null;
  EPSAType: string | null;
}

export interface EpsaCreationAttributes extends Omit<EpsaAttributes, "Id"> {
  Id?: CreationOptional<number>;
}

export class Epsa
  extends Model<InferAttributes<Epsa>, InferCreationAttributes<Epsa>>
  implements EpsaAttributes
{
  declare Id: CreationOptional<number>;
  declare InterstName: string;
  declare NOC: number | null;
  declare PC: number | null;
  declare EPSAType: string | null;
}

export const initEpsaModel = (sequelize: Sequelize): typeof Epsa => {
  Epsa.init(
    {
      Id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      InterstName: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      NOC: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      PC: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      EPSAType: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: "EPSAType"
      }
    },
    {
      sequelize,
      modelName: "Epsa",
      tableName: "EPSA",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [
        {
          name: "PK_EPSA",
          unique: true,
          fields: ["Id"]
        }
      ]
    }
  );

  return Epsa;
};
