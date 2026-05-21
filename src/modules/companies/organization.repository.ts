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
}
