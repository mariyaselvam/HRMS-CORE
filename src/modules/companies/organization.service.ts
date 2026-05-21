import { OrganizationRepository } from './organization.repository';
import { CreateDepartmentInput, UpdateDepartmentInput, CreateTeamInput, CreateWorkLocationInput } from './organization.validator';

export class OrganizationService {
    private orgRepository: OrganizationRepository;

    constructor() {
        this.orgRepository = new OrganizationRepository();
    }

    async createDepartment(companyId: string, data: CreateDepartmentInput) {
        return this.orgRepository.createDepartment(companyId, data);
    }

    async getDepartments(companyId: string, locationId?: string) {
        return this.orgRepository.findDepartmentsByCompany(companyId, locationId);
    }

    async updateDepartment(id: string, companyId: string, data: UpdateDepartmentInput) {
        return this.orgRepository.updateDepartment(id, companyId, data);
    }

    async deleteDepartment(id: string, companyId: string) {
        return this.orgRepository.deleteDepartment(id, companyId);
    }

    async createTeam(companyId: string, data: CreateTeamInput) {
        return this.orgRepository.createTeam(companyId, data);
    }

    async createLocation(companyId: string, data: CreateWorkLocationInput) {
        return this.orgRepository.createLocation(companyId, data);
    }

    async getLocations(companyId: string) {
        return this.orgRepository.findLocationsByCompany(companyId);
    }

    async getTeams(companyId: string, locationId?: string) {
        return this.orgRepository.findTeamsByCompany(companyId, locationId);
    }

    async updateTeam(id: string, companyId: string, data: any) {
        return this.orgRepository.updateTeam(id, companyId, data);
    }

    async deleteTeam(id: string, companyId: string) {
        return this.orgRepository.deleteTeam(id, companyId);
    }
}
