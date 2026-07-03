import { Request, Response } from 'express';
import { ShiftsService } from './shifts.service';

export class ShiftsController {
    private service: ShiftsService;

    constructor() {
        this.service = new ShiftsService();
    }

    // Shift CRUD
    createShift = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const result = await this.service.addShift(companyId, req.body);
        res.status(201).json({ success: true, data: result });
    };

    updateShift = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const { shiftId } = req.params;
        const result = await this.service.editShift(shiftId, companyId, req.body);
        res.json({ success: true, data: result });
    };

    listShifts = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const result = await this.service.getAllShifts(companyId);
        res.json({ success: true, data: result });
    };

    getShiftById = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const { shiftId } = req.params;
        const result = await this.service.getShiftById(shiftId, companyId);
        res.json({ success: true, data: result });
    };

    // Bulk Operations
    bulkAssign = async (req: Request, res: Response) => {
        const result = await this.service.bulkAssign(req.body);
        res.status(201).json({ success: true, data: result });
    };

    bulkRemove = async (req: Request, res: Response) => {
        const result = await this.service.bulkRemove(req.body);
        res.json({ success: true, data: result });
    };

    transfer = async (req: Request, res: Response) => {
        const result = await this.service.transfer(req.body);
        res.json({ success: true, data: result });
    };

    // Shift Employee Queries
    getShiftEmployees = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const { shiftId } = req.params;
        const result = await this.service.getShiftEmployees(shiftId, companyId, req.query as any);
        res.json({ success: true, data: result });
    };
}