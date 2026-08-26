import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Op,
  Sequelize
} from "sequelize";
import type { AuthDomain } from "./AuthDomain";
import type { Role } from "./Role";

export interface AdGroupRoleMappingAttributes {
  Id: number;
  AuthDomainId: number;
  AdGroupSid: string | null;
  AdGroupName: string;
  EntraGroupObjectId: string | null;
  RoleId: number;
  IsActive: boolean;
  CreatedAt: Date;
}

export interface AdGroupRoleMappingCreationAttributes
  extends Omit<AdGroupRoleMappingAttributes, "Id" | "IsActive" | "CreatedAt"> {
  Id?: CreationOptional<number>;
  IsActive?: CreationOptional<boolean>;
  CreatedAt?: CreationOptional<Date>;
}

export class AdGroupRoleMapping
  extends Model<
    InferAttributes<AdGroupRoleMapping>,
    InferCreationAttributes<AdGroupRoleMapping>
  >
  implements AdGroupRoleMappingAttributes
{
  declare Id: CreationOptional<number>;
  declare AuthDomainId: ForeignKey<AuthDomain["Id"]>;
  declare AdGroupSid: string | null;
  declare AdGroupName: string;
  declare EntraGroupObjectId: string | null;
  declare RoleId: ForeignKey<Role["Id"]>;
  declare IsActive: CreationOptional<boolean>;
  declare CreatedAt: CreationOptional<Date>;
}

export const initAdGroupRoleMappingModel = (
  sequelize: Sequelize
): typeof AdGroupRoleMapping => {
  AdGroupRoleMapping.init(
    {
      Id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },
      AuthDomainId: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      AdGroupSid: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      AdGroupName: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      EntraGroupObjectId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      RoleId: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      IsActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      CreatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: "AdGroupRoleMapping",
      tableName: "AdGroupRoleMappings",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      validate: {
        hasEntraOrSid() {
          if (!this.EntraGroupObjectId && !this.AdGroupSid) {
            throw new Error(
              "Either EntraGroupObjectId or AdGroupSid must be provided"
            );
          }
        }
      },
      indexes: [
        {
          name: "IX_AdGroupRoleMappings_EntraGroupObjectId",
          fields: ["EntraGroupObjectId"],
          where: {
            EntraGroupObjectId: { [Op.ne]: null }
          }
        },
        {
          name: "IX_AdGroupRoleMappings_AdGroupSid",
          fields: ["AdGroupSid"],
          where: {
            AdGroupSid: { [Op.ne]: null }
          }
        },
        {
          name: "UX_AdGroupRoleMappings_Domain_EntraGroup_Role",
          unique: true,
          fields: ["AuthDomainId", "EntraGroupObjectId", "RoleId"],
          where: {
            EntraGroupObjectId: { [Op.ne]: null }
          }
        },
        {
          name: "UX_AdGroupRoleMappings_Domain_AdSid_Role",
          unique: true,
          fields: ["AuthDomainId", "AdGroupSid", "RoleId"],
          where: {
            AdGroupSid: { [Op.ne]: null }
          }
        }
      ]
    }
  );

  return AdGroupRoleMapping;
};
