import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";

export interface JobAttributes {
  Job_ID: number;
  Job_Name_AR: string | null;
  Job_Name_EN: string | null;
}

export class Job
  extends Model<InferAttributes<Job>, InferCreationAttributes<Job>>
  implements JobAttributes
{
  declare Job_ID: number;
  declare Job_Name_AR: string | null;
  declare Job_Name_EN: string | null;
}

export const initJobModel = (sequelize: Sequelize): typeof Job => {
  Job.init(
    {
      Job_ID: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
      },
      Job_Name_AR: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      Job_Name_EN: {
        type: DataTypes.STRING(255),
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "Job",
      tableName: "jobs",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true
    }
  );

  return Job;
};
