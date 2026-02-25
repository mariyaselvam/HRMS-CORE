import { Request, Response } from 'express';
import { HolidayService } from './holiday.service';

export class HolidayController {
    private service: HolidayService;

    constructor() {
        this.service = new HolidayService();
    }

    create = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const result = await this.service.addHoliday(companyId, req.body);
        res.status(201).json({ success: true, data: result });
    };

    list = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const year = req.query.year ? parseInt(req.query.year as string) : undefined;
        const result = await this.service.getHolidays(companyId, year);
        res.json({ success: true, data: result });
    };

    delete = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const id = req.params.id as string;
        await this.service.removeHoliday(id, companyId);
        res.json({ success: true, message: 'Holiday deleted successfully' });
    };
}
