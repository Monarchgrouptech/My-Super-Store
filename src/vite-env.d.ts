/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_PUBLIC_BUILDER_KEY: string;
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly VITE_IMGBB_API_KEY: string;
    readonly VITE_GROQ_API_KEY: string;
    readonly VITE_GROQ_PRIMARY_MODEL: string;
    readonly VITE_GROQ_FALLBACK_MODEL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
