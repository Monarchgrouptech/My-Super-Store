import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getAddressFromLocation } from '../lib/geolocationUtils';

type CurrencyCode = 'USD' | 'NGN';

interface CurrencyContextType {
    currency: CurrencyCode;
    rate: number;
    formatPrice: (usdAmount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType>({
    currency: 'USD',
    rate: 1,
    formatPrice: () => '$0.00',
});

const NGN_RATE_ENDPOINT =
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';

const RATE_CACHE_KEY = 'currency_ngn_rate_cache_v1';
const COUNTRY_CACHE_KEY = 'currency_country_cache_v1';
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

function isNigeriaCountry(country: string | null | undefined) {
    return (country || '').toLowerCase().includes('nigeria');
}

function formatUsd(usdAmount: number) {
    return `$${usdAmount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function formatNgn(ngnAmount: number) {
    return `₦${Math.round(ngnAmount).toLocaleString()}`;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
    const [currency, setCurrency] = useState<CurrencyCode>('USD');
    const [rate, setRate] = useState<number>(1);

    useEffect(() => {
        let cancelled = false;

        const getCached = <T,>(key: string): T | null => {
            try {
                const raw = localStorage.getItem(key);
                if (!raw) return null;
                const parsed = JSON.parse(raw) as { value: T; at: number };
                if (!parsed?.at || Date.now() - parsed.at > CACHE_TTL_MS) return null;
                return parsed.value;
            } catch {
                return null;
            }
        };

        const setCached = <T,>(key: string, value: T) => {
            try {
                localStorage.setItem(key, JSON.stringify({ value, at: Date.now() }));
            } catch {
                // no-op
            }
        };

        const fetchNgnRate = async () => {
            const cachedRate = getCached<number>(RATE_CACHE_KEY);
            if (cachedRate && cachedRate > 0) {
                return cachedRate;
            }

            const response = await fetch(NGN_RATE_ENDPOINT);
            if (!response.ok) {
                throw new Error('Failed to fetch USD->NGN rate');
            }

            const data = await response.json();
            const fetchedRate = Number(data?.usd?.ngn);
            if (!fetchedRate || Number.isNaN(fetchedRate)) {
                throw new Error('Invalid USD->NGN rate response');
            }

            setCached(RATE_CACHE_KEY, fetchedRate);
            return fetchedRate;
        };

        const detectCurrency = async () => {
            try {
                const cachedCountry = getCached<string>(COUNTRY_CACHE_KEY);
                let country = cachedCountry;

                if (!country) {
                    const address = await getAddressFromLocation();
                    country = address.country || '';
                    setCached(COUNTRY_CACHE_KEY, country);
                }

                if (!isNigeriaCountry(country)) {
                    if (!cancelled) {
                        setCurrency('USD');
                        setRate(1);
                    }
                    return;
                }

                const fetchedRate = await fetchNgnRate();
                if (!cancelled) {
                    setCurrency('NGN');
                    setRate(fetchedRate);
                }
            } catch (error) {
                console.error('[Currency] Falling back to USD:', error);
                if (!cancelled) {
                    setCurrency('USD');
                    setRate(1);
                }
            }
        };

        detectCurrency();

        return () => {
            cancelled = true;
        };
    }, []);

    const value = useMemo<CurrencyContextType>(() => {
        const formatPrice = (usdAmount: number) => {
            if (currency === 'NGN') {
                return formatNgn(usdAmount * rate);
            }
            return formatUsd(usdAmount);
        };

        return {
            currency,
            rate,
            formatPrice,
        };
    }, [currency, rate]);

    return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
    return useContext(CurrencyContext);
}
