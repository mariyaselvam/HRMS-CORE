import prisma from '../../common/utils/prisma';
import { UploadDocumentInput } from './document.validator';

export class DocumentRepository {
    async createDocument(userId: string, data: UploadDocumentInput, file: { url: string, name: string }) {
        return prisma.employeeDocument.create({
            data: {
                employeeId: data.employeeId,
                documentType: data.documentType,
                fileUrl: file.url,
                fileName: file.name,
                expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
                uploadedBy: userId
            }
        });
    }

    async listEmployeeDocuments(employeeId: string) {
        return prisma.employeeDocument.findMany({
            where: { employeeId },
            orderBy: { createdAt: 'desc' }
        });
    }

    async deleteDocument(id: string) {
        return prisma.employeeDocument.delete({
            where: { id }
        });
    }

    async findDocumentById(id: string) {
        return prisma.employeeDocument.findUnique({
            where: { id }
        });
    }
}
