import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface AdminLayoutProps {
    children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
    const { isAdmin, loading: adminLoading } = useAdmin();
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        // Wait for both auth and admin checks to complete
        if (authLoading || adminLoading) return;

        // Redirect to login if not authenticated
        if (!user) {
            navigate('/login');
            return;
        }

        // Redirect to account if authenticated but not admin
        if (!isAdmin) {
            navigate('/account');
        }
    }, [user, isAdmin, authLoading, adminLoading, navigate]);

    // Show loading spinner while checking
    if (authLoading || adminLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="animate-spin text-gray-400 mx-auto mb-4" size={40} />
                    <p className="text-gray-600">Verifying access...</p>
                </div>
            </div>
        );
    }

    // Only render admin content if user is authenticated and is admin
    if (!user || !isAdmin) {
        return null;
    }

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            {/* Main Content */}
            <main className="flex-1 w-full">
                <div className="flex justify-center w-full">
                    <div className="w-full max-w-[1280px] px-4 sm:px-6 md:px-8 lg:px-10 py-6">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
