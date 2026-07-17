import prisma from "../../common/utils/prisma";
import {
  SalaryStructureInput,
  UpdatePayrollRecordInput,
} from "./payroll.validator";

export class PayrollRepository {
  // --- Salary Structure ---
  async upsertSalaryStructure(data: SalaryStructureInput) {
    // Calculate netSalary: Sum(earnings) - Sum(deductions) from the items
    // We will fetch the components inside a transaction to know their type
    return prisma.$transaction(async (tx) => {
      const componentIds = data.items.map((item) => item.salaryComponentId);
      const components = await tx.salaryComponent.findMany({
        where: { id: { in: componentIds } },
      });

      let totalEarnings = 0;
      let totalDeductions = 0;

      for (const item of data.items) {
        const comp = components.find((c) => c.id === item.salaryComponentId);
        if (comp) {
          if (comp.type === "earning") {
            totalEarnings += item.amount;
          } else {
            totalDeductions += item.amount;
          }
        }
      }

      const netSalary = Math.max(0, totalEarnings - totalDeductions);

      const structure = await tx.salaryStructure.create({
        data: {
          employeeId: data.employeeId,
          grossSalary: data.grossSalary,
          netSalary: netSalary,
          effectiveFrom: new Date(data.effectiveFrom),
          isActive: true,
        },
      });

      if (data.items.length > 0) {
        await tx.salaryStructureItem.createMany({
          data: data.items.map((item) => ({
            salaryStructureId: structure.id,
            salaryComponentId: item.salaryComponentId,
            amount: item.amount,
          })),
        });
      }

      return tx.salaryStructure.findUnique({
        where: { id: structure.id },
        include: {
          items: {
            include: { component: true },
          },
        },
      });
    });
  }

  async getActiveSalary(employeeId: string) {
    return prisma.salaryStructure.findFirst({
      where: { employeeId, isActive: true },
      include: {
        items: {
          include: { component: true },
        },
      },
      orderBy: { effectiveFrom: "desc" },
    });
  }

  // --- Payroll Cycles ---
  async findCycle(companyId: string, month: Date, workLocationId: string) {
    return prisma.payrollCycle.findFirst({
      where: { companyId, workLocationId, month },
    });
  }

  async createCycle(
    companyId: string,
    month: Date,
    adminUserId: string | null,
    workLocationId: string,
  ) {
    return prisma.payrollCycle.create({
      data: {
        companyId,
        workLocationId,
        month,
        status: "draft",
        triggeredBy: adminUserId || undefined,
      },
    });
  }

  // --- Attendance/Leave Summary for Calculation ---
  async getEmployeeWorkSummary(
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const [attendanceCount, leaveCount] = await Promise.all([
      prisma.attendanceLog.count({
        where: {
          employeeId,
          attendanceDate: { gte: startDate, lte: endDate },
          status: "present",
        },
      }),
      prisma.leaveRequest.aggregate({
        where: {
          employeeId,
          status: "approved",
          startDate: { gte: startDate },
          endDate: { lte: endDate },
        },
        _sum: { totalDays: true },
      }),
    ]);

    return {
      presentDays: attendanceCount,
      approvedLeaveDays: Number(leaveCount._sum.totalDays || 0),
    };
  }

  // --- Payroll Records ---
  async createPayrollRecord(data: any) {
    return prisma.payrollRecord.create({
      data: data,
    });
  }

  async getPayrollRecords(cycleId: string) {
    const cycle = await prisma.payrollCycle.findUnique({
      where: { id: cycleId },
      select: { status: true },
    });

    const records = await prisma.payrollRecord.findMany({
      where: { payrollCycleId: cycleId },
      include: {
        employee: {
          select: {
            employeeCode: true,
            department: { select: { name: true } },
            personalDetails: { select: { firstName: true, lastName: true } },
            user: { select: { email: true } },
          },
        },
      },
    });

    // Attach the cycle status to each record for frontend display
    return records.map((r) => ({ ...r, status: cycle?.status || "draft" }));
  }

  async updateRecord(id: string, data: UpdatePayrollRecordInput) {
    const record = await prisma.payrollRecord.findUnique({ where: { id } });
    if (!record) return null;

    // Recalculate net salary including all deductions
    const otherDeductions =
      data.otherDeductions ?? Number(record.otherDeductions);

    const netSalary =
      Number(record.grossSalary) -
      Number(record.attendanceDeduction) -
      Number(record.leaveDeduction) -
      Number(record.pfDeduction) -
      Number(record.esiDeduction) -
      Number(record.ptDeduction) -
      Number(record.incomeTax) -
      otherDeductions;

    return prisma.payrollRecord.update({
      where: { id },
      data: {
        otherDeductions,
        netSalary: Number(netSalary.toFixed(2)),
      },
    });
  }

  async finalizeCycle(cycleId: string) {
    return prisma.payrollCycle.update({
      where: { id: cycleId },
      data: {
        status: "finalized",
        finalizedAt: new Date(),
      },
    });
  }

  async getFullRecordContext(recordId: string) {
    return prisma.payrollRecord.findUnique({
      where: { id: recordId },
      include: {
        payrollCycle: {
          include: {
            company: true,
            workLocation: true,
          },
        },
        employee: {
          include: {
            user: true,
            department: true,
            personalDetails: true,
            bankDetails: true,
            jobDetails: true,
          },
        },
      },
    });
  }
}
