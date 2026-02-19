import { useState, useEffect } from 'react';
import { getUserPreferenceRecords, UserPreferenceRecord } from '../lib/exportCartData';

/**
 * Hook to access cached user preference data for recommendations
 */
export function useUserPreferences(userId?: string) {
    const [preferenceRecords, setPreferenceRecords] = useState<UserPreferenceRecord[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!userId) return;

        setLoading(true);
        try {
            const records = getUserPreferenceRecords(userId);
            setPreferenceRecords(records);
        } catch (error) {
            console.error('Error loading preference records:', error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    return { preferenceRecords, loading };
}

/**
 * Parse CSV data to extract product preferences
 */
export function parsePreferenceCSV(csvData: string): Array<{
    productName: string;
    category: string;
    vendor: string;
    quantity: number;
}> {
    const lines = csvData.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    const products = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        // Parse CSV with quoted fields
        const regex = /"([^"]*)"|([^,]+)/g;
        const fields: string[] = [];
        let match;

        while ((match = regex.exec(line)) !== null) {
            fields.push(match[1] || match[2]);
        }

        if (fields.length >= 4) {
            products.push({
                productName: fields[0]?.trim() || '',
                category: fields[1]?.trim() || '',
                vendor: fields[2]?.trim() || '',
                quantity: parseInt(fields[3]) || 1,
            });
        }
    }

    return products;
}

/**
 * Get product categories that a user has purchased
 */
export function getUserPurchaseCategories(preferenceRecords: UserPreferenceRecord[]): string[] {
    const categories = new Set<string>();

    for (const record of preferenceRecords) {
        const products = parsePreferenceCSV(record.csvData);
        products.forEach(p => {
            if (p.category && p.category !== 'Uncategorized') {
                categories.add(p.category);
            }
        });
    }

    return Array.from(categories);
}

/**
 * Get vendors that a user frequently purchases from
 */
export function getUserPreferredVendors(preferenceRecords: UserPreferenceRecord[]): {
    vendor: string;
    purchaseCount: number;
}[] {
    const vendorMap = new Map<string, number>();

    for (const record of preferenceRecords) {
        const products = parsePreferenceCSV(record.csvData);
        products.forEach(p => {
            if (p.vendor && p.vendor !== 'Unknown Vendor') {
                vendorMap.set(p.vendor, (vendorMap.get(p.vendor) || 0) + p.quantity);
            }
        });
    }

    return Array.from(vendorMap.entries())
        .map(([vendor, count]) => ({ vendor, purchaseCount: count }))
        .sort((a, b) => b.purchaseCount - a.purchaseCount);
}

/**
 * Get most purchased product categories for recommendations
 */
export function getRecommendationCategories(
    preferenceRecords: UserPreferenceRecord[],
    topN: number = 5
): string[] {
    const categoryMap = new Map<string, number>();

    for (const record of preferenceRecords) {
        const products = parsePreferenceCSV(record.csvData);
        products.forEach(p => {
            if (p.category && p.category !== 'Uncategorized') {
                categoryMap.set(p.category, (categoryMap.get(p.category) || 0) + p.quantity);
            }
        });
    }

    return Array.from(categoryMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(([category]) => category);
}
