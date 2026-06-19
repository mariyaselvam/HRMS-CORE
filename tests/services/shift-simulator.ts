import prisma from '../../src/common/utils/prisma';
import { shiftFactory } from '../factories/shift.factory';

export class ShiftSimulator {
    /**
     * Creates standard shifts for a company and assigns them to employees.
     */
    async setupShifts(companyId: string, employeeIds: string[]) {
        // 1. Create standard shifts
        const shifts = await shiftFactory.createStandardShifts(companyId);
        console.log(`✅ Created ${shifts.length} standard shifts`);

        // 2. Assign "General Shift" to most employees, random few get Morning/Night
        let assignedCount = 0;
        for (let i = 0; i < employeeIds.length; i++) {
            const empId = employeeIds[i];
            
            // Distribute: 70% General, 20% Morning, 10% Night
            let shiftIndex = 0; // Default: General Shift
            if (i > employeeIds.length * 0.7) shiftIndex = 1; // Morning
            if (i > employeeIds.length * 0.9) shiftIndex = 2; // Night

            const existing = await prisma.employeeShift.findFirst({
                where: { employeeId: empId, isActive: true }
            });

            if (!existing) {
                await prisma.employeeShift.create({
                    data: {
                        employeeId: empId,
                        shiftId: shifts[shiftIndex].id,
                        effectiveFrom: new Date('2024-01-01'),
                        isActive: true
                    }
                });
                assignedCount++;
            }
        }

        console.log(`✅ Assigned shifts to ${assignedCount} employees`);
        return shifts;
    }
}

export const shiftSimulator = new ShiftSimulator();