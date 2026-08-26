import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";

export interface AssetAttributes {
  AssetID: number;
  AssetCode: string;
  AssetDescription: string;
  CategoryID: number;
  SubLocationID: number;
  DepartmentID: number;
  PurchaseDate: string;
  InsertedDate: string;
  PurchaseCost: string;
  BookValue: string;
  OpeningBalanceBookValue: string;
  DepreciationValue: string;
  NetValue: string;
  ResponsibleID: number;
  ResponsibleNote: string | null;
  Status: string;
}

export interface AssetCreationAttributes extends Omit<AssetAttributes, "AssetID"> {
  AssetID?: CreationOptional<number>;
}

export class Asset
  extends Model<InferAttributes<Asset>, InferCreationAttributes<Asset>>
  implements AssetAttributes
{
  declare AssetID: CreationOptional<number>;
  declare AssetCode: string;
  declare AssetDescription: string;
  declare CategoryID: number;
  declare SubLocationID: number;
  declare DepartmentID: number;
  declare PurchaseDate: string;
  declare InsertedDate: string;
  declare PurchaseCost: string;
  declare BookValue: string;
  declare OpeningBalanceBookValue: string;
  declare DepreciationValue: string;
  declare NetValue: string;
  declare ResponsibleID: number;
  declare ResponsibleNote: string | null;
  declare Status: string;
}

export const initAssetModel = (sequelize: Sequelize): typeof Asset => {
  Asset.init(
    {
      AssetID: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      AssetCode: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      AssetDescription: {
        type: DataTypes.STRING(200),
        allowNull: false
      },
      CategoryID: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      SubLocationID: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      DepartmentID: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      PurchaseDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      InsertedDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      PurchaseCost: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false
      },
      BookValue: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false
      },
      OpeningBalanceBookValue: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false
      },
      DepreciationValue: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false
      },
      NetValue: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false
      },
      ResponsibleID: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      ResponsibleNote: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      Status: {
        type: DataTypes.STRING(50),
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "Asset",
      tableName: "Asset",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [
        {
          name: "PK_Assets",
          unique: true,
          fields: ["AssetID"]
        }
      ]
    }
  );

  return Asset;
};
