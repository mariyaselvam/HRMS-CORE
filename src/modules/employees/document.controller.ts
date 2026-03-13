import { Request, Response } from 'express';
import { DocumentService } from './document.service';
import { AppError } from '../../common/errors/AppError';

export class DocumentController {
    private service: DocumentService;

    constructor() {
        this.service = new DocumentService();
    }

    upload = async (req: Request, res: Response) => {
        const { userId, companyId } = req.user!;
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            throw new AppError('No documents uploaded', 400);
        }

        // Handle documentTypes which could be an array or a single string
        const bodyTypes = req.body.documentTypes || req.body.documentType || 'other';
        const docTypes = Array.isArray(bodyTypes) ? bodyTypes : [bodyTypes];

        const results = [];
        for (let i = 0; i < files.length; i++) {
            const data = {
                ...req.body,
                documentType: docTypes[i] || docTypes[0] || 'other'
            };

            const result = await this.service.uploadFile(userId, companyId, data, files[i]);
            results.push(result);
        }

        res.status(201).json({ success: true, data: results });
    };

    list = async (req: Request, res: Response) => {
        const { companyId } = req.user!;
        const employeeId = req.params.employeeId as string;
        const result = await this.service.getDocuments(employeeId, companyId);
        res.json({ success: true, data: result });
    };

    delete = async (req: Request, res: Response) => {
        const { userId, companyId } = req.user!;
        const id = req.params.id as string;
        await this.service.removeDocument(id, userId, companyId);
        res.json({ success: true, message: 'Document deleted successfully' });
    };
}
