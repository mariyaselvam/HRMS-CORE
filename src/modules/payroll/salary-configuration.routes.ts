import { Router } from 'express';
import { SalaryConfigurationController } from './salary-configuration.controller';
import { authenticate } from '../../common/middleware/auth.middleware';

const router = Router();
const controller = new SalaryConfigurationController();

router.use(authenticate);

// Components CRUD
router.post('/components', controller.createComponent);
router.get('/components', controller.getComponents);
router.put('/components/:id', controller.updateComponent);
router.delete('/components/:id', controller.deleteComponent);

// Templates CRUD & Preview Calculation Engine
router.post('/templates', controller.createTemplate);
router.get('/templates', controller.getTemplates);
router.get('/templates/:id', controller.getTemplateById);
router.post('/calculate-preview', controller.calculatePreview);

export default router;
