import { Request, Response } from 'express';
import { SalaryComponentService } from './salary-component.service';
import { SalaryTemplateService } from './salary-template.service';

export class SalaryConfigurationController {
    private componentService: SalaryComponentService;
    private templateService: SalaryTemplateService;

    constructor() {
        this.componentService = new SalaryComponentService();
        this.templateService = new SalaryTemplateService();
    }

    // --- Component Endpoints ---
    createComponent = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const result = await this.componentService.createComponent(companyId, req.body);
        res.status(201).json({ success: true, data: result });
    };

    getComponents = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const result = await this.componentService.getComponents(companyId);
        res.json({ success: true, data: result });
    };

    updateComponent = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const id = req.params.id;
        const result = await this.componentService.updateComponent(companyId, id, req.body);
        res.json({ success: true, data: result });
    };

    deleteComponent = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const id = req.params.id;
        const result = await this.componentService.deleteComponent(companyId, id);
        res.json({ success: true, data: result });
    };

    // --- Template Endpoints ---
    createTemplate = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const result = await this.templateService.createTemplate(companyId, req.body);
        res.status(201).json({ success: true, data: result });
    };

    getTemplates = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const result = await this.templateService.getTemplates(companyId);
        res.json({ success: true, data: result });
    };

    getTemplateById = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const id = req.params.id;
        const result = await this.templateService.getTemplateById(companyId, id);
        res.json({ success: true, data: result });
    };

    calculatePreview = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const { templateId, monthlyCTC } = req.body;
        const result = await this.templateService.calculatePreview(companyId, templateId, Number(monthlyCTC));
        res.json({ success: true, data: result });
    };
}
