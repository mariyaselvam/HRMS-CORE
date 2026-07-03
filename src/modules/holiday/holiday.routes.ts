import { Router } from 'express';
import { HolidayController } from './holiday.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { validateCreateHoliday } from './holiday.validator';

const router = Router();
const controller = new HolidayController();

// Auth required
router.use(authenticate);

// Holiday Management
router.post('/', validateCreateHoliday, controller.create);
router.get('/', controller.list);
router.delete('/:id', controller.delete);

export default router;
