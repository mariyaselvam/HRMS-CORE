import prisma from '../../common/utils/prisma';

export class SettingsService {
    async getAllSettings(companyId: string) {
        const settings = await prisma.systemSetting.findMany({
            where: { companyId }
        });

        // Group by category for easier frontend consumption
        const grouped = settings.reduce((acc: any, setting: any) => {
            if (!acc[setting.category]) acc[setting.category] = {};
            acc[setting.category][setting.key] = setting.value;
            return acc;
        }, {});

        return grouped;
    }

    async getSettingsByCategory(companyId: string, category: string) {
        const settings = await prisma.systemSetting.findMany({
            where: { companyId, category }
        });     

        const formatted = settings.reduce((acc: any, setting: any) => {
            acc[setting.key] = setting.value;
            return acc;
        }, {});

        return formatted;
    }

    async updateSettingsByCategory(companyId: string, category: string, payload: Record<string, any>) {
        const payloadKeys = Object.keys(payload);
        const updates = [];

        // 1. Delete keys that are NOT in the payload for this category
        updates.push(
            prisma.systemSetting.deleteMany({
                where: {
                    companyId,
                    category,
                    key: { notIn: payloadKeys }
                }
            })
        );

        // 2. Upsert each key in the payload
        for (const [key, value] of Object.entries(payload)) {
            updates.push(
                prisma.systemSetting.upsert({
                    where: {
                        companyId_key: { companyId, key }
                    },
                    update: {
                        value: value,
                        category: category
                    },
                    create: {
                        companyId,
                        category,
                        key,
                        value: value
                    }
                })
            );
        }

        await prisma.$transaction(updates);

        return this.getSettingsByCategory(companyId, category);
    }
}
