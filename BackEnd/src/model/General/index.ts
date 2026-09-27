const { sequelize } = require("../../config/database");

import { initDepartmentModel, Department } from "./Department";
import { initEpsaModel, Epsa } from "./Epsa";
import { initLocationModel, Location } from "./Location";
import { initSubLocationModel, SubLocation } from "./SubLocation";

// Initialize models
initLocationModel(sequelize);
initSubLocationModel(sequelize);
initDepartmentModel(sequelize);
initEpsaModel(sequelize);


// SubLocation → Location
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

// Asset → AssetCategory


// Asset → Department

// Asset → SubLocation
export{
  sequelize,
  Department,
  Epsa,
  Location,
  SubLocation,
 
  
};