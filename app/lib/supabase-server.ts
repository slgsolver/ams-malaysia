import { cookies } from "next/headers";

const ACCESS_TOKEN_COOKIE = "cukai_access_token";

function setting(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Connect the Supabase integration in Vercel.`);
  return value;
}

export function supabaseUrl() {
  return setting("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
}

export function supabaseAnonKey() {
  return setting("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export async function accessToken() {
  return (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

export const accessTokenCookie = ACCESS_TOKEN_COOKIE;

export async function authenticatedUser() {
  const token = await accessToken();
  if (!token) return null;
  const response = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: { apikey: supabaseAnonKey(), authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json() as Promise<{ id: string; email?: string }>;
}

export function supabaseHeaders(token: string, extra: HeadersInit = {}) {
  return { apikey: supabaseAnonKey(), authorization: `Bearer ${token}`, ...extra };
}
