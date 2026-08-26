import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
  Op
} from "sequelize";
import { USER_AUTH_PROVIDERS, UserAuthProvider } from "../types/auth.enums";
import type { AuthDomain } from "./AuthDomain";

export interface UserAttributes {
  Id: number;
  EmployeeId: number | null;
  AuthDomainId: number | null;
  Username: string;
  Email: string;
  Phone: string | null;
  DisplayName: string | null;
  DepartmentId: number | null;
  JobTitle: string | null;
  ManagerUserId: number | null;
  AuthProvider: UserAuthProvider;
  DomainName: string | null;
  SamAccountName: string | null;
  UserPrincipalName: string | null;
  DistinguishedName: string | null;
  ObjectGuid: string | null;
  ExternalAuthId: string | null;
  PasswordHash: string | null;
  PasswordUpdatedAt: Date | null;
  IsAdSynced: boolean;
  LastAdSyncAt: Date | null;
  IsActive: boolean;
  IsLocked: boolean;
  FailedLoginCount: number;
  LockoutUntil: Date | null;
  MustChangePassword: boolean;
  DeletedAt: Date | null;
  IsMobile: boolean;
  IsWeb: boolean;
  LastLoginAt: Date | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface UserCreationAttributes
  extends Omit<
    UserAttributes,
    | "Id"
    | "CreatedAt"
    | "UpdatedAt"
    | "IsAdSynced"
    | "IsActive"
    | "IsLocked"
    | "FailedLoginCount"
    | "MustChangePassword"
    | "IsMobile"
    | "IsWeb"
  > {
  Id?: CreationOptional<number>;
  CreatedAt?: CreationOptional<Date>;
  UpdatedAt?: CreationOptional<Date>;
  IsAdSynced?: CreationOptional<boolean>;
  IsActive?: CreationOptional<boolean>;
  IsLocked?: CreationOptional<boolean>;
  FailedLoginCount?: CreationOptional<number>;
  MustChangePassword?: CreationOptional<boolean>;
  IsMobile?: CreationOptional<boolean>;
  IsWeb?: CreationOptional<boolean>;
}

export class User
  extends Model<InferAttributes<User>, InferCreationAttributes<User>>
  implements UserAttributes
{
  declare Id: CreationOptional<number>;
  declare EmployeeId: number | null;
  declare AuthDomainId: ForeignKey<AuthDomain["Id"]> | null;
  declare Username: string;
  declare Email: string;
  declare Phone: string | null;
  declare DisplayName: string | null;
  declare DepartmentId: number | null;
  declare JobTitle: string | null;
  declare ManagerUserId: ForeignKey<User["Id"]> | null;
  declare AuthProvider: CreationOptional<UserAuthProvider>;
  declare DomainName: string | null;
  declare SamAccountName: string | null;
  declare UserPrincipalName: string | null;
  declare DistinguishedName: string | null;
  declare ObjectGuid: string | null;
  declare ExternalAuthId: string | null;
  declare PasswordHash: string | null;
  declare PasswordUpdatedAt: Date | null;
  declare IsAdSynced: CreationOptional<boolean>;
  declare LastAdSyncAt: Date | null;
  declare IsActive: CreationOptional<boolean>;
  declare IsLocked: CreationOptional<boolean>;
  declare FailedLoginCount: CreationOptional<number>;
  declare LockoutUntil: Date | null;
  declare MustChangePassword: CreationOptional<boolean>;
  declare DeletedAt: Date | null;
  declare IsMobile: CreationOptional<boolean>;
  declare IsWeb: CreationOptional<boolean>;
  declare LastLoginAt: Date | null;
  declare CreatedAt: CreationOptional<Date>;
  declare UpdatedAt: CreationOptional<Date>;
}

export const initUserModel = (sequelize: Sequelize): typeof User => {
  User.init(
    {
      Id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },
      EmployeeId: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      AuthDomainId: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      Username: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      Email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          isEmail: true
        }
      },
      Phone: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      DisplayName: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      DepartmentId: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      JobTitle: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      ManagerUserId: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      AuthProvider: {
        type: DataTypes.ENUM(...USER_AUTH_PROVIDERS),
        allowNull: false,
        defaultValue: "AD"
      },
      DomainName: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      SamAccountName: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      UserPrincipalName: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      DistinguishedName: {
        type: DataTypes.STRING(1000),
        allowNull: true
      },
      ObjectGuid: {
        type: DataTypes.UUID,
        allowNull: true
      },
      ExternalAuthId: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      PasswordHash: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      PasswordUpdatedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      IsAdSynced: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      LastAdSyncAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      IsActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      IsLocked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      FailedLoginCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      LockoutUntil: {
        type: DataTypes.DATE,
        allowNull: true
      },
      MustChangePassword: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      DeletedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      IsMobile: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      IsWeb: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      LastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true
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
      modelName: "User",
      tableName: "Users",
      schema: "dbo",
      timestamps: false,
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      validate: {
        passwordPolicyByProvider() {
          const self = this as unknown as User;
          const provider = self.getDataValue("AuthProvider");
          const passwordHash = self.getDataValue("PasswordHash");

          if (provider === "LOCAL" && !passwordHash) {
            throw new Error("PasswordHash is required for LOCAL users");
          }

          if (provider !== "LOCAL" && passwordHash) {
            throw new Error(
              "PasswordHash must be null for AD/LDAP/SSO users"
            );
          }
        }
      },
      indexes: [
        {
          name: "UX_Users_Email",
          unique: true,
          fields: ["Email"],
          where: {
            DeletedAt: null
          }
        },
        {
          name: "UX_Users_Phone",
          unique: true,
          fields: ["Phone"],
          where: {
            DeletedAt: null,
            Phone: { [Op.ne]: null }
          }
        },
        {
          name: "UX_Users_AuthProvider_Domain_Username",
          unique: true,
          fields: ["AuthProvider", "DomainName", "Username"],
          where: {
            DeletedAt: null
          }
        },
        {
          name: "UX_Users_AuthProvider_Domain_ExternalAuthId",
          unique: true,
          fields: ["AuthProvider", "DomainName", "ExternalAuthId"],
          where: {
            DeletedAt: null,
            ExternalAuthId: { [Op.ne]: null }
          }
        },
        {
          name: "UX_Users_Domain_SamAccountName",
          unique: true,
          fields: ["DomainName", "SamAccountName"],
          where: {
            DeletedAt: null,
            SamAccountName: { [Op.ne]: null }
          }
        },
        {
          name: "UX_Users_Domain_UserPrincipalName",
          unique: true,
          fields: ["DomainName", "UserPrincipalName"],
          where: {
            DeletedAt: null,
            UserPrincipalName: { [Op.ne]: null }
          }
        },
        {
          name: "UX_Users_ObjectGuid",
          unique: true,
          fields: ["ObjectGuid"],
          where: {
            DeletedAt: null,
            ObjectGuid: { [Op.ne]: null }
          }
        },
        {
          name: "IX_User_EmployeeId",
          fields: ["EmployeeId"]
        },
        {
          name: "IX_Users_AuthDomainId",
          fields: ["AuthDomainId"]
        }
      ]
    }
  );

  return User;
};
