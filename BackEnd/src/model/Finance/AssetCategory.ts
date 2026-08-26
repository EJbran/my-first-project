import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";

export interface AssetCategoryAttributes {
  CategoryID: number;
  CategoryName: string;
  Percentage: string;
  DepAccountID: number;
  CreditAccountID: number;
  Description: string;
}

export interface AssetCategoryCreationAttributes
  extends Omit<AssetCategoryAttributes, "CategoryID"> {
  CategoryID?: CreationOptional<number>;
}

export class AssetCategory
  extends Model<InferAttributes<AssetCategory>, InferCreationAttributes<AssetCategory>>
  implements AssetCategoryAttributes
{
  declare CategoryID: CreationOptional<number>;
  declare CategoryName: string;
  declare Percentage: string;
  declare DepAccountID: number;
  declare CreditAccountID: number;
  declare Description: string;
}

export const initAssetCategoryModel = (sequelize: Sequelize): typeof AssetCategory => {
  AssetCategory.init(
    {
      CategoryID: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      CategoryName: {
        type: DataTypes.STRING(30),
        allowNull: false
      },
      Percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false
      },
      DepAccountID: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      CreditAccountID: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      Description: {
        type: DataTypes.STRING(200),
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "AssetCategory",
      tableName: "AssetCategory",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [{ name: "PK_AssetCategory", unique: true, fields: ["CategoryID"] }]
    }
  );

  return AssetCategory;
};
