import * as dotenv from 'dotenv';
dotenv.config();
import prisma from '../../src/common/utils/prisma';

async function checkToday() {
    process.env.NODE_ENV = 'development';

    const totalLogs = await prisma.attendanceLog.count();
    console.log(`Total Logs in DB: ${totalLogs}`);

    const jan2024Logs = await prisma.attendanceLog.count({
        where: {
            attendanceDate: {
                gte: new Date(2024, 0, 1),
                lte: new Date(2024, 0, 31)
            }
        }
    });
    console.log(`Logs in Jan 2024: ${jan2024Logs}`);

    const currentLogs = await prisma.attendanceLog.count({
        where: {
            attendanceDate: {
                gte: new Date(2026, 2, 1)
            }
        }
    });
    console.log(`Logs in March 2026: ${currentLogs}`);

    if (currentLogs > 0) {
        const sample = await prisma.attendanceLog.findFirst({
            where: { attendanceDate: { gte: new Date(2026, 2, 1) } },
            include: { employee: { include: { user: true } } }
        });
        console.log(`Sample current log employee: ${sample?.employee.user.email}`);
    } else {
        console.log("No logs for March 2026.");
    }

    process.exit(0);
}

checkToday().catch(err => {
    console.error(err);
    process.exit(1);
});
