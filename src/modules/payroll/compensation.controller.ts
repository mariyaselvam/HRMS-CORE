import { Request, Response } from 'express';
import { CompensationService } from './compensation.service';

export class CompensationController {
    private service: CompensationService;

    constructor() {
        this.service = new CompensationService();
    }

    createCycle = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const { name, effectiveFrom } = req.body;
        const result = await this.service.createCycle(companyId, name, effectiveFrom);
        res.status(201).json({ success: true, data: result });
    };

    getCycles = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const result = await this.service.getCycles(companyId);
        res.json({ success: true, data: result });
    };

    getCycleRevisions = async (req: Request, res: Response) => {
        const cycleId = req.params.id;
        const result = await this.service.getCycleRevisions(cycleId);
        res.json({ success: true, data: result });
    };

    bulkUpdate = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const cycleId = req.params.id;
        const { filters, incrementType, value } = req.body;
        const result = await this.service.calculateBulkIncrement(
            companyId,
            cycleId,
            filters,
            incrementType,
            value
        );
        res.json({ success: true, data: result });
    };

    applyCycle = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const cycleId = req.params.id;
        const result = await this.service.applyCycle(companyId, cycleId);
        res.json({ success: true, data: result });
    };
}
