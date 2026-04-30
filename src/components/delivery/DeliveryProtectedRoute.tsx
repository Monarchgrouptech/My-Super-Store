import { Navigate } from 'react-router-dom';
import { useDeliveryPartner } from '../../hooks/useDeliveryPartner';
import { Loader2 } from 'lucide-react';

interface DeliveryProtectedRouteProps {
    children: React.ReactNode;
}

export function DeliveryProtectedRoute({ children }: DeliveryProtectedRouteProps) {
    const { isPartner, loading } = useDeliveryPartner();

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#f1eee7]">
                <Loader2 className="animate-spin text-[#9f7418] mb-4" size={48} />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Verifying Credentials...</p>
            </div>
        );
    }

    if (!isPartner) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}
