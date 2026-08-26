import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";

export interface LineLevelAttributes {
  Line_ID: number;
  SortLine: number | null;
  ArabicDescription: string | null;
  EnglishDescription: string | null;
}

export class LineLevel
  extends Model<InferAttributes<LineLevel>, InferCreationAttributes<LineLevel>>
  implements LineLevelAttributes
{
  declare Line_ID: number;
  declare SortLine: number | null;
  declare ArabicDescription: string | null;
  declare EnglishDescription: string | null;
}

export const initLineLevelModel = (sequelize: Sequelize): typeof LineLevel => {
  LineLevel.init(
    {
      Line_ID: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
      },
      SortLine: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      ArabicDescription: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      EnglishDescription: {
        type: DataTypes.STRING(255),
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "LineLevel",
      tableName: "LineLevel",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true
    }
  );

  return LineLevel;
};
