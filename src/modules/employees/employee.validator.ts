import { z } from 'zod';
import { validateRequest } from '../../common/middleware/validation.middleware';

/**
 * Employment Status Enum
 */
export const EmploymentStatus = z.enum(['active', 'probation', 'notice', 'terminated']);

/**
 * Onboard Employee Validation Schema
 */
export const onboardEmployeeSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    employeeCode: z.string().min(1, "Employee code is required"),
    departmentId: z.string().uuid("Invalid department ID format"),
    teamId: z.string().uuid("Invalid team ID format").optional(),
    managerId: z.string().uuid("Invalid manager ID format").optional(),
    dateOfJoining: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid date format for dateOfJoining",
    }),
    status: EmploymentStatus.optional().default('probation'),
});

/**
 * Update Employee Validation Schema
 */
export const updateEmployeeSchema = z.object({
    departmentId: z.string().uuid("Invalid department ID format").optional(),
    teamId: z.string().uuid("Invalid team ID format").optional(),
    managerId: z.string().uuid("Invalid manager ID format").optional(),
    status: EmploymentStatus.optional(),
});

export const validateOnboard = validateRequest(onboardEmployeeSchema);
export const validateUpdateEmployee = validateRequest(updateEmployeeSchema);

export type OnboardEmployeeInput = z.infer<typeof onboardEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
