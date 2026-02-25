import { z } from 'zod';
import { validateRequest } from '../../common/middleware/validation.middleware';

/**
 * Create Leave Type Validation Schema
 */
export const createLeaveTypeSchema = z.object({
    name: z.string().min(1, "Leave type name is required"),
    maxDays: z.number().int().min(1, "Max days must be at least 1"),
    isPaid: z.boolean().default(true),
    carryForward: z.boolean().default(false),
});

/**
 * Create Leave Request Validation Schema
 */
export const createLeaveRequestSchema = z.object({
    leaveTypeId: z.string().uuid("Invalid leave type ID format"),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid start date"),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid end date"),
    reason: z.string().optional(),
});

/**
 * Handle Leave Action Validation Schema (Approve/Reject)
 */
export const handleLeaveActionSchema = z.object({
    action: z.enum(['approve', 'reject']),
    comment: z.string().optional(),
});

export const validateCreateLeaveType = validateRequest(createLeaveTypeSchema);
export const validateCreateLeaveRequest = validateRequest(createLeaveRequestSchema);
export const validateHandleLeaveAction = validateRequest(handleLeaveActionSchema);

export type CreateLeaveTypeInput = z.infer<typeof createLeaveTypeSchema>;
export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
export type HandleLeaveActionInput = z.infer<typeof handleLeaveActionSchema>;
