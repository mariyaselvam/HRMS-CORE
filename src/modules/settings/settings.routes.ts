import { Router } from 'express';
import { SettingsController } from './settings.controller';
import { authenticate, requireRole } from '../../common/middleware/auth.middleware';
import { SystemRole } from '../../common/enums/role.enum';

const router = Router();
const controller = new SettingsController();

// Only Admin roles can manage company-wide settings
router.use(authenticate);
router.use(requireRole([SystemRole.SUPER_ADMIN, SystemRole.COMPANY_ADMIN]));

router.get('/', controller.getAllSettings);
router.get('/:category', controller.getSettingsByCategory);
router.put('/:category', controller.updateSettingsByCategory);

export default router;
