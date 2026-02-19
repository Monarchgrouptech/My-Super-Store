import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Vendor } from '../types/vendor';

interface UseVendorResult {
    vendor: Vendor | null;
    loading: boolean;
    error: string | null;
    isVendor: boolean;
    refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch the current authenticated user's vendor profile
 * @returns Vendor data, loading state, and error
 */
export function useVendor(): UseVendorResult {
    const [vendor, setVendor] = useState<Vendor | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isVendor, setIsVendor] = useState(false);

    const fetchVendor = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get current user
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError) {
                throw authError;
            }

            if (!user) {
                setVendor(null);
                setIsVendor(false);
                return;
            }

            // Fetch vendor profile where user_id matches authenticated user
            const { data, error: vendorError } = await supabase
                .from('vendors')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (vendorError) {
                // If no vendor found, that's okay - user just isn't a vendor
                if (vendorError.code === 'PGRST116') {
                    setVendor(null);
                    setIsVendor(false);
                } else {
                    throw vendorError;
                }
            } else {
                setVendor(data);
                setIsVendor(true);
            }
        } catch (err) {
            console.error('Error fetching vendor:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch vendor data');
            setIsVendor(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVendor();
    }, []);

    return {
        vendor,
        loading,
        error,
        isVendor,
        refetch: fetchVendor,
    };
}
