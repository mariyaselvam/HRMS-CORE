import prisma from '../../common/utils/prisma';
import { PayrollService } from './payroll.service';
import { HierarchyResolverService } from '../organization/hierarchy-resolver.service';

export interface BatchRunOptions {
    scope?: 'ALL' | 'CLUSTER' | 'BRANCHES';
    clusterId?: string;
    branchIds?: string[];
    skipWarnings?: boolean;
}

export interface BranchReadinessItem {
    branchId: string;
    branchName: string;
    branchCode?: string | null;
    cluster: {
        id: string;
        name: string;
        code: string | null;
    } | null;
    rule: {
        frequencyType?: string;
        processingMode?: string;
        salaryCalculationMethod?: string;
        attendanceCutoffDate?: number | null;
        isInherited: boolean;
    } | null;
    employeeCount: number;
    missingSalaryCount: number;
    pendingLeaveCount: number;
    existingCycleStatus: string | null;
    estimatedGross: number;
    isReady: boolean;
    blockers: string[];
    warnings: string[];
}

export interface PayrollReadinessReport {
    period: string;
    totalBranches: number;
    readyBranches: number;
    blockedBranches: number;
    totalEligibleEmployees: number;
    estimatedTotalGross: number;
    allBranchesReady: boolean;
    branches: BranchReadinessItem[];
}

export class PayrollRunnerService {
    private hierarchyResolver = new HierarchyResolverService();

    async listRuns(companyId: string) {
        return prisma.payrollRun.findMany({
            where: { companyId },
            orderBy: { startedAt: 'desc' }
        });
    }

    async getRunPreview(companyId: string, period: string) {
        const activeEmployees = await prisma.employee.findMany({
            where: { companyId, employmentStatus: 'active' },
            include: { salaryStructures: { where: { isActive: true } } }
        });

        const count = activeEmployees.length;
        let estimatedTotal = 0;
        for (const emp of activeEmployees) {
            const activeSalary = emp.salaryStructures[0];
            if (activeSalary) {
                estimatedTotal += Number(activeSalary.grossSalary);
            }
        }

        return {
            period,
            employeeCount: count,
            estimatedTotal: estimatedTotal
        };
    }

    /**
     * Pre-flight readiness check across branches for an eagle-eye payroll run
     */
    async getReadiness(
        companyId: string,
        period: string,
        options?: { clusterId?: string; branchIds?: string[] }
    ): Promise<PayrollReadinessReport> {
        const [yearStr, monthStr] = period.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        const monthStart = new Date(Date.UTC(year, month - 1, 1));
        const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

        const whereBranches: any = { companyId };
        if (options?.clusterId) {
            whereBranches.clusterId = options.clusterId;
        }
        if (options?.branchIds && options.branchIds.length > 0) {
            whereBranches.id = { in: options.branchIds };
        }

        const branches = await prisma.workLocation.findMany({
            where: whereBranches,
            include: {
                cluster: {
                    select: { id: true, name: true, code: true }
                }
            },
            orderBy: { name: 'asc' }
        });

        const branchReports: BranchReadinessItem[] = [];
        let totalEligibleEmployees = 0;
        let estimatedTotalGross = 0;

        for (const branch of branches) {
            const ruleResult = await this.hierarchyResolver.getEffectivePayrollRule(companyId, branch.id);
            const rule = ruleResult.data;

            const employees = await prisma.employee.findMany({
                where: {
                    companyId,
                    workLocationId: branch.id,
                    employmentStatus: 'active'
                },
                include: {
                    salaryStructures: {
                        where: { isActive: true },
                        take: 1
                    }
                }
            });

            const missingSalaryCount = employees.filter((e) => e.salaryStructures.length === 0).length;
            const branchGross = employees.reduce((sum, e) => {
                const s = e.salaryStructures[0];
                return sum + (s ? Number(s.grossSalary) : 0);
            }, 0);

            const employeeIds = employees.map((e) => e.id);
            const pendingLeaveCount = employeeIds.length > 0
                ? await prisma.leaveRequest.count({
                      where: {
                          employeeId: { in: employeeIds },
                          status: 'pending',
                          startDate: { lte: monthEnd },
                          endDate: { gte: monthStart }
                      }
                  })
                : 0;

            const existingCycle = await prisma.payrollCycle.findFirst({
                where: {
                    companyId,
                    workLocationId: branch.id,
                    month: monthStart
                }
            });

            const blockers: string[] = [];
            const warnings: string[] = [];

            if (!rule) {
                blockers.push('No payroll rule configured for branch or company default.');
            }
            if (employees.length === 0) {
                warnings.push('No active employees assigned to this branch.');
            }
            if (missingSalaryCount > 0) {
                blockers.push(`${missingSalaryCount} active employee(s) missing configured salary structure.`);
            }
            if (pendingLeaveCount > 0) {
                warnings.push(`${pendingLeaveCount} pending leave request(s) require manager decision.`);
            }
            if (existingCycle && existingCycle.status === 'finalized') {
                blockers.push(`Payroll already finalized for ${period}.`);
            }

            const isReady = blockers.length === 0 && employees.length > 0;

            branchReports.push({
                branchId: branch.id,
                branchName: branch.name,
                branchCode: (branch as any).code || null,
                cluster: branch.cluster,
                rule: rule
                    ? {
                          frequencyType: rule.frequencyType,
                          processingMode: rule.processingMode,
                          salaryCalculationMethod: rule.salaryCalculationMethod,
                          attendanceCutoffDate: rule.attendanceCutoffDate,
                          isInherited: ruleResult.isInherited
                      }
                    : null,
                employeeCount: employees.length,
                missingSalaryCount,
                pendingLeaveCount,
                existingCycleStatus: existingCycle?.status || null,
                estimatedGross: branchGross,
                isReady,
                blockers,
                warnings
            });

            totalEligibleEmployees += employees.length;
            estimatedTotalGross += branchGross;
        }

        const readyBranches = branchReports.filter((b) => b.isReady).length;
        const blockedBranches = branchReports.filter((b) => !b.isReady && b.employeeCount > 0).length;

        return {
            period,
            totalBranches: branchReports.length,
            readyBranches,
            blockedBranches,
            totalEligibleEmployees,
            estimatedTotalGross,
            allBranchesReady: blockedBranches === 0 && readyBranches > 0,
            branches: branchReports
        };
    }

    /**
     * Executes centralized batch payroll across all branches or a selected scope
     */
    async executeRun(
        companyId: string,
        period: string,
        runType: string,
        triggeredBy?: string,
        options?: BatchRunOptions
    ) {
        // 1. Pre-flight readiness check
        const readiness = await this.getReadiness(companyId, period, {
            clusterId: options?.clusterId,
            branchIds: options?.branchIds
        });

        if (!options?.skipWarnings && readiness.blockedBranches > 0) {
            const blockedList = readiness.branches
                .filter((b) => !b.isReady && b.employeeCount > 0)
                .map((b) => `${b.branchName}: ${b.blockers.join(', ')}`)
                .join('; ');
            throw new Error(`Pre-flight check failed for branches: ${blockedList}`);
        }

        // 2. Prevent duplicate global completed run
        const existingRun = await prisma.payrollRun.findFirst({
            where: { companyId, payrollPeriod: period, status: 'Completed' }
        });

        if (existingRun && (!options?.scope || options.scope === 'ALL')) {
            throw new Error(`Payroll already processed for period: ${period}`);
        }

        // 3. Create PayrollRun record
        const run = await prisma.payrollRun.create({
            data: {
                companyId,
                payrollPeriod: period,
                runType: runType || 'Manual',
                triggeredBy,
                status: 'Processing',
                startedAt: new Date()
            }
        });

        try {
            const payrollService = new PayrollService();
            const branchesToProcess = readiness.branches.filter(
                (b) => b.employeeCount > 0 && (options?.skipWarnings || b.isReady)
            );

            let totalEmployees = 0;
            let totalAmount = 0;
            const branchResults: Array<{
                branchId: string;
                branchName: string;
                status: 'Success' | 'Failed' | 'Skipped';
                employeeCount: number;
                totalAmount: number;
                error?: string;
            }> = [];

            for (const branch of branchesToProcess) {
                try {
                    const result = await payrollService.generateMonthlyPayroll(
                        companyId,
                        triggeredBy || null,
                        branch.branchId,
                        { month: period }
                    );

                    const records = await prisma.payrollRecord.findMany({
                        where: { payrollCycleId: result.cycle.id }
                    });

                    const branchNet = records.reduce((sum, r) => sum + Number(r.netSalary), 0);
                    totalEmployees += records.length;
                    totalAmount += branchNet;

                    branchResults.push({
                        branchId: branch.branchId,
                        branchName: branch.branchName,
                        status: 'Success',
                        employeeCount: records.length,
                        totalAmount: branchNet
                    });
                } catch (branchErr: any) {
                    console.error(`Branch ${branch.branchName} payroll failed: ${branchErr.message}`);
                    branchResults.push({
                        branchId: branch.branchId,
                        branchName: branch.branchName,
                        status: 'Failed',
                        employeeCount: 0,
                        totalAmount: 0,
                        error: branchErr.message
                    });
                }
            }

            const hasFailures = branchResults.some((b) => b.status === 'Failed');
            const finalStatus = hasFailures && totalEmployees === 0 ? 'Failed' : 'Completed';

            await prisma.payrollRun.update({
                where: { id: run.id },
                data: {
                    status: finalStatus,
                    employeeCount: totalEmployees,
                    totalAmount: totalAmount,
                    completedAt: new Date()
                }
            });

            return {
                success: finalStatus === 'Completed',
                runId: run.id,
                period,
                totalEmployees,
                totalAmount,
                branchResults
            };
        } catch (err: any) {
            await prisma.payrollRun.update({
                where: { id: run.id },
                data: {
                    status: 'Failed',
                    errorMessage: err.message,
                    completedAt: new Date()
                }
            });
            throw err;
        }
    }
}
