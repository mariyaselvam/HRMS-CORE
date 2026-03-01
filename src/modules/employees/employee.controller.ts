import { Request, Response } from 'express';
import { EmployeeService } from './employee.service';

export class EmployeeController {
    private employeeService: EmployeeService;

    constructor() {
        this.employeeService = new EmployeeService();
    }

    onboard = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const result = await this.employeeService.onboardEmployee(companyId, req.body);
        res.status(201).json({ success: true, data: result });
    };

    savePersonal = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const employeeId = req.params.id as string;
        const result = await this.employeeService.savePersonalDetails(employeeId, companyId, req.body);
        res.json({ success: true, data: result });
    };

    saveJob = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const employeeId = req.params.id as string;
        const result = await this.employeeService.saveJobDetails(employeeId, companyId, req.body);
        res.json({ success: true, data: result });
    };

    saveStatutory = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const employeeId = req.params.id as string;
        const result = await this.employeeService.saveStatutoryDetails(employeeId, companyId, req.body);
        res.json({ success: true, data: result });
    };

    list = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const result = await this.employeeService.getAllEmployees(companyId);
        res.json({ success: true, data: result });
    };

    detail = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const id = req.params.id as string;
        const result = await this.employeeService.getEmployeeDetail(id, companyId);
        res.json({ success: true, data: result });
    };

    update = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const id = req.params.id as string;
        const result = await this.employeeService.updateEmployeeProfile(id, companyId, req.body);
        res.json({ success: true, data: result });
    };

    finalize = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const id = req.params.id as string;
        const result = await this.employeeService.finalizeOnboarding(id, companyId);
        res.json({ success: true, message: 'Onboarding finalized successfully', data: result });
    };
}

