import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface DeliveryPartner {
    id: string;
    user_id: string;
    company_name: string;
    role: string;
    email: string;
    phone: string | null;
    country: string | null;
    city: string | null;
    address: string | null;
    logo_url?: string | null;
    is_active: boolean;
    is_verified: boolean;
    created_at: string;
    updated_at: string;
}

interface UseDeliveryPartnerResult {
    partner: DeliveryPartner | null;
    loading: boolean;
    error: string | null;
    isPartner: boolean;
    refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch the current authenticated user's delivery partner profile
 * @returns Delivery partner data, loading state, and error
 */
export function useDeliveryPartner(): UseDeliveryPartnerResult {
    const [partner, setPartner] = useState<DeliveryPartner | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPartner, setIsPartner] = useState(false);

    const fetchPartner = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get current user
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError) {
                throw authError;
            }

            if (!user) {
                setPartner(null);
                setIsPartner(false);
                return;
            }

            // Fetch delivery partner profile where user_id matches authenticated user
            const { data, error: partnerError } = await supabase
                .from('delivery_partners')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (partnerError) {
                throw partnerError;
            }

            if (data) {
                setPartner(data);
                setIsPartner(true);
            } else {
                setPartner(null);
                setIsPartner(false);
            }
        } catch (err) {
            console.error('Error fetching delivery partner:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch delivery partner data');
            setIsPartner(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPartner();
    }, []);

    return {
        partner,
        loading,
        error,
        isPartner,
        refetch: fetchPartner,
    };
}
