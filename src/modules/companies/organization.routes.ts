import { Router } from 'express';
import { OrganizationController } from './organization.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { validateCreateDepartment, validateUpdateDepartment, validateCreateTeam, validateCreateLocation } from './organization.validator';

const router = Router();
const controller = new OrganizationController();

// All organization routes require authentication
router.use(authenticate);

// Departments
router.post('/departments', validateCreateDepartment, controller.createDepartment);
router.get('/departments', controller.getDepartments);
router.patch('/departments/:id', validateUpdateDepartment, controller.updateDepartment);
router.delete('/departments/:id', controller.deleteDepartment);

// Teams
router.post('/teams', validateCreateTeam, controller.createTeam);

// Locations
router.post('/locations', validateCreateLocation, controller.createLocation);
router.get('/locations', controller.getLocations);

export default router;
