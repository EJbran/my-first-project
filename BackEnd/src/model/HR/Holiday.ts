import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";

export interface HolidayAttributes {
  HolidayId: number;
  HolidayCode: string | null;
  HolidayNameAr: string;
  HolidayNameEn: string | null;
  HolidayType: string;
  HolidayDate: string | Date;
  IsFixedDate: boolean;
  IsActive: boolean;
  Description: string | null;
  CreatedAt: Date;
  UpdatedAt: Date | null;
}

export interface HolidayCreationAttributes
  extends Omit<HolidayAttributes, "HolidayId" | "IsFixedDate" | "IsActive" | "CreatedAt" | "UpdatedAt"> {
  HolidayId?: CreationOptional<number>;
  IsFixedDate?: CreationOptional<boolean>;
  IsActive?: CreationOptional<boolean>;
  CreatedAt?: CreationOptional<Date>;
  UpdatedAt?: CreationOptional<Date | null>;
}

export class Holiday
  extends Model<InferAttributes<Holiday>, InferCreationAttributes<Holiday>>
  implements HolidayAttributes
{
  declare HolidayId: CreationOptional<number>;
  declare HolidayCode: string | null;
  declare HolidayNameAr: string;
  declare HolidayNameEn: string | null;
  declare HolidayType: string;
  declare HolidayDate: string | Date;
  declare IsFixedDate: CreationOptional<boolean>;
  declare IsActive: CreationOptional<boolean>;
  declare Description: string | null;
  declare CreatedAt: CreationOptional<Date>;
  declare UpdatedAt: CreationOptional<Date | null>;
}

export const initHolidayModel = (sequelize: Sequelize): typeof Holiday => {
  Holiday.init(
    {
      HolidayId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      HolidayCode: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      HolidayNameAr: {
        type: DataTypes.STRING(200),
        allowNull: false
      },
      HolidayNameEn: {
        type: DataTypes.STRING(200),
        allowNull: true
      },
      HolidayType: {
        type: DataTypes.STRING(30),
        allowNull: false
      },
      HolidayDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      IsFixedDate: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      IsActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      Description: {
        type: DataTypes.STRING(1000),
        allowNull: true
      },
      CreatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      UpdatedAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "Holiday",
      tableName: "Holidays",
      schema: "dbo",
      timestamps: true,
      createdAt: "CreatedAt",
      updatedAt: "UpdatedAt",
      paranoid: false,
      underscored: false,
      freezeTableName: true,
      indexes: [
        {
          name: "PK_Holidays",
          unique: true,
          fields: ["HolidayId"]
        }
      ]
    }
  );

  return Holiday;
};
