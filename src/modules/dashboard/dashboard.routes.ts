import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { authenticate } from '../../common/middleware/auth.middleware';

const router = Router();
const controller = new DashboardController();

// Auth required
router.use(authenticate);

router.get('/summary', controller.getSummary);

export default router;
