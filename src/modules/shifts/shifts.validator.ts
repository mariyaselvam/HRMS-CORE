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
    startTime: z.string().regex(timeRegex, "Invalid time format (HH:mm)"),
    endTime: z.string().regex(timeRegex, "Invalid time format (HH:mm)"),
    graceMinutes: z.number().int().min(0).max(60).optional(),
});

/**
 * Assign Shift Validation Schema
 */
export const assignShiftSchema = z.object({
    employeeId: z.string().uuid("Invalid employee ID format"),
    shiftId: z.string().uuid("Invalid shift ID format"),
    effectiveFrom: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
});

export const validateCreateShift = validateRequest(createShiftSchema);
export const validateAssignShift = validateRequest(assignShiftSchema);

export type CreateShiftInput = z.infer<typeof createShiftSchema>;
export type AssignShiftInput = z.infer<typeof assignShiftSchema>;