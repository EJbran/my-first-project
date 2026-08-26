import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";

export interface LocationAttributes {
  ID_Location: number;
  LocationName_ar: string | null;
  LocationName_en: string;
  LocationCode: string;
  LocationInMap: Buffer | null;
}

export interface LocationCreationAttributes extends Omit<LocationAttributes, "ID_Location"> {
  ID_Location?: CreationOptional<number>;
}

export class Location
  extends Model<InferAttributes<Location>, InferCreationAttributes<Location>>
  implements LocationAttributes
{
  declare ID_Location: CreationOptional<number>;
  declare LocationName_ar: string | null;
  declare LocationName_en: string;
  declare LocationCode: string;
  declare LocationInMap: Buffer | null;
}

export const initLocationModel = (sequelize: Sequelize): typeof Location => {
  Location.init(
    {
      ID_Location: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      LocationName_ar: {
        type: DataTypes.STRING(200),
        allowNull: true
      },
      LocationName_en: {
        type: DataTypes.STRING(200),
        allowNull: false
      },
      LocationCode: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      LocationInMap: {
        type: DataTypes.BLOB("long"),
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "Location",
      tableName: "Location",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [
        {
          name: "PK_Location",
          unique: true,
          fields: ["ID_Location"]
        }
      ]
    }
  );

  return Location;
};
