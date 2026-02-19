# Admin System Documentation

## Overview

The admin system is a comprehensive management interface that provides full control over your My Super Store e-commerce platform. Admin users can manage products, vendors, users, orders, categories, and system settings.

## Features

### 1. **Dashboard**
- Overview of key metrics (total users, vendors, products, orders, revenue)
- Pending vendor approvals counter
- Quick action buttons for common tasks
- Real-time statistics

### 2. **User Management**
- View all registered users
- Search users by email
- Delete user accounts
- Track user join dates and last activity

### 3. **Product Management**
- View all products in the store
- Publish/unpublish products
- Delete products
- Search products by name or SKU
- Monitor stock levels
- View product status (published/draft)

### 4. **Vendor Management**
- View all vendors
- Approve pending vendors
- Delete vendor accounts
- Search vendors by business name or email
- Track vendor verification status
- Monitor vendor registration dates

### 5. **Order Management**
- View all customer orders
- Update order status (pending, processing, shipped, delivered, cancelled)
- Search orders by ID
- Track order amounts and currencies
- Monitor order fulfillment

### 6. **Category Management**
- Create new product categories
- Edit existing categories
- Delete categories
- Organize product categories

### 7. **Settings**
- Configure store information (name, email, phone, address)
- Manage financial settings (commission rate, tax rate)
- Enable/disable maintenance mode
- Centralized system configuration

## User Roles & Permissions

### Super Admin
- **Role:** `super_admin`
- **Access:** Full access to all features and settings
- **Use Case:** Primary administrator with complete control

### Admin
- **Role:** `admin`
- **Access:** All features except admin management
- **Use Case:** Full administrative duties without super admin privileges

### Moderator
- **Role:** `moderator`
- **Access:** Limited to viewing and approving products/vendors
- **Use Case:** Product and vendor verification only

## Permissions List

| Permission | Description |
|-----------|-------------|
| `MANAGE_USERS` | Create, update, and manage user accounts |
| `VIEW_USERS` | View user information |
| `DELETE_USERS` | Delete user accounts |
| `MANAGE_PRODUCTS` | Create, edit, and manage products |
| `VIEW_PRODUCTS` | View product listings |
| `DELETE_PRODUCTS` | Delete products |
| `APPROVE_PRODUCTS` | Approve pending products |
| `MANAGE_VENDORS` | Manage vendor accounts |
| `VIEW_VENDORS` | View vendor information |
| `APPROVE_VENDORS` | Approve pending vendors |
| `MANAGE_ORDERS` | Edit and manage orders |
| `VIEW_ORDERS` | View order details |
| `MANAGE_SETTINGS` | Modify system settings |
| `VIEW_SETTINGS` | View system settings |
| `MANAGE_CATEGORIES` | Create, edit, and delete categories |
| `VIEW_ANALYTICS` | View analytics and dashboards |
| `MANAGE_ADMINS` | Manage other admin accounts |

## Access Control

### Accessing the Admin Panel

1. **Login** to your admin account
2. **Navigate** to `/admin/dashboard` or click the admin link in your account menu
3. The system will verify your admin status and permissions
4. If access is denied, you'll be redirected to the home page

### Protected Routes

All admin routes are protected by the `AdminProvider` context. The `ProtectedAdminRoute` component can be used to wrap routes that require specific permissions:

```tsx
<Route 
  path="/admin/settings" 
  element={
    <ProtectedAdminRoute requiredPermission={AdminPermission.MANAGE_SETTINGS}>
      <AdminSettings />
    </ProtectedAdminRoute>
  } 
/>
```

## Database Tables Required

To use the admin system, ensure the following Supabase tables exist:

### `admin_users`
```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'admin',
  permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### Related Tables (Used by Admin)
- `auth.users` - User authentication
- `vendors` - Vendor information
- `products` - Product inventory
- `orders` - Customer orders
- `categories` - Product categories
- `user_profiles` - User profile data

## Usage Examples

### Checking Admin Status
```tsx
import { useAdmin } from './context/AdminContext';

function MyComponent() {
  const { isAdmin, adminRole, hasPermission } = useAdmin();

  if (!isAdmin) return <div>Not an admin</div>;

  return (
    <div>
      Your role: {adminRole}
      Can manage users: {hasPermission(AdminPermission.MANAGE_USERS)}
    </div>
  );
}
```

### Using Admin Utilities
```tsx
import { 
  hasPermission, 
  getRoleLabel, 
  getPermissionLabel 
} from './lib/adminUtils';

const admin = { role: 'admin', permissions: [...] };
const canDelete = hasPermission(admin, AdminPermission.DELETE_USERS);
const roleLabel = getRoleLabel(admin.role);
```

## Setting Up Initial Admin Account

1. Create a user account via the normal registration process
2. In Supabase, manually insert a record in the `admin_users` table:

```sql
INSERT INTO admin_users (user_id, role, permissions)
VALUES (
  'user-uuid-here',
  'super_admin',
  ARRAY['manage_users', 'manage_products', 'manage_vendors', 'manage_orders', 'manage_settings', 'manage_categories', 'view_analytics', 'manage_admins']::TEXT[]
);
```

## Security Considerations

1. **Permission Verification:** Always verify permissions server-side when performing actions
2. **Rate Limiting:** Implement rate limiting on admin endpoints
3. **Audit Logging:** Log all admin actions for security and compliance
4. **Session Management:** Use secure session handling for admin accounts
5. **Data Validation:** Validate all inputs on both client and server
6. **HTTPS Only:** Always use HTTPS for admin panel access

## File Structure

```
src/
├── context/
│   └── AdminContext.tsx          # Admin state management
├── types/
│   └── admin.ts                  # Type definitions
├── lib/
│   └── adminUtils.ts             # Utility functions
├── components/
│   └── admin/
│       ├── AdminLayout.tsx        # Main admin layout
│       └── ProtectedAdminRoute.tsx # Route protection
└── pages/
    └── admin/
        ├── AdminDashboard.tsx     # Main dashboard
        ├── AdminUsers.tsx         # User management
        ├── AdminProducts.tsx      # Product management
        ├── AdminVendors.tsx       # Vendor management
        ├── AdminOrders.tsx        # Order management
        ├── AdminCategories.tsx    # Category management
        └── AdminSettings.tsx      # System settings
```

## Troubleshooting

### Admin Panel Not Loading
- Verify your user has an `admin_users` record in Supabase
- Check browser console for errors
- Ensure `AdminProvider` is wrapped around your routes

### Permissions Not Working
- Verify `admin_users` table has the correct permissions array
- Check that permission names match the enum values
- Clear browser cache and refresh

### Database Connection Issues
- Verify Supabase credentials are correct
- Check network connectivity
- Ensure Supabase project is active

## Future Enhancements

- Admin activity logging
- Bulk operations
- Advanced filtering and sorting
- Export data functionality
- Email notifications for critical events
- Role-based dashboard customization
- API key management
- Two-factor authentication for admins

---

**Last Updated:** February 2026
**Version:** 1.0.0
