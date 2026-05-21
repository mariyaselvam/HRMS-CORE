import { Request, Response } from 'express';
import { DashboardService } from './dashboard.service';

export class DashboardController {
    private service: DashboardService;

    constructor() {
        this.service = new DashboardService();
    }

    getSummary = async (req: Request, res: Response) => {
        const { companyId } = req.user!;
        const locationId = req.query.locationId as string | undefined;
        const result = await this.service.getAdminSummary(companyId, locationId);
        res.json({ success: true, data: result });
    };
}
