import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";

export interface TimeSheetCodeAttributes {
  ID: number;
  Code_Description: string | null;
  Code: string | null;
}

export interface TimeSheetCodeCreationAttributes
  extends Omit<TimeSheetCodeAttributes, "ID"> {
  ID?: CreationOptional<number>;
}

export class TimeSheetCode
  extends Model<InferAttributes<TimeSheetCode>, InferCreationAttributes<TimeSheetCode>>
  implements TimeSheetCodeAttributes
{
  declare ID: CreationOptional<number>;
  declare Code_Description: string | null;
  declare Code: string | null;
}

export const initTimeSheetCodeModel = (sequelize: Sequelize): typeof TimeSheetCode => {
  TimeSheetCode.init(
    {
      ID: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      Code_Description: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      Code: {
        type: DataTypes.STRING(20),
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "TimeSheetCode",
      tableName: "TimeSheetCode",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [
        {
          name: "PK_TimeSheetCode",
          unique: true,
          fields: ["ID"]
        }
      ]
    }
  );

  return TimeSheetCode;
};
