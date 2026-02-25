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
        const file = req.file;

        if (!file) {
            throw new AppError('No file uploaded', 400);
        }

        const result = await this.service.uploadFile(userId, companyId, req.body, {
            path: file.path,
            originalname: file.originalname
        });

        res.status(201).json({ success: true, data: result });
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
