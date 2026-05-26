import cron from 'node-cron';
import prisma from '../utils/prisma';
import { PayrollRunnerService } from '../../modules/payroll/payroll-runner.service';
const runnerService = new PayrollRunnerService();

export const initPayrollScheduler = () => {
    // Run daily at midnight
    cron.schedule('0 0 * * *', async () => {
        console.log('Running daily payroll check...');
        const todayDate = new Date().getDate();

        try {
            const rules = await prisma.payrollRule.findMany({
                where: {
                    autoProcessEnabled: true,
                    isActive: true,
                    payrollDate: todayDate,
                    payrollDateType: 'FixedDate'
                }
            });

            for (const rule of rules) {
                const period = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
                console.log(`Auto-processing payroll for company: ${rule.companyId}, period: ${period}`);
                
                try {
                    await runnerService.executeRun(rule.companyId, period, 'Automatic', undefined);
                } catch (err: any) {
                    console.error(`Error auto-processing payroll for company ${rule.companyId}:`, err.message);
                }
            }
        } catch (error) {
            console.error('Error in payroll scheduler:', error);
        }
    });
};
