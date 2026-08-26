import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";

export interface SubLocationAttributes {
  Id: number;
  Name: string;
  Type: string | null;
  LocationId: number;
}

export interface SubLocationCreationAttributes extends Omit<SubLocationAttributes, "Id"> {
  Id?: CreationOptional<number>;
}

export class SubLocation
  extends Model<InferAttributes<SubLocation>, InferCreationAttributes<SubLocation>>
  implements SubLocationAttributes
{
  declare Id: CreationOptional<number>;
  declare Name: string;
  declare Type: string | null;
  declare LocationId: number;
}

export const initSubLocationModel = (sequelize: Sequelize): typeof SubLocation => {
  SubLocation.init(
    {
      Id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      Name: {
        type: DataTypes.STRING(200),
        allowNull: false
      },
      Type: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      LocationId: {
        type: DataTypes.INTEGER,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "SubLocation",
      tableName: "SubLocation",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [
        {
          name: "PK_SubLocation",
          unique: true,
          fields: ["Id"]
        },
        {
          name: "IX_SubLocation_LocationId",
          unique: false,
          fields: ["LocationId"]
        }
      ]
    }
  );

  return SubLocation;
};
