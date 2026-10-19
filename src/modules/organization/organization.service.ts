import { OrganizationRepository } from './organization.repository';
import { CreateDepartmentInput, UpdateDepartmentInput, CreateTeamInput, CreateWorkLocationInput } from './organization.validator';

export class OrganizationService {
    private orgRepository: OrganizationRepository;

    constructor() {
        this.orgRepository = new OrganizationRepository();
    }

    async getCompanies() {
        return this.orgRepository.findAllCompanies();
    }

    async getCompanyById(id: string) {
        return this.orgRepository.findCompanyById(id);
    }

    async updateCompanyStatus(id: string, status: string) {
        return this.orgRepository.updateCompanyStatus(id, status);
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

    async createRole(companyId: string, data: { name: string; description?: string }) {
        return this.orgRepository.createRole(companyId, data);
    }

    async getRoles(companyId: string) {
        return this.orgRepository.findRolesByCompany(companyId);
    }

    async updateRole(id: string, companyId: string, data: { name?: string; description?: string }) {
        return this.orgRepository.updateRole(id, companyId, data);
    }

    async deleteRole(id: string, companyId: string) {
        return this.orgRepository.deleteRole(id, companyId);
    }

    async assignPermissionsToRole(roleId: string, companyId: string, permissionIds: string[]) {
        return this.orgRepository.assignPermissionsToRole(roleId, companyId, permissionIds);
    }

    async getRolePermissions(roleId: string, companyId: string) {
        return this.orgRepository.findRolePermissions(roleId, companyId);
    }

    async removePermissionFromRole(roleId: string, companyId: string, permissionId: string) {
        return this.orgRepository.removePermissionFromRole(roleId, companyId, permissionId);
    }
}
