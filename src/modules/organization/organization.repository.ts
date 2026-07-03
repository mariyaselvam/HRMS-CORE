import prisma from '../../common/utils/prisma';
import { CreateDepartmentInput, UpdateDepartmentInput, CreateTeamInput, CreateWorkLocationInput } from './organization.validator';

export class OrganizationRepository {
    async createDepartment(companyId: string, data: CreateDepartmentInput) {
        return prisma.department.create({
            data: {
                name: data.name,
                companyId: companyId,
                managerId: data.managerId,
                workLocationId: data.workLocationId
            }
        });
    }

    async findDepartmentsByCompany(companyId: string, locationId?: string) {
        const where: any = { companyId };
        if (locationId) {
            where.workLocationId = locationId;
        }
        return prisma.department.findMany({
            where,
            include: {
                workLocation: { select: { id: true, name: true } },
                _count: { select: { teams: true, employees: true } }
            }
        });
    }

    async updateDepartment(id: string, companyId: string, data: UpdateDepartmentInput) {
        return prisma.department.update({
            where: { id, companyId },
            data: {
                name: data.name,
                managerId: data.managerId,
                workLocationId: data.workLocationId
            }
        });
    }

    async deleteDepartment(id: string, companyId: string) {
        return prisma.department.delete({
            where: { id, companyId }
        });
    }

    async createTeam(companyId: string, data: CreateTeamInput) {
        return prisma.team.create({
            data: {
                name: data.name,
                companyId: companyId,
                departmentId: data.departmentId,
                workLocationId: data.workLocationId
            }
        });
    }

    async createLocation(companyId: string, data: CreateWorkLocationInput) {
        return prisma.workLocation.create({
            data: {
                name: data.name,
                address: data.address,
                companyId: companyId,
                latitude: data.latitude,
                longitude: data.longitude
            }
        });
    }

    async findLocationsByCompany(companyId: string) {
        return prisma.workLocation.findMany({
            where: { companyId },
            include: { _count: { select: { employees: true } } }
        });
    }

    async findTeamsByCompany(companyId: string, locationId?: string) {
        const where: any = { companyId };
        if (locationId) {
            where.workLocationId = locationId;
        }
        return prisma.team.findMany({
            where,
            include: {
                department: {
                    select: {
                        name: true
                    }
                },
                workLocation: {
                    select: {
                        name: true
                    }
                },
                _count: { select: { employees: true } }
            }
        });
    }

    async updateTeam(id: string, companyId: string, data: Partial<CreateTeamInput>) {
        return prisma.team.update({
            where: { id, companyId },
            data: {
                name: data.name,
                departmentId: data.departmentId,
                workLocationId: data.workLocationId
            }
        });
    }

    async deleteTeam(id: string, companyId: string) {
        return prisma.team.delete({
            where: { id, companyId }
        });
    }

    async createRole(companyId: string, data: { name: string; description?: string }) {
        return prisma.role.create({
            data: {
                ...data,
                companyId,
                isSystemRole: false,
            }
        });
    }

    async findRolesByCompany(companyId: string) {
        return prisma.role.findMany({
            where: { companyId },
            include: {
                permissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });
    }

    async updateRole(id: string, companyId: string, data: { name?: string; description?: string }) {
        return prisma.role.update({
            where: { id, companyId },
            data: {
                name: data.name,
                description: data.description,
            }
        });
    }

    async deleteRole(id: string, companyId: string) {
        return prisma.role.delete({
            where: { id, companyId }
        });
    }

    async assignPermissionsToRole(roleId: string, companyId: string, permissionIds: string[]) {
        // Remove existing permissions first, then add new ones
        await prisma.rolePermission.deleteMany({
            where: { roleId }
        });

        // Update role with new permissions using connect
        return prisma.role.update({
            where: { id: roleId },
            data: {
                permissions: {
                    create: permissionIds.map(pid => ({ permissionId: pid }))
                }
            }
        });
    }

    async findRolePermissions(roleId: string, companyId: string) {
        return prisma.rolePermission.findMany({
            where: { roleId },
            include: {
                permission: true
            }
        });
    }

    async removePermissionFromRole(roleId: string, companyId: string, permissionId: string) {
        return prisma.rolePermission.delete({
            where: {
                roleId_permissionId: {
                    roleId,
                    permissionId
                }
            }
        });
    }
}
