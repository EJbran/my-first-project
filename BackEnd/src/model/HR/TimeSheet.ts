import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";

export type TimeSheetDayFields = {
  [K in `j_${number}`]?: string | null;
} & {
  [K in `E${number}`]?: Date | string | null;
} & {
  [K in `S${number}`]?: Date | string | null;
} & {
  [K in `AFE${number}`]?: string | null;
};

export interface TimeSheetAttributes extends TimeSheetDayFields {
  Id: number;
  ID_Employee: number;
  Job_Name: string | null;
  DATE_JS: string | Date | null;
  IS_Approved: boolean | null;
  Id_Approved: number | null;
}

export interface TimeSheetCreationAttributes
  extends Omit<TimeSheetAttributes, "Id"> {
  Id?: CreationOptional<number>;
}

const dayFieldDefs = () => {
  const fields: Record<string, object> = {};
  for (let day = 1; day <= 31; day += 1) {
    fields[`j_${day}`] = { type: DataTypes.STRING(10), allowNull: true };
    fields[`E${day}`] = { type: DataTypes.DATE, allowNull: true };
    fields[`S${day}`] = { type: DataTypes.DATE, allowNull: true };
    fields[`AFE${day}`] = { type: DataTypes.STRING(10), allowNull: true };
  }
  return fields;
};

export class TimeSheet
  extends Model<InferAttributes<TimeSheet>, InferCreationAttributes<TimeSheet>>
{
  declare Id: CreationOptional<number>;
  declare ID_Employee: number;
  declare Job_Name: string | null;
  declare DATE_JS: string | Date | null;
  declare IS_Approved: boolean | null;
  declare Id_Approved: number | null;
}

export const initTimeSheetModel = (sequelize: Sequelize): typeof TimeSheet => {
  TimeSheet.init(
    {
      Id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      ID_Employee: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      Job_Name: {
        type: DataTypes.STRING(200),
        allowNull: true
      },
      DATE_JS: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      IS_Approved: {
        type: DataTypes.BOOLEAN,
        allowNull: true
      },
      Id_Approved: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      ...dayFieldDefs()
    } as never,
    {
      sequelize,
      modelName: "TimeSheet",
      tableName: "TimeSheet",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true
    }
  );

  return TimeSheet;
};
