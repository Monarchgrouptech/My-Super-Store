import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

type Intent = 'product_search' | 'category_browse' | 'payment_help' | 'navigation_help' | 'general';

interface RequestBody {
  message?: string;
  history?: Array<{ role: 'assistant' | 'user'; content: string }>;
  context?: {
    currentPath?: string;
    currentProductId?: string;
    currentProductName?: string;
  };
}

interface ProductResult {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  price: number;
  stock: number;
  published: boolean;
  brand: string | null;
  image_url?: string | null;
}

interface SearchParams {
  keyword: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  category: string | null;
}

interface ActionButton {
  label: string;
  action: 'navigate' | 'sendMessage';
  path?: string;
  message?: string;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const GROQ_PRIMARY_MODEL = Deno.env.get('GROQ_PRIMARY_MODEL') || 'deepseek-r1-distill-llama-70b';
const GROQ_FALLBACK_MODEL = Deno.env.get('GROQ_FALLBACK_MODEL') || 'llama-3.1-8b-instant';
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required Supabase server environment variables.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function buildCorsHeaders(origin: string | null) {
  const allowedOrigin = ALLOWED_ORIGIN || origin || '*';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  };
}

function jsonResponse(body: Record<string, unknown>, origin: string | null, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: buildCorsHeaders(origin),
  });
}

function detectIntent(message: string): Intent {
  const lower = message.toLowerCase();
  const productKeywords = [
    'find',
    'show',
    'search',
    'buy',
    'cheapest',
    'price',
    'phone',
    'laptop',
    'shoe',
    'stock',
    'available',
    'product',
    'brand',
    'samsung',
    'apple',
    'under',
  ];
  const categoryKeywords = ['category', 'categories', 'browse', 'section', 'department'];
  const navigationKeywords = ['cart', 'checkout', 'how to', 'where is', 'navigate', 'find page', 'account', 'login', 'sign up', 'register'];
  const paymentKeywords = ['payment', 'pay', 'failed', 'not working', 'transaction', 'card', 'transfer'];

  if (productKeywords.some((keyword) => lower.includes(keyword))) return 'product_search';
  if (categoryKeywords.some((keyword) => lower.includes(keyword))) return 'category_browse';
  if (paymentKeywords.some((keyword) => lower.includes(keyword))) return 'payment_help';
  if (navigationKeywords.some((keyword) => lower.includes(keyword))) return 'navigation_help';
  return 'general';
}

function parsePriceToken(value: string | undefined) {
  if (!value) return null;
  const normalized = value.replace(/,/g, '').trim();
  const hasK = normalized.toLowerCase().endsWith('k');
  const baseValue = Number.parseInt(normalized.replace(/k$/i, ''), 10);
  if (Number.isNaN(baseValue)) return null;
  return hasK ? baseValue * 1000 : baseValue;
}

function extractSearchParams(message: string): SearchParams {
  const lower = message.toLowerCase();
  const maxMatch = lower.match(/(?:under|below|less than|max|maximum)\s+(\d[\d,]*k?)/i);
  const minMatch = lower.match(/(?:over|above|more than|min|minimum)\s+(\d[\d,]*k?)/i);
  const categoryMatch = lower.match(
    /\b(phone|phones|laptop|laptops|shoe|shoes|cosmetics|construction|furniture|fashion|clothing|events tools|electrical appliances|electronics)\b/i,
  );

  const keyword = message
    .replace(/under|below|less than|over|above|more than|minimum|max|maximum|cheapest|show me|find|search for|do you sell/gi, '')
    .replace(/\d[\d,]*k?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    keyword: keyword || null,
    minPrice: parsePriceToken(minMatch?.[1]),
    maxPrice: parsePriceToken(maxMatch?.[1]),
    category: categoryMatch?.[1] ? categoryMatch[1].toLowerCase() : null,
  };
}

async function fetchProductImages(client: SupabaseClient, productIds: string[]) {
  if (!productIds.length) return [];

  const { data: images, error } = await client
    .from('product_images')
    .select('product_id, url, alt_text, position')
    .in('product_id', productIds);

  if (error) throw error;
  return images ?? [];
}

async function fetchProductsForSearch(
  client: SupabaseClient,
  searchParams: SearchParams,
): Promise<{ products: ProductResult[]; productContext: string }> {
  let query = client
    .from('products')
    .select('id, name, slug, short_description, price, stock, published, brand')
    .eq('published', true)
    .gt('stock', 0)
    .limit(4);

  if (searchParams.keyword) {
    query = query.or(
      `name.ilike.%${searchParams.keyword}%,short_description.ilike.%${searchParams.keyword}%,brand.ilike.%${searchParams.keyword}%`,
    );
  }

  if (searchParams.maxPrice !== null) {
    query = query.lte('price', searchParams.maxPrice);
  }

  if (searchParams.minPrice !== null) {
    query = query.gte('price', searchParams.minPrice);
  }

  const { data: productData, error } = await query;
  if (error) throw error;

  let filteredProducts = productData ?? [];

  if (searchParams.category && filteredProducts.length) {
    const { data: categoryRows, error: categoryError } = await client
      .from('categories')
      .select('id, name, slug, parent_id')
      .or(`name.ilike.%${searchParams.category}%,slug.ilike.%${searchParams.category}%`);
    if (categoryError) throw categoryError;

    const categoryIds = (categoryRows ?? []).map((category) => category.id);
    if (categoryIds.length) {
      const { data: joins, error: joinError } = await client
        .from('product_categories')
        .select('product_id, category_id')
        .in('product_id', filteredProducts.map((product) => product.id))
        .in('category_id', categoryIds);
      if (joinError) throw joinError;

      const allowedProductIds = new Set((joins ?? []).map((row) => row.product_id));
      filteredProducts = filteredProducts.filter((product) => allowedProductIds.has(product.id));
    } else {
      filteredProducts = [];
    }
  }

  const images = await fetchProductImages(
    client,
    filteredProducts.map((product) => product.id),
  );

  const products = filteredProducts.map((product) => {
    const image = images
      .filter((candidate) => candidate.product_id === product.id)
      .sort((left, right) => (left.position ?? 0) - (right.position ?? 0))[0];

    return {
      ...product,
      image_url: image?.url ?? null,
    };
  });

  if (!products.length) {
    return {
      products,
      productContext: 'No products found matching the search.',
    };
  }

  return {
    products,
    productContext: `Found ${products.length} matching products:\n${JSON.stringify(
      products.map((product) => ({
        name: product.name,
        price: product.price,
        stock: product.stock,
        brand: product.brand,
        short_description: product.short_description,
      })),
      null,
      2,
    )}`,
  };
}

function isAvailabilityQuestion(message: string) {
  return /\b(is this available|availability|in stock|out of stock|is it available|do you have this)\b/i.test(message);
}

async function fetchCurrentProductContext(
  client: SupabaseClient,
  currentProductId: string | undefined,
): Promise<{ products: ProductResult[]; productContext: string } | null> {
  if (!currentProductId) return null;

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const identifierColumn = uuidPattern.test(currentProductId) ? 'id' : 'slug';

  const { data: productData, error } = await client
    .from('products')
    .select('id, name, slug, short_description, price, stock, published, brand')
    .eq(identifierColumn, currentProductId)
    .limit(1);

  if (error) throw error;

  const product = productData?.[0];
  if (!product) return null;

  const images = await fetchProductImages(client, [product.id]);
  const image = images.sort((left, right) => (left.position ?? 0) - (right.position ?? 0))[0];

  const enrichedProduct = { ...product, image_url: image?.url ?? null };

  return {
    products: [enrichedProduct],
    productContext: `Current product page context:\n${JSON.stringify(
      {
        name: enrichedProduct.name,
        price: enrichedProduct.price,
        stock: enrichedProduct.stock,
        brand: enrichedProduct.brand,
        short_description: enrichedProduct.short_description,
      },
      null,
      2,
    )}`,
  };
}

async function fetchCategoryContext(client: SupabaseClient) {
  const { data: categories, error } = await client
    .from('categories')
    .select('id, name, slug, parent_id')
    .is('parent_id', null);
  if (error) throw error;

  const categoryList = categories ?? [];
  return {
    productContext: `Available categories: ${categoryList.map((category) => category.name).join(', ')}`,
  };
}

function buildSystemPrompt(
  context: RequestBody['context'],
  productContext: string,
): string {
  return `
You are an AI shopping assistant for an e-commerce platform. You are embedded as a chat widget on the website.

## Your role
- Help users find products, navigate the site, understand checkout, and resolve payment questions
- Be concise, friendly, and helpful
- Never make up product names, prices, or details; only use the data provided to you
- Never discuss anything unrelated to the store or shopping

## Website structure
- Home: /
- Products: /products
- Categories: /categories
- Cart: /cart
- Checkout: /checkout
- Account: /account
- Login: /login
- Register: /register

## How to buy
1. Browse or search for a product
2. Open the product details page
3. Click "Add to Cart"
4. Go to the cart
5. Click "Checkout"
6. Enter shipping address
7. Select a payment method and complete the order
8. Wait for confirmation

## Payment help
- If payment fails, ask the user to retry, check card details, and confirm sufficient balance
- Supported methods may include card payment and bank transfer depending on platform configuration
- Never ask for card numbers, PINs, CVVs, or private account details
- Never claim to process payments yourself

## Current page context
User is currently on: ${context?.currentPath ?? 'unknown page'}
${context?.currentProductName ? `They are viewing product: "${context.currentProductName}"` : ''}

## Live product data
${productContext || 'No product data fetched for this query.'}

## Response rules
- Keep replies under 120 words unless listing products
- Use plain conversational language
- If showing products, mention the top 2 or 3 by name and price briefly, then say "See cards below for details"
- If the user asks whether the current product is available, answer from the product context honestly
- If no products were found, say so and suggest browsing /products
- Do not use markdown headers or bullet points in your reply
`.trim();
}

function buildActions(intent: Intent): ActionButton[] {
  switch (intent) {
    case 'product_search':
      return [{ label: 'Browse All Products', action: 'navigate', path: '/products' }];
    case 'category_browse':
      return [{ label: 'View Categories', action: 'navigate', path: '/categories' }];
    case 'navigation_help':
      return [
        { label: 'Go to Cart', action: 'navigate', path: '/cart' },
        { label: 'Checkout', action: 'navigate', path: '/checkout' },
      ];
    case 'payment_help':
      return [{ label: 'Go to Checkout', action: 'navigate', path: '/checkout' }];
    default:
      return [];
  }
}

async function requestGroqReply(systemPrompt: string, history: NonNullable<RequestBody['history']>, message: string) {
  if (!GROQ_API_KEY) {
    throw new Error('Missing GROQ_API_KEY');
  }

  const payload = {
    max_tokens: 512,
    temperature: 0.4,
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ],
  };

  const candidateModels = [GROQ_PRIMARY_MODEL, GROQ_FALLBACK_MODEL].filter(Boolean);
  let lastError: Error | null = null;

  for (const model of candidateModels) {
    try {
      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          model,
        }),
      });

      if (!groqResponse.ok) {
        throw new Error(`Groq request failed with status ${groqResponse.status}`);
      }

      const groqData = await groqResponse.json();
      const reply = groqData.choices?.[0]?.message?.content?.trim();
      if (reply) {
        return reply;
      }

      throw new Error('Groq returned an empty response.');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown Groq error');
      console.error(`Groq model ${model} failed`, lastError);
    }
  }

  throw lastError ?? new Error('Groq request failed.');
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin');

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: buildCorsHeaders(origin),
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse(
      {
        reply: "I'm temporarily unavailable. Please try again shortly.",
        products: [],
        actions: [],
      },
      origin,
      200,
    );
  }

  try {
    const body = (await request.json()) as RequestBody;
    const message = body.message?.trim() || '';
    const history = body.history ?? [];
    const context = body.context ?? {};

    if (!message) {
      return jsonResponse(
        {
          reply: 'Please send a message so I can help.',
          products: [],
          actions: [],
        },
        origin,
      );
    }

    const intent = detectIntent(message);
    let products: ProductResult[] = [];
    let productContext = '';

    try {
      if (intent === 'product_search') {
        const searchResult = await fetchProductsForSearch(supabase, extractSearchParams(message));
        products = searchResult.products;
        productContext = searchResult.productContext;
      } else if (intent === 'category_browse') {
        const categoryResult = await fetchCategoryContext(supabase);
        productContext = categoryResult.productContext;
      } else if (context.currentProductId && isAvailabilityQuestion(message)) {
        const currentProductResult = await fetchCurrentProductContext(supabase, context.currentProductId);
        if (currentProductResult) {
          products = currentProductResult.products;
          productContext = currentProductResult.productContext;
        }
      }
    } catch (queryError) {
      console.error('Chat data query failed', queryError);
      productContext = 'No products found matching the search.';
      products = [];
    }

    const systemPrompt = buildSystemPrompt(context, productContext);
    const actions = buildActions(intent);

    try {
      const reply = await requestGroqReply(systemPrompt, history, message);
      return jsonResponse({ reply, products, actions }, origin);
    } catch (groqError) {
      console.error('Groq request failed', groqError);
      return jsonResponse(
        {
          reply: "I'm temporarily unavailable. Please try again shortly.",
          products: [],
          actions: [],
        },
        origin,
      );
    }
  } catch (error) {
    console.error('Unexpected chat handler failure', error);
    return jsonResponse(
      {
        reply: "I'm temporarily unavailable. Please try again shortly.",
        products: [],
        actions: [],
      },
      origin,
    );
  }
});
