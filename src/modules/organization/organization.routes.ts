import { Router } from 'express';
import { OrganizationController } from './organization.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { validateCreateDepartment, validateUpdateDepartment, validateCreateTeam, validateCreateLocation, validateCreateRole, validateUpdateRole, validateAssignPermissions } from './organization.validator';
import { requireRole } from '../../common/middleware/auth.middleware';
import { SystemRole } from '../../common/enums/role.enum';

const router = Router();
const controller = new OrganizationController();

// All organization routes require authentication
router.use(authenticate);

// Platform / Super Admin Companies Management
router.get('/companies', controller.getCompanies);
router.get('/companies/:id', controller.getCompanyById);
router.patch('/companies/:id', controller.updateCompanyStatus);
router.patch('/companies/:id/status', controller.updateCompanyStatus);

// Departments
router.post('/departments', validateCreateDepartment, controller.createDepartment);
router.get('/departments', controller.getDepartments);
router.patch('/departments/:id', validateUpdateDepartment, controller.updateDepartment);
router.delete('/departments/:id', controller.deleteDepartment);

// Teams
router.post('/teams', validateCreateTeam, controller.createTeam);
router.get('/teams', controller.getTeams);
router.patch('/teams/:id', controller.updateTeam);
router.delete('/teams/:id', controller.deleteTeam);

// Locations
router.post('/locations', validateCreateLocation, controller.createLocation);
router.get('/locations', controller.getLocations);

// Admin-only routes for role/permission management
router.post('/roles', requireRole([SystemRole.SUPER_ADMIN, SystemRole.COMPANY_ADMIN]), validateCreateRole, controller.createRole);
router.get('/roles', requireRole([SystemRole.SUPER_ADMIN, SystemRole.COMPANY_ADMIN]), controller.getRoles);
router.patch('/roles/:id', requireRole([SystemRole.SUPER_ADMIN, SystemRole.COMPANY_ADMIN]), validateUpdateRole, controller.updateRole);
router.delete('/roles/:id', requireRole([SystemRole.SUPER_ADMIN, SystemRole.COMPANY_ADMIN]), controller.deleteRole);

router.post('/roles/:roleId/permissions', requireRole([SystemRole.SUPER_ADMIN, SystemRole.COMPANY_ADMIN]), validateAssignPermissions, controller.assignPermissionsToRole);
router.get('/roles/:roleId/permissions', requireRole([SystemRole.SUPER_ADMIN, SystemRole.COMPANY_ADMIN]), controller.getRolePermissions);
router.delete('/roles/:roleId/permissions/:permissionId', requireRole([SystemRole.SUPER_ADMIN, SystemRole.COMPANY_ADMIN]), controller.removePermissionFromRole);

export default router;
