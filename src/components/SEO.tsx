import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  ogType?: string;
  canonical?: string;
  robots?: string;
  schema?: object | object[];
}

/**
 * SEO Component - Dynamically manages metadata, Open Graph, Twitter, Canonical,
 * and JSON-LD Structured Data tags in the document head for SPAs.
 */
export function SEO({
  title,
  description,
  keywords,
  image,
  ogType = 'website',
  canonical,
  robots,
  schema
}: SEOProps) {
  const location = useLocation();
  const currentUrl = `https://mysuperstore.co${location.pathname}${location.search}`;

  useEffect(() => {
    // 1. Manage Document Title
    const defaultTitle = "MySuperStore Nigeria | Premium Electronics, Fashion & Home Goods";
    const finalTitle = title ? `${title} | MySuperStore` : defaultTitle;
    document.title = finalTitle;

    // Helper function to set or append meta tags
    const setMetaTag = (attrName: string, attrValue: string, contentValue: string) => {
      let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', contentValue);
    };



    // 2. Meta Description
    const defaultDesc = "Curating excellence in luxury fashion, premium electronics, and home goods in Nigeria. Shop top quality brands at MySuperStore.";
    const finalDesc = description || defaultDesc;
    setMetaTag('name', 'description', finalDesc.slice(0, 155));

    // 3. Meta Keywords
    const defaultKeywords = "luxury shopping, e-commerce nigeria, premium electronics, luxury fashion, home goods, online store lagos";
    const finalKeywords = keywords || defaultKeywords;
    setMetaTag('name', 'keywords', finalKeywords);

    // 4. Robots Directives (e.g., noindex)
    if (robots) {
      setMetaTag('name', 'robots', robots);
    } else {
      // Default to index, follow for public pages
      setMetaTag('name', 'robots', 'index, follow');
    }

    // 5. Open Graph / Facebook Tags
    setMetaTag('property', 'og:title', finalTitle);
    setMetaTag('property', 'og:description', finalDesc);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:url', canonical || currentUrl);
    setMetaTag('property', 'og:image', image || 'https://mysuperstore.co/logo.png');
    setMetaTag('property', 'og:site_name', 'MySuperStore Nigeria');

    // 6. Twitter Card Tags
    setMetaTag('name', 'twitter:title', finalTitle);
    setMetaTag('name', 'twitter:description', finalDesc.slice(0, 155));
    setMetaTag('name', 'twitter:image', image || 'https://mysuperstore.co/logo.png');
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:site', '@mysuperstore');

    // 7. Canonical Link Tag
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonical || currentUrl);

    // 8. Inject Dynamic JSON-LD Structured Data Schema
    const scriptId = 'jsonld-schema-dynamic';
    let scriptEl = document.getElementById(scriptId);
    
    if (schema) {
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = scriptId;
        scriptEl.setAttribute('type', 'application/ld+json');
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(schema);
    } else {
      if (scriptEl) {
        scriptEl.remove();
      }
    }

    return () => {
      // Optional cleanup on unmount
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };
  }, [title, description, keywords, image, ogType, canonical, robots, schema, currentUrl]);

  return null;
}
