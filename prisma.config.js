require('dotenv').config();

module.exports = {
    schema: 'prisma/schema.prisma',
    datasource: {
        url: process.env.DIRECT_URL,
    },
    migrations: {
        seed: 'ts-node --transpile-only prisma/seed.ts',
    },
};
