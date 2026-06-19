import prisma from '../../src/common/utils/prisma';
import { SystemRole } from '../../src/common/enums/role.enum';
import { SystemPermission, DEFAULT_ROLE_PERMISSIONS } from '../../src/common/enums/permission.enum';

export class RolePermissionSeeder {
    /**
     * Seeds all system permissions into the Permission table.
     */
    async seedPermissions() {
        const permissions = Object.values(SystemPermission);
        for (const code of permissions) {
            await prisma.permission.upsert({
                where: { code },
                update: {},
                create: { code, description: `Access to ${code}` }
            });
        }
        return permissions;
    }

    /**
     * Seeds all system roles and maps their default permissions.
     */
    async seedRoles() {
        const roles: { role: any; roleName: string }[] = [];

        for (const roleName of Object.values(SystemRole)) {
            let role = await prisma.role.findFirst({
                where: { companyId: null, name: roleName }
            });

            if (!role) {
                role = await prisma.role.create({
                    data: {
                        name: roleName,
                        companyId: null,
                        description: `System role for ${roleName}`,
                        isSystemRole: true
                    }
                });
            }

            roles.push({ role, roleName });
        }

        return roles;
    }

    /**
     * Maps default permissions to roles based on DEFAULT_ROLE_PERMISSIONS.
     */
    async mapRolePermissions(roles: { role: any; roleName: string }[]) {
        let mappingCount = 0;

        for (const { role, roleName } of roles) {
            const defaultPerms = DEFAULT_ROLE_PERMISSIONS[roleName] || [];

            for (const permCode of defaultPerms) {
                const dbPerm = await prisma.permission.findUnique({
                    where: { code: permCode }
                });

                if (dbPerm) {
                    const existingMapping = await prisma.rolePermission.findUnique({
                        where: {
                            roleId_permissionId: {
                                roleId: role.id,
                                permissionId: dbPerm.id
                            }
                        }
                    });

                    if (!existingMapping) {
                        await prisma.rolePermission.create({
                            data: {
                                roleId: role.id,
                                permissionId: dbPerm.id
                            }
                        });
                        mappingCount++;
                    }
                }
            }
        }

        return mappingCount;
    }

    /**
     * Runs the full seed: permissions → roles → role-permission mappings.
     */
    async runFullSeed() {
        console.log('⏳ Seeding permissions...');
        const perms = await this.seedPermissions();
        console.log(`✅ Seeded ${perms.length} permissions`);

        console.log('⏳ Seeding system roles...');
        const roles = await this.seedRoles();
        console.log(`✅ Seeded ${roles.length} system roles`);

        console.log('⏳ Mapping role permissions...');
        const count = await this.mapRolePermissions(roles);
        console.log(`✅ Created ${count} role-permission mappings`);

        return { permissions: perms, roles };
    }
}

export const rolePermissionSeeder = new RolePermissionSeeder();