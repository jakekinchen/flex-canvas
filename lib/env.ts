export type EnvStatus = {
  ok: boolean;
  missing: string[];
};

export const requiredRuntimeEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "LIVEBLOCKS_SECRET_KEY",
  "OPENAI_API_KEY",
] as const;

export function getEnvStatus(keys: readonly string[] = requiredRuntimeEnv): EnvStatus {
  const missing = keys.filter((key) => !process.env[key]);
  return { ok: missing.length === 0, missing };
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
