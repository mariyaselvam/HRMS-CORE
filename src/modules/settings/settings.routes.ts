import { Router } from 'express';
import { SettingsController } from './settings.controller';
import { authenticate, requireRole } from '../../common/middleware/auth.middleware';

const router = Router();
const controller = new SettingsController();

// Only Admin can manage company-wide settings
router.use(authenticate);
router.use(requireRole(['Admin']));

router.get('/', controller.getAllSettings);
router.get('/:category', controller.getSettingsByCategory);
router.put('/:category', controller.updateSettingsByCategory);

export default router;
