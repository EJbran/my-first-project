import { Op } from "sequelize";
const { sequelize } = require("../../config/database");
import { initAccessRequestModel, AccessRequest } from "./AccessRequest";
import {
  initAccessRequestApprovalModel,
  AccessRequestApproval
} from "./AccessRequestApproval";
import { initAdGroupRoleMappingModel, AdGroupRoleMapping } from "./AdGroupRoleMapping";
import { initApiClientModel, ApiClient } from "./ApiClient";
import { initApiClientSecretModel, ApiClientSecret } from "./ApiClientSecret";
import { initAuditLogModel, AuditLog } from "./AuditLog";
import { initAuthDomainModel, AuthDomain } from "./AuthDomain";
import { initDelegationModel, Delegation } from "./Delegation";
import { initLoginAttemptModel, LoginAttempt } from "./LoginAttempt";
import { initMfaFactorModel, MfaFactor } from "./MfaFactor";
import { initPasswordHistoryModel, PasswordHistory } from "./PasswordHistory";
import { initPermissionModel, Permission } from "./Permission";
import { initPermissionGroupModel, PermissionGroup } from "./PermissionGroup";
import {
  initPermissionGroupItemModel,
  PermissionGroupItem
} from "./PermissionGroupItem";
import { initRoleModel, Role } from "./Role";
import { initRolePermissionModel, RolePermission } from "./RolePermission";
import { initSecurityPolicyModel, SecurityPolicy } from "./SecurityPolicy";
import { initUserModel, User } from "./User";
import { initUserDeviceModel, UserDevice } from "./UserDevice";
import { initUserPermissionModel, UserPermission } from "./UserPermission";
import { initUserRoleModel, UserRole } from "./UserRole";
import { initUserSessionModel, UserSession } from "./UserSession";

initAuthDomainModel(sequelize);
initUserModel(sequelize);
initRoleModel(sequelize);
initPermissionModel(sequelize);
initUserRoleModel(sequelize);
initRolePermissionModel(sequelize);
initUserPermissionModel(sequelize);
initMfaFactorModel(sequelize);
initUserSessionModel(sequelize);
initLoginAttemptModel(sequelize);
initPasswordHistoryModel(sequelize);
initDelegationModel(sequelize);
initAuditLogModel(sequelize);
initApiClientModel(sequelize);
initApiClientSecretModel(sequelize);
initSecurityPolicyModel(sequelize);
initUserDeviceModel(sequelize);
initAccessRequestModel(sequelize);
initAccessRequestApprovalModel(sequelize);
initPermissionGroupModel(sequelize);
initPermissionGroupItemModel(sequelize);
initAdGroupRoleMappingModel(sequelize);

AuthDomain.hasMany(User, { foreignKey: "AuthDomainId" });
User.belongsTo(AuthDomain, { foreignKey: "AuthDomainId" });

User.belongsTo(User, { as: "Manager", foreignKey: "ManagerUserId" });
User.hasMany(User, { as: "DirectReports", foreignKey: "ManagerUserId" });

User.belongsToMany(Role, { through: UserRole, foreignKey: "UserId", otherKey: "RoleId" });
Role.belongsToMany(User, { through: UserRole, foreignKey: "RoleId", otherKey: "UserId" });
UserRole.belongsTo(User, { foreignKey: "UserId" });
UserRole.belongsTo(Role, { foreignKey: "RoleId" });

Role.belongsToMany(Permission, {
  through: RolePermission,
  foreignKey: "RoleId",
  otherKey: "PermissionId"
});
Permission.belongsToMany(Role, {
  through: RolePermission,
  foreignKey: "PermissionId",
  otherKey: "RoleId"
});
RolePermission.belongsTo(Role, { foreignKey: "RoleId" });
RolePermission.belongsTo(Permission, { foreignKey: "PermissionId" });

User.belongsToMany(Permission, {
  through: UserPermission,
  foreignKey: "UserId",
  otherKey: "PermissionId"
});
Permission.belongsToMany(User, {
  through: UserPermission,
  foreignKey: "PermissionId",
  otherKey: "UserId"
});
UserPermission.belongsTo(User, { foreignKey: "UserId" });
UserPermission.belongsTo(Permission, { foreignKey: "PermissionId" });

User.hasMany(MfaFactor, { foreignKey: "UserId" });
MfaFactor.belongsTo(User, { foreignKey: "UserId" });

User.hasMany(UserSession, { foreignKey: "UserId" });
UserSession.belongsTo(User, { foreignKey: "UserId" });
UserSession.belongsTo(UserSession, {
  as: "ReplacedBySession",
  foreignKey: "ReplacedBySessionId"
});

User.hasMany(LoginAttempt, { foreignKey: "UserId" });
LoginAttempt.belongsTo(User, { foreignKey: "UserId" });

User.hasMany(PasswordHistory, { foreignKey: "UserId" });
PasswordHistory.belongsTo(User, { foreignKey: "UserId" });

User.hasMany(UserDevice, { foreignKey: "UserId" });
UserDevice.belongsTo(User, { foreignKey: "UserId" });

User.hasMany(Delegation, { as: "DelegationsFromUser", foreignKey: "FromUserId" });
User.hasMany(Delegation, { as: "DelegationsToUser", foreignKey: "ToUserId" });
Delegation.belongsTo(User, { as: "FromUser", foreignKey: "FromUserId" });
Delegation.belongsTo(User, { as: "ToUser", foreignKey: "ToUserId" });

AuditLog.belongsTo(User, { as: "ActorUser", foreignKey: "ActorUserId" });
AuditLog.belongsTo(User, {
  as: "DelegatedFromUser",
  foreignKey: "DelegatedFromUserId"
});
AuditLog.belongsTo(Delegation, { foreignKey: "DelegationId" });

ApiClient.hasMany(ApiClientSecret, { foreignKey: "ApiClientId" });
ApiClientSecret.belongsTo(ApiClient, { foreignKey: "ApiClientId" });
ApiClientSecret.belongsTo(User, { as: "CreatedByUser", foreignKey: "CreatedBy" });
ApiClientSecret.belongsTo(User, { as: "RevokedByUser", foreignKey: "RevokedBy" });

SecurityPolicy.belongsTo(User, { as: "UpdatedByUser", foreignKey: "UpdatedBy" });

AccessRequest.belongsTo(User, {
  as: "RequestedForUser",
  foreignKey: "RequestedForUserId"
});
AccessRequest.belongsTo(User, {
  as: "RequestedByUser",
  foreignKey: "RequestedByUserId"
});
AccessRequest.belongsTo(Role, { foreignKey: "RoleId" });
AccessRequest.belongsTo(Permission, { foreignKey: "PermissionId" });
AccessRequest.hasMany(AccessRequestApproval, { foreignKey: "AccessRequestId" });
AccessRequestApproval.belongsTo(AccessRequest, { foreignKey: "AccessRequestId" });
AccessRequestApproval.belongsTo(User, {
  as: "ApproverUser",
  foreignKey: "ApproverUserId"
});

PermissionGroup.belongsToMany(Permission, {
  through: PermissionGroupItem,
  foreignKey: "PermissionGroupId",
  otherKey: "PermissionId"
});
Permission.belongsToMany(PermissionGroup, {
  through: PermissionGroupItem,
  foreignKey: "PermissionId",
  otherKey: "PermissionGroupId"
});

AuthDomain.hasMany(AdGroupRoleMapping, { foreignKey: "AuthDomainId" });
AdGroupRoleMapping.belongsTo(AuthDomain, { foreignKey: "AuthDomainId" });
Role.hasMany(AdGroupRoleMapping, { foreignKey: "RoleId" });
AdGroupRoleMapping.belongsTo(Role, { foreignKey: "RoleId" });

export {
  sequelize,
  Op,
  AuthDomain,
  User,
  Role,
  Permission,
  UserRole,
  RolePermission,
  UserPermission,
  MfaFactor,
  UserSession,
  LoginAttempt,
  PasswordHistory,
  Delegation,
  AuditLog,
  ApiClient,
  ApiClientSecret,
  SecurityPolicy,
  UserDevice,
  AccessRequest,
  AccessRequestApproval,
  PermissionGroup,
  PermissionGroupItem,
  AdGroupRoleMapping
};
