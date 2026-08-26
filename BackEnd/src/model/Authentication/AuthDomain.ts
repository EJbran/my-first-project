import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";
import { AUTH_DOMAIN_METHODS, AuthDomainMethod } from "../types/auth.enums";

export interface AuthDomainAttributes {
  Id: number;
  DomainName: string;
  NetbiosName: string | null;
  AuthMethod: AuthDomainMethod;
  AuthorityUrl: string | null;
  TenantId: string | null;
  ClientId: string | null;
  LdapServer: string | null;
  LdapPort: number | null;
  BaseDn: string | null;
  IsActive: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface AuthDomainCreationAttributes
  extends Omit<AuthDomainAttributes, "Id" | "CreatedAt" | "UpdatedAt"> {
  Id?: CreationOptional<number>;
  CreatedAt?: CreationOptional<Date>;
  UpdatedAt?: CreationOptional<Date>;
}

export class AuthDomain
  extends Model<InferAttributes<AuthDomain>, InferCreationAttributes<AuthDomain>>
  implements AuthDomainAttributes
{
  declare Id: CreationOptional<number>;
  declare DomainName: string;
  declare NetbiosName: string | null;
  declare AuthMethod: AuthDomainMethod;
  declare AuthorityUrl: string | null;
  declare TenantId: string | null;
  declare ClientId: string | null;
  declare LdapServer: string | null;
  declare LdapPort: number | null;
  declare BaseDn: string | null;
  declare IsActive: CreationOptional<boolean>;
  declare CreatedAt: CreationOptional<Date>;
  declare UpdatedAt: CreationOptional<Date>;
}

export const initAuthDomainModel = (sequelize: Sequelize): typeof AuthDomain => {
  AuthDomain.init(
    {
      Id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },
      DomainName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
      },
      NetbiosName: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      AuthMethod: {
        type: DataTypes.ENUM(...AUTH_DOMAIN_METHODS),
        allowNull: false
      },
      AuthorityUrl: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      TenantId: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      ClientId: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      LdapServer: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      LdapPort: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      BaseDn: {
        type: DataTypes.STRING(500),
        allowNull: true
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
      },
      UpdatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: "AuthDomain",
      tableName: "AuthDomains",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      validate: {
        methodSpecificFields() {
          if (this.AuthMethod === "OIDC") {
            if (!this.TenantId || !this.ClientId || !this.AuthorityUrl) {
              throw new Error(
                "OIDC domains require TenantId, ClientId, and AuthorityUrl"
              );
            }
          }

          if (this.AuthMethod === "ADFS" && !this.AuthorityUrl) {
            throw new Error("ADFS domains require AuthorityUrl");
          }

          if (
            (this.AuthMethod === "LDAP" || this.AuthMethod === "LDAPS") &&
            (!this.LdapServer || !this.BaseDn)
          ) {
            throw new Error("LDAP/LDAPS domains require LdapServer and BaseDn");
          }
        }
      },
      indexes: [
        {
          name: "UX_AuthDomains_DomainName",
          unique: true,
          fields: ["DomainName"]
        }
      ]
    }
  );

  return AuthDomain;
};
