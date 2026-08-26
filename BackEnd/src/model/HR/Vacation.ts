import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";

export interface VacationAttributes {
  Id: number;
  ID_Employee: string | null;
  Id_CodeTimeSheet: number | null;
  VacationDate_Start: string | Date | null;
  VacationDate_End: string | Date | null;
  State: string | null;
}

export interface VacationCreationAttributes
  extends Omit<VacationAttributes, "Id"> {
  Id?: CreationOptional<number>;
}

export class Vacation
  extends Model<InferAttributes<Vacation>, InferCreationAttributes<Vacation>>
  implements VacationAttributes
{
  declare Id: CreationOptional<number>;
  declare ID_Employee: string | null;
  declare Id_CodeTimeSheet: number | null;
  declare VacationDate_Start: string | Date | null;
  declare VacationDate_End: string | Date | null;
  declare State: string | null;
}

export const initVacationModel = (sequelize: Sequelize): typeof Vacation => {
  Vacation.init(
    {
      Id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      ID_Employee: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      Id_CodeTimeSheet: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      VacationDate_Start: {
        type: DataTypes.DATE,
        allowNull: true
      },
      VacationDate_End: {
        type: DataTypes.DATE,
        allowNull: true
      },
      State: {
        type: DataTypes.STRING(100),
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "Vacation",
      tableName: "Vacation",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true
    }
  );

  return Vacation;
};
