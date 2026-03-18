import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/common/utils/prisma';

describe('HRMS E2E Simulation API', () => {
    let companyId: string;
    let employeeIds: string[] = [];

    beforeAll(async () => {
        // Optional: Clean up or setup logic
    });

    afterAll(async () => {
        // Cleanup if necessary
    });

    it('should create a sandbox company', async () => {
        const response = await request(app)
            .post('/api/v1/testing/create-sandbox')
            .send({ name: 'Test Simulation Corp' });

        expect(response.status).toBe(200);
        expect(response.body.companyId).toBeDefined();
        companyId = response.body.companyId;
    });

    it('should generate attendance for the company', async () => {
        // Normally we'd fetch employees, for now we assume they were created by the factory in create-sandbox if we had that logic
        // But our create-sandbox currently only creates the company. 
        // Let's create a few employees first for this test.
        const roleResult = await prisma.role.findFirst({ where: { companyId, name: 'Admin' } });
        const adminRoleId = roleResult ? roleResult.id : '';
        const dept = await prisma.department.create({ data: { name: 'Test Dept', companyId } });

        // Manual employee creation for test isolation
        const user = await prisma.user.create({
            data: {
                companyId,
                email: `test-${Date.now()}@example.com`,
                passwordHash: 'hash',
                roleId: adminRoleId,
            }
        });

        const emp = await prisma.employee.create({
            data: {
                companyId,
                userId: user.id,
                employeeCode: `TEST${Math.floor(Math.random() * 1000)}`,
                departmentId: dept.id,
                dateOfJoining: new Date(),
            }
        });

        employeeIds = [emp.id];

        const response = await request(app)
            .post('/api/v1/testing/generate-attendance')
            .send({ employeeIds, year: 2024, month: 1 });

        expect(response.status).toBe(200);
        expect(response.body.count).toBeGreaterThan(0);
    }, 30000);

    it('should generate leaves for employees', async () => {
        const response = await request(app)
            .post('/api/v1/testing/generate-leaves')
            .send({ companyId, employeeIds, count: 5 });

        expect(response.status).toBe(200);
        expect(response.body.count).toBeDefined();
    }, 30000);

    it('should run payroll for the company', async () => {
        const response = await request(app)
            .post('/api/v1/testing/run-payroll')
            .send({ companyId, year: 2024, month: 1 });

        expect(response.status).toBe(200);
        expect(response.body.recordCount).toBeGreaterThan(0);
    });
});
