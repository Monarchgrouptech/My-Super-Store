# AI Support Chatbot — Full Builder Specification
> **Project Stack:** React + Vite + TypeScript + Supabase  
> **Target:** Drop-in AI-powered customer support and product discovery chatbot for an e-commerce platform  
> **Read every section completely before writing a single line of code.**

---

## CREDENTIALS & KEYS

```
GROQ_API_KEY=your_groq_api_key_here
GROQ_PRIMARY_MODEL=deepseek-r1-distill-llama-70b
GROQ_FALLBACK_MODEL=llama-3.1-8b-instant
```

These keys are used **only on the backend** (`/api/chat` route or equivalent server function). They must **never** appear in any frontend `.tsx`, `.ts`, or `.jsx` file. Store them in `.env` as `VITE_` prefix is NOT used for these — use server-side environment variables exclusively.

---

## TECH STACK CONSTRAINTS

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS (or existing project CSS system) |
| Backend/API | Supabase Edge Functions **or** a `/api/chat` server route (e.g. via a Vite plugin, Express adapter, or Vercel/Netlify function) |
| Database | Supabase (PostgreSQL) |
| AI Provider | Groq Cloud (`https://api.groq.com/openai/v1/chat/completions`) |
| Auth | Supabase Auth (already set up in project) |

---

## HOW SUPABASE API CALLS ARE MADE IN THIS PROJECT

The project already has a configured `supabase` client. All database queries follow this exact pattern — replicate it exactly, do not use raw `fetch` to Supabase, do not use REST URLs directly:

```typescript
import { supabase } from '../../lib/supabase';

// Example: multi-step query pattern used in this project
const { data: orderItems, error: orderItemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('vendor_id', vendor.id);

if (orderItemsError) throw orderItemsError;

// Get unique IDs from result
const orderIds = [...new Set(orderItems.map(item => item.order_id).filter(Boolean))];

// Second query using those IDs
const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .in('id', orderIds);
```

**Key rules for all Supabase queries in this project:**
- Always destructure `{ data, error }` from every query
- Always check `if (error) throw error` immediately after
- Use `.select('*')` for full rows; use `.select('id, name, price, stock')` for partial selects
- Filter with `.eq()`, `.in()`, `.gte()`, `.lte()`, `.ilike()` — all chained
- Never use raw SQL; never call the Supabase REST API directly from the frontend
- The backend (Edge Function or API route) is the only place that queries Supabase for chatbot data

---

## DATABASE SCHEMA — FULL REFERENCE

The AI chatbot backend will query the following tables. This is the complete schema for context.

```sql
-- Users & Auth
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  display_name varchar,
  avatar_url varchar,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_admin boolean DEFAULT false
);

-- Vendors (sellers on the platform)
CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES public.user_profiles(user_id),
  business_name varchar NOT NULL,
  logo_url varchar,
  email text NOT NULL,
  phone varchar,
  country varchar,
  city varchar,
  address text,
  bank_name varchar,
  bank_account_number varchar,
  bank_account_name varchar,
  payout_currency varchar DEFAULT 'USD',
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  slug varchar NOT NULL UNIQUE,
  sku varchar UNIQUE,
  short_description varchar,
  description text,
  price numeric NOT NULL DEFAULT 0,
  stock integer DEFAULT 0,
  published boolean DEFAULT false,
  view_count bigint DEFAULT 0,
  search_hit_count bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  brand varchar,
  seller_id uuid REFERENCES public.vendors(id)
);

-- Product images (one product can have many)
CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id),
  url varchar NOT NULL,
  alt_text varchar,
  position smallint DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Product specs (key-value pairs per product)
CREATE TABLE public.product_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id),
  spec_key varchar NOT NULL,
  spec_value varchar,
  created_at timestamptz DEFAULT now()
);

-- Categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  slug varchar NOT NULL UNIQUE,
  parent_id uuid, -- self-referencing for subcategories
  created_at timestamptz DEFAULT now()
);

-- Product ↔ Category join table (many-to-many)
CREATE TABLE public.product_categories (
  product_id uuid NOT NULL REFERENCES public.products(id),
  category_id uuid NOT NULL REFERENCES public.categories(id),
  PRIMARY KEY (product_id, category_id)
);

-- Carts
CREATE TABLE public.carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id varchar,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid REFERENCES public.carts(id),
  product_id uuid REFERENCES public.products(id),
  quantity integer NOT NULL DEFAULT 1,
  price_at_time numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  status varchar NOT NULL DEFAULT 'pending',
  total_amount numeric NOT NULL DEFAULT 0,
  currency varchar DEFAULT 'USD',
  shipping_address_id uuid,
  billing_address_id uuid,
  placed_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id),
  product_id uuid REFERENCES public.products(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  vendor_id uuid REFERENCES public.vendors(id)
);

-- Payments
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id),
  provider varchar,
  provider_payment_id varchar,
  amount numeric,
  currency varchar,
  status varchar,
  created_at timestamptz DEFAULT now()
);

-- Addresses
CREATE TABLE public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  label varchar,
  line1 varchar,
  line2 varchar,
  city varchar,
  state varchar,
  country varchar,
  postal_code varchar,
  created_at timestamptz DEFAULT now()
);

-- Search/analytics
CREATE TABLE public.popular_searches (
  query varchar PRIMARY KEY,
  search_count bigint DEFAULT 0,
  last_searched_at timestamptz DEFAULT now()
);

CREATE TABLE public.popular_categories (
  category_id uuid PRIMARY KEY REFERENCES public.categories(id),
  search_count bigint DEFAULT 0,
  last_searched_at timestamptz DEFAULT now()
);
```

### What the chatbot is allowed to READ from Supabase

| Table | Purpose | Allowed columns |
|---|---|---|
| `products` | Search, filter, display products | `id, name, slug, short_description, price, stock, published, brand` |
| `product_images` | Get product images | `product_id, url, alt_text, position` |
| `product_specs` | Show product specs | `product_id, spec_key, spec_value` |
| `categories` | List categories, filter | `id, name, slug, parent_id` |
| `product_categories` | Join products to categories | `product_id, category_id` |
| `popular_searches` | Show trending searches | `query, search_count` |
| `popular_categories` | Show popular categories | `category_id, search_count` |
| `vendors` | Show seller name on product | `id, business_name, is_verified` |

### What the chatbot must NEVER touch

- `user_profiles` — private user data
- `orders` — order records
- `order_items` — order data
- `payments` — payment records
- `addresses` — user addresses
- `carts` / `cart_items` — cart data
- Any `INSERT`, `UPDATE`, or `DELETE` on any table
- Any admin columns like `is_admin`, bank details, or `bank_account_number`

---

## ARCHITECTURE — EXACT DATA FLOW

```
[User types message in chat widget]
        ↓
[Frontend ChatWidget.tsx]
  - Appends message to local conversation state
  - POSTs to /api/chat with:
      { message: string, context: PageContext, history: Message[] }
        ↓
[Backend: /api/chat handler (Edge Function or server route)]
  - Receives request
  - Parses intent from message (product search? navigation? help?)
  - If product search intent:
      → Queries Supabase products table with filters
      → Queries product_images for results
      → Injects product data into AI prompt as JSON context
  - If category browse intent:
      → Queries categories table
      → Injects list into AI prompt
  - Sends full prompt to Groq API:
      POST https://api.groq.com/openai/v1/chat/completions
      Headers: { Authorization: Bearer GROQ_API_KEY }
      Body: { model, messages: [system, ...history, user] }
  - Receives AI response text
  - Parses response for any structured product cards or action buttons
  - Returns JSON to frontend:
      { reply: string, products?: Product[], actions?: Action[] }
        ↓
[Frontend renders AI response + optional product cards + action buttons]
```

---

## SECTION 1: FRONTEND — CHAT WIDGET COMPONENT

### File: `src/components/chat/ChatWidget.tsx`

This is the **only** new top-level component. It self-contains all chat UI logic.

#### Floating Trigger Button

- Position: `fixed bottom-5 right-5 z-50`
- Shape: circle, 56px × 56px
- Icon: chat bubble SVG (no external icon library dependency unless already in project)
- Color: match the project's primary brand color (check existing Tailwind config or CSS variables)
- On hover: subtle scale transform (`scale-105`) with transition
- Unread indicator: red dot (10px) top-right of button, only shown when `unreadCount > 0`
- Click: toggles `isOpen` state

#### Chat Window — Desktop

- Position: `fixed bottom-20 right-5 z-50`
- Width: `380px` (fixed, not responsive on desktop)
- Height: `560px` (fixed)
- Border radius: `16px`
- Box shadow: `0 8px 32px rgba(0,0,0,0.18)`
- Background: white (or project's card background)
- Overflow: hidden (children scroll internally)
- Animation: slide up + fade in on open (`transform translateY(16px) → 0`, `opacity 0 → 1`), reverse on close — use CSS transitions, not a library

#### Chat Window — Mobile (< 768px breakpoint)

- Position: `fixed bottom-0 left-0 right-0 z-50`
- Width: `100vw`
- Height: `78vh` (not 100vh — must not cover bottom nav or checkout buttons)
- Border radius: `16px 16px 0 0` (rounded top only)
- Animation: slide up from bottom (`translateY(100%) → translateY(0)`)
- Must include `padding-bottom: env(safe-area-inset-bottom)` for iPhone notch safety
- The input box must stay above the keyboard — use `position: sticky; bottom: 0` on the input container

#### Chat Window Internal Layout (flex column, full height)

```
┌─────────────────────────────────┐  ← border-radius top
│  HEADER (fixed, no scroll)      │  56px tall
│  [Bot Avatar] AI Assistant      │
│  ● Online                        │
├─────────────────────────────────┤
│                                 │
│  MESSAGE AREA (scrollable)      │  flex-1, overflow-y: auto
│  Messages render here           │
│  Product cards render here      │
│                                 │
├─────────────────────────────────┤
│  QUICK PROMPTS (horizontal      │  Only shown when no messages yet
│  scroll chips)                  │  Hide after first user message
├─────────────────────────────────┤
│  INPUT ROW (sticky bottom)      │  52px tall
│  [text input      ] [Send →]    │
└─────────────────────────────────┘
```

#### Header

- Left: circular bot avatar (use a simple SVG robot face or sparkle icon, inline)
- Center/left text: `"AI Assistant"` in semibold, `"Online"` in small green text below
- Right: close `×` button (24px clickable area)
- Background: brand primary color (match project)
- Text: white

#### Message Bubbles

- User messages: right-aligned, brand primary background, white text, `border-radius: 16px 16px 0 16px`
- Bot messages: left-aligned, light gray background, dark text, `border-radius: 16px 16px 16px 0`
- Max width: 82% of message area
- Timestamp: small gray text below each bubble, format `HH:MM`
- Avatar: small bot icon left of bot messages only

#### Typing Indicator

- Shown while waiting for AI response
- Three animated dots (CSS keyframe pulse animation)
- Render as a bot message bubble with class `typing-indicator`
- Remove immediately when response arrives

#### Quick Prompt Chips

- Show only when `messages.length === 0`
- Horizontal scroll row
- Chips: `"Find products"`, `"How to buy?"`, `"Payment help"`, `"Browse categories"`, `"Cheapest laptops"`, `"Show phones"`
- On click: send that text as a user message
- Style: rounded pill, border, small text, white background

#### Input Row

- `<input type="text">` — NOT `<textarea>` unless user presses Enter for newline (keep it simple: single line)
- Placeholder: `"Ask me anything..."`
- On Enter key OR Send button click: submit message
- Send button: disabled and visually dimmed when input is empty OR when AI is loading
- Trim whitespace before sending; do not send empty strings

#### Product Cards (rendered inside message area)

When the AI returns product data, render cards below the text reply:

```
┌──────────────────────────────┐
│ [Product Image - 80px]       │
│ Product Name (bold)          │
│ ₦ Price (brand color)        │
│ In Stock / Out of Stock      │
│ [View Product →] button      │
└──────────────────────────────┘
```

- Max 4 cards per response
- Horizontal scroll on mobile, grid (2 cols) on desktop if space allows
- "View Product" links to `/products/${product.slug}`
- If `stock === 0`: show "Out of Stock" badge in red, disable "View Product" with gray style

#### Action Buttons

These are clickable button chips the AI can return alongside a reply:

- `{ label: "Open Cart", action: "navigate", path: "/cart" }`
- `{ label: "Browse Electronics", action: "navigate", path: "/categories/electronics" }`
- `{ label: "Go to Checkout", action: "navigate", path: "/checkout" }`

Render as pill buttons below the bot message. On click: use React Router's `useNavigate()` to navigate.

---

## SECTION 2: STATE MANAGEMENT

Use `useState` and `useRef` only. No external state library needed.

```typescript
interface Message {
  id: string;           // nanoid or Date.now().toString()
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
  products?: ProductCard[];
  actions?: ActionButton[];
}

interface ProductCard {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  image_url?: string;
  brand?: string;
}

interface ActionButton {
  label: string;
  action: 'navigate' | 'sendMessage';
  path?: string;
  message?: string;
}

interface PageContext {
  currentPath: string;
  currentProductId?: string;   // if on a product page
  currentProductName?: string;
}
```

State variables:
- `messages: Message[]` — full conversation history
- `inputValue: string` — controlled input
- `isOpen: boolean` — chat window open/closed
- `isLoading: boolean` — waiting for AI
- `unreadCount: number` — increments when bot replies and chat is closed

Auto-scroll: use `useRef` on the message container, call `ref.current.scrollTop = ref.current.scrollHeight` in a `useEffect` whenever `messages` changes.

Page context: use `useLocation()` from React Router to get `currentPath`. Parse product ID from URL if on a product page (e.g. `/products/:slug`).

---

## SECTION 3: API CALL FROM FRONTEND

```typescript
// src/components/chat/useChatApi.ts

const sendMessage = async (
  userMessage: string,
  history: Message[],
  context: PageContext
) => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: userMessage,
      history: history.slice(-10).map(m => ({  // send last 10 messages for memory
        role: m.role === 'bot' ? 'assistant' : 'user',
        content: m.text
      })),
      context
    })
  });

  if (!response.ok) throw new Error('Chat API failed');
  return await response.json() as ChatAPIResponse;
};

interface ChatAPIResponse {
  reply: string;
  products?: ProductCard[];
  actions?: ActionButton[];
  error?: string;
}
```

---

## SECTION 4: BACKEND — `/api/chat` HANDLER

This is the brain of the chatbot. Build this as a Supabase Edge Function (`supabase/functions/chat/index.ts`) OR as a Vite/Express API route depending on the project's deployment setup. The logic is identical either way.

### Full Handler Logic

```typescript
// supabase/functions/chat/index.ts (or equivalent)

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!  // service role for server-side reads
);

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!;
const GROQ_MODEL = 'deepseek-r1-distill-llama-70b';

Deno.serve(async (req) => {
  const { message, history, context } = await req.json();

  // Step 1: Detect intent
  const intent = detectIntent(message);

  let productContext = '';
  let products: any[] = [];

  if (intent === 'product_search') {
    // Step 2: Extract search params from message
    const { keyword, maxPrice, minPrice, category } = extractSearchParams(message);

    // Step 3: Query Supabase
    let query = supabase
      .from('products')
      .select('id, name, slug, short_description, price, stock, brand')
      .eq('published', true)
      .gt('stock', 0)
      .limit(4);

    if (keyword) query = query.ilike('name', `%${keyword}%`);
    if (maxPrice) query = query.lte('price', maxPrice);
    if (minPrice) query = query.gte('price', minPrice);

    const { data: productData, error } = await query;
    if (!error && productData?.length) {
      products = productData;
      // Fetch first image for each product
      const ids = productData.map(p => p.id);
      const { data: images } = await supabase
        .from('product_images')
        .select('product_id, url')
        .in('product_id', ids)
        .eq('position', 0);

      products = productData.map(p => ({
        ...p,
        image_url: images?.find(img => img.product_id === p.id)?.url ?? null
      }));

      productContext = `Found ${products.length} products:\n${JSON.stringify(products.map(p => ({
        name: p.name, price: p.price, stock: p.stock, brand: p.brand
      })), null, 2)}`;
    } else {
      productContext = 'No products found matching the search.';
    }
  }

  if (intent === 'category_browse') {
    const { data: cats } = await supabase
      .from('categories')
      .select('id, name, slug')
      .is('parent_id', null);
    productContext = `Available categories: ${cats?.map(c => c.name).join(', ')}`;
  }

  // Step 4: Build system prompt
  const systemPrompt = buildSystemPrompt(context, productContext);

  // Step 5: Call Groq
  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 512,
      temperature: 0.4,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: message }
      ]
    })
  });

  const groqData = await groqResponse.json();
  const reply = groqData.choices?.[0]?.message?.content ?? 'Sorry, I could not generate a response.';

  // Step 6: Build actions based on intent
  const actions = buildActions(intent, context);

  return new Response(JSON.stringify({ reply, products, actions }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### Intent Detection Function

```typescript
function detectIntent(message: string): string {
  const lower = message.toLowerCase();
  const productKeywords = ['find', 'show', 'search', 'buy', 'cheapest', 'price', 'phone', 'laptop', 'shoe', 'sell', 'stock', 'available', 'product', 'brand', 'samsung', 'apple', 'under'];
  const categoryKeywords = ['category', 'categories', 'browse', 'section', 'department'];
  const navigationKeywords = ['cart', 'checkout', 'how to', 'where is', 'navigate', 'find page', 'account', 'login', 'sign up', 'register'];
  const paymentKeywords = ['payment', 'pay', 'failed', 'not working', 'transaction', 'card', 'transfer'];

  if (productKeywords.some(k => lower.includes(k))) return 'product_search';
  if (categoryKeywords.some(k => lower.includes(k))) return 'category_browse';
  if (paymentKeywords.some(k => lower.includes(k))) return 'payment_help';
  if (navigationKeywords.some(k => lower.includes(k))) return 'navigation_help';
  return 'general';
}
```

### Search Param Extractor

```typescript
function extractSearchParams(message: string) {
  const lower = message.toLowerCase();

  // Extract price ceiling — handles "under 200k", "less than 50000", "below 150,000"
  const priceMatch = lower.match(/(?:under|below|less than|max|maximum)?\s*(\d[\d,]*)\s*k?\b/);
  let maxPrice: number | null = null;
  if (priceMatch) {
    const raw = parseInt(priceMatch[1].replace(/,/g, ''));
    maxPrice = lower.includes('k') ? raw * 1000 : raw;
  }

  // Extract keyword (remove price text, common stop words)
  const keyword = message
    .replace(/under|below|less than|cheapest|show me|find|search for|do you sell/gi, '')
    .replace(/\d[\d,]*k?/g, '')
    .trim();

  return { keyword: keyword || null, maxPrice, minPrice: null, category: null };
}
```

### System Prompt Builder

```typescript
function buildSystemPrompt(context: any, productContext: string): string {
  return `
You are an AI shopping assistant for an e-commerce platform. You are embedded as a chat widget on the website.

## Your role
- Help users find products, navigate the site, understand checkout, and resolve payment questions
- Be concise, friendly, and helpful
- Never make up product names, prices, or details — only use the data provided to you
- Never discuss anything unrelated to the store or shopping

## Website structure
- Home: / — Landing page with featured products
- Products: /products — Full product listing with filters
- Categories: /categories — Browse by category
- Cart: /cart — View selected items, update quantities, proceed to checkout
- Checkout: /checkout — Enter shipping address and complete payment
- Account: /account — Manage profile, view order history
- Login: /login — Sign in to account
- Register: /register — Create new account

## How to buy (explain this when asked)
1. Browse or search for a product
2. Click the product to view details
3. Click "Add to Cart"
4. Go to cart (cart icon top right)
5. Click "Checkout"
6. Enter shipping address
7. Select payment method and complete payment
8. You'll receive a confirmation

## Payment help
- If payment fails: ask user to retry, check card details, ensure sufficient balance
- Supported methods: card payment, bank transfer (exact methods depend on platform config)
- Never ask for card numbers or PINs
- Never claim to process payments yourself

## Current page context
User is currently on: ${context?.currentPath ?? 'unknown page'}
${context?.currentProductName ? `They are viewing product: "${context.currentProductName}"` : ''}

## Live product data (if any)
${productContext || 'No product data fetched for this query.'}

## Response rules
- Keep replies under 120 words unless listing products
- Use plain conversational language
- If showing products, mention top 2–3 by name and price briefly, then say "See cards below for details"
- If user asks "is this available?" and they are on a product page, reference the product in context
- If no products found, say so honestly and suggest they browse /products
- Do not use markdown headers or bullet points in your reply — write in natural sentences
`.trim();
}
```

### Action Button Builder

```typescript
function buildActions(intent: string, context: any): ActionButton[] {
  switch (intent) {
    case 'product_search':
      return [{ label: 'Browse All Products', action: 'navigate', path: '/products' }];
    case 'category_browse':
      return [{ label: 'View Categories', action: 'navigate', path: '/categories' }];
    case 'navigation_help':
      return [
        { label: 'Go to Cart', action: 'navigate', path: '/cart' },
        { label: 'Checkout', action: 'navigate', path: '/checkout' }
      ];
    case 'payment_help':
      return [{ label: 'Go to Checkout', action: 'navigate', path: '/checkout' }];
    default:
      return [];
  }
}
```

---

## SECTION 5: SYSTEM PROMPT — FULL KNOWLEDGE BASE

The following knowledge is baked into the system prompt. The AI knows this at all times.

### Navigation Instructions (user-facing language the AI uses)

| User asks | AI response template |
|---|---|
| "Where is my cart?" | "Tap the cart icon at the top right of the page. Your selected items appear there." |
| "How do I checkout?" | "Go to your cart, review your items, then tap 'Checkout'. Enter your address and payment details to complete your order." |
| "How do I create an account?" | "Tap 'Sign Up' at the top right. Enter your name, email, and password to register." |
| "How do I search for a product?" | "Use the search bar at the top of the page. Type a product name, brand, or keyword." |
| "Where are electronics?" | "Go to Categories and select Electronics, or I can search for specific electronic products for you." |
| "Is this available?" | Check `context.currentProductName` — look up stock for that product and reply |

---

## SECTION 6: CONVERSATION MEMORY

The frontend sends the last **10 messages** (5 user + 5 bot turns) with every request. This enables:

- "I want phones" → "Under 200k" — AI remembers phones context
- "Show me more" — AI knows what category was being browsed
- Multi-step checkout guidance

The backend **does not persist** conversation to database. Memory is session-local (React state). If user closes and reopens chat, history resets.

---

## SECTION 7: ERROR HANDLING

### Frontend

```typescript
try {
  setIsLoading(true);
  const response = await sendMessage(input, messages, pageContext);
  // add bot message to state
} catch (err) {
  // Add fallback bot message
  addMessage({
    role: 'bot',
    text: "I'm having trouble connecting right now. Please try again in a moment.",
    products: [],
    actions: []
  });
} finally {
  setIsLoading(false);
}
```

### Backend

- If Groq API fails or returns empty: return `{ reply: "I'm temporarily unavailable. Please try again shortly.", products: [], actions: [] }` with HTTP 200
- If Supabase query fails: log error, continue without product data (AI will say no products found)
- Never return HTTP 500 to the frontend — always return structured JSON

---

## SECTION 8: SECURITY RULES — NON-NEGOTIABLE

1. The `GROQ_API_KEY` is **never** in any frontend file. It lives in `.env` on the server only.
2. The Supabase **service role key** is **never** in any frontend file.
3. The `/api/chat` endpoint only performs `SELECT` queries. No `INSERT`, `UPDATE`, `DELETE` ever.
4. Only query these tables: `products`, `product_images`, `product_specs`, `categories`, `product_categories`, `vendors` (name + verified only), `popular_searches`, `popular_categories`.
5. Never return any column from `user_profiles`, `orders`, `payments`, `addresses`, `carts` to the AI.
6. Add CORS headers to the `/api/chat` endpoint allowing only the frontend origin.

---

## SECTION 9: FILE STRUCTURE

Create only these new files:

```
src/
  components/
    chat/
      ChatWidget.tsx       ← Main widget (floating button + window)
      ChatMessage.tsx      ← Individual message bubble component
      ProductCard.tsx      ← Product card rendered inside chat
      useChatApi.ts        ← Hook for sending messages to /api/chat
      chat.types.ts        ← All TypeScript interfaces for chat
      ChatWidget.css       ← Animations only (open/close, typing dots)

supabase/
  functions/
    chat/
      index.ts             ← Edge Function handler (or equivalent /api/chat)
```

Mount `<ChatWidget />` once in `App.tsx` or the root layout component, outside all routes, so it persists across page navigation.

---

## SECTION 10: PERFORMANCE REQUIREMENTS

- Chat widget JS bundle impact: minimize — do not import heavy libraries just for chat
- AI response time target: under 3 seconds (Groq is fast; Supabase queries should be < 100ms)
- Product images: use `loading="lazy"` on all `<img>` tags in product cards
- Do not fetch product data on every keystroke — only on message submit
- Debounce is not needed (this is not an autocomplete input)
- The widget CSS uses `will-change: transform` on the animation containers only

---

## SECTION 11: INTEGRATION CHECKLIST

Before considering this complete, verify all of the following:

- [ ] Chat widget renders on all pages without overlapping navigation or checkout buttons
- [ ] On mobile, widget is a bottom sheet (not a floating card)
- [ ] On desktop, widget is bottom-right floating card
- [ ] Typing indicator appears while waiting for AI
- [ ] Quick prompts disappear after first message
- [ ] Product cards render with image, name, price, stock status, and link
- [ ] "View Product" links use correct slug: `/products/${slug}`
- [ ] Action buttons navigate correctly using React Router
- [ ] AI never mentions a product not in the database
- [ ] AI never reveals user private data
- [ ] API key never appears in frontend code
- [ ] Chat history (last 10 messages) is sent with each request
- [ ] Error fallback message renders if API fails
- [ ] Unread count badge shows when chat is closed and bot replies
- [ ] Auto-scroll to latest message works
- [ ] Send button is disabled during loading
- [ ] Enter key submits message
- [ ] Empty messages are never sent

---

## FINAL DELIVERABLE SUMMARY

This spec produces a **self-contained, production-ready AI chatbot** that:

- Floats on all pages of the React + Vite + TypeScript + Supabase e-commerce site
- Understands the site's full page structure and user flows
- Queries live product data from Supabase in real time
- Streams natural language replies from Groq (deepseek-r1-distill-llama-70b)
- Returns clickable product cards and navigation action buttons
- Maintains short-term conversation memory within the session
- Operates 24/7 with no human agents required
- Respects all security boundaries — no private data, no write access

Build it exactly as specified. Do not simplify, skip, or substitute any component.
