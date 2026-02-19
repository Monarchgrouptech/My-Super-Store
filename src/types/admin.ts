// Admin Management TypeScript Types

export enum AdminRole {
    SUPER_ADMIN = 'super_admin',
    ADMIN = 'admin',
    MODERATOR = 'moderator',
}

export interface AdminUser {
    id: string;
    user_id: string;
    role: AdminRole;
    permissions: AdminPermission[];
    created_at: string;
    updated_at: string;
}

export enum AdminPermission {
    // User Management
    MANAGE_USERS = 'manage_users',
    VIEW_USERS = 'view_users',
    DELETE_USERS = 'delete_users',
    
    // Product Management
    MANAGE_PRODUCTS = 'manage_products',
    VIEW_PRODUCTS = 'view_products',
    DELETE_PRODUCTS = 'delete_products',
    APPROVE_PRODUCTS = 'approve_products',
    
    // Vendor Management
    MANAGE_VENDORS = 'manage_vendors',
    VIEW_VENDORS = 'view_vendors',
    APPROVE_VENDORS = 'approve_vendors',
    
    // Order Management
    MANAGE_ORDERS = 'manage_orders',
    VIEW_ORDERS = 'view_orders',
    
    // System Settings
    MANAGE_SETTINGS = 'manage_settings',
    VIEW_SETTINGS = 'view_settings',
    
    // Categories
    MANAGE_CATEGORIES = 'manage_categories',
    
    // Analytics
    VIEW_ANALYTICS = 'view_analytics',
    
    // Admin Management
    MANAGE_ADMINS = 'manage_admins',
}

export interface AdminStats {
    totalUsers: number;
    totalVendors: number;
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    pendingVendorApprovals: number;
    pendingProductApprovals: number;
}

export interface DashboardMetric {
    label: string;
    value: number | string;
    change?: number;
    icon?: string;
}

export interface AdminActivityLog {
    id: string;
    admin_id: string;
    action: string;
    resource_type: string;
    resource_id: string;
    details: Record<string, any>;
    ip_address: string | null;
    created_at: string;
}
