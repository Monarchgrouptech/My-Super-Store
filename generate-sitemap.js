import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Regex-based environment variable loader for local .env files
function loadEnv() {
  const envPath = path.resolve(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('WARNING: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not defined. Skipping dynamic sitemap generation.');
  process.exit(0);
}

const baseUrl = 'https://mysuperstore.co';

async function generate() {
  console.log('Generating sitemap.xml dynamically from Supabase database...');
  try {
    // Fetch products
    const productsRes = await fetch(`${supabaseUrl}/rest/v1/products?select=id,slug,published&published=eq.true`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    
    if (!productsRes.ok) {
      throw new Error(`Failed to fetch products: ${productsRes.statusText}`);
    }
    const products = await productsRes.json();
    console.log(`Fetched ${products.length} published products.`);
    
    // Fetch categories
    const categoriesRes = await fetch(`${supabaseUrl}/rest/v1/categories?select=id,name,slug`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    
    let categories = [];
    if (categoriesRes.ok) {
      categories = await categoriesRes.json();
      console.log(`Fetched ${categories.length} categories.`);
    } else {
      console.warn('Warning: Failed to fetch categories from database, using static fallback.');
      categories = [
        { name: 'Cosmetics', slug: 'cosmetics' },
        { name: 'Construction', slug: 'construction' },
        { name: 'Furniture', slug: 'furniture' },
        { name: 'Clothing and Fashion', slug: 'clothing-and-fashion' },
        { name: 'Events Tools', slug: 'events-tools' },
        { name: 'Electrical Appliances', slug: 'electrical-appliances' }
      ];
    }

    // Static URLs - only indexable public pages
    const staticUrls = [
      '',        // Home - priority 1.0
      '/shop',   // Shop - priority 0.8
      '/about',  // About - priority 0.8
      '/login',  // Login/Register - now indexable
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    const today = new Date().toISOString().split('T')[0];

    // Per-URL config for static pages
    const staticUrlConfig: Record<string, { priority: string; changefreq: string }> = {
      '':       { priority: '1.0', changefreq: 'daily' },
      '/shop':  { priority: '0.9', changefreq: 'daily' },
      '/about': { priority: '0.7', changefreq: 'monthly' },
      '/login': { priority: '0.5', changefreq: 'monthly' },
    };

    // 1. Add static URLs
    staticUrls.forEach(url => {
      const cfg = staticUrlConfig[url] || { priority: '0.8', changefreq: 'weekly' };
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}${url}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>${cfg.changefreq}</changefreq>\n`;
      xml += `    <priority>${cfg.priority}</priority>\n`;
      xml += `  </url>\n`;
    });

    // 2. Add categories
    categories.forEach(cat => {
      const slug = cat.slug || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (slug === 'gfygf') return; // Filter out test category
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/categories/${slug}</loc>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    });

    // 3. Add products
    products.forEach(prod => {
      const identifier = prod.slug || prod.id;
      if (identifier === 'test') return; // Filter out test product
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/product/${identifier}</loc>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.6</priority>\n`;
      xml += `  </url>\n`;
    });

    xml += `</urlset>`;

    // Save to public directory
    const publicPath = path.resolve(__dirname, 'public', 'sitemap.xml');
    fs.writeFileSync(publicPath, xml, 'utf-8');
    console.log(`Sitemap written to ${publicPath}`);

    // Save to dist directory if it exists
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      const distPath = path.resolve(__dirname, 'dist', 'sitemap.xml');
      fs.writeFileSync(distPath, xml, 'utf-8');
      console.log(`Sitemap written to ${distPath}`);
    }
  } catch (err) {
    console.error('Error generating sitemap:', err);
  }
}

generate();
