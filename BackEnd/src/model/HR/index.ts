const { sequelize } = require("../../config/database");

import { initEmployeeModel, Employee } from "./Employee";
import { initHolidayModel, Holiday } from "./Holiday";
import { initJobModel, Job } from "./Job";
import { initLineLevelModel, LineLevel } from "./LineLevel";
import { initPositionModel, Position } from "./Position";
import { initTimeSheetModel, TimeSheet } from "./TimeSheet";
import { initTimeSheetCodeModel, TimeSheetCode } from "./TimeSheetCode";
import { initVacationModel, Vacation } from "./Vacation";

initTimeSheetCodeModel(sequelize);
initHolidayModel(sequelize);
initEmployeeModel(sequelize);
initJobModel(sequelize);
initLineLevelModel(sequelize);
initPositionModel(sequelize);
initVacationModel(sequelize);
initTimeSheetModel(sequelize);

TimeSheet.belongsTo(Employee, {
  foreignKey: "ID_Employee",
  targetKey: "ID_Employee",
  as: "Employee",
  constraints: false
});

Position.belongsTo(Employee, {
  foreignKey: "EmployeeId",
  targetKey: "ID_Employee",
  as: "Employee",
  constraints: false
});

Employee.hasMany(Position, {
  foreignKey: "EmployeeId",
  sourceKey: "ID_Employee",
  as: "Positions",
  constraints: false
});

Position.belongsTo(Job, {
  foreignKey: "Job_ID",
  targetKey: "Job_ID",
  as: "Job",
  constraints: false
});

Position.belongsTo(LineLevel, {
  foreignKey: "LineLevelId",
  targetKey: "Line_ID",
  as: "LineLevel",
  constraints: false
});

Vacation.belongsTo(TimeSheetCode, {
  foreignKey: "Id_CodeTimeSheet",
  targetKey: "ID",
  as: "TimeSheetCode",
  constraints: false
});

export {
  sequelize,
  Employee,
  Holiday,
  Job,
  LineLevel,
  Position,
  TimeSheet,
  TimeSheetCode,
  Vacation
};
