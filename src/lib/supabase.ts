import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase URL or Anon Key in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
        fetch: (url, options) => {
            const newOptions = { ...options };
            if (newOptions.headers) {
                if (newOptions.headers instanceof Headers) {
                    newOptions.headers.delete('x-supabase-client-platform');
                } else if (Array.isArray(newOptions.headers)) {
                    newOptions.headers = newOptions.headers.filter(
                        ([key]) => key.toLowerCase() !== 'x-supabase-client-platform'
                    );
                } else if (typeof newOptions.headers === 'object') {
                    const cleanHeaders = { ...newOptions.headers } as Record<string, string>;
                    delete cleanHeaders['x-supabase-client-platform'];
                    delete cleanHeaders['X-Supabase-Client-Platform'];
                    newOptions.headers = cleanHeaders;
                }
            }
            return fetch(url, newOptions);
        }
    }
});
