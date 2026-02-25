import { z } from 'zod';
import { validateRequest } from '../../common/middleware/validation.middleware';

/**
 * Register Company Validation Schema
 */
export const registerCompanySchema = z.object({
    companyName: z.string().min(1, "Company name is required"),
    industryType: z.string().min(1, "Industry type is required"),
    employeeLimit: z.number().int().min(1, "Employee limit must be at least 1"),
    adminEmail: z.string().email("Invalid admin email"),
    adminPassword: z.string().min(8, "Admin password must be at least 8 characters"),
});

/**
 * Login Validation Schema
 */
export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

export const validateRegister = validateRequest(registerCompanySchema);
export const validateLogin = validateRequest(loginSchema);

export type RegisterCompanyInput = z.infer<typeof registerCompanySchema>;
export type LoginInput = z.infer<typeof loginSchema>;
