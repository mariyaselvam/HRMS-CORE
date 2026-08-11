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
        const startDate = req.query.startDate as string | undefined;
        const endDate = req.query.endDate as string | undefined;
        const result = await this.service.getAdminSummary(companyId, locationId, startDate, endDate);
        res.json({ success: true, data: result });
    };
}
