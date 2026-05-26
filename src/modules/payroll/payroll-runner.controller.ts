import { Request, Response } from 'express';
import { PayrollRunnerService } from './payroll-runner.service';

export class PayrollRunnerController {
    private service = new PayrollRunnerService();

    listRuns = async (req: Request, res: Response) => {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

            const runs = await this.service.listRuns(companyId);
            return res.json(runs);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    };

    getRunPreview = async (req: Request, res: Response) => {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

            const period = req.query.period as string;
            const preview = await this.service.getRunPreview(companyId, period);
            return res.json(preview);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    };

    executeRun = async (req: Request, res: Response) => {
        try {
            const companyId = req.user?.companyId;
            const userId = req.user?.id;
            if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

            const { period, runType } = req.body;
            const result = await this.service.executeRun(companyId, period, runType || 'Manual', userId);
            return res.json(result);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    };
}
