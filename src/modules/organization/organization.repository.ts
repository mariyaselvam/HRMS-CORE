import prisma from '../../common/utils/prisma';
import {
    CreateDepartmentInput,
    UpdateDepartmentInput,
    CreateTeamInput,
    CreateWorkLocationInput,
    CreateClusterInput,
    UpdateClusterInput
} from './organization.validator';

export class OrganizationRepository {
    async findAllCompanies() {
        return prisma.company.findMany({
            include: {
                _count: {
                    select: {
                        employees: true,
                        departments: true,
                        workLocations: true,
                        clusters: true,
                        users: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findCompanyById(id: string) {
        return prisma.company.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        employees: true,
                        departments: true,
                        workLocations: true,
                        clusters: true,
                        users: true,
                    }
                }
            }
        });
    }

    async updateCompanyStatus(id: string, status: string) {
        return prisma.company.update({
            where: { id },
            data: { status }
        });
    }

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
                longitude: data.longitude,
                clusterId: data.clusterId || null,
            },
            include: {
                cluster: {
                    select: { id: true, name: true, code: true, state: true }
                }
            }
        });
    }

    async findLocationsByCompany(companyId: string, clusterId?: string) {
        const where: any = { companyId };
        if (clusterId) {
            where.clusterId = clusterId;
        }
        return prisma.workLocation.findMany({
            where,
            include: {
                cluster: {
                    select: { id: true, name: true, code: true, state: true }
                },
                _count: { select: { employees: true } }
            },
            orderBy: { name: 'asc' }
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
            data
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
                name: data.name,
                description: data.description,
                companyId: companyId
            }
        });
    }

    async findRolesByCompany(companyId: string) {
        return prisma.role.findMany({
            where: {
                OR: [
                    { companyId: companyId },
                    { isSystemRole: true }
                ]
            }
        });
    }

    async updateRole(id: string, companyId: string, data: { name?: string; description?: string }) {
        return prisma.role.update({
            where: { id, companyId },
            data
        });
    }

    async deleteRole(id: string, companyId: string) {
        return prisma.role.delete({
            where: { id, companyId }
        });
    }

    async assignPermissionsToRole(roleId: string, companyId: string, permissionIds: string[]) {
        await prisma.rolePermission.deleteMany({
            where: { roleId }
        });

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

    // --- Clusters ---
    async createCluster(companyId: string, data: CreateClusterInput) {
        return prisma.cluster.create({
            data: {
                name: data.name,
                code: data.code,
                state: data.state || null,
                companyId
            }
        });
    }

    async findClustersByCompany(companyId: string) {
        return prisma.cluster.findMany({
            where: { companyId },
            include: {
                workLocations: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        _count: { select: { employees: true } }
                    }
                },
                _count: {
                    select: {
                        workLocations: true,
                        users: true,
                        holidays: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        });
    }

    async findClusterById(id: string, companyId: string) {
        return prisma.cluster.findFirst({
            where: { id, companyId },
            include: {
                workLocations: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        _count: { select: { employees: true } }
                    }
                },
                holidays: true,
                _count: {
                    select: {
                        workLocations: true,
                        users: true
                    }
                }
            }
        });
    }

    async updateCluster(id: string, companyId: string, data: UpdateClusterInput) {
        return prisma.cluster.update({
            where: { id },
            data: {
                ...(data.name !== undefined ? { name: data.name } : {}),
                ...(data.code !== undefined ? { code: data.code } : {}),
                ...(data.state !== undefined ? { state: data.state } : {})
            }
        });
    }

    async deleteCluster(id: string, companyId: string) {
        // Disassociate branches from cluster before deleting
        await prisma.workLocation.updateMany({
            where: { clusterId: id, companyId },
            data: { clusterId: null }
        });

        return prisma.cluster.delete({
            where: { id }
        });
    }

    async assignBranchToCluster(branchId: string, clusterId: string | null, companyId: string) {
        return prisma.workLocation.update({
            where: { id: branchId },
            data: { clusterId }
        });
    }
}

