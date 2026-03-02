import { z } from 'zod';
import { validateRequest } from '../../common/middleware/validation.middleware';

/**
 * Employment Status Enum
 */
export const EmploymentStatus = z.enum(['active', 'probation', 'notice', 'terminated']);

/**
 * Step 1: Account & Core Org Mapping (Mandatory)
 */
export const onboardStep1Schema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    employeeCode: z.string().min(1, "Employee code is required"),
    departmentId: z.string().uuid("Invalid department ID format"),
    workLocationId: z.uuid("Invalid work location ID format").optional(),
    role: z.preprocess(
        (val) => typeof val === 'string' ? val.charAt(0).toUpperCase() + val.toLowerCase().slice(1) : val,
        z.enum(['Employee', 'Manager', 'HR']).optional().default('Employee')
    ),
    managerId: z.uuid("Invalid manager ID format").optional(),
    dateOfJoining: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid date format for dateOfJoining",
    }),
    status: EmploymentStatus.optional().default('probation'),
});

/**
 * Step 2: Personal Information
 */
export const onboardStep2Schema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    mobile: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number").optional(),
    gender: z.enum(['Male', 'Female', 'Other']).optional(),
    dob: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
        message: "Invalid date format",
    }),
    maritalStatus: z.enum(['Single', 'Married', 'Divorced', 'Widowed']).optional(),
    currentAddress: z.string().optional(),
    permAddress: z.string().optional(),
});

/**
 * Step 3: Job & Organization Details
 */
export const onboardStep3Schema = z.object({
    designation: z.string().optional(),
    employmentType: z.enum(['Full-time', 'Contract', 'Intern']).optional(),
    workLocationType: z.enum(['Office', 'Remote', 'Hybrid']).optional(),
    probationPeriod: z.number().int().min(0).optional(),
    noticePeriod: z.number().int().min(0).optional(),
});

/**
 * Step 4: Payroll & Statutory Setup
 */
export const onboardStep4Schema = z.object({
    accountNumber: z.string().regex(/^\d{9,18}$/, "Invalid Bank Account Number").optional(),
    ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC Code").optional(),
    bankName: z.string().optional(),
    branchName: z.string().optional(),
    pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format").optional(),
    uan: z.string().regex(/^\d{12}$/, "Invalid UAN format").optional(),
    pfApplicable: z.boolean().optional(),
    esiApplicable: z.boolean().optional(),
    esiNumber: z.string().optional(),
    ptState: z.string().optional(),
    taxRegime: z.enum(['old', 'new']).optional().default('new'),
});

/**
 * Legacy support / Combined schemas
 */
export const onboardEmployeeSchema = onboardStep1Schema; // Use step 1 as initial
export const updateEmployeeSchema = z.object({
    departmentId: z.uuid("Invalid department ID format").optional(),
    workLocationId: z.uuid("Invalid work location ID format").optional(),
    teamId: z.uuid("Invalid team ID format").optional(),
    managerId: z.uuid("Invalid manager ID format").optional(),
    status: EmploymentStatus.optional(),
});

export const validateOnboard = validateRequest(onboardStep1Schema);
export const validateOnboardStep2 = validateRequest(onboardStep2Schema);
export const validateOnboardStep3 = validateRequest(onboardStep3Schema);
export const validateOnboardStep4 = validateRequest(onboardStep4Schema);
export const validateUpdateEmployee = validateRequest(updateEmployeeSchema);

export type OnboardEmployeeInput = z.infer<typeof onboardStep1Schema>;
export type OnboardStep2Input = z.infer<typeof onboardStep2Schema>;
export type OnboardStep3Input = z.infer<typeof onboardStep3Schema>;
export type OnboardStep4Input = z.infer<typeof onboardStep4Schema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

