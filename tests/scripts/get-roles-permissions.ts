import 'dotenv/config';
import prisma from '../../src/common/utils/prisma';

async function main() {
    console.log('Querying Database Roles and Permissions...');

    const roles = await prisma.role.findMany({
        include: {
            permissions: {
                include: {
                    permission: true
                }
            }
        }
    });

    console.log(`\nFound ${roles.length} role(s):\n`);

    roles.forEach(role => {
        console.log(`========================================`);
        console.log(`Role: ${role.name}`);
        console.log(`Description: ${role.description || 'N/A'}`);
        console.log(`========================================`);
        
        if (role.permissions.length === 0) {
            console.log('No specific permissions assigned.');
        } else {
            console.log('Permissions:');
            role.permissions.forEach(rp => {
                console.log(`  - [${rp.permission.code}] ${rp.permission.description || ''}`);
            });
        }
        console.log('\n');
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
