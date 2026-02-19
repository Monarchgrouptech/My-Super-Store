# User Preference Data Export for Recommendations

## Overview
This feature automatically captures user purchase data (product names, categories, vendors, and quantities) when they complete a purchase in the checkout process. The data is cached locally for later use in generating personalized product recommendations.

## How It Works

### 1. Data Capture (Automatic)
When a user clicks "Place Order" in the checkout:
- The system generates a CSV file containing:
  - Product Name
  - Category
  - Vendor
  - Quantity purchased
- The CSV includes metadata (timestamp, user email)
- Data is saved to browser's localStorage for caching

### 2. Data Storage
- **Location**: Browser localStorage
- **Key**: `user_preference_records`
- **Structure**: Array of `UserPreferenceRecord` objects
- **Retention**: Up to 50 most recent purchase records per user

### 3. Data Access
The `useUserPreferences` hook provides access to cached data for building recommendations.

## Files Created/Modified

### New Files:
1. **`src/lib/exportCartData.ts`**
   - `generateCartCSV()` - Generates CSV from cart items
   - `generateCSVWithHeader()` - Adds metadata header
   - `saveUserPreferenceData()` - Saves to localStorage
   - `getUserPreferenceRecords()` - Retrieves user's records
   - `getLatestUserPreference()` - Gets most recent record
   - `downloadCachedPreferenceData()` - Downloads CSV file

2. **`src/hooks/useUserPreferences.ts`**
   - `useUserPreferences()` - React hook to access cached data
   - `parsePreferenceCSV()` - Parse CSV back to structured data
   - `getUserPurchaseCategories()` - Get all purchased categories
   - `getUserPreferredVendors()` - Get frequently purchased vendors
   - `getRecommendationCategories()` - Get top categories for recommendations

### Modified Files:
1. **`src/context/CartContext.tsx`**
   - Updated Product interface to include `seller_id`
   - Updated Supabase query to fetch `seller_id` from products

2. **`src/pages/Checkout.tsx`**
   - Added imports for preference data functions
   - Updated "Place Order" button to trigger data capture
   - Automatically saves user preferences before navigation

## Usage Example

### Access Cached Preferences in a Recommendations Component:
```tsx
import { useAuth } from '../context/AuthContext';
import { 
    useUserPreferences, 
    getRecommendationCategories 
} from '../hooks/useUserPreferences';

export function RecommendationsPanel() {
    const { user } = useAuth();
    const { preferenceRecords } = useUserPreferences(user?.id);
    
    // Get top 5 categories for recommendations
    const recommendedCategories = getRecommendationCategories(preferenceRecords, 5);
    
    return (
        <div>
            <h2>Recommended for You</h2>
            {recommendedCategories.map(category => (
                <div key={category}>{category}</div>
            ))}
        </div>
    );
}
```

## Data Format

### CSV Format (in localStorage):
```
# User Preference Data
# Generated: 2026-01-27T10:30:00.000Z
# User Email: user@example.com
# This file contains product preferences for personalized recommendations

Product Name,Category,Vendor,Quantity
"Luxury Watch","Accessories","Vendor A",1
"Designer Bag","Fashion","Vendor B",2
```

### UserPreferenceRecord Interface:
```typescript
interface UserPreferenceRecord {
    userId: string;           // User ID from auth
    userEmail: string;        // User's email
    timestamp: string;        // ISO timestamp
    csvData: string;          // Full CSV with headers
    productCount: number;     // Number of products purchased
}
```

## Benefits
- **Personalization**: Build product recommendations based on actual purchase history
- **Performance**: Data cached locally, no API calls needed for basic recommendations
- **Privacy**: Data stored only in browser, user can clear anytime
- **Scalability**: Stores up to 50 purchases per user, auto-rotates old data

## Future Enhancements
1. Sync cached data to backend database for persistence
2. ML-based recommendation engine using preference data
3. Export functionality for analytics
4. Cross-device synchronization
5. Time-based preference decay (older purchases weighted less)
