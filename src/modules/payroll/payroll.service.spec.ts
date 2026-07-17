/// <reference types="jest" />

import { PayrollService } from "./payroll.service";
import { PayrollRepository } from "./payroll.repository";
import prisma from "../../common/utils/prisma";
import { AppError, NotFoundError } from "../../common/errors/AppError";

jest.mock("./payroll.repository");
jest.mock("../../common/utils/prisma", () => ({
  __esModule: true,
  default: {
    employee: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    salaryStructure: {
      updateMany: jest.fn(),
    },
    holiday: {
      findMany: jest.fn(),
    },
    payrollCycle: {
      findFirst: jest.fn(),
    },
  },
}));

describe("PayrollService", () => {
  let payrollService: PayrollService;
  let payrollRepositoryMock: jest.Mocked<PayrollRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    payrollService = new PayrollService();
    payrollRepositoryMock = (PayrollRepository as jest.Mock).mock
      .instances[0] as unknown as jest.Mocked<PayrollRepository>;
    if (!payrollRepositoryMock) {
      payrollRepositoryMock = (payrollService as any).repository;
    }
  });

  const mockCompanyId = "company-123";
  const mockEmployeeId = "emp-123";

  describe("setupSalary", () => {
    const mockData = {
      employeeId: mockEmployeeId,
      grossSalary: 18000,
      effectiveFrom: "2026-07-01",
      items: [
        { salaryComponentId: "comp-basic", amount: 10000 },
        { salaryComponentId: "comp-hra", amount: 5000 },
        { salaryComponentId: "comp-transport", amount: 2000 },
        { salaryComponentId: "comp-special", amount: 1000 },
      ],
    };

    it("should throw NotFoundError if employee not found in company", async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        payrollService.setupSalary(mockCompanyId, mockData as any),
      ).rejects.toThrow(NotFoundError);
      expect(prisma.employee.findFirst).toHaveBeenCalledWith({
        where: { id: mockEmployeeId, companyId: mockCompanyId },
      });
    });

    it("should upsert salary structure and deactivate previous ones", async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue({
        id: mockEmployeeId,
      });
      (prisma.salaryStructure.updateMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
      payrollRepositoryMock.upsertSalaryStructure = jest
        .fn()
        .mockResolvedValue({ id: "salary-1", ...mockData });

      const result = await payrollService.setupSalary(
        mockCompanyId,
        mockData as any,
      );

      expect(prisma.salaryStructure.updateMany).toHaveBeenCalledWith({
        where: { employeeId: mockEmployeeId, isActive: true },
        data: { isActive: false, effectiveTo: expect.any(Date) },
      });
      expect(payrollRepositoryMock.upsertSalaryStructure).toHaveBeenCalledWith(
        mockData,
      );
      expect(result).toHaveProperty("id", "salary-1");
    });
  });

  describe("getSalaryDetail", () => {
    it("should throw NotFoundError if employee not found", async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        payrollService.getSalaryDetail(mockCompanyId, mockEmployeeId),
      ).rejects.toThrow(NotFoundError);
    });

    it("should return active salary structure", async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue({
        id: mockEmployeeId,
      });
      payrollRepositoryMock.getActiveSalary = jest
        .fn()
        .mockResolvedValue({ id: "salary-1", grossSalary: 18000 });

      const result = await payrollService.getSalaryDetail(
        mockCompanyId,
        mockEmployeeId,
      );

      expect(payrollRepositoryMock.getActiveSalary).toHaveBeenCalledWith(
        mockEmployeeId,
      );
      expect(result).toHaveProperty("grossSalary", 18000);
    });
  });

  describe("generateMonthlyPayroll", () => {
    const adminUserId = "admin-1";
    const branchId = "branch-1";
    const generateData = { month: "2024-01" };

    it("should throw AppError if cycle already exists", async () => {
      payrollRepositoryMock.findCycle = jest
        .fn()
        .mockResolvedValue({ id: "cycle-1", status: "completed" });

      await expect(
        payrollService.generateMonthlyPayroll(
          mockCompanyId,
          adminUserId,
          branchId,
          generateData,
        ),
      ).rejects.toThrow(AppError);
      await expect(
        payrollService.generateMonthlyPayroll(
          mockCompanyId,
          adminUserId,
          branchId,
          generateData,
        ),
      ).rejects.toMatchObject({
        message: expect.stringContaining("is already generated"),
      });
    });

    // Simulating the actual generation logic is complex and long, so we ensure the sequence works
    it("should create cycle, calculate deductions, and save payroll records", async () => {
      const expectedMonthDate = new Date("2024-01-01");

      payrollRepositoryMock.findCycle = jest.fn().mockResolvedValue(null);
      payrollRepositoryMock.createCycle = jest
        .fn()
        .mockResolvedValue({ id: "cycle-1" });

      // Mock employees
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([
        {
          id: "emp-1",
          statutoryDetails: { pfApplicable: true, esiApplicable: true },
        }, // With statutory details
        { id: "emp-2", statutoryDetails: null }, // Without statutory details
      ]);

      // Mock holidays
      (prisma.holiday.findMany as jest.Mock).mockResolvedValue([]);

      // Mock active salaries
      payrollRepositoryMock.getActiveSalary = jest
        .fn()
        .mockResolvedValueOnce({ grossSalary: 20000, basicSalary: 10000 }) // emp-1
        .mockResolvedValueOnce({ grossSalary: 30000, basicSalary: 15000 }); // emp-2

      // Mock work summaries (pretend perfect attendance to avoid LOP complexity)
      payrollRepositoryMock.getEmployeeWorkSummary = jest
        .fn()
        .mockResolvedValue({ presentDays: 23, approvedLeaveDays: 0 });

      payrollRepositoryMock.createPayrollRecord = jest
        .fn()
        .mockResolvedValue({ id: "record-x" });

      const result = await payrollService.generateMonthlyPayroll(
        mockCompanyId,
        adminUserId,
        branchId,
        generateData,
      );

      expect(payrollRepositoryMock.findCycle).toHaveBeenCalledWith(
        mockCompanyId,
        expectedMonthDate,
        branchId,
      );
      expect(payrollRepositoryMock.createCycle).toHaveBeenCalledWith(
        mockCompanyId,
        expectedMonthDate,
        adminUserId,
        branchId,
      );
      expect(prisma.employee.findMany).toHaveBeenCalled();
      expect(prisma.holiday.findMany).toHaveBeenCalled();

      expect(payrollRepositoryMock.getActiveSalary).toHaveBeenCalledTimes(2);
      expect(
        payrollRepositoryMock.getEmployeeWorkSummary,
      ).toHaveBeenCalledTimes(2);
      expect(payrollRepositoryMock.createPayrollRecord).toHaveBeenCalledTimes(
        2,
      );

      expect(result).toHaveProperty("cycle");
      expect(result).toHaveProperty("recordsCreated", 2);
    });
  });

  describe("getCycleRecords", () => {
    const branchId = "branch-1";

    it("should return empty array if cycle not found", async () => {
      payrollRepositoryMock.findCycle = jest.fn().mockResolvedValue(null);

      const result = await payrollService.getCycleRecords(
        mockCompanyId,
        branchId,
        "2024-01",
      );

      expect(result).toEqual([]);
    });

    it("should return payroll records for the cycle", async () => {
      payrollRepositoryMock.findCycle = jest
        .fn()
        .mockResolvedValue({ id: "cycle-1" });
      payrollRepositoryMock.getPayrollRecords = jest
        .fn()
        .mockResolvedValue([{ id: "record-1" }]);

      const result = await payrollService.getCycleRecords(
        mockCompanyId,
        branchId,
        "2024-01",
      );

      expect(payrollRepositoryMock.getPayrollRecords).toHaveBeenCalledWith(
        "cycle-1",
      );
      expect(result).toEqual([{ id: "record-1" }]);
    });
  });

  describe("finalizePayroll", () => {
    const cycleId = "cycle-1";

    it("should throw NotFoundError if payroll cycle not found", async () => {
      (prisma.payrollCycle.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        payrollService.finalizePayroll(mockCompanyId, cycleId),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw AppError if already finalized", async () => {
      (prisma.payrollCycle.findFirst as jest.Mock).mockResolvedValue({
        id: cycleId,
        status: "finalized",
      });

      await expect(
        payrollService.finalizePayroll(mockCompanyId, cycleId),
      ).rejects.toThrow(AppError);
    });

    it("should finalize payroll cycle", async () => {
      (prisma.payrollCycle.findFirst as jest.Mock).mockResolvedValue({
        id: cycleId,
        status: "draft",
      });
      payrollRepositoryMock.finalizeCycle = jest
        .fn()
        .mockResolvedValue({ id: cycleId, status: "finalized" });

      const result = await payrollService.finalizePayroll(
        mockCompanyId,
        cycleId,
      );

      expect(payrollRepositoryMock.finalizeCycle).toHaveBeenCalledWith(cycleId);
      expect(result).toHaveProperty("status", "finalized");
    });
  });
});
