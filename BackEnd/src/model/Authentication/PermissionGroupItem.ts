import {
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";
import type { Permission } from "./Permission";
import type { PermissionGroup } from "./PermissionGroup";

export interface PermissionGroupItemAttributes {
  PermissionGroupId: number;
  PermissionId: number;
}

export type PermissionGroupItemCreationAttributes = PermissionGroupItemAttributes;

export class PermissionGroupItem
  extends Model<
    InferAttributes<PermissionGroupItem>,
    InferCreationAttributes<PermissionGroupItem>
  >
  implements PermissionGroupItemAttributes
{
  declare PermissionGroupId: ForeignKey<PermissionGroup["Id"]>;
  declare PermissionId: ForeignKey<Permission["Id"]>;
}

export const initPermissionGroupItemModel = (
  sequelize: Sequelize
): typeof PermissionGroupItem => {
  PermissionGroupItem.init(
    {
      PermissionGroupId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true
      },
      PermissionId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true
      }
    },
    {
      sequelize,
      modelName: "PermissionGroupItem",
      tableName: "PermissionGroupItem",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [{ name: "IX_PermissionGroupItem_PermissionId", fields: ["PermissionId"] }]
    }
  );

  return PermissionGroupItem;
};
