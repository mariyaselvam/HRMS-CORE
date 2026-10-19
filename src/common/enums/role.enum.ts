/**
 * Predefined system roles for the HRMS application.
 *
 * These roles are seeded automatically when a company is created.
 * All backend authorization checks should reference this enum
 * instead of using hardcoded string literals.
 *
 * Future: When dynamic custom roles are needed, they will be
 * stored in the Role table but won't appear in this enum.
 * At that point, authorization will shift to permission-based checks.
 */
export enum SystemRole {
    SUPER_ADMIN = 'Super Admin',
    COMPANY_ADMIN = 'Company Admin',
    CLUSTER_MANAGER = 'Cluster Manager',
    HR_MANAGER = 'HR Manager',
    PAYROLL_MANAGER = 'Payroll Manager',
    ONBOARDING_MANAGER = 'Onboarding Manager',
    BRANCH_MANAGER = 'Branch Manager',
    EMPLOYEE = 'Employee'
}

/**
 * Roles that have administrative privileges across the company or region.
 */
export const ADMIN_ROLES: SystemRole[] = [
    SystemRole.SUPER_ADMIN,
    SystemRole.COMPANY_ADMIN,
    SystemRole.CLUSTER_MANAGER
];

/**
 * Roles that can manage employees (HR operations).
 */
export const HR_ROLES: SystemRole[] = [
    SystemRole.SUPER_ADMIN,
    SystemRole.COMPANY_ADMIN,
    SystemRole.CLUSTER_MANAGER,
    SystemRole.HR_MANAGER
];

/**
 * Roles that can process payroll.
 */
export const PAYROLL_ROLES: SystemRole[] = [
    SystemRole.SUPER_ADMIN,
    SystemRole.COMPANY_ADMIN,
    SystemRole.CLUSTER_MANAGER,
    SystemRole.PAYROLL_MANAGER
];

/**
 * Roles that can approve leave and attendance.
 */
export const APPROVAL_ROLES: SystemRole[] = [
    SystemRole.SUPER_ADMIN,
    SystemRole.COMPANY_ADMIN,
    SystemRole.CLUSTER_MANAGER,
    SystemRole.HR_MANAGER,
    SystemRole.BRANCH_MANAGER
];
