import { z } from 'zod';
import { validateRequest } from '../../common/middleware/validation.middleware';

/**
 * Time format helper (HH:mm)
 */
const timeRegex = /^([01]\d|2[0-3]):?([0-5]\d)$/;

/**
 * Create Shift Validation Schema
 */
export const createShiftSchema = z.object({
    name: z.string().min(1, "Shift name is required"),
    code: z.string().min(1, "Shift code is required").max(20, "Shift code must be at most 20 characters"),
    startTime: z.string().regex(timeRegex, "Invalid time format (HH:mm)"),
    endTime: z.string().regex(timeRegex, "Invalid time format (HH:mm)"),
    graceMinutes: z.number().int().min(0).max(120).optional().default(0),
    breakDuration: z.number().int().min(0).max(240).optional().default(0),
    status: z.enum(['active', 'inactive']).optional().default('active'),
});

/**
 * Update Shift Validation Schema
 */
export const updateShiftSchema = z.object({
    name: z.string().min(1, "Shift name is required").optional(),
    code: z.string().min(1, "Shift code is required").max(20).optional(),
    startTime: z.string().regex(timeRegex, "Invalid time format (HH:mm)").optional(),
    endTime: z.string().regex(timeRegex, "Invalid time format (HH:mm)").optional(),
    graceMinutes: z.number().int().min(0).max(120).optional(),
    breakDuration: z.number().int().min(0).max(240).optional(),
    status: z.enum(['active', 'inactive']).optional(),
});

/**
 * Bulk Assign Shift Validation Schema
 */
export const bulkAssignShiftSchema = z.object({
    shiftId: z.string().uuid("Invalid shift ID format"),
    employeeIds: z.array(z.string().uuid("Invalid employee ID format")).min(1, "At least one employee is required"),
    effectiveFrom: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
});

/**
 * Bulk Remove Shift Assignment Validation Schema
 */
export const bulkRemoveShiftSchema = z.object({
    shiftId: z.string().uuid("Invalid shift ID format"),
    employeeIds: z.array(z.string().uuid("Invalid employee ID format")).min(1, "At least one employee is required"),
});

/**
 * Transfer Employees Shift Validation Schema
 */
export const transferShiftSchema = z.object({
    fromShiftId: z.string().uuid("Invalid source shift ID format"),
    toShiftId: z.string().uuid("Invalid target shift ID format"),
    employeeIds: z.array(z.string().uuid("Invalid employee ID format")).min(1, "At least one employee is required"),
    effectiveFrom: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
});

/**
 * Shift Employee Filter Validation Schema
 */
export const shiftEmployeeFilterSchema = z.object({
    page: z.string().or(z.number()).transform(v => Number(v) || 1).optional(),
    limit: z.string().or(z.number()).transform(v => Number(v) || 10).optional(),
    search: z.string().optional(),
    departmentId: z.string().uuid().optional(),
    workLocationId: z.string().uuid().optional(),
    status: z.enum(['active', 'inactive']).optional(),
});

export const validateCreateShift = validateRequest(createShiftSchema);
export const validateUpdateShift = validateRequest(updateShiftSchema);
export const validateBulkAssignShift = validateRequest(bulkAssignShiftSchema);
export const validateBulkRemoveShift = validateRequest(bulkRemoveShiftSchema);
export const validateTransferShift = validateRequest(transferShiftSchema);
export const validateShiftEmployeeFilter = validateRequest(shiftEmployeeFilterSchema, 'query');

export type CreateShiftInput = z.infer<typeof createShiftSchema>;
export type UpdateShiftInput = z.infer<typeof updateShiftSchema>;
export type BulkAssignShiftInput = z.infer<typeof bulkAssignShiftSchema>;
export type BulkRemoveShiftInput = z.infer<typeof bulkRemoveShiftSchema>;
export type TransferShiftInput = z.infer<typeof transferShiftSchema>;
export type ShiftEmployeeFilterInput = z.infer<typeof shiftEmployeeFilterSchema>;