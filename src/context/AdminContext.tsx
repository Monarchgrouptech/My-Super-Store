import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface AdminContextType {
    isAdmin: boolean;
    loading: boolean;
}

const AdminContext = createContext<AdminContextType>({
    isAdmin: false,
    loading: true,
});

export function AdminProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAdminStatus = async () => {
            if (!user) {
                setIsAdmin(false);
                setLoading(false);
                return;
            }

            try {
                // Query user_profiles table for is_admin flag
                const { data, error } = await supabase
                    .from('user_profiles')
                    .select('is_admin')
                    .eq('user_id', user.id)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    throw error;
                }

                // Set admin status based on is_admin flag
                setIsAdmin(data?.is_admin === true);
            } catch (error) {
                console.error('Error checking admin status:', error);
                setIsAdmin(false);
            } finally {
                setLoading(false);
            }
        };

        checkAdminStatus();
    }, [user]);

    return (
        <AdminContext.Provider value={{
            isAdmin,
            loading,
        }}>
            {children}
        </AdminContext.Provider>
    );
}

export const useAdmin = () => useContext(AdminContext);
