import { z } from "zod";
import { validateRequest } from "../../common/middleware/validation.middleware";

/**
 * Salary Structure Validation Schema
 */
export const salaryStructureSchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID"),
  grossSalary: z.number().positive("Gross salary must be positive"),
  netSalary: z.number().nonnegative().optional(),
  effectiveFrom: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), "Invalid effective date"),
  items: z
    .array(
      z.object({
        salaryComponentId: z.string().uuid("Invalid component ID"),
        amount: z.number().nonnegative("Amount must be positive"),
      }),
    )
    .nonempty("At least one salary component is required"),
});

/**
 * Generate Payroll Cycle Validation Schema
 */
export const generatePayrollSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be in YYYY-MM format"),
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
export const validateUpdatePayrollRecord = validateRequest(
  updatePayrollRecordSchema,
);

export type SalaryStructureInput = z.infer<typeof salaryStructureSchema>;
export type GeneratePayrollInput = z.infer<typeof generatePayrollSchema>;
export type UpdatePayrollRecordInput = z.infer<
  typeof updatePayrollRecordSchema
>;
