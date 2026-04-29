import { supabase } from '../../lib/supabase';
import type { ChatAPIResponse, Message, PageContext, ProductCardData, ActionButton } from './chat.types';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL = 'openai/gpt-oss-120b';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function extractIntent(userMessage: string, _history: Message[]) {
  if (!GROQ_API_KEY) return null;

  const extractionPrompt = `You are a data extraction bot. Analyze the user's message to extract intent and search parameters.
Return ONLY a valid JSON object. Do not include any reasoning, markdown blocks, or preamble.

Structure:
{
  "intent": "product_search" | "category_browse" | "order_status" | "address_info" | "payment_info" | "navigation_help" | "payment_help" | "general",
  "params": {
    "keyword": string,
    "maxPrice": number,
    "minPrice": number,
    "category": string,
    "orderId": string
  }
}

User Message: "${userMessage}"`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'system', content: extractionPrompt }],
        temperature: 0.1,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Groq Intent Error:', err);
      return null;
    }
    const data = await response.json();
    let content = data.choices[0]?.message?.content || '{}';
    
    // Cleanup content if model included markdown or reasoning outside the JSON object
    content = content.trim();
    if (content.includes('```json')) {
      content = content.split('```json')[1].split('```')[0].trim();
    } else if (content.includes('```')) {
      content = content.split('```')[1].split('```')[0].trim();
    }
    
    // If there's still reasoning text before the JSON object {
    if (content.indexOf('{') > 0) {
      content = content.substring(content.indexOf('{'));
    }
    // If there's text after the last }
    if (content.lastIndexOf('}') < content.length - 1) {
      content = content.substring(0, content.lastIndexOf('}') + 1);
    }

    return JSON.parse(content);
  } catch (e) {
    console.error('Intent extraction failed:', e);
    return null;
  }
}

function detectIntentFallback(message: string): string {
  const lower = message.toLowerCase();
  const productKeywords = ['find', 'show', 'search', 'buy', 'cheapest', 'price', 'phone', 'laptop', 'shoe', 'sell', 'stock', 'available', 'product', 'products','brand', 'samsung', 'apple', 'under'];
  const categoryKeywords = ['category', 'categories', 'browse', 'section', 'department'];
  const navigationKeywords = ['cart', 'checkout', 'how to', 'where is', 'navigate', 'find page', 'account', 'login', 'sign up', 'register'];
  const paymentKeywords = ['payment', 'pay', 'failed', 'not working', 'transaction', 'card', 'transfer'];
  const orderKeywords = ['order', 'tracking', 'status', 'where is my', 'package'];
  const addressKeywords = ['address', 'shipping', 'delivery address'];

  if (productKeywords.some(k => lower.includes(k))) return 'product_search';
  if (categoryKeywords.some(k => lower.includes(k))) return 'category_browse';
  if (orderKeywords.some(k => lower.includes(k))) return 'order_status';
  if (addressKeywords.some(k => lower.includes(k))) return 'address_info';
  if (paymentKeywords.some(k => lower.includes(k))) return 'payment_help';
  if (navigationKeywords.some(k => lower.includes(k))) return 'navigation_help';
  return 'general';
}

function extractSearchParamsFallback(message: string) {
  const lower = message.toLowerCase();

  // Extract price ceiling — handles "under 200k", "less than 50000", "below 150,000"
  const priceMatch = lower.match(/(?:under|below|less than|max|maximum)?\s*(\d[\d,]*)\s*k?\b/);
  let maxPrice: number | null = null;
  if (priceMatch) {
    const raw = parseInt(priceMatch[1].replace(/,/g, ''));
    maxPrice = lower.includes('k') ? raw * 1000 : raw;
  }

  // Extract Order ID (e.g., #123, order 123)
  const orderIdMatch = lower.match(/(?:order|#)\s*([a-f0-9-]{8,})/i) || lower.match(/(?:order|#)\s*(\d+)/);
  const orderId = orderIdMatch ? orderIdMatch[1] : null;

  // Extract keyword (remove price text, common stop words)
  const keyword = message
    .replace(/under|below|less than|cheapest|show me|find|search for|do you sell|order|#\s*\d+/gi, '')
    .replace(/\d[\d,]*k?/g, '')
    .trim();

  return { keyword: keyword || null, maxPrice, minPrice: null, category: null, orderId };
}

export async function sendMessage(
  userMessage: string,
  history: Message[],
  context: PageContext,
  userId?: string
): Promise<ChatAPIResponse> {
  if (!GROQ_API_KEY) {
    throw new Error('Groq API key is not configured');
  }

  // Step 1: Extract intent and parameters
  let extracted = await extractIntent(userMessage, history);
  
  // Use fallback logic if LLM extraction fails
  if (!extracted || !extracted.intent) {
    const fallbackIntent = detectIntentFallback(userMessage);
    const fallbackParams = extractSearchParamsFallback(userMessage);
    extracted = {
      intent: fallbackIntent,
      params: fallbackParams
    };
  }

  const intent = extracted.intent;
  const params = extracted.params || {};

  let dbContext = '';
  let foundProducts: ProductCardData[] = [];
  let foundActions: ActionButton[] = [];

  // Add context about the current product if on a product page
  if (context.currentProductId) {
    try {
      const { data: currentProduct } = await supabase
        .from('products')
        .select('id, name, price, stock, brand, short_description')
        .or(`id.eq.${context.currentProductId},slug.eq.${context.currentProductId}`)
        .single();

      if (currentProduct) {
        const { data: specs } = await supabase
          .from('product_specs')
          .select('spec_key, spec_value')
          .eq('product_id', currentProduct.id);

        dbContext += `\nCurrently viewing product: ${currentProduct.name} (Price: ${currentProduct.price}, Stock: ${currentProduct.stock}, Brand: ${currentProduct.brand})`;
        if (specs?.length) {
          dbContext += `\nProduct Specs: ${specs.map(s => `${s.spec_key}: ${s.spec_value}`).join(', ')}`;
        }
      }
    } catch (e) {
      console.error('Failed to fetch current product context:', e);
    }
  }

  // Step 2: Query Supabase based on intent
  try {
    if (intent === 'product_search' || (intent === 'general' && (userMessage.toLowerCase().includes('find') || userMessage.toLowerCase().includes('search')))) {
      let query = supabase
        .from('products')
        .select('id, name, slug, short_description, price, stock, brand, seller_id, vendors(business_name)')
        .eq('published', true)
        .gt('stock', 0);

      if (params.category) {
        // Multi-step: first find category ID
        const { data: catData } = await supabase
          .from('categories')
          .select('id')
          .or(`name.ilike.%${params.category}%,slug.ilike.%${params.category}%`)
          .single();
        
        if (catData) {
          // Join with product_categories
          const { data: productIds } = await supabase
            .from('product_categories')
            .select('product_id')
            .eq('category_id', catData.id);
          
          if (productIds?.length) {
            query = query.in('id', productIds.map(p => p.product_id));
          }
        }
      }

      if (params.keyword) {
        // Search in name, brand, and short_description
        query = query.or(`name.ilike.%${params.keyword}%,brand.ilike.%${params.keyword}%,short_description.ilike.%${params.keyword}%`);
      } else if (!params.category) {
        // Try searching for the whole user message if no specific keyword or category extracted
        query = query.or(`name.ilike.%${userMessage}%,brand.ilike.%${userMessage}%,short_description.ilike.%${userMessage}%`);
      }

      if (params.maxPrice) query = query.lte('price', params.maxPrice);
      if (params.minPrice) query = query.gte('price', params.minPrice);

      let { data: productData, error } = await query.limit(4);

      // If no results, try splitting the keyword into words for a broader search
      if (!error && (!productData || productData.length === 0) && params.keyword) {
        const words = params.keyword.split(/\s+/).filter((w: string) => w.length > 2);
        if (words.length > 0) {
          let broadQuery = supabase
            .from('products')
            .select('id, name, slug, short_description, price, stock, brand, seller_id, vendors(business_name)')
            .eq('published', true)
            .gt('stock', 0);
          
          const orConditions = words.map((w: string) => `name.ilike.%${w}%,brand.ilike.%${w}%`).join(',');
          const { data: broadData } = await broadQuery.or(orConditions).limit(4);
          if (broadData?.length) productData = broadData;
        }
      }
      
      if (!error && productData?.length) {
        const ids = productData.map(p => p.id);
        const { data: images } = await supabase
          .from('product_images')
          .select('product_id, url')
          .in('product_id', ids)
          .eq('position', 0);

        foundProducts = productData.map(p => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.price,
          stock: p.stock,
          brand: p.brand,
          image_url: images?.find(img => img.product_id === p.id)?.url || null,
          vendors: Array.isArray(p.vendors) ? p.vendors[0] : p.vendors
        }));

        dbContext += `\nFound Products: ${JSON.stringify(foundProducts.map(p => ({ 
          name: p.name, 
          price: p.price, 
          stock: p.stock, 
          brand: p.brand,
          seller: (p.vendors as any)?.business_name 
        })), null, 2)}`;
        foundActions.push({ label: 'Browse All Products', action: 'navigate', path: '/products' });
      } else {
        // If no products found, try fetching popular categories to suggest
        const { data: popularCats } = await supabase
          .from('popular_categories')
          .select('category_id, categories(name, slug)')
          .order('search_count', { ascending: false })
          .limit(3);
        
        if (popularCats?.length) {
          dbContext += `\nNo products found. Popular categories to suggest: ${popularCats.map(pc => (pc.categories as any)?.name).join(', ')}`;
        } else {
          dbContext += `\nNo products found matching the search.`;
        }
      }
    }

    if (intent === 'category_browse' || userMessage.toLowerCase().includes('category')) {
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name, slug')
        .is('parent_id', null);
      
      if (categories) {
        // Fetch counts for these categories
        const { data: counts } = await supabase
          .from('product_categories')
          .select('category_id');
        
        const categoryCounts = categories.map(c => {
          const count = counts?.filter(pc => pc.category_id === c.id).length || 0;
          return { name: c.name, count, slug: c.slug };
        });

        dbContext += `\nAvailable categories and product counts: ${categoryCounts.map(c => `${c.name} (${c.count} products)`).join(', ')}`;
        foundActions = categories.slice(0, 3).map(c => ({
          label: `Browse ${c.name}`,
          action: 'navigate',
          path: `/categories/${c.slug}`
        }));
      }
    }

    if (userId && (intent === 'order_status' || userMessage.toLowerCase().includes('order'))) {
      let query = supabase
        .from('orders')
        .select('id, status, total_amount, placed_at, currency')
        .eq('user_id', userId)
        .order('placed_at', { ascending: false });

      if (params.orderId) {
        // Try searching for specific order ID if provided
        query = query.or(`id.eq.${params.orderId}`);
      } else {
        query = query.limit(3);
      }

      const { data: orders, error } = await query;

      if (!error && orders?.length) {
        const targetOrder = orders[0];
        const { data: items } = await supabase
          .from('order_items')
          .select('product_id, quantity, unit_price, products(name)')
          .eq('order_id', targetOrder.id);

        dbContext += `\nUser's ${params.orderId ? 'Requested' : 'Recent'} Order(s): ${JSON.stringify(orders.map(o => ({ id: o.id, status: o.status, total: o.total_amount, currency: o.currency, date: o.placed_at })), null, 2)}`;
        if (items?.length) {
          dbContext += `\nItems in order (${targetOrder.id}): ${JSON.stringify(items.map(i => ({ name: (i.products as any)?.name, quantity: i.quantity, price: i.unit_price })), null, 2)}`;
        }
        foundActions.push({ label: 'View All Orders', action: 'navigate', path: '/account/orders' });
      } else {
        dbContext += `\nNo ${params.orderId ? 'matching ' : 'recent '}orders found for this user.`;
      }
    }

    if (userId && (intent === 'address_info' || userMessage.toLowerCase().includes('address'))) {
      const { data: addresses } = await supabase
        .from('addresses')
        .select('id, label, line1, line2, city, state, country, postal_code')
        .eq('user_id', userId);

      if (addresses?.length) {
        dbContext += `\nUser's Saved Addresses: ${JSON.stringify(addresses.map(a => ({ label: a.label, line1: a.line1, line2: a.line2, city: a.city, state: a.state, country: a.country, zip: a.postal_code })), null, 2)}`;
      } else {
        dbContext += `\nNo saved addresses found for this user.`;
      }
      foundActions.push({ label: 'Manage Addresses', action: 'navigate', path: '/account/addresses' });
    }

    if (userId && (intent === 'payment_info' || intent === 'payment_help' || userMessage.toLowerCase().includes('payment'))) {
      const { data: userOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', userId);
      
      if (userOrders?.length) {
        const orderIds = userOrders.map(o => o.id);
        const { data: payments } = await supabase
          .from('payments')
          .select('id, order_id, amount, status, provider, created_at')
          .in('order_id', orderIds)
          .order('created_at', { ascending: false })
          .limit(3);
        
        if (payments?.length) {
          dbContext += `\nUser's Recent Payments: ${JSON.stringify(payments.map(p => ({ id: p.id, amount: p.amount, status: p.status, provider: p.provider, order_id: p.order_id, date: p.created_at })), null, 2)}`;
        } else {
          dbContext += `\nNo recent payments found for this user.`;
        }
      }
      foundActions.push({ label: 'Payment Help', action: 'navigate', path: '/checkout' });
    }

    if (intent === 'navigation_help') {
      foundActions.push(
        { label: 'Go to Cart', action: 'navigate', path: '/cart' },
        { label: 'Go to Checkout', action: 'navigate', path: '/checkout' }
      );
    }

  } catch (e) {
    console.error('Supabase query failed:', e);
  }

  // Step 3: Final AI Call
  const systemPrompt = `You are a helpful and professional AI shopping assistant for "My Superstore".
You are embedded as a chat widget on the website.

## Your role
- Help users find products, navigate the site, understand checkout, and resolve payment or order questions.
- Be concise, friendly, and helpful.
- Never make up product names, prices, or details — only use the data provided to you in the Database Context.
- Never discuss anything unrelated to the store or shopping.

## Website structure
- Home: / — Landing page with featured products
- Products: /products — Full product listing with filters
- Categories: /categories — Browse by category
- Cart: /cart — View selected items, update quantities, proceed to checkout
- Checkout: /checkout — Enter shipping address and complete payment
- Account: /account — Manage profile, view order history
- Orders: /account/orders — View specific order details
- Addresses: /account/addresses — Manage shipping addresses
- Login: /login — Sign in to account
- Register: /register — Create new account

## How to buy
1. Browse or search for a product
2. Click the product to view details
3. Click "Add to Cart"
4. Go to cart (cart icon top right)
5. Click "Checkout"
6. Enter shipping address
7. Select payment method and complete payment
8. You'll receive a confirmation

## Payment help
- If payment fails: ask user to retry, check card details, ensure sufficient balance.
- Supported methods: card payment, bank transfer.
- Never ask for card numbers or PINs.
- Never claim to process payments yourself.

## Response rules
- Keep replies under 120 words unless listing products.
- Use plain conversational language.
- If showing products, mention top 2–3 by name and price briefly, then say "See cards below for details".
- If user asks "is this available?" and they are on a product page, reference the product in context.
- If no products found, say so honestly and suggest they browse /products.
- Do not use markdown headers in your reply (no #, ##, etc.) — write in natural sentences.
- You can use **bold** for product names or emphasis.
- Never mention internal technical details like "Database Context" or "Supabase".
- If the user is asking about their orders/payments and they aren't logged in, ask them to login first.

## Context
Current page: ${context.currentPath}
${context.currentProductName ? `Viewing product: "${context.currentProductName}"` : ''}
${userId ? `User ID: ${userId} (Logged in)` : 'User is not logged in'}

Database Context:
${dbContext || 'No specific data found in database for this query.'}

`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10).map((msg) => ({
      role: msg.role === 'bot' ? 'assistant' : 'user',
      content: msg.text,
    })),
    { role: 'user', content: userMessage },
  ];

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.4,
      max_tokens: 512,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Groq API Error:', errorData);
    throw new Error('Chat API failed');
  }

  const data = await response.json();
  const reply = data.choices[0]?.message?.content || "I'm sorry, I couldn't process that request.";

  return {
    reply,
    products: foundProducts,
    actions: foundActions,
  } as ChatAPIResponse;
}
