import bcrypt from "bcrypt";
import { EmployeeService } from "./employee.service";
import { EmployeeRepository } from "./employee.repository";
import { AppError, NotFoundError } from "../../common/errors/AppError";
import { uploadFile } from "../../common/utils/s3";
import { SystemRole } from "../../common/enums/role.enum";

jest.mock("bcrypt");
jest.mock("./employee.repository");
jest.mock("../../common/utils/s3");

describe("EmployeeService", () => {
  let employeeService: EmployeeService;
  let employeeRepositoryMock: jest.Mocked<EmployeeRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    employeeService = new EmployeeService();
    employeeRepositoryMock = (EmployeeRepository as jest.Mock).mock
      .instances[0] as unknown as jest.Mocked<EmployeeRepository>;
  });

  describe("onboardEmployee", () => {
    const mockCompanyId = "company-123";
    const mockData = {
      email: "test@example.com",
      password: "password123",
      employeeCode: "EMP001",
      departmentId: "00000000-0000-0000-0000-000000000000", // Valid UUID format
      role: SystemRole.EMPLOYEE,
      dateOfJoining: "2024-01-01",
      status: "probation" as const,
    };

    it("should throw AppError if email already exists", async () => {
      employeeRepositoryMock.findByEmail = jest
        .fn()
        .mockResolvedValue({ id: "existing-id" });

      await expect(
        employeeService.onboardEmployee(mockCompanyId, mockData),
      ).rejects.toThrow(AppError);
      await expect(
        employeeService.onboardEmployee(mockCompanyId, mockData),
      ).rejects.toMatchObject({
        message: "A user with this email already exists",
        statusCode: 409,
      });

      expect(employeeRepositoryMock.findByEmail).toHaveBeenCalledWith(
        mockData.email,
      );
    });

    it("should throw AppError if employee code is already in use", async () => {
      employeeRepositoryMock.findByEmail = jest.fn().mockResolvedValue(null);
      employeeRepositoryMock.findByEmployeeCode = jest
        .fn()
        .mockResolvedValue({ id: "existing-emp-id" });

      await expect(
        employeeService.onboardEmployee(mockCompanyId, mockData),
      ).rejects.toThrow(AppError);
      await expect(
        employeeService.onboardEmployee(mockCompanyId, mockData),
      ).rejects.toMatchObject({
        message: `Employee code ${mockData.employeeCode} is already in use`,
        statusCode: 409,
      });

      expect(employeeRepositoryMock.findByEmployeeCode).toHaveBeenCalledWith(
        mockCompanyId,
        mockData.employeeCode,
      );
    });

    it("should hash password and create employee successfully", async () => {
      employeeRepositoryMock.findByEmail = jest.fn().mockResolvedValue(null);
      employeeRepositoryMock.findByEmployeeCode = jest
        .fn()
        .mockResolvedValue(null);

      const mockedPassword = "hashed-password";
      (bcrypt.hash as jest.Mock).mockResolvedValue(mockedPassword);

      const createdEmployee = { id: "new-emp-id" };
      employeeRepositoryMock.createEmployee = jest
        .fn()
        .mockResolvedValue(createdEmployee);

      const result = await employeeService.onboardEmployee(
        mockCompanyId,
        mockData,
      );

      expect(bcrypt.hash).toHaveBeenCalledWith(mockData.password, 12);
      expect(employeeRepositoryMock.createEmployee).toHaveBeenCalledWith(
        mockCompanyId,
        mockData,
        mockedPassword,
      );
      expect(result).toEqual(createdEmployee);
    });
  });

  describe("getEmployeeDetail", () => {
    const mockCompanyId = "company-123";
    const mockEmployeeId = "emp-123";

    it("should throw NotFoundError if employee does not exist", async () => {
      employeeRepositoryMock.getEmployeeById = jest
        .fn()
        .mockResolvedValue(null);

      await expect(
        employeeService.getEmployeeDetail(mockEmployeeId, mockCompanyId),
      ).rejects.toThrow(NotFoundError);
      await expect(
        employeeService.getEmployeeDetail(mockEmployeeId, mockCompanyId),
      ).rejects.toMatchObject({
        message: "Employee not found",
        statusCode: 404,
      });

      expect(employeeRepositoryMock.getEmployeeById).toHaveBeenCalledWith(
        mockEmployeeId,
        mockCompanyId,
      );
    });

    it("should return employee if it exists", async () => {
      const employeeData = { id: mockEmployeeId, firstName: "John" };
      employeeRepositoryMock.getEmployeeById = jest
        .fn()
        .mockResolvedValue(employeeData);

      const result = await employeeService.getEmployeeDetail(
        mockEmployeeId,
        mockCompanyId,
      );

      expect(result).toEqual(employeeData);
    });
  });

  describe("savePersonalDetails", () => {
    const mockCompanyId = "company-123";
    const mockEmployeeId = "emp-123";
    const data = {
      dateOfBirth: "1990-01-01",
      gender: "male",
      nationality: "US",
    };

    it("should verify employee existence and upsert details", async () => {
      employeeRepositoryMock.getEmployeeById = jest
        .fn()
        .mockResolvedValue({ id: mockEmployeeId });
      employeeRepositoryMock.upsertPersonalDetails = jest
        .fn()
        .mockResolvedValue(data);

      const result = await employeeService.savePersonalDetails(
        mockEmployeeId,
        mockCompanyId,
        data as any,
      );

      expect(employeeRepositoryMock.getEmployeeById).toHaveBeenCalledWith(
        mockEmployeeId,
        mockCompanyId,
      );
      expect(employeeRepositoryMock.upsertPersonalDetails).toHaveBeenCalledWith(
        mockEmployeeId,
        data,
      );
      expect(result).toEqual(data);
    });
  });

  describe("saveJobDetails", () => {
    const mockCompanyId = "company-123";
    const mockEmployeeId = "emp-123";
    const data = { jobTitle: "Developer" };

    it("should verify employee existence and upsert details", async () => {
      employeeRepositoryMock.getEmployeeById = jest
        .fn()
        .mockResolvedValue({ id: mockEmployeeId });
      employeeRepositoryMock.upsertJobDetails = jest
        .fn()
        .mockResolvedValue(data);

      const result = await employeeService.saveJobDetails(
        mockEmployeeId,
        mockCompanyId,
        data as any,
      );

      expect(employeeRepositoryMock.getEmployeeById).toHaveBeenCalledWith(
        mockEmployeeId,
        mockCompanyId,
      );
      expect(employeeRepositoryMock.upsertJobDetails).toHaveBeenCalledWith(
        mockEmployeeId,
        data,
      );
      expect(result).toEqual(data);
    });
  });

  describe("saveBankDetails", () => {
    const mockCompanyId = "company-123";
    const mockEmployeeId = "emp-123";
    const data = { bankName: "Bank of America", accountNumber: "123456789" };

    it("should verify employee existence and upsert details", async () => {
      employeeRepositoryMock.getEmployeeById = jest
        .fn()
        .mockResolvedValue({ id: mockEmployeeId });
      employeeRepositoryMock.upsertBankDetails = jest
        .fn()
        .mockResolvedValue(data);

      const result = await employeeService.saveBankDetails(
        mockEmployeeId,
        mockCompanyId,
        data,
      );

      expect(employeeRepositoryMock.getEmployeeById).toHaveBeenCalledWith(
        mockEmployeeId,
        mockCompanyId,
      );
      expect(employeeRepositoryMock.upsertBankDetails).toHaveBeenCalledWith(
        mockEmployeeId,
        data,
      );
      expect(result).toEqual(data);
    });
  });

  describe("uploadEmployeeDocument", () => {
    const mockCompanyId = "company-123";
    const mockEmployeeId = "emp-123";
    const mockUserId = "user-123";
    const mockFile = { originalname: "resume.pdf" } as any;
    const mockDocumentType = "resume";

    it("should verify employee existence, upload file, and save record", async () => {
      employeeRepositoryMock.getEmployeeById = jest
        .fn()
        .mockResolvedValue({ id: mockEmployeeId });

      const mockUrl = "https://s3.example.com/file.pdf";
      (uploadFile as jest.Mock).mockResolvedValue(mockUrl);

      const savedDoc = { id: "doc-123" };
      employeeRepositoryMock.addEmployeeDocument = jest
        .fn()
        .mockResolvedValue(savedDoc);

      const result = await employeeService.uploadEmployeeDocument(
        mockEmployeeId,
        mockCompanyId,
        mockUserId,
        mockFile,
        mockDocumentType,
      );

      expect(employeeRepositoryMock.getEmployeeById).toHaveBeenCalledWith(
        mockEmployeeId,
        mockCompanyId,
      );
      expect(uploadFile).toHaveBeenCalledWith(
        mockFile,
        expect.stringContaining(`/${mockEmployeeId}/`),
      );
      expect(employeeRepositoryMock.addEmployeeDocument).toHaveBeenCalledWith({
        employeeId: mockEmployeeId,
        documentType: mockDocumentType,
        fileUrl: mockUrl,
        fileName: mockFile.originalname,
        uploadedBy: mockUserId,
      });
      expect(result).toEqual(savedDoc);
    });
  });
});
