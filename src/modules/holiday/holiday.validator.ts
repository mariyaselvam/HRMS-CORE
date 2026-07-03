import { z } from 'zod';
import { validateRequest } from '../../common/middleware/validation.middleware';

/**
 * Create Holiday Validation Schema
 */
export const createHolidaySchema = z.object({
    name: z.string().min(1, "Holiday name is required"),
    date: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid holiday date"),
    isOptional: z.boolean().optional().default(false),
    workLocationId: z.string().uuid("Invalid branch ID").optional().nullable(),
    allBranches: z.boolean().optional(),
});

/**
 * Holiday Range Validation Schema
 */
export const holidayRangeSchema = z.object({
    year: z.number().int().min(2000).max(2100).optional(),
});

export const validateCreateHoliday = validateRequest(createHolidaySchema);
export const validateHolidayRange = validateRequest(holidayRangeSchema);

export type CreateHolidayInput = z.infer<typeof createHolidaySchema>;
export type HolidayRangeInput = z.infer<typeof holidayRangeSchema>;
