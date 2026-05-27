// Vendor Dashboard TypeScript Types

export interface Vendor {
    id: string;
    user_id: string;
    business_name: string;
    logo_url: string | null;
    email: string;
    phone: string | null;
    country: string | null;
    city: string | null;
    address: string | null;
    bank_name: string | null;
    bank_account_number: string | null;
    bank_account_name: string | null;
    payout_currency: string;
    is_verified: boolean;
    created_at: string;
    updated_at: string;
}

export interface Product {
    id: string;
    name: string;
    slug: string;
    sku: string | null;
    short_description: string | null;
    description: string | null;
    price: number;
    stock: number;
    published: boolean;
    view_count: number;
    search_hit_count: number;
    created_at: string;
    updated_at: string;
    brand: string | null;
    seller_id: string;
    // Optional joined vendor data
    vendors?: {
        id: string;
        business_name: string;
        is_verified: boolean;
    };
}

export interface ProductImage {
    id?: string;
    product_id?: string;
    url: string;
    alt_text: string | null;
    position: number;
    created_at?: string;
}

export interface ProductSpec {
    id?: string;
    product_id?: string;
    spec_key: string;
    spec_value: string | null;
    created_at?: string;
}

export interface Category {
    id: string;
    name: string;
    slug: string;
    parent_id: string | null;
    created_at: string;
}

export interface ProductCategory {
    product_id: string;
    category_id: string;
}

export interface Order {
    id: string;
    user_id: string | null;
    status: string;
    total_amount: number;
    currency: string;
    shipping_address_id: string | null;
    billing_address_id: string | null;
    placed_at: string;
    updated_at: string;
    fulfillment_status?: string | null;
    delivery_status?: string | null;
}

export interface OrderItem {
    id: string;
    order_id: string;
    product_id: string;
    vendor_id: string | null;
    quantity: number;
    unit_price: number;
    created_at: string;
}

export interface Address {
    id: string;
    user_id: string | null;
    label: string | null;
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postal_code: string | null;
    created_at: string;
}

export interface Payment {
    id: string;
    order_id: string;
    provider: string;
    provider_payment_id: string | null;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
}

export interface VendorOrderFulfillment {
    id: string;
    order_id: string;
    vendor_id: string;
    status: 'not_ready' | 'ready';
    pickup_contact_name: string | null;
    pickup_contact_phone: string | null;
    pickup_address: string | null;
    pickup_city: string | null;
    pickup_state: string | null;
    pickup_country: string | null;
    pickup_notes: string | null;
    submitted_at: string | null;
    created_at: string;
    updated_at: string;
}

// Form types
export interface ProductFormData {
    name: string;
    sku: string;
    price: number;
    stock: number;
    short_description: string;
    description: string;
    brand: string;
    published: boolean;
    images: ProductImage[];
    specs: ProductSpec[];
    category_ids: string[];
}

// API Response types
export interface ImgBBResponse {
    data: {
        id: string;
        url_viewer: string;
        url: string;
        display_url: string;
        title: string;
        time: string;
        image: {
            filename: string;
            name: string;
            mime: string;
            extension: string;
            url: string;
        };
        thumb: {
            filename: string;
            name: string;
            mime: string;
            extension: string;
            url: string;
        };
        medium: {
            filename: string;
            name: string;
            mime: string;
            extension: string;
            url: string;
        };
        delete_url: string;
    };
    success: boolean;
    status: number;
}

// Vendor Dashboard Stats
export interface VendorStats {
    totalProducts: number;
    publishedProducts: number;
    pendingOrders: number;
    totalRevenue: number;
    totalViews: number;
}

// Extended types with joins
export interface ProductWithDetails extends Product {
    product_images?: ProductImage[];
    product_specs?: ProductSpec[];
    product_categories?: Array<{
        categories: Category;
    }>;
}

export interface OrderWithDetails extends Order {
    order_items?: Array<OrderItem & {
        products?: Product & {
            product_images?: ProductImage[];
        };
    }>;
    shipping_address?: Address;
    payments?: Payment[];
    vendor_order_fulfillments?: VendorOrderFulfillment[];
}

