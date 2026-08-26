const { sequelize } = require("../../config/database");

import { Department, Epsa, Location } from "../General";
import { initAFEModel, AFE } from "./AFE";
import { initAssetModel, Asset } from "./Asset";
import { initAssetCategoryModel, AssetCategory } from "./AssetCategory";
import { initBankModel, Bank } from "./Bank";
import { initBankGeneralModel, BankGeneral } from "./BankGeneral";
import { initBankSerialCheckModel, BankSerialCheck } from "./BankSerialCheck";
import { initCoaAccountGroupModel, CoaAccountGroup } from "./CoaAccountGroup";
import { initChartOfAccountsModel, ChartOfAccounts } from "./ChartOfAccounts";
import {
  initEpsaDepartmentChartAccountModel,
  EpsaDepartmentChartAccount
} from "./EpsaDepartmentChartAccount";

initAFEModel(sequelize);
initAssetModel(sequelize);
initAssetCategoryModel(sequelize);
initBankGeneralModel(sequelize);
initBankModel(sequelize);
initBankSerialCheckModel(sequelize);
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
  CoaAccountGroup,
  ChartOfAccounts,
  EpsaDepartmentChartAccount
};
