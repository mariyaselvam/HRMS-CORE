import 'dotenv/config';
import app from './app';
import { PORT } from './config/env';

import { initPayrollScheduler } from './common/scheduler/payroll.scheduler';

const start = () => {
    initPayrollScheduler();
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
};

start();
