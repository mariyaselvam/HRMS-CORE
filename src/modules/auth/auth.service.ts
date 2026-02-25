import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthRepository } from './auth.repository';
import { RegisterCompanyInput, LoginInput } from './auth.validator';
import { AppError, AuthenticationError } from '../../common/errors/AppError';

export class AuthService {
    private authRepository: AuthRepository;

    constructor() {
        this.authRepository = new AuthRepository();
    }

    async registerCompany(data: RegisterCompanyInput) {
        const existingUser = await this.authRepository.findByEmail(data.adminEmail);

        if (existingUser) {
            throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
        }

        const hashedPassword = await bcrypt.hash(data.adminPassword, 12);
        const result = await this.authRepository.createCompanyWithAdmin(data, hashedPassword);

        return {
            companyId: result.company.id,
            adminId: result.user.id,
            email: result.user.email
        };
    }

    async login(data: LoginInput) {
        const user = await this.authRepository.findByEmail(data.email);

        if (!user) {
            throw new AuthenticationError('Invalid email or password');
        }

        const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);

        if (!isPasswordValid) {
            throw new AuthenticationError('Invalid email or password');
        }

        const token = jwt.sign(
            {
                userId: user.id,
                companyId: user.companyId,
                role: user.role.name
            },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '24h' }
        );

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role.name,
                companyId: user.companyId
            }
        };
    }
}
