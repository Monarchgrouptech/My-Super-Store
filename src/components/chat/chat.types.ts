export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  brand: string | null;
  image_url: string | null;
  vendors?: {
    business_name: string;
  };
}

export interface ActionButton {
  label: string;
  action: 'navigate' | 'sendMessage';
  path?: string;
  message?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
  products?: ProductCardData[];
  actions?: ActionButton[];
}

export interface PageContext {
  currentPath: string;
  currentProductId?: string;
  currentProductName?: string;
}

export interface ChatAPIHistoryMessage {
  role: 'assistant' | 'user';
  content: string;
}

export interface ChatAPIResponse {
  reply: string;
  products?: ProductCardData[];
  actions?: ActionButton[];
  error?: string;
}
