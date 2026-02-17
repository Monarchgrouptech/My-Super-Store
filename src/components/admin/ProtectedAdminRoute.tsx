import { Navigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';

interface ProtectedAdminRouteProps {
    children: React.ReactNode;
}

/**
 * ProtectedAdminRoute - Wrapper component to protect admin routes
 * Redirects to home if user is not an admin
 */
export function ProtectedAdminRoute({
    children,
}: ProtectedAdminRouteProps) {
    const { isAdmin, loading } = useAdmin();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-gray-600">Loading admin panel...</p>
            </div>
        );
    }

    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}
