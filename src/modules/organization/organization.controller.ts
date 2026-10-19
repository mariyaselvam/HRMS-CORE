import { Request, Response } from 'express';
import { OrganizationService } from './organization.service';

export class OrganizationController {
    private orgService: OrganizationService;

    constructor() {
        this.orgService = new OrganizationService();
    }

    getCompanies = async (req: Request, res: Response) => {
        const companies = await this.orgService.getCompanies();
        res.json({ success: true, data: companies });
    };

    getCompanyById = async (req: Request, res: Response) => {
        const id = req.params.id as string;
        const company = await this.orgService.getCompanyById(id);
        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }
        res.json({ success: true, data: company });
    };

    updateCompanyStatus = async (req: Request, res: Response) => {
        const id = req.params.id as string;
        const { status } = req.body;
        const company = await this.orgService.updateCompanyStatus(id, status);
        res.json({ success: true, data: company });
    };

    createDepartment = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const department = await this.orgService.createDepartment(companyId, req.body);
        res.status(201).json({ success: true, data: department });
    };

    getDepartments = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const locationId = req.query.locationId as string | undefined;
        const departments = await this.orgService.getDepartments(companyId, locationId);
        res.json({ success: true, data: departments });
    };

    updateDepartment = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const id = req.params.id as string;
        const department = await this.orgService.updateDepartment(id, companyId, req.body);
        res.json({ success: true, data: department });
    };

    deleteDepartment = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const id = req.params.id as string;
        await this.orgService.deleteDepartment(id, companyId);
        res.json({ success: true, message: 'Department deleted successfully' });
    };

    createTeam = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const team = await this.orgService.createTeam(companyId, req.body);
        res.status(201).json({ success: true, data: team });
    };

    createLocation = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const location = await this.orgService.createLocation(companyId, req.body);
        res.status(201).json({ success: true, data: location });
    };

    getLocations = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const locations = await this.orgService.getLocations(companyId);
        res.json({ success: true, data: locations });
    };

    getTeams = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const locationId = req.query.locationId as string | undefined;
        const teams = await this.orgService.getTeams(companyId, locationId);
        res.json({ success: true, data: teams });
    };

    updateTeam = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const id = req.params.id as string;
        const team = await this.orgService.updateTeam(id, companyId, req.body);
        res.json({ success: true, data: team });
    };

    deleteTeam = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const id = req.params.id as string;
        await this.orgService.deleteTeam(id, companyId);
        res.json({ success: true, message: 'Team deleted successfully' });
    };

    createRole = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const role = await this.orgService.createRole(companyId, req.body);
        res.status(201).json({ success: true, data: role });
    };

    getRoles = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const roles = await this.orgService.getRoles(companyId);
        res.json({ success: true, data: roles });
    };

    updateRole = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const id = req.params.id as string;
        const role = await this.orgService.updateRole(id, companyId, req.body);
        res.json({ success: true, data: role });
    };

    deleteRole = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const id = req.params.id as string;
        await this.orgService.deleteRole(id, companyId);
        res.json({ success: true, message: 'Role deleted successfully' });
    };

    assignPermissionsToRole = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const roleId = req.params.roleId as string;
        const { permissionIds } = req.body;
        await this.orgService.assignPermissionsToRole(roleId, companyId, permissionIds);
        res.json({ success: true, message: 'Permissions assigned successfully' });
    };

    getRolePermissions = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const roleId = req.params.roleId as string;
        const permissions = await this.orgService.getRolePermissions(roleId, companyId);
        res.json({ success: true, data: permissions });
    };

    removePermissionFromRole = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const roleId = req.params.roleId as string;
        const permissionId = req.params.permissionId as string;
        await this.orgService.removePermissionFromRole(roleId, companyId, permissionId);
        res.json({ success: true, message: 'Permission removed successfully' });
    };
}
