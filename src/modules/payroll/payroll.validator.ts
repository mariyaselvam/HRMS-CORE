import { z } from 'zod';
import { validateRequest } from '../../common/middleware/validation.middleware';

/**
 * Salary Structure Validation Schema
 */
export const salaryStructureSchema = z.object({
    employeeId: z.string().uuid("Invalid employee ID"),
    basicSalary: z.number().positive("Basic salary must be positive"),
    hra: z.number().nonnegative().default(0),
    transportAllowance: z.number().nonnegative().default(0),
    otherAllowances: z.number().nonnegative().default(0),
    effectiveFrom: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid effective date"),
});

/**
 * Generate Payroll Cycle Validation Schema
 */
export const generatePayrollSchema = z.object({
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be in YYYY-MM format"),
});

/**
 * Update Payroll Record Validation Schema (Manual adjustments)
 */
export const updatePayrollRecordSchema = z.object({
    otherDeductions: z.number().nonnegative().optional(),
    bonus: z.number().nonnegative().optional(),
    comment: z.string().optional(),
});

export const validateSalaryStructure = validateRequest(salaryStructureSchema);
export const validateGeneratePayroll = validateRequest(generatePayrollSchema);
export const validateUpdatePayrollRecord = validateRequest(updatePayrollRecordSchema);

export type SalaryStructureInput = z.infer<typeof salaryStructureSchema>;
export type GeneratePayrollInput = z.infer<typeof generatePayrollSchema>;
export type UpdatePayrollRecordInput = z.infer<typeof updatePayrollRecordSchema>;
