import { faker } from '@faker-js/faker';
import { BaseFactory } from './base.factory';
import prisma from '../../src/common/utils/prisma';
import { WorkLocation } from '@prisma/client';

export class WorkLocationFactory extends BaseFactory<WorkLocation> {
    protected model = prisma.workLocation;

    protected async definition() {
        return {
            name: `${faker.location.city()} Office`,
            address: faker.location.streetAddress({ useFullAddress: true }),
            geoRequired: false,
            companyId: '', // Must be provided
        };
    }

    /**
     * Creates standard multi-location branches for a company.
     */
    async createStandardLocations(companyId: string, clusterId: string | null = null): Promise<WorkLocation[]> {
        const locationData = [
            {
                name: 'Headquarters (New York)',
                address: '123 Tech Blvd, New York, NY 10001',
            },
            {
                name: 'Engineering Hub (San Francisco)',
                address: '456 Innovation Ave, San Francisco, CA 94107',
            },
            {
                name: 'Operations Office (London)',
                address: '789 Business Park, London EC1A 1BB',
            },
        ];

        const created: WorkLocation[] = [];
        for (const loc of locationData) {
            const item = await this.create({
                ...loc,
                companyId,
                clusterId,
            });
            created.push(item);
        }
        return created;
    }
}

export const workLocationFactory = new WorkLocationFactory();
