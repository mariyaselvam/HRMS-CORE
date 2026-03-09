import { DocumentRepository } from './document.repository';
import { UploadDocumentInput } from './document.validator';
import { NotFoundError } from '../../common/errors/AppError';
import prisma from '../../common/utils/prisma';
import { uploadFile } from '../../common/utils/s3';

export class DocumentService {
    private repository: DocumentRepository;

    constructor() {
        this.repository = new DocumentRepository();
    }

    async uploadFile(userId: string, companyId: string, data: UploadDocumentInput, file: Express.Multer.File) {
        // 1. Verify employee exists in company
        const employee = await prisma.employee.findFirst({
            where: { id: data.employeeId, companyId }
        });

        if (!employee) {
            throw new NotFoundError('Employee not found in your company');
        }

        // 2. Create bucket path: company/employee/timestamp-filename
        const path = `${companyId}/${data.employeeId}/${Date.now()}-${file.originalname}`;

        // 3. Upload to Supabase S3
        const fileUrl = await uploadFile(file, path);

        // 4. Persist metadata to database
        return this.repository.createDocument(userId, data, {
            url: fileUrl,
            name: file.originalname
        });
    }

    async getDocuments(employeeId: string, companyId: string) {
        // Security check
        const employee = await prisma.employee.findFirst({
            where: { id: employeeId, companyId }
        });
        if (!employee) throw new NotFoundError('Employee not found');

        return this.repository.listEmployeeDocuments(employeeId);
    }

    async removeDocument(id: string, userId: string, companyId: string) {
        const doc = await this.repository.findDocumentById(id);
        if (!doc) throw new NotFoundError('Document not found');

        // Check if document belongs to an employee of this company
        const employee = await prisma.employee.findFirst({
            where: { id: doc.employeeId, companyId }
        });
        if (!employee) throw new NotFoundError('Document access denied');

        return this.repository.deleteDocument(id);
    }
}
