import { Request, Response } from 'express';
import { PayrollRulesService } from './payroll-rules.service';

export class PayrollRulesController {
    private service = new PayrollRulesService();

    getRule = async (req: Request, res: Response) => {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

            const workLocationId = (req.query.workLocationId as string) || (req.activeBranchId as string) || undefined;
            const isEffective = req.query.effective === 'true';

            if (isEffective) {
                const effectiveRule = await this.service.getEffectiveRule(companyId, workLocationId);
                return res.json(effectiveRule);
            }

            const rule = await this.service.getRule(companyId, workLocationId);
            return res.json(rule);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    };

    getAllRules = async (req: Request, res: Response) => {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

            const rules = await this.service.getAllRules(companyId);
            return res.json(rules);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    };

    upsertRule = async (req: Request, res: Response) => {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

            const workLocationId = (req.query.workLocationId as string) || req.body.workLocationId || undefined;
            const data = req.body;
            const rule = await this.service.upsertRule(companyId, data, workLocationId);
            return res.json(rule);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    };
}

