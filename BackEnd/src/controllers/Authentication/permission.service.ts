import { Op, Transaction } from "sequelize";
import {
  AdGroupRoleMapping,
  Permission,
  Role,
  RolePermission,
  User,
  UserPermission,
  UserRole
} from "../../model/Authentication";
import { recordAudit } from "./audit.service";

export const getUserRoles = async (
  userId: number,
  transaction?: Transaction
): Promise<Role[]> => {
  const user = await User.findByPk(userId, transaction ? { transaction } : undefined);
  if (!user || !user.IsActive || user.DeletedAt) {
    return [];
  }

  const userRoles = await UserRole.findAll({
    where: {
      UserId: userId,
      IsActive: true
    },
    include: [
      {
        model: Role,
        required: true,
        where: {
          IsActive: true
        }
      }
    ],
    ...(transaction ? { transaction } : {})
  });

  return userRoles
    .map((row) => row.get("Role") as Role)
    .filter((role): role is Role => Boolean(role));
};

export const getUserPermissions = async (
  userId: number,
  transaction?: Transaction
): Promise<Permission[]> => {
  const user = await User.findByPk(userId, transaction ? { transaction } : undefined);
  if (!user || !user.IsActive || user.DeletedAt) {
    return [];
  }

  const roles = await getUserRoles(userId, transaction);
  const roleIds = roles.map((role) => role.Id);

  const rolePermissions = roleIds.length
    ? await RolePermission.findAll({
        where: {
          RoleId: {
            [Op.in]: roleIds
          }
        },
        include: [
          {
            model: Permission,
            required: true,
            where: {
              IsActive: true
            }
          }
        ],
        ...(transaction ? { transaction } : {})
      })
    : [];

  const now = new Date();
  const directUserPermissions = await UserPermission.findAll({
    where: {
      UserId: userId,
      [Op.or]: [{ ExpiresAt: null }, { ExpiresAt: { [Op.gt]: now } }]
    },
    include: [
      {
        model: Permission,
        required: true,
        where: {
          IsActive: true
        }
      }
    ],
    ...(transaction ? { transaction } : {})
  });

  const deniedPermissionIds = new Set<number>();
  const explicitGrantedPermissionIds = new Set<number>();

  for (const userPermission of directUserPermissions) {
    const permission = userPermission.get("Permission") as Permission | null;
    if (!permission) {
      continue;
    }

    if (userPermission.IsGranted) {
      explicitGrantedPermissionIds.add(permission.Id);
    } else {
      deniedPermissionIds.add(permission.Id);
    }
  }

  const combined = new Map<number, Permission>();

  for (const rolePermission of rolePermissions) {
    const permission = rolePermission.get("Permission") as Permission | null;
    if (!permission) {
      continue;
    }

    if (!deniedPermissionIds.has(permission.Id)) {
      combined.set(permission.Id, permission);
    }
  }

  for (const userPermission of directUserPermissions) {
    const permission = userPermission.get("Permission") as Permission | null;
    if (!permission) {
      continue;
    }

    if (deniedPermissionIds.has(permission.Id)) {
      combined.delete(permission.Id);
      continue;
    }

    if (explicitGrantedPermissionIds.has(permission.Id)) {
      combined.set(permission.Id, permission);
    }
  }

  return Array.from(combined.values());
};

export const hasPermission = async (
  userId: number,
  permissionCode: string
): Promise<boolean> => {
  const permissions = await getUserPermissions(userId);
  return permissions.some((permission) => permission.Code === permissionCode);
};

export const syncEntraGroupsToRoles = async (
  userId: number,
  authDomainId: number,
  groupIds: string[],
  transaction?: Transaction
): Promise<void> => {
  if (!groupIds.length) {
    return;
  }

  const mappings = await AdGroupRoleMapping.findAll({
    where: {
      AuthDomainId: authDomainId,
      IsActive: true,
      EntraGroupObjectId: {
        [Op.in]: groupIds
      }
    },
    transaction
  });

  const mappedRoleIds = Array.from(new Set(mappings.map((m) => m.RoleId)));
  if (!mappedRoleIds.length) {
    return;
  }

  for (const roleId of mappedRoleIds) {
    const existing = await UserRole.findOne({
      where: {
        UserId: userId,
        RoleId: roleId
      },
      transaction
    });

    if (!existing) {
      await UserRole.create(
        {
          UserId: userId,
          RoleId: roleId,
          IsActive: true,
          AssignedAt: new Date()
        },
        { transaction }
      );
      continue;
    }

    if (!existing.IsActive) {
      existing.IsActive = true;
      existing.RevokedAt = null;
      existing.RevokedBy = null;
      existing.RevokedReason = null;
      await existing.save({ transaction });
    }
  }

  await recordAudit({
    actorUserId: userId,
    action: "ENTRA_GROUP_ROLE_SYNC",
    module: "AUTH",
    entityName: "UserRole",
    entityId: String(userId),
    status: "SUCCESS",
    newData: {
      authDomainId,
      groupIds,
      mappedRoleIds,
      note: "No automatic removal of roles without assignment-source tracking"
    }
  });
};
