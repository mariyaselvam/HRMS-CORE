import { z } from 'zod';
import { validateRequest } from '../../common/middleware/validation.middleware';

/**
 * Upload Document Validation Schema
 */
export const uploadDocumentSchema = z.object({
    employeeId: z.uuid("Invalid employee ID"),
    documentType: z.string().min(1, "Document type is required"),
    expiryDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid expiry date").optional(),
});

export const validateUploadDocument = validateRequest(uploadDocumentSchema);

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
