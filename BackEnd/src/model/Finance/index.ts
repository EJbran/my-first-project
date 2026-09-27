const { sequelize } = require("../../config/database");

import {   Department,
  Epsa,
  Location,
  SubLocation } from "../General";
import { initAFEModel, AFE } from "./AFE";
import { initAssetModel, Asset } from "./Asset";
import { initAssetCategoryModel, AssetCategory } from "./AssetCategory";
import { initBankModel, Bank } from "./Bank";
import { initBankGeneralModel, BankGeneral } from "./BankGeneral";
import { initBankSerialCheckModel, BankSerialCheck } from "./BankSerialCheck";
import { initCategoryAttributesModel, CategoryAttributes } from "./CategoryAttributes";
import { initCoaAccountGroupModel, CoaAccountGroup } from "./CoaAccountGroup";
import { initChartOfAccountsModel, ChartOfAccounts } from "./ChartOfAccounts";
import {
  initEpsaDepartmentChartAccountModel,
  EpsaDepartmentChartAccount
} from "./EpsaDepartmentChartAccount";

initAFEModel(sequelize);

initAssetModel(sequelize);
initAssetCategoryModel(sequelize);
Asset.belongsTo(AssetCategory, {
  foreignKey: "CategoryID",
  targetKey: "CategoryID",
  as: "Category",
  constraints: false
});

AssetCategory.hasMany(Asset, {
  foreignKey: "CategoryID",
  sourceKey: "CategoryID",
  as: "Assets",
  constraints: false
});
Asset.belongsTo(Department, {
  foreignKey: "DepartmentID",
  targetKey: "Id",
  as: "Department",
  constraints: false
});

Department.hasMany(Asset, {
  foreignKey: "DepartmentID",
  sourceKey: "Id",
  as: "Assets",
  constraints: false
});

Asset.belongsTo(SubLocation, {
  foreignKey: "SubLocationID",
  targetKey: "Id",
  as: "SubLocation",
  constraints: false
});
SubLocation.hasMany(Asset, {
  foreignKey: "SubLocationID",
  sourceKey: "Id",
  as: "Assets",
  constraints: false
});

initBankGeneralModel(sequelize);
initBankModel(sequelize);
initBankSerialCheckModel(sequelize);
initCategoryAttributesModel(sequelize);
initCoaAccountGroupModel(sequelize);
initChartOfAccountsModel(sequelize);
initEpsaDepartmentChartAccountModel(sequelize);

Bank.belongsTo(BankGeneral, {
  foreignKey: "BankId",
  targetKey: "Id",
  as: "BankGeneral",
  constraints: false
});

BankGeneral.hasMany(Bank, {
  foreignKey: "BankId",
  sourceKey: "Id",
  as: "Banks",
  constraints: false
});

BankSerialCheck.belongsTo(Bank, {
  foreignKey: "BANKID",
  targetKey: "Id",
  as: "Bank",
  constraints: false
});

Bank.hasMany(BankSerialCheck, {
  foreignKey: "BANKID",
  sourceKey: "Id",
  as: "SerialChecks",
  constraints: false
});

ChartOfAccounts.belongsTo(CoaAccountGroup, {
  foreignKey: "AccountGroupCode",
  targetKey: "AccountGroupCode",
  as: "AccountGroup",
  constraints: false
});

CoaAccountGroup.hasMany(ChartOfAccounts, {
  foreignKey: "AccountGroupCode",
  sourceKey: "AccountGroupCode",
  as: "Accounts",
  constraints: false
});

EpsaDepartmentChartAccount.belongsTo(Epsa, {
  foreignKey: "EPSAId",
  targetKey: "Id",
  as: "Epsa",
  constraints: false
});

EpsaDepartmentChartAccount.belongsTo(Department, {
  foreignKey: "DepartmentId",
  targetKey: "Id",
  as: "Department",
  constraints: false
});

EpsaDepartmentChartAccount.belongsTo(ChartOfAccounts, {
  foreignKey: "ChartAccountId",
  targetKey: "Id",
  as: "ChartAccount",
  constraints: false
});

EpsaDepartmentChartAccount.belongsTo(Location, {
  foreignKey: "LocationID",
  targetKey: "ID_Location",
  as: "Location",
  constraints: false
});

AFE.belongsTo(Department, {
  foreignKey: "DepartmentId",
  targetKey: "Id",
  as: "Department",
  constraints: false
});

AFE.belongsTo(Location, {
  foreignKey: "LocationId",
  targetKey: "ID_Location",
  as: "Location",
  constraints: false
});

export {
  sequelize,
  AFE,
  Asset,
  AssetCategory,
  Bank,
  BankGeneral,
  BankSerialCheck,
  CategoryAttributes,
  CoaAccountGroup,
  ChartOfAccounts,
  EpsaDepartmentChartAccount,
Department,
SubLocation,
};