import { z } from 'zod';
import { validateRequest } from '../../common/middleware/validation.middleware';

/**
 * Upload Document Validation Schema
 */
export const uploadDocumentSchema = z.object({
    employeeId: z.uuid("Invalid employee ID"),
    documentType: z.string().optional(),
    documentTypes: z.union([z.string(), z.array(z.string())]).optional(),
    expiryDate: z.string().optional(),
});

export const validateUploadDocument = validateRequest(uploadDocumentSchema);

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
