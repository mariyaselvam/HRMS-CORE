import { OrganizationService } from './organization.service';
import { OrganizationRepository } from './organization.repository';

jest.mock('./organization.repository');

describe('OrganizationService', () => {
    let organizationService: OrganizationService;
    let orgRepositoryMock: jest.Mocked<OrganizationRepository>;

    beforeEach(() => {
        jest.clearAllMocks();
        
        organizationService = new OrganizationService();
        orgRepositoryMock = (OrganizationRepository as jest.Mock).mock.instances[0] as unknown as jest.Mocked<OrganizationRepository>;
        if (!orgRepositoryMock) {
            orgRepositoryMock = (organizationService as any).orgRepository;
        }
    });

    const mockCompanyId = 'company-123';
    const mockId = 'resource-123';

    describe('Departments', () => {
        it('should create a department', async () => {
            const data = { name: 'Engineering', description: 'Tech team' };
            orgRepositoryMock.createDepartment = jest.fn().mockResolvedValue({ id: mockId, ...data });

            const result = await organizationService.createDepartment(mockCompanyId, data as any);

            expect(orgRepositoryMock.createDepartment).toHaveBeenCalledWith(mockCompanyId, data);
            expect(result).toHaveProperty('id', mockId);
        });

        it('should get departments', async () => {
            const lists = [{ id: 'dept-1' }];
            orgRepositoryMock.findDepartmentsByCompany = jest.fn().mockResolvedValue(lists);

            const result = await organizationService.getDepartments(mockCompanyId);

            expect(orgRepositoryMock.findDepartmentsByCompany).toHaveBeenCalledWith(mockCompanyId, undefined);
            expect(result).toEqual(lists);
        });

        it('should update a department', async () => {
            const data = { description: 'Updated Tech team' };
            orgRepositoryMock.updateDepartment = jest.fn().mockResolvedValue({ id: mockId, ...data });

            const result = await organizationService.updateDepartment(mockId, mockCompanyId, data as any);

            expect(orgRepositoryMock.updateDepartment).toHaveBeenCalledWith(mockId, mockCompanyId, data);
            expect(result).toEqual({ id: mockId, ...data });
        });

        it('should delete a department', async () => {
            orgRepositoryMock.deleteDepartment = jest.fn().mockResolvedValue({ id: mockId });

            const result = await organizationService.deleteDepartment(mockId, mockCompanyId);

            expect(orgRepositoryMock.deleteDepartment).toHaveBeenCalledWith(mockId, mockCompanyId);
            expect(result).toEqual({ id: mockId });
        });
    });

    describe('Teams', () => {
        it('should create a team', async () => {
            const data = { name: 'Frontend', departmentId: 'dept-1' };
            orgRepositoryMock.createTeam = jest.fn().mockResolvedValue({ id: mockId, ...data });

            const result = await organizationService.createTeam(mockCompanyId, data as any);

            expect(orgRepositoryMock.createTeam).toHaveBeenCalledWith(mockCompanyId, data);
            expect(result).toHaveProperty('id', mockId);
        });

        it('should get teams', async () => {
            const lists = [{ id: 'team-1' }];
            orgRepositoryMock.findTeamsByCompany = jest.fn().mockResolvedValue(lists);

            const result = await organizationService.getTeams(mockCompanyId);

            expect(orgRepositoryMock.findTeamsByCompany).toHaveBeenCalledWith(mockCompanyId, undefined);
            expect(result).toEqual(lists);
        });

        it('should update a team', async () => {
            const data = { name: 'Backend' };
            orgRepositoryMock.updateTeam = jest.fn().mockResolvedValue({ id: mockId, ...data });

            const result = await organizationService.updateTeam(mockId, mockCompanyId, data);

            expect(orgRepositoryMock.updateTeam).toHaveBeenCalledWith(mockId, mockCompanyId, data);
            expect(result).toEqual({ id: mockId, ...data });
        });

        it('should delete a team', async () => {
            orgRepositoryMock.deleteTeam = jest.fn().mockResolvedValue({ id: mockId });

            const result = await organizationService.deleteTeam(mockId, mockCompanyId);

            expect(orgRepositoryMock.deleteTeam).toHaveBeenCalledWith(mockId, mockCompanyId);
            expect(result).toEqual({ id: mockId });
        });
    });

    describe('Locations', () => {
        it('should create a location', async () => {
            const data = { name: 'HQ', address: '123 Main St' };
            orgRepositoryMock.createLocation = jest.fn().mockResolvedValue({ id: mockId, ...data });

            const result = await organizationService.createLocation(mockCompanyId, data as any);

            expect(orgRepositoryMock.createLocation).toHaveBeenCalledWith(mockCompanyId, data);
            expect(result).toHaveProperty('id', mockId);
        });

        it('should get locations', async () => {
            const lists = [{ id: 'loc-1' }];
            orgRepositoryMock.findLocationsByCompany = jest.fn().mockResolvedValue(lists);

            const result = await organizationService.getLocations(mockCompanyId);

            expect(orgRepositoryMock.findLocationsByCompany).toHaveBeenCalledWith(mockCompanyId);
            expect(result).toEqual(lists);
        });
    });
});
