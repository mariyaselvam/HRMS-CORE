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

/**
 * Check-In Validation Schema
 */
export const checkInSchema = z.object({
    workLocationId: z.string().uuid("Invalid work location ID format").optional(),
    shiftId: z.string().uuid("Invalid shift ID format").optional(),
    note: z.string().optional(),
});

/**
 * Check-Out Validation Schema
 */
export const checkOutSchema = z.object({
    note: z.string().optional(),
});

/**
 * Attendance Filter Validation Schema
 */
export const attendanceFilterSchema = z.object({
    startDate: z.string().refine((val) => !isNaN(Date.parse(val))).optional(),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val))).optional(),
    employeeId: z.string().uuid().optional(),
});

export const validateCreateShift = validateRequest(createShiftSchema);
export const validateAssignShift = validateRequest(assignShiftSchema);
export const validateCheckIn = validateRequest(checkInSchema);
export const validateCheckOut = validateRequest(checkOutSchema);
export const validateAttendanceFilter = validateRequest(attendanceFilterSchema);

export type CreateShiftInput = z.infer<typeof createShiftSchema>;
export type AssignShiftInput = z.infer<typeof assignShiftSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
export type CheckOutInput = z.infer<typeof checkOutSchema>;
export type AttendanceFilterInput = z.infer<typeof attendanceFilterSchema>;
