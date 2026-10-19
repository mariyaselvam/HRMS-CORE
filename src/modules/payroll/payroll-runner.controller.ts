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

    getReadiness = async (req: Request, res: Response) => {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

            const period = (req.query.period as string) || new Date().toISOString().slice(0, 7);
            const clusterId = (req.query.clusterId as string) || (req.activeClusterId as string) || undefined;
            const branchIds = req.query.branchIds
                ? (req.query.branchIds as string).split(',').map((s) => s.trim())
                : undefined;

            const report = await this.service.getReadiness(companyId, period, {
                clusterId,
                branchIds
            });

            return res.json(report);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    };

    executeRun = async (req: Request, res: Response) => {
        try {
            const companyId = req.user?.companyId;
            const userId = req.user?.userId;
            if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

            const {
                period,
                runType,
                scope,
                clusterId: bodyClusterId,
                branchIds,
                skipWarnings
            } = req.body;

            const clusterId = bodyClusterId || (req.activeClusterId as string) || undefined;

            const result = await this.service.executeRun(
                companyId,
                period,
                runType || 'Manual',
                userId,
                {
                    scope,
                    clusterId,
                    branchIds,
                    skipWarnings
                }
            );

            return res.json(result);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    };
}
