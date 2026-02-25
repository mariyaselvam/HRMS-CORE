import { Request, Response } from 'express';
import { AttendanceService } from './attendance.service';

export class AttendanceController {
    private service: AttendanceService;

    constructor() {
        this.service = new AttendanceService();
    }

    // Shifts
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

    // Tracking
    checkIn = async (req: Request, res: Response) => {
        const { userId, companyId } = req.user!;
        const result = await this.service.processCheckIn(userId, companyId, req.body);
        res.status(201).json({ success: true, data: result });
    };

    checkOut = async (req: Request, res: Response) => {
        const { userId } = req.user!;
        const result = await this.service.processCheckOut(userId, req.body);
        res.json({ success: true, data: result });
    };

    history = async (req: Request, res: Response) => {
        const { companyId, userId } = req.user!;
        const result = await this.service.getAttendanceHistory(companyId, userId, req.query as any);
        res.json({ success: true, data: result });
    };
}
