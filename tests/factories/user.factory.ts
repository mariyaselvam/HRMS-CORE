import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';
import { BaseFactory } from './base.factory';
import prisma from '../../src/common/utils/prisma';
import { User } from '@prisma/client';

export class UserFactory extends BaseFactory<User> {
    protected model = prisma.user;

    protected async definition() {
        const passwordHash = await bcrypt.hash('Password123!', 10);
        return {
            email: faker.internet.email().toLowerCase(),
            passwordHash,
            isActive: true,
            companyId: '', // Must be provided
            roleId: '', // Must be provided
            workLocationId: null,
        };
    }

    /**
     * Creates a user with a specific password (hashed via bcrypt).
     */
    async createUser(params: {
        companyId: string;
        email: string;
        password?: string;
        roleId: string;
        workLocationId?: string | null;
        isActive?: boolean;
    }): Promise<User> {
        const password = params.password ?? 'Password123!';
        const passwordHash = await bcrypt.hash(password, 10);

        return this.create({
            companyId: params.companyId,
            email: params.email.toLowerCase(),
            passwordHash,
            roleId: params.roleId,
            workLocationId: params.workLocationId ?? null,
            isActive: params.isActive ?? true,
        });
    }
}

export const userFactory = new UserFactory();
