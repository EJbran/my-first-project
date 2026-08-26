import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";

export interface DepartmentAttributes {
  Id: number;
  DepartmentName_Arabic: string;
  DepartmentName_English: string;
  DepartmentType: string | null;
  AttachedNumber: number | null;
  DepartmentAddress: string;
  DepartmentPhone: string;
  DepartmentExtenstion: string;
}

export interface DepartmentCreationAttributes extends Omit<DepartmentAttributes, "Id"> {
  Id?: CreationOptional<number>;
}

export class Department
  extends Model<InferAttributes<Department>, InferCreationAttributes<Department>>
  implements DepartmentAttributes
{
  declare Id: CreationOptional<number>;
  declare DepartmentName_Arabic: string;
  declare DepartmentName_English: string;
  declare DepartmentType: string | null;
  declare AttachedNumber: number | null;
  declare DepartmentAddress: string;
  declare DepartmentPhone: string;
  declare DepartmentExtenstion: string;
}

export const initDepartmentModel = (sequelize: Sequelize): typeof Department => {
  Department.init(
    {
      Id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      DepartmentName_Arabic: {
        type: DataTypes.STRING(2000),
        allowNull: false
      },
      DepartmentName_English: {
        type: DataTypes.STRING(2000),
        allowNull: false
      },
      DepartmentType: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      AttachedNumber: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      DepartmentAddress: {
        type: DataTypes.STRING(2000),
        allowNull: false
      },
      DepartmentPhone: {
        type: DataTypes.STRING(2000),
        allowNull: false
      },
      DepartmentExtenstion: {
        type: DataTypes.STRING(2000),
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "Department",
      tableName: "Departments",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [
        {
          name: "PK_Departments",
          unique: true,
          fields: ["Id"]
        }
      ]
    }
  );

  return Department;
};
