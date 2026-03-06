import prisma from '../../src/common/utils/prisma';

export abstract class BaseFactory<T> {
    protected abstract model: any;

    async create(overrides: Partial<any> = {}): Promise<T> {
        const data = await this.definition();
        return await this.model.create({
            data: { ...data, ...overrides }
        });
    }

    async createMany(count: number, overrides: Partial<any> = {}): Promise<T[]> {
        const results: T[] = [];
        for (let i = 0; i < count; i++) {
            results.push(await this.create(overrides));
        }
        return results;
    }

    protected abstract definition(): Promise<any> | any;
}
