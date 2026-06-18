/**
 * Predefined system permissions for the HRMS application.
 *
 * These permission codes are seeded into the Permission table
 * and mapped to system roles via the RolePermission table.
 *
 * Grouped by module for readability.
 */
export enum SystemPermission {
    // --- Employee Management ---
    EMPLOYEE_VIEW = 'employee.view',
    EMPLOYEE_CREATE = 'employee.create',
    EMPLOYEE_EDIT = 'employee.edit',
    EMPLOYEE_DELETE = 'employee.delete',
    EMPLOYEE_ONBOARD = 'employee.onboard',

    // --- Attendance ---
    ATTENDANCE_VIEW = 'attendance.view',
    ATTENDANCE_MARK = 'attendance.mark',
    ATTENDANCE_EDIT = 'attendance.edit',

    // --- Leave ---
    LEAVE_VIEW = 'leave.view',
    LEAVE_APPLY = 'leave.apply',
    LEAVE_APPROVE = 'leave.approve',
    LEAVE_CONFIG = 'leave.config',

    // --- Payroll ---
    PAYROLL_VIEW = 'payroll.view',
    PAYROLL_PROCESS = 'payroll.process',
    PAYROLL_ADJUST = 'payroll.adjust',
    PAYROLL_FINALIZE = 'payroll.finalize',
    PAYROLL_CONFIG = 'payroll.config',
    PAYSLIP_VIEW = 'payslip.view',
    PAYSLIP_DOWNLOAD = 'payslip.download',

    // --- Organization ---
    DEPARTMENT_VIEW = 'department.view',
    DEPARTMENT_MANAGE = 'department.manage',
    TEAM_VIEW = 'team.view',
    TEAM_MANAGE = 'team.manage',
    LOCATION_VIEW = 'location.view',
    LOCATION_MANAGE = 'location.manage',

    // --- Settings ---
    SETTINGS_VIEW = 'settings.view',
    SETTINGS_MANAGE = 'settings.manage',

    // --- Dashboard ---
    DASHBOARD_VIEW = 'dashboard.view',
    DASHBOARD_ADMIN = 'dashboard.admin',

    // --- Company ---
    COMPANY_MANAGE = 'company.manage',

    // --- User Management ---
    USER_MANAGE = 'user.manage',
    ROLE_ASSIGN = 'role.assign',

    // --- Profile (Self) ---
    PROFILE_VIEW = 'profile.view',
    PROFILE_EDIT = 'profile.edit',

    // --- Holiday ---
    HOLIDAY_VIEW = 'holiday.view',
    HOLIDAY_MANAGE = 'holiday.manage',
}

/**
 * Default permission mappings for each system role.
 * Used during company creation seeding.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, SystemPermission[]> = {
    'Super Admin': Object.values(SystemPermission), // Full access

    'Company Admin': Object.values(SystemPermission), // Full access within company

    'HR Manager': [
        SystemPermission.EMPLOYEE_VIEW,
        SystemPermission.EMPLOYEE_CREATE,
        SystemPermission.EMPLOYEE_EDIT,
        SystemPermission.EMPLOYEE_DELETE,
        SystemPermission.EMPLOYEE_ONBOARD,
        SystemPermission.ATTENDANCE_VIEW,
        SystemPermission.ATTENDANCE_EDIT,
        SystemPermission.LEAVE_VIEW,
        SystemPermission.LEAVE_APPROVE,
        SystemPermission.LEAVE_CONFIG,
        SystemPermission.PAYROLL_VIEW,
        SystemPermission.PAYSLIP_VIEW,
        SystemPermission.DEPARTMENT_VIEW,
        SystemPermission.DEPARTMENT_MANAGE,
        SystemPermission.TEAM_VIEW,
        SystemPermission.TEAM_MANAGE,
        SystemPermission.LOCATION_VIEW,
        SystemPermission.HOLIDAY_VIEW,
        SystemPermission.HOLIDAY_MANAGE,
        SystemPermission.DASHBOARD_VIEW,
        SystemPermission.DASHBOARD_ADMIN,
        SystemPermission.PROFILE_VIEW,
        SystemPermission.PROFILE_EDIT,
    ],

    'Payroll Manager': [
        SystemPermission.EMPLOYEE_VIEW,
        SystemPermission.PAYROLL_VIEW,
        SystemPermission.PAYROLL_PROCESS,
        SystemPermission.PAYROLL_ADJUST,
        SystemPermission.PAYROLL_FINALIZE,
        SystemPermission.PAYROLL_CONFIG,
        SystemPermission.PAYSLIP_VIEW,
        SystemPermission.PAYSLIP_DOWNLOAD,
        SystemPermission.ATTENDANCE_VIEW,
        SystemPermission.DASHBOARD_VIEW,
        SystemPermission.PROFILE_VIEW,
        SystemPermission.PROFILE_EDIT,
    ],

    'Onboarding Manager': [
        SystemPermission.EMPLOYEE_VIEW,
        SystemPermission.EMPLOYEE_CREATE,
        SystemPermission.EMPLOYEE_EDIT,
        SystemPermission.EMPLOYEE_ONBOARD,
        SystemPermission.DEPARTMENT_VIEW,
        SystemPermission.TEAM_VIEW,
        SystemPermission.LOCATION_VIEW,
        SystemPermission.DASHBOARD_VIEW,
        SystemPermission.PROFILE_VIEW,
        SystemPermission.PROFILE_EDIT,
    ],

    'Branch Manager': [
        SystemPermission.EMPLOYEE_VIEW,
        SystemPermission.ATTENDANCE_VIEW,
        SystemPermission.ATTENDANCE_EDIT,
        SystemPermission.LEAVE_VIEW,
        SystemPermission.LEAVE_APPROVE,
        SystemPermission.PAYROLL_VIEW,
        SystemPermission.PAYSLIP_VIEW,
        SystemPermission.DEPARTMENT_VIEW,
        SystemPermission.TEAM_VIEW,
        SystemPermission.LOCATION_VIEW,
        SystemPermission.HOLIDAY_VIEW,
        SystemPermission.DASHBOARD_VIEW,
        SystemPermission.DASHBOARD_ADMIN,
        SystemPermission.PROFILE_VIEW,
        SystemPermission.PROFILE_EDIT,
    ],

    'Employee': [
        SystemPermission.PROFILE_VIEW,
        SystemPermission.PROFILE_EDIT,
        SystemPermission.LEAVE_VIEW,
        SystemPermission.LEAVE_APPLY,
        SystemPermission.ATTENDANCE_VIEW,
        SystemPermission.ATTENDANCE_MARK,
        SystemPermission.PAYSLIP_VIEW,
        SystemPermission.PAYSLIP_DOWNLOAD,
        SystemPermission.HOLIDAY_VIEW,
        SystemPermission.DASHBOARD_VIEW,
    ],
};
