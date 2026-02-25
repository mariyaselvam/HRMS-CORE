import { DocumentRepository } from './document.repository';
import { UploadDocumentInput } from './document.validator';
import { NotFoundError } from '../../common/errors/AppError';
import prisma from '../../common/utils/prisma';

export class DocumentService {
    private repository: DocumentRepository;

    constructor() {
        this.repository = new DocumentRepository();
    }

    async uploadFile(userId: string, companyId: string, data: UploadDocumentInput, fileInfo: { path: string, originalname: string }) {
        // 1. Verify employee exists in company
        const employee = await prisma.employee.findFirst({
            where: { id: data.employeeId, companyId }
        });

        if (!employee) {
            throw new NotFoundError('Employee not found in your company');
        }

        // 2. Persist metadata
        return this.repository.createDocument(userId, data, {
            url: fileInfo.path,
            name: fileInfo.originalname
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
