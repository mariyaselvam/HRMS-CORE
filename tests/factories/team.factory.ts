import { faker } from '@faker-js/faker';
import { BaseFactory } from './base.factory';
import prisma from '../../src/common/utils/prisma';
import { Team } from '@prisma/client';

export class TeamFactory extends BaseFactory<Team> {
    protected model = prisma.team;

    protected async definition() {
        return {
            name: `${faker.word.noun()} Team`,
            companyId: '', // Must be provided
            departmentId: '', // Must be provided
            workLocationId: null,
        };
    }

    /**
     * Creates standard teams across departments and locations.
     */
    async createStandardTeams(params: {
        companyId: string;
        departments: {
            engineeringId: string;
            productId: string;
            operationsId: string;
        };
        locations: {
            hqId: string;
            sfId: string;
            londonId: string;
        };
    }): Promise<{
        teamFE: Team;
        teamBE: Team;
        teamQA: Team;
        teamOps: Team;
    }> {
        const teamFE = await this.create({
            companyId: params.companyId,
            departmentId: params.departments.engineeringId,
            workLocationId: params.locations.hqId,
            name: 'Frontend Team',
        });

        const teamBE = await this.create({
            companyId: params.companyId,
            departmentId: params.departments.engineeringId,
            workLocationId: params.locations.hqId,
            name: 'Backend Team',
        });

        const teamQA = await this.create({
            companyId: params.companyId,
            departmentId: params.departments.productId,
            workLocationId: params.locations.sfId,
            name: 'QA Team',
        });

        const teamOps = await this.create({
            companyId: params.companyId,
            departmentId: params.departments.operationsId,
            workLocationId: params.locations.londonId,
            name: 'Ops Team',
        });

        return { teamFE, teamBE, teamQA, teamOps };
    }
}

export const teamFactory = new TeamFactory();
