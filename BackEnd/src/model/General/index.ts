const { sequelize } = require("../../config/database");

import { initDepartmentModel, Department } from "./Department";
import { initEpsaModel, Epsa } from "./Epsa";
import { initLocationModel, Location } from "./Location";
import { initSubLocationModel, SubLocation } from "./SubLocation";

initLocationModel(sequelize);
initSubLocationModel(sequelize);
initDepartmentModel(sequelize);
initEpsaModel(sequelize);

SubLocation.belongsTo(Location, {
	foreignKey: "LocationId",
	targetKey: "ID_Location",
	as: "Location"
});

Location.hasMany(SubLocation, {
	foreignKey: "LocationId",
	sourceKey: "ID_Location",
	as: "SubLocations"
});

export { sequelize, Department, Epsa, Location, SubLocation };
