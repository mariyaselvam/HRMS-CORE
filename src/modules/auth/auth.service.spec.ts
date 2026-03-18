import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { AppError, AuthenticationError } from '../../common/errors/AppError';

// Mock dependencies
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('./auth.repository');

describe('AuthService', () => {
    let authService: AuthService;
    let authRepositoryMock: jest.Mocked<AuthRepository>;

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();

        // Instantiate the service
        authService = new AuthService();
        
        // Grab the internal repository mock instance
        // Because authRepository is instantiated inside the constructor,
        // we can access the mocked prototype or use jest.spyOn if we had injected it.
        // But since it's `new AuthRepository()`, jest.mock('./auth.repository') 
        // will give it mocked functions. We can spy on the prototype.
        authRepositoryMock = (AuthRepository as jest.Mock).mock.instances[0] as unknown as jest.Mocked<AuthRepository>;
        if(!authRepositoryMock) {
          // Fallback if instances[0] is not yet populated until instantiation
          authRepositoryMock = authService['authRepository'] as jest.Mocked<AuthRepository>;
        }
    });

    describe('registerCompany', () => {
        const mockRegisterData = {
            companyName: 'Test Corp',
            adminEmail: 'admin@test.com',
            adminPassword: 'password123',
            adminName: 'Admin User',
            industryType: 'Tech',
            employeeLimit: 100
        };

        it('should throw AppError if email is already registered', async () => {
            authRepositoryMock.findByEmail = jest.fn().mockResolvedValue({ id: 'existing-id' });

            await expect(authService.registerCompany(mockRegisterData)).rejects.toThrow(AppError);
            await expect(authService.registerCompany(mockRegisterData)).rejects.toMatchObject({
                message: 'Email already registered',
                statusCode: 409,
                code: 'EMAIL_EXISTS'
            });

            expect(authRepositoryMock.findByEmail).toHaveBeenCalledWith(mockRegisterData.adminEmail);
        });

        it('should carefully hash the password and create company with admin', async () => {
            authRepositoryMock.findByEmail = jest.fn().mockResolvedValue(null);
            
            const mockedHashedPassword = 'hashed-password';
            (bcrypt.hash as jest.Mock).mockResolvedValue(mockedHashedPassword);

            const mockResult = {
                company: { id: 'company-id-123' },
                user: { id: 'user-id-123', email: mockRegisterData.adminEmail }
            };
            authRepositoryMock.createCompanyWithAdmin = jest.fn().mockResolvedValue(mockResult);

            const result = await authService.registerCompany(mockRegisterData);

            expect(authRepositoryMock.findByEmail).toHaveBeenCalledWith(mockRegisterData.adminEmail);
            expect(bcrypt.hash).toHaveBeenCalledWith(mockRegisterData.adminPassword, 12);
            expect(authRepositoryMock.createCompanyWithAdmin).toHaveBeenCalledWith(mockRegisterData, mockedHashedPassword);
            
            expect(result).toEqual({
                companyId: 'company-id-123',
                adminId: 'user-id-123',
                email: mockRegisterData.adminEmail
            });
        });
    });

    describe('login', () => {
        const mockLoginData = {
            email: 'admin@test.com',
            password: 'password123'
        };

        const mockUser = {
            id: 'user-id-123',
            email: 'admin@test.com',
            passwordHash: 'hashed-password',
            companyId: 'company-id-123',
            role: { name: 'Admin' }
        };

        it('should throw AuthenticationError if user is not found', async () => {
            authRepositoryMock.findByEmail = jest.fn().mockResolvedValue(null);

            await expect(authService.login(mockLoginData)).rejects.toThrow(AuthenticationError);
            await expect(authService.login(mockLoginData)).rejects.toMatchObject({
                message: 'Invalid email or password'
            });

            expect(authRepositoryMock.findByEmail).toHaveBeenCalledWith(mockLoginData.email);
        });

        it('should throw AuthenticationError if password does not match', async () => {
            authRepositoryMock.findByEmail = jest.fn().mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(authService.login(mockLoginData)).rejects.toThrow(AuthenticationError);
            await expect(authService.login(mockLoginData)).rejects.toMatchObject({
                message: 'Invalid email or password'
            });

            expect(bcrypt.compare).toHaveBeenCalledWith(mockLoginData.password, mockUser.passwordHash);
        });

        it('should return token and user info if login is successful', async () => {
            authRepositoryMock.findByEmail = jest.fn().mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            
            const mockedToken = 'jwt-mock-token';
            (jwt.sign as jest.Mock).mockReturnValue(mockedToken);

            const result = await authService.login(mockLoginData);

            expect(jwt.sign).toHaveBeenCalledWith(
                {
                    userId: mockUser.id,
                    companyId: mockUser.companyId,
                    role: mockUser.role.name
                },
                expect.any(String),
                { expiresIn: '24h' }
            );

            expect(result).toEqual({
                token: mockedToken,
                user: {
                    id: mockUser.id,
                    email: mockUser.email,
                    role: mockUser.role.name,
                    companyId: mockUser.companyId
                }
            });
        });
    });
});
