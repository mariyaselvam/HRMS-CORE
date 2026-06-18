import { SettingsService } from './settings.service';
import prisma from '../../common/utils/prisma';

jest.mock('../../common/utils/prisma', () => ({
  __esModule: true,
  default: {
    systemSetting: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(prisma)),
  },
}));

describe('SettingsService', () => {
  let settingsService: SettingsService;
  const mockCompanyId = 'company-123';

  beforeEach(() => {
    settingsService = new SettingsService();
    jest.clearAllMocks();
  });

  describe('getAllSettings', () => {
    it('should return settings grouped by category', async () => {
      const mockSettings = [
        { category: 'general', key: 'theme', value: 'dark' },
        { category: 'general', key: 'language', value: 'en' },
        { category: 'general', key: 'hrEmail', value: 'hr@example.com' },
      ];

      (prisma.systemSetting.findMany as jest.Mock).mockResolvedValue(mockSettings);

      const result = await settingsService.getAllSettings(mockCompanyId);

      expect(prisma.systemSetting.findMany).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId },
      });
      expect(result).toEqual({
        general: { theme: 'dark', language: 'en', hrEmail: 'hr@example.com' },
      });
    });

    it('should return an empty object if no settings are found', async () => {
      (prisma.systemSetting.findMany as jest.Mock).mockResolvedValue([]);

      const result = await settingsService.getAllSettings(mockCompanyId);

      expect(result).toEqual({});
    });
  });

  describe('getSettingsByCategory', () => {
    it('should return formatted settings for a specific category', async () => {
      const mockSettings = [
        { category: 'general', key: 'theme', value: 'dark' },
        { category: 'general', key: 'language', value: 'en' },
      ];

      (prisma.systemSetting.findMany as jest.Mock).mockResolvedValue(mockSettings);

      const result = await settingsService.getSettingsByCategory(mockCompanyId, 'general');

      expect(prisma.systemSetting.findMany).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId, category: 'general' },
      });
      expect(result).toEqual({ theme: 'dark', language: 'en' });
    });
  });

  describe('updateSettingsByCategory', () => {
    it('should upsert settings and return the updated category settings', async () => {
      const payload = { theme: 'light', hrEmail: 'hr@example.com' };

      // Mock the upsert calls
      (prisma.systemSetting.upsert as jest.Mock).mockImplementation((args) => args);
      
      // Mock the transaction call
      (prisma.$transaction as jest.Mock).mockResolvedValue(true);

      // Mock the findMany call for the return statement (getSettingsByCategory)
      const mockUpdatedSettings = [
        { category: 'general', key: 'theme', value: 'light' },
        { category: 'general', key: 'hrEmail', value: 'hr@example.com' },
      ];
      (prisma.systemSetting.findMany as jest.Mock).mockResolvedValue(mockUpdatedSettings);

      const result = await settingsService.updateSettingsByCategory(mockCompanyId, 'general', payload);

      expect(prisma.systemSetting.upsert).toHaveBeenCalledTimes(2);
      
      // Check first upsert call
      expect(prisma.systemSetting.upsert).toHaveBeenNthCalledWith(1, {
        where: { companyId_key: { companyId: mockCompanyId, key: 'theme' } },
        update: { value: 'light', category: 'general' },
        create: { companyId: mockCompanyId, category: 'general', key: 'theme', value: 'light' },
      });

      // Check second upsert call
      expect(prisma.systemSetting.upsert).toHaveBeenNthCalledWith(2, {
        where: { companyId_key: { companyId: mockCompanyId, key: 'hrEmail' } },
        update: { value: 'hr@example.com', category: 'general' },
        create: { companyId: mockCompanyId, category: 'general', key: 'hrEmail', value: 'hr@example.com' },
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ theme: 'light', hrEmail: 'hr@example.com' });
    });
  });
});
