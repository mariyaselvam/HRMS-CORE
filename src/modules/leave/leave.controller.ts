import { Request, Response } from 'express';
import { LeaveService } from './leave.service';

export class LeaveController {
    private service: LeaveService;

    constructor() {
        this.service = new LeaveService();
    }

    // Types
    createLeaveType = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const result = await this.service.addLeaveType(companyId, req.body);
        res.status(201).json({ success: true, data: result });
    };

    listLeaveTypes = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const result = await this.service.getLeaveTypes(companyId);
        res.json({ success: true, data: result });
    };

    // Requests
    apply = async (req: Request, res: Response) => {
        const { userId } = req.user!;
        const result = await this.service.submitLeaveRequest(userId, req.body);
        res.status(201).json({ success: true, data: result });
    };

    myRequests = async (req: Request, res: Response) => {
        const { userId, companyId } = req.user!;
        const result = await this.service.getRequests(companyId, userId);
        res.json({ success: true, data: result });
    };

    allRequests = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const locationId = req.query.locationId as string | undefined;
        const result = await this.service.getRequests(companyId, undefined, locationId);
        res.json({ success: true, data: result });
    };

    // Actions
    handleAction = async (req: Request, res: Response) => {
        const adminUserId = req.user!.userId;
        const id = req.params.id as string;
        const result = await this.service.handleRequestAction(id, adminUserId, req.body);
        res.json({ success: true, data: result });
    };
}
