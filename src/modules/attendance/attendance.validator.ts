import { z } from 'zod';
import { validateRequest } from '../../common/middleware/validation.middleware';

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
    status: z.enum(['present', 'late', 'absent', 'half-day']).optional(),
    search: z.string().optional(),
    page: z.string().or(z.number()).transform(v => Number(v) || 1).optional(),
    limit: z.string().or(z.number()).transform(v => Number(v) || 10).optional(),
});

export const validateCheckIn = validateRequest(checkInSchema);
export const validateCheckOut = validateRequest(checkOutSchema);
export const validateAttendanceFilter = validateRequest(attendanceFilterSchema, 'query');

export type CheckInInput = z.infer<typeof checkInSchema>;
export type CheckOutInput = z.infer<typeof checkOutSchema>;
export type AttendanceFilterInput = z.infer<typeof attendanceFilterSchema>;
