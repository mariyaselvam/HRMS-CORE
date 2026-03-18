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

    getSalaryStructure = async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const employeeId = req.params.id as string;
        const result = await this.service.getSalaryDetail(companyId, employeeId);
        res.json({ success: true, data: result });
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

    downloadPayslip = async (req: Request, res: Response) => {
        const { companyId, role, userId } = req.user!;
        const recordId = req.params.id as string;

        const pdfBuffer = await this.service.generatePayslipPdf(recordId, companyId, role, userId);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=payslip-${recordId}.pdf`);
        res.send(pdfBuffer);
    };
}
