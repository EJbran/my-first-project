import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";

export interface CategoryAttributesAttributes {
  CategoryID: number;
  CategoryDetails: Record<string, unknown>;
}

export interface CategoryAttributesCreationAttributes
  extends Omit<CategoryAttributesAttributes, "CategoryID"> {
  CategoryID?: CreationOptional<number>;
}

export class CategoryAttributes
  extends Model<InferAttributes<CategoryAttributes>, InferCreationAttributes<CategoryAttributes>>
  implements CategoryAttributesAttributes
{
  declare CategoryID: CreationOptional<number>;
  declare CategoryDetails: Record<string, unknown>;
}

export const initCategoryAttributesModel = (sequelize: Sequelize): typeof CategoryAttributes => {
  CategoryAttributes.init(
    {
      CategoryID: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      CategoryDetails: {
        type: DataTypes.JSON,
        allowNull: true
      }
    },
    {
      sequelize,
      tableName: "CategoryAttributes",
      timestamps: false
    }
  );

  return CategoryAttributes;
};
