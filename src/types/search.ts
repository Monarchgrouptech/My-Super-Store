// Search and Analytics TypeScript Types

export interface SearchProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  short_description: string | null;
  image_url?: string; // Primary product image
  category_name?: string;
  published: boolean;
  view_count: number;
  search_hit_count: number;
}

export interface SearchCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

export interface SearchResult {
  type: 'product' | 'category';
  id: string;
  name: string;
  slug: string;
  metadata?: SearchProduct | SearchCategory;
}

export interface PopularSearch {
  id?: string;
  query: string;
  search_count: number;
  last_searched_at: string;
  created_at?: string;
}

export interface PopularCategory {
  id?: string;
  category_id: string;
  category_name: string;
  search_count: number;
  last_searched_at: string;
  created_at?: string;
}
