import { Request, Response } from 'express';
import { OrganizationService } from './organization.service';

export class OrganizationController {
    private orgService: OrganizationService;

    constructor() {
        this.orgService = new OrganizationService();
    }

    createDepartment = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const department = await this.orgService.createDepartment(companyId, req.body);
        res.status(201).json({ success: true, data: department });
    };

    getDepartments = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const departments = await this.orgService.getDepartments(companyId);
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
}
