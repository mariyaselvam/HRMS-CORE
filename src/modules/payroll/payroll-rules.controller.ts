import { Request, Response } from 'express';
import { PayrollRulesService } from './payroll-rules.service';

export class PayrollRulesController {
    private service = new PayrollRulesService();

    getRule = async (req: Request, res: Response) => {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

            const rule = await this.service.getRule(companyId);
            return res.json(rule);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    };

    upsertRule = async (req: Request, res: Response) => {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

            const data = req.body;
            const rule = await this.service.upsertRule(companyId, data);
            return res.json(rule);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    };
}
