import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";

export interface PositionAttributes {
  Id: number;
  EmployeeId: number | null;
  Job_ID: number | null;
  LineLevelId: number | null;
}

export interface PositionCreationAttributes extends Omit<PositionAttributes, "Id"> {
  Id?: CreationOptional<number>;
}

export class Position
  extends Model<InferAttributes<Position>, InferCreationAttributes<Position>>
  implements PositionAttributes
{
  declare Id: CreationOptional<number>;
  declare EmployeeId: number | null;
  declare Job_ID: number | null;
  declare LineLevelId: number | null;
}

export const initPositionModel = (sequelize: Sequelize): typeof Position => {
  Position.init(
    {
      Id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      EmployeeId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      Job_ID: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      LineLevelId: {
        type: DataTypes.INTEGER,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "Position",
      tableName: "Position",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true
    }
  );

  return Position;
};
