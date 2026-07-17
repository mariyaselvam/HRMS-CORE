import prisma from "../../common/utils/prisma";

export class CompensationRepository {
  async createCycle(companyId: string, name: string, effectiveFrom: Date) {
    return prisma.compensationCycle.create({
      data: {
        companyId,
        name,
        effectiveFrom,
        status: "draft",
      },
    });
  }

  async getCycles(companyId: string) {
    return prisma.compensationCycle.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getCycleWithRevisions(cycleId: string) {
    return prisma.compensationCycle.findUnique({
      where: { id: cycleId },
      include: {
        revisions: {
          include: {
            employee: {
              include: {
                personalDetails: {
                  select: { firstName: true, lastName: true },
                },
                department: { select: { name: true } },
              },
            },
          },
        },
      },
    });
  }

  async deleteRevisions(cycleId: string, employeeIds: string[]) {
    return prisma.salaryRevision.deleteMany({
      where: {
        compensationCycleId: cycleId,
        employeeId: { in: employeeIds },
      },
    });
  }

  async upsertRevisions(revisions: any[]) {
    // Since Prisma batch upsert isn't directly clean with unique constraints, we do it in a transaction
    return prisma.$transaction(
      revisions.map((rev) =>
        prisma.salaryRevision.upsert({
          where: {
            compensationCycleId_employeeId: {
              compensationCycleId: rev.compensationCycleId,
              employeeId: rev.employeeId,
            },
          },
          update: {
            currentGross: rev.currentGross,
            proposedGross: rev.proposedGross,
            basicSalary: rev.basicSalary,
            hra: rev.hra,
            transportAllowance: rev.transportAllowance,
            otherAllowances: rev.otherAllowances,
            status: rev.status || "draft",
          },
          create: {
            compensationCycleId: rev.compensationCycleId,
            employeeId: rev.employeeId,
            currentGross: rev.currentGross,
            proposedGross: rev.proposedGross,
            basicSalary: rev.basicSalary,
            hra: rev.hra,
            transportAllowance: rev.transportAllowance,
            otherAllowances: rev.otherAllowances,
            status: rev.status || "draft",
          },
        }),
      ),
    );
  }

  async applyRevisions(cycleId: string, revisions: any[], effectiveFrom: Date) {
    return prisma.$transaction(async (tx) => {
      // 1. Update cycle status
      await tx.compensationCycle.update({
        where: { id: cycleId },
        data: { status: "applied" },
      });

      // 2. Process each revision
      for (const rev of revisions) {
        // Deactivate current active salary structure
        await tx.salaryStructure.updateMany({
          where: { employeeId: rev.employeeId, isActive: true },
          data: {
            isActive: false,
            effectiveTo: new Date(
              effectiveFrom.getTime() - 24 * 60 * 60 * 1000,
            ), // Day before new one starts
          },
        });

        // Find companyId from employee
        const employee = await tx.employee.findUnique({
          where: { id: rev.employeeId },
          select: { companyId: true },
        });

        if (!employee) continue;
        const companyId = employee.companyId;

        // Ensure basic components exist
        const defaultCodes = ["BASIC", "HRA", "TRANSPORT", "SPECIAL"];
        const components = [];
        for (const code of defaultCodes) {
          let comp = await tx.salaryComponent.findFirst({
            where: { companyId, code },
          });
          if (!comp) {
            comp = await tx.salaryComponent.create({
              data: {
                companyId,
                code,
                name: code.charAt(0) + code.slice(1).toLowerCase() + " Salary",
                type: "earning",
                calcType: "fixed",
                calcValue: 0,
                isTaxable: true,
                isActive: true,
              },
            });
          }
          components.push(comp);
        }

        const basicComp = components.find((c) => c.code === "BASIC")!;
        const hraComp = components.find((c) => c.code === "HRA")!;
        const transportComp = components.find((c) => c.code === "TRANSPORT")!;
        const specialComp = components.find((c) => c.code === "SPECIAL")!;

        // Create new active salary structure
        const structure = await tx.salaryStructure.create({
          data: {
            employeeId: rev.employeeId,
            grossSalary: rev.proposedGross,
            netSalary: Number(rev.proposedGross),
            effectiveFrom: effectiveFrom,
            isActive: true,
          },
        });

        // Create items
        const itemsData = [
          {
            salaryStructureId: structure.id,
            salaryComponentId: basicComp.id,
            amount: Number(rev.basicSalary),
          },
          {
            salaryStructureId: structure.id,
            salaryComponentId: hraComp.id,
            amount: Number(rev.hra),
          },
          {
            salaryStructureId: structure.id,
            salaryComponentId: transportComp.id,
            amount: Number(rev.transportAllowance),
          },
          {
            salaryStructureId: structure.id,
            salaryComponentId: specialComp.id,
            amount: Number(rev.otherAllowances),
          },
        ].filter((item) => item.amount > 0);

        if (itemsData.length > 0) {
          await tx.salaryStructureItem.createMany({
            data: itemsData,
          });

          const totalEarnings = itemsData.reduce(
            (sum, item) => sum + item.amount,
            0,
          );
          await tx.salaryStructure.update({
            where: { id: structure.id },
            data: { netSalary: totalEarnings },
          });
        }
      }
    });
  }
}
