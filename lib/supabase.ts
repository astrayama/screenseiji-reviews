import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Public client — RLS enforced, only sees published content.
// Server-side only (keys never reach the browser).
let pub: SupabaseClient | null = null;
export function db(): SupabaseClient {
  if (!pub) {
    pub = createClient(env("SUPABASE_URL"), env("SUPABASE_PUBLISHABLE_KEY"), {
      auth: { persistSession: false },
    });
  }
  return pub;
}

// Admin client — bypasses RLS. Only ever used inside /api/desk/* handlers
// and trusted server code (view counter, subscribe).
let adm: SupabaseClient | null = null;
export function adminDb(): SupabaseClient {
  if (!adm) {
    adm = createClient(env("SUPABASE_URL"), env("SUPABASE_SECRET_KEY"), {
      auth: { persistSession: false },
    });
  }
  return adm;
}

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name} — check .env.local`);
  return v;
}
