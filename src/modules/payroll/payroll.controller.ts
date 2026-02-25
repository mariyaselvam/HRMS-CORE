import { Request, Response } from 'express';
import { PayrollService } from './payroll.service';

export class PayrollController {
    private service: PayrollService;

    constructor() {
        this.service = new PayrollService();
    }

    setupSalary = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const result = await this.service.setupSalary(companyId, req.body);
        res.status(201).json({ success: true, data: result });
    };

    generate = async (req: Request, res: Response) => {
        const { companyId, userId } = req.user!;
        const result = await this.service.generateMonthlyPayroll(companyId, userId, req.body);
        res.status(201).json({ success: true, data: result });
    };

    listRecords = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const { month } = req.query as { month: string };
        const result = await this.service.getCycleRecords(companyId, month);
        res.json({ success: true, data: result });
    };

    finalize = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const id = req.params.id as string;
        const result = await this.service.finalizePayroll(companyId, id);
        res.json({ success: true, data: result });
    };
}
