import prisma from '../../common/utils/prisma';
import { CreateDepartmentInput, UpdateDepartmentInput, CreateTeamInput, CreateWorkLocationInput } from './organization.validator';

export class OrganizationRepository {
    async createDepartment(companyId: string, data: CreateDepartmentInput) {
        return prisma.department.create({
            data: {
                name: data.name,
                companyId: companyId,
                managerId: data.managerId
            }
        });
    }

    async findDepartmentsByCompany(companyId: string) {
        return prisma.department.findMany({
            where: { companyId },
            include: { _count: { select: { teams: true, employees: true } } }
        });
    }

    async updateDepartment(id: string, companyId: string, data: UpdateDepartmentInput) {
        return prisma.department.update({
            where: { id, companyId },
            data: {
                name: data.name,
                managerId: data.managerId
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
                departmentId: data.departmentId
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
}
