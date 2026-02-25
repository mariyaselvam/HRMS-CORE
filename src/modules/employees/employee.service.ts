import bcrypt from 'bcrypt';
import { EmployeeRepository } from './employee.repository';
import { OnboardEmployeeInput, UpdateEmployeeInput } from './employee.validator';
import { AppError, NotFoundError } from '../../common/errors/AppError';

export class EmployeeService {
    private employeeRepository: EmployeeRepository;

    constructor() {
        this.employeeRepository = new EmployeeRepository();
    }

    async onboardEmployee(companyId: string, data: OnboardEmployeeInput) {
        // 1. Check if email exists
        const existingUser = await this.employeeRepository.findByEmail(data.email);
        if (existingUser) {
            throw new AppError('A user with this email already exists', 409);
        }

        // 2. Check if employee code exists in company
        const existingCode = await this.employeeRepository.findByEmployeeCode(companyId, data.employeeCode);
        if (existingCode) {
            throw new AppError(`Employee code ${data.employeeCode} is already in use`, 409);
        }

        // 3. Hash password
        const hashedPassword = await bcrypt.hash(data.password, 12);

        // 4. Create record
        return this.employeeRepository.createEmployee(companyId, data, hashedPassword);
    }

    async getAllEmployees(companyId: string) {
        return this.employeeRepository.listEmployees(companyId);
    }

    async getEmployeeDetail(id: string, companyId: string) {
        const employee = await this.employeeRepository.getEmployeeById(id, companyId);
        if (!employee) {
            throw new NotFoundError('Employee not found');
        }
        return employee;
    }

    async updateEmployeeProfile(id: string, companyId: string, data: UpdateEmployeeInput) {
        // Verify existence
        await this.getEmployeeDetail(id, companyId);

        return this.employeeRepository.updateEmployee(id, companyId, data);
    }
}
