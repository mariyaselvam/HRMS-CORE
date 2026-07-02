import { Request, Response } from 'express';
import { ShiftsService } from './shifts.service';

export class ShiftsController {
    private service: ShiftsService;

    constructor() {
        this.service = new ShiftsService();
    }

    createShift = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const result = await this.service.addShift(companyId, req.body);
        res.status(201).json({ success: true, data: result });
    };

    listShifts = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const result = await this.service.getAllShifts(companyId);
        res.json({ success: true, data: result });
    };

    assignShift = async (req: Request, res: Response) => {
        const result = await this.service.assignEmployeeShift(req.body);
        res.status(201).json({ success: true, data: result });
    };
}