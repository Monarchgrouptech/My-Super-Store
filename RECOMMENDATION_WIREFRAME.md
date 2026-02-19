# Product Recommendation Algorithm - Wireframe

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE LAYER                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              Product Detail / Checkout Page                      │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │ Product: [Product ID]                                    │  │  │
│  │  │ Category: Electronics                                    │  │  │
│  │  │ Price: $99.99                                            │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                   │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │     "Recommended For You" Section                         │  │  │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │  │  │
│  │  │  │ Product 1    │  │ Product 2    │  │ Product 3    │    │  │  │
│  │  │  │ Image        │  │ Image        │  │ Image        │    │  │  │
│  │  │  │ $45.99       │  │ $67.50       │  │ $32.00       │    │  │  │
│  │  │  └──────────────┘  └──────────────┘  └──────────────┘    │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
         ┌──────────────────────────────────────────────────┐
         │      RECOMMENDATION SERVICE / HOOK LAYER         │
         └──────────────────────────────────────────────────┘
                              ↓
         ┌──────────────────────────────────────────────────┐
         │         ALGORITHM PROCESSING LAYER               │
         └──────────────────────────────────────────────────┘
                              ↓
         ┌──────────────────────────────────────────────────┐
         │      DATABASE / SUPABASE QUERY LAYER             │
         └──────────────────────────────────────────────────┘
```

## Algorithm Process Flow

```
START: User views product
       │
       ├─ Extract: Product ID
       ├─ Extract: Product Category
       ├─ Extract: Current Purchase Count
       │
       ↓
┌─────────────────────────────────────────────────────┐
│   STEP 1: GET CATEGORY PRODUCTS                      │
├─────────────────────────────────────────────────────┤
│ Query: All products in same category                │
│ Filter: Exclude current product                     │
│ Limit: Top 100 candidates                           │
└─────────────────────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────────────┐
│   STEP 2: FILTER OUT PURCHASED ITEMS                │
├─────────────────────────────────────────────────────┤
│ Query: User's order history                         │
│ Remove: Any products already purchased              │
│ Keep: Available unowned products                    │
└─────────────────────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────────────┐
│   STEP 3: CALCULATE RECOMMENDATION SCORE             │
├─────────────────────────────────────────────────────┤
│ For each product:                                    │
│                                                      │
│ Score = (Purchase Count × 0.5) +                   │
│         (View Count × 0.3) +                        │
│         (Recency Bonus × 0.2)                       │
│                                                      │
│ Recency Bonus: Recent products get +points          │
│ Quality Filter: Min purchase count ≥ 1              │
└─────────────────────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────────────┐
│   STEP 4: RANK & SELECT TOP RECOMMENDATIONS         │
├─────────────────────────────────────────────────────┤
│ Sort: By calculated score (descending)              │
│ Select: Top 3-6 products                            │
│ Return: Product details with metadata               │
└─────────────────────────────────────────────────────┘
       │
       ↓
DISPLAY: Render recommendation carousel/grid
```

## Data Input/Output

### INPUT
```
┌──────────────────────────────┐
│  Current Product Context     │
├──────────────────────────────┤
│ • product_id: "prod_123"     │
│ • category_id: "cat_45"      │
│ • purchase_count: 234        │
│ • user_id: "user_789"        │
│ • view_count: 1,023          │
└──────────────────────────────┘
```

### PROCESSING DATA
```
Products in Category → Filter by Score → Sort by Rank
        ↓                     ↓                ↓
  [100 products]        [45 products]    [6 products]
   (All electronics)    (No duplicates)   (Top 6 sorted)
```

### OUTPUT
```
┌────────────────────────────────────────────────────────┐
│  Recommendation Result Array                          │
├────────────────────────────────────────────────────────┤
│ [                                                      │
│   {                                                    │
│     id: "prod_456",                                   │
│     name: "Wireless Mouse",                           │
│     price: 45.99,                                     │
│     purchase_count: 342,                              │
│     view_count: 2,105,                                │
│     score: 87.5,                                      │
│     reason: "Popular in Electronics"                  │
│   },                                                   │
│   ... (up to 6 items)                                 │
│ ]                                                      │
└────────────────────────────────────────────────────────┘
```

## Component Integration Points

```
┌────────────────────────────────────────────────────────────┐
│                    ProductDetail.tsx                       │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  const recommendations = useRecommendations({              │
│    productId: currentProduct.id,                           │
│    categoryId: currentProduct.category_id,                 │
│    userId: user.id                                         │
│  })                                                         │
│                                                             │
│  return (                                                   │
│    <>                                                       │
│      <ProductCard product={currentProduct} />              │
│      <RecommendationCarousel items={recommendations} />    │
│    </>                                                      │
│  )                                                          │
└────────────────────────────────────────────────────────────┘
```

## Database Schema Requirements

```
products table:
├─ id (string) ✓ existing
├─ name (string) ✓ existing
├─ category_id (string) → via ProductCategory ✓ existing
├─ purchase_count (number) ← NEEDS TO BE ADDED
├─ view_count (number) ✓ existing
├─ created_at (timestamp) ✓ existing
└─ price (number) ✓ existing

order_items table:
├─ id (string) ✓ existing
├─ order_id (string) ✓ existing
├─ product_id (string) ✓ existing
└─ quantity (number) ✓ existing
```

## Recommendation Score Formula

```
FINAL_SCORE = (W1 × purchase_count) + (W2 × view_count) + (W3 × recency_bonus)

Where:
  W1 = 0.50 (50% weight on purchase count)
  W2 = 0.30 (30% weight on view count)
  W3 = 0.20 (20% weight on recency)

Example:
  purchase_count = 150
  view_count = 500
  recency_bonus = 10 (recent product)
  
  SCORE = (0.50 × 150) + (0.30 × 500) + (0.20 × 10)
        = 75 + 150 + 2
        = 227 points
```

## Implementation Checklist

- [ ] Add `purchase_count` to Product interface
- [ ] Create database migration for `purchase_count` column
- [ ] Create `RecommendationEngine` service/utility
- [ ] Create `useRecommendations` hook
- [ ] Create `RecommendationCarousel` component
- [ ] Integrate into ProductDetail page
- [ ] Add to Checkout/Cart pages
- [ ] Test with various categories
- [ ] Optimize query performance
- [ ] Add analytics tracking
