import { z } from 'zod';
import { validateRequest } from '../../common/middleware/validation.middleware';

/**
 * Create Department Validation Schema
 */
export const createDepartmentSchema = z.object({
    name: z.string().min(1, "Department name is required"),
    managerId: z.string().uuid("Invalid manager ID format").optional(),
    workLocationId: z.string().uuid("Invalid work location ID format").optional().nullable(),
});

/**
 * Update Department Validation Schema
 */
export const updateDepartmentSchema = z.object({
    name: z.string().min(1, "Department name is required").optional(),
    managerId: z.string().uuid("Invalid manager ID format").optional().nullable(),
    workLocationId: z.string().uuid("Invalid work location ID format").optional().nullable(),
});

/**
 * Create Team Validation Schema
 */
export const createTeamSchema = z.object({
    name: z.string().min(1, "Team name is required"),
    departmentId: z.string().uuid("Invalid department ID format"),
    workLocationId: z.string().uuid("Invalid work location ID format").optional().nullable(),
});

/**
 * Create Work Location Validation Schema
 */
export const createWorkLocationSchema = z.object({
    name: z.string().min(1, "Location name is required"),
    address: z.string().optional(),
    latitude: z.coerce.number().optional().nullable(),
    longitude: z.coerce.number().optional().nullable(),
    clusterId: z.string().uuid("Invalid cluster ID format").optional().nullable(),
});

/**
 * Cluster Validation Schemas
 */
export const createClusterSchema = z.object({
    name: z.string().min(1, "Cluster name is required"),
    code: z.string().min(1, "Cluster code is required"),
    state: z.string().optional().nullable(),
});

export const updateClusterSchema = z.object({
    name: z.string().min(1, "Cluster name is required").optional(),
    code: z.string().min(1, "Cluster code is required").optional(),
    state: z.string().optional().nullable(),
});

export const validateCreateDepartment = validateRequest(createDepartmentSchema);
export const validateUpdateDepartment = validateRequest(updateDepartmentSchema);
export const validateCreateTeam = validateRequest(createTeamSchema);
export const validateCreateLocation = validateRequest(createWorkLocationSchema);
export const validateCreateCluster = validateRequest(createClusterSchema);
export const validateUpdateCluster = validateRequest(updateClusterSchema);

export const createRoleSchema = z.object({
    name: z.string().min(1, "Role name is required"),
    description: z.string().optional(),
});

export const updateRoleSchema = z.object({
    name: z.string().min(1, "Role name is required").optional(),
    description: z.string().optional(),
});

export const assignPermissionsSchema = z.object({
    permissionIds: z.array(z.string().uuid()).min(1, "At least one permission is required"),
});

export const validateCreateRole = validateRequest(createRoleSchema);
export const validateUpdateRole = validateRequest(updateRoleSchema);
export const validateAssignPermissions = validateRequest(assignPermissionsSchema);

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type CreateWorkLocationInput = z.infer<typeof createWorkLocationSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type CreateClusterInput = z.infer<typeof createClusterSchema>;
export type UpdateClusterInput = z.infer<typeof updateClusterSchema>;
