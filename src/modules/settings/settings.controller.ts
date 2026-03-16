import { Request, Response } from 'express';
import { SettingsService } from './settings.service';

export class SettingsController {
    private service: SettingsService;

    constructor() {
        this.service = new SettingsService();
    }

    getAllSettings = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const result = await this.service.getAllSettings(companyId);
        res.json({ success: true, data: result });
    };

    getSettingsByCategory = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const { category } = req.params;
        const result = await this.service.getSettingsByCategory(companyId, category);
        res.json({ success: true, data: result });
    };

    updateSettingsByCategory = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const { category } = req.params;
        const result = await this.service.updateSettingsByCategory(companyId, category, req.body);
        res.json({ success: true, data: result });
    };
}
