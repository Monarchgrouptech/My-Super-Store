import { AdminUser, AdminRole, AdminPermission } from '../types/admin';

// Default permission sets for different roles
export const rolePermissions: Record<AdminRole, AdminPermission[]> = {
    [AdminRole.SUPER_ADMIN]: [
        // All permissions
        AdminPermission.MANAGE_USERS,
        AdminPermission.VIEW_USERS,
        AdminPermission.DELETE_USERS,
        AdminPermission.MANAGE_PRODUCTS,
        AdminPermission.VIEW_PRODUCTS,
        AdminPermission.DELETE_PRODUCTS,
        AdminPermission.APPROVE_PRODUCTS,
        AdminPermission.MANAGE_VENDORS,
        AdminPermission.VIEW_VENDORS,
        AdminPermission.APPROVE_VENDORS,
        AdminPermission.MANAGE_ORDERS,
        AdminPermission.VIEW_ORDERS,
        AdminPermission.MANAGE_SETTINGS,
        AdminPermission.VIEW_SETTINGS,
        AdminPermission.MANAGE_CATEGORIES,
        AdminPermission.VIEW_ANALYTICS,
        AdminPermission.MANAGE_ADMINS,
    ],
    [AdminRole.ADMIN]: [
        // Most permissions except admin management
        AdminPermission.MANAGE_USERS,
        AdminPermission.VIEW_USERS,
        AdminPermission.DELETE_USERS,
        AdminPermission.MANAGE_PRODUCTS,
        AdminPermission.VIEW_PRODUCTS,
        AdminPermission.DELETE_PRODUCTS,
        AdminPermission.APPROVE_PRODUCTS,
        AdminPermission.MANAGE_VENDORS,
        AdminPermission.VIEW_VENDORS,
        AdminPermission.APPROVE_VENDORS,
        AdminPermission.MANAGE_ORDERS,
        AdminPermission.VIEW_ORDERS,
        AdminPermission.VIEW_SETTINGS,
        AdminPermission.MANAGE_CATEGORIES,
        AdminPermission.VIEW_ANALYTICS,
    ],
    [AdminRole.MODERATOR]: [
        // Limited permissions
        AdminPermission.VIEW_USERS,
        AdminPermission.VIEW_PRODUCTS,
        AdminPermission.APPROVE_PRODUCTS,
        AdminPermission.VIEW_VENDORS,
        AdminPermission.APPROVE_VENDORS,
        AdminPermission.VIEW_ORDERS,
        AdminPermission.VIEW_SETTINGS,
        AdminPermission.VIEW_ANALYTICS,
    ],
};

/**
 * Check if a user has a specific permission
 */
export const hasPermission = (admin: AdminUser, permission: AdminPermission): boolean => {
    if (admin.role === AdminRole.SUPER_ADMIN) return true;
    return admin.permissions.includes(permission);
};

/**
 * Check if a user can perform an action (multiple permissions)
 */
export const canPerformAction = (admin: AdminUser, permissions: AdminPermission[]): boolean => {
    if (admin.role === AdminRole.SUPER_ADMIN) return true;
    return permissions.every(permission => admin.permissions.includes(permission));
};

/**
 * Get display name for a permission
 */
export const getPermissionLabel = (permission: AdminPermission): string => {
    const labels: Record<AdminPermission, string> = {
        [AdminPermission.MANAGE_USERS]: 'Manage Users',
        [AdminPermission.VIEW_USERS]: 'View Users',
        [AdminPermission.DELETE_USERS]: 'Delete Users',
        [AdminPermission.MANAGE_PRODUCTS]: 'Manage Products',
        [AdminPermission.VIEW_PRODUCTS]: 'View Products',
        [AdminPermission.DELETE_PRODUCTS]: 'Delete Products',
        [AdminPermission.APPROVE_PRODUCTS]: 'Approve Products',
        [AdminPermission.MANAGE_VENDORS]: 'Manage Vendors',
        [AdminPermission.VIEW_VENDORS]: 'View Vendors',
        [AdminPermission.APPROVE_VENDORS]: 'Approve Vendors',
        [AdminPermission.MANAGE_ORDERS]: 'Manage Orders',
        [AdminPermission.VIEW_ORDERS]: 'View Orders',
        [AdminPermission.MANAGE_SETTINGS]: 'Manage Settings',
        [AdminPermission.VIEW_SETTINGS]: 'View Settings',
        [AdminPermission.MANAGE_CATEGORIES]: 'Manage Categories',
        [AdminPermission.VIEW_ANALYTICS]: 'View Analytics',
        [AdminPermission.MANAGE_ADMINS]: 'Manage Admins',
    };
    return labels[permission] || permission;
};

/**
 * Get display name for a role
 */
export const getRoleLabel = (role: AdminRole): string => {
    const labels: Record<AdminRole, string> = {
        [AdminRole.SUPER_ADMIN]: 'Super Admin',
        [AdminRole.ADMIN]: 'Admin',
        [AdminRole.MODERATOR]: 'Moderator',
    };
    return labels[role] || role;
};

/**
 * Get role color for UI display
 */
export const getRoleColor = (role: AdminRole): string => {
    switch (role) {
        case AdminRole.SUPER_ADMIN:
            return 'bg-red-100 text-red-800';
        case AdminRole.ADMIN:
            return 'bg-blue-100 text-blue-800';
        case AdminRole.MODERATOR:
            return 'bg-yellow-100 text-yellow-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};
