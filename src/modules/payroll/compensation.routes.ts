import { Router } from 'express';
import { CompensationController } from './compensation.controller';
import { authenticate } from '../../common/middleware/auth.middleware';

const router = Router();
const controller = new CompensationController();

router.use(authenticate);

router.post('/', controller.createCycle);
router.get('/', controller.getCycles);
router.get('/:id/revisions', controller.getCycleRevisions);
router.post('/:id/bulk-update', controller.bulkUpdate);
router.post('/:id/apply', controller.applyCycle);

export default router;
