import { faker } from '@faker-js/faker';
import { BaseFactory } from './base.factory';
import prisma from '../../src/common/utils/prisma';
import { Role, Permission } from '@prisma/client';
import { SystemRole } from '../../src/common/enums/role.enum';
import {
    SystemPermission,
    DEFAULT_ROLE_PERMISSIONS,
} from '../../src/common/enums/permission.enum';

/**
 * PermissionFactory responsible for generating & seeding permissions.
 */
export class PermissionFactory extends BaseFactory<Permission> {
    protected model = prisma.permission;

    protected async definition() {
        return {
            code: `custom.perm_${faker.string.alphanumeric(6).toLowerCase()}`,
            description: faker.lorem.sentence(),
        };
    }

    /**
     * Seeds all predefined SystemPermissions into the database using bulk operations.
     * Guaranteed to be idempotent and fast.
     */
    async seedAll(): Promise<Permission[]> {
        const permissions = Object.values(SystemPermission);

        // Fetch existing codes in 1 query to avoid unnecessary writes
        const existing = await prisma.permission.findMany({ select: { code: true } });
        const existingCodes = new Set(existing.map((p) => p.code));

        const toCreate = permissions
            .filter((code) => !existingCodes.has(code))
            .map((code) => ({ code, description: `Access to ${code}` }));

        if (toCreate.length > 0) {
            await prisma.permission.createMany({
                data: toCreate,
                skipDuplicates: true,
            });
        }

        return prisma.permission.findMany();
    }
}

/**
 * RoleFactory responsible for generating & seeding system roles and mapping permissions.
 */
export class RoleFactory extends BaseFactory<Role> {
    protected model = prisma.role;

    protected async definition() {
        return {
            name: `Role_${faker.string.alphanumeric(5)}`,
            description: faker.lorem.sentence(),
            isSystemRole: false,
            companyId: null,
        };
    }

    /**
     * Seeds all predefined system permissions.
     */
    async seedPermissions(): Promise<Permission[]> {
        return permissionFactory.seedAll();
    }

    /**
     * Seeds all standard system roles with their respective default permissions.
     * Uses in-memory mapping and batch insertions to minimize remote database round-trips.
     *
     * @param companyId Optional companyId. Defaults to null for global system roles.
     * @returns A Map of RoleName -> Role record.
     */
    async seedSystemRoles(companyId: string | null = null): Promise<Map<string, Role>> {
        const roleMap = new Map<string, Role>();

        // Preload all permissions into memory for instant lookup (1 query)
        const allPermissions = await prisma.permission.findMany();
        const permByCode = new Map(allPermissions.map((p) => [p.code, p]));

        const rolePermissionsToInsert: { roleId: string; permissionId: string }[] = [];

        for (const roleName of Object.values(SystemRole)) {
            let role = await prisma.role.findFirst({
                where: { companyId, name: roleName },
            });

            if (!role) {
                role = await prisma.role.create({
                    data: {
                        name: roleName,
                        companyId,
                        description: `System role: ${roleName}`,
                        isSystemRole: true,
                    },
                });
            }

            roleMap.set(roleName, role);

            const defaultPerms = DEFAULT_ROLE_PERMISSIONS[roleName] || [];
            for (const permCode of defaultPerms) {
                const dbPerm = permByCode.get(permCode);
                if (dbPerm) {
                    rolePermissionsToInsert.push({
                        roleId: role.id,
                        permissionId: dbPerm.id,
                    });
                }
            }
        }

        // Batch insert all role permission mappings in 1 query
        if (rolePermissionsToInsert.length > 0) {
            await prisma.rolePermission.createMany({
                data: rolePermissionsToInsert,
                skipDuplicates: true,
            });
        }

        return roleMap;
    }

    /**
     * Combined seeder: Seeds all system permissions and all system roles.
     */
    async seedAll(companyId: string | null = null): Promise<{
        permissions: Permission[];
        roles: Map<string, Role>;
    }> {
        const permissions = await this.seedPermissions();
        const roles = await this.seedSystemRoles(companyId);
        return { permissions, roles };
    }

    /**
     * Find a role by its name (and optionally companyId).
     */
    async findByName(name: SystemRole | string, companyId: string | null = null): Promise<Role | null> {
        return prisma.role.findFirst({
            where: {
                name,
                companyId,
            },
        });
    }

    /**
     * Find an existing system role or create it if not present.
     */
    async findOrCreateSystemRole(roleName: SystemRole | string): Promise<Role> {
        let role = await this.findByName(roleName, null);
        if (!role) {
            role = await prisma.role.create({
                data: {
                    name: roleName,
                    companyId: null,
                    description: `System role: ${roleName}`,
                    isSystemRole: true,
                },
            });
        }
        return role;
    }

    /**
     * Creates a custom role with a list of system permissions assigned.
     */
    async createWithPermissions(
        data: {
            name: string;
            companyId?: string | null;
            description?: string;
            isSystemRole?: boolean;
        },
        permissionCodes: SystemPermission[] = []
    ): Promise<Role> {
        const role = await this.create({
            name: data.name,
            companyId: data.companyId ?? null,
            description: data.description ?? `Custom role: ${data.name}`,
            isSystemRole: data.isSystemRole ?? false,
        });

        await this.attachPermissions(role.id, permissionCodes);

        return role;
    }

    /**
     * Attaches an array of permission codes to an existing role using batch insertion.
     */
    async attachPermissions(roleId: string, permissionCodes: SystemPermission[]): Promise<void> {
        if (permissionCodes.length === 0) return;

        const dbPerms = await prisma.permission.findMany({
            where: { code: { in: permissionCodes } },
        });

        const mappings = dbPerms.map((p) => ({
            roleId,
            permissionId: p.id,
        }));

        if (mappings.length > 0) {
            await prisma.rolePermission.createMany({
                data: mappings,
                skipDuplicates: true,
            });
        }
    }
}

export const permissionFactory = new PermissionFactory();
export const roleFactory = new RoleFactory();
