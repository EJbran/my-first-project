import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";

export interface EmployeeAttributes {
  ID_Employee: number;
  Ref_Employee: string | null;
  EmployeeName: string | null;
  EmployeeName_En: string | null;
  Email: string | null;
  Phone: string | null;
  Department_Id: number | null;
  State: boolean | null;
}

export interface EmployeeCreationAttributes
  extends Omit<EmployeeAttributes, "ID_Employee"> {
  ID_Employee?: CreationOptional<number>;
}

export class Employee
  extends Model<InferAttributes<Employee>, InferCreationAttributes<Employee>>
  implements EmployeeAttributes
{
  declare ID_Employee: CreationOptional<number>;
  declare Ref_Employee: string | null;
  declare EmployeeName: string | null;
  declare EmployeeName_En: string | null;
  declare Email: string | null;
  declare Phone: string | null;
  declare Department_Id: number | null;
  declare State: boolean | null;
}

export const initEmployeeModel = (sequelize: Sequelize): typeof Employee => {
  Employee.init(
    {
      ID_Employee: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      Ref_Employee: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      EmployeeName: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      EmployeeName_En: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      Email: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      Phone: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      Department_Id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      State: {
        type: DataTypes.BOOLEAN,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "Employee",
      tableName: "Employee",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true
    }
  );

  return Employee;
};
