import { z } from 'zod';

const schema = z.object({
  url: z.url().refine(value => {
    const url = new URL(value);
    return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '10.0.2.2'].includes(url.hostname));
  }),
  anonKey: z.string().min(20).refine(value => !value.startsWith('sb_secret_') && !value.includes('YOUR_')),
});

export function validateConfig(url: string | undefined, anonKey: string | undefined) {
  const result = schema.safeParse({ url, anonKey });
  if (!result.success) return { valid: false as const, message: 'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env to your local or intended Supabase project. See .env.example.' };
  if (anonKey?.startsWith('eyJ')) {
    try {
      const payload: unknown = JSON.parse(atob(anonKey.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (typeof payload !== 'object' || !payload || !('role' in payload) || payload.role !== 'anon') return { valid: false as const, message: 'Use a public anon or publishable key. Privileged keys are forbidden in the application.' };
    } catch { return { valid: false as const, message: 'EXPO_PUBLIC_SUPABASE_ANON_KEY is not a valid public client key.' }; }
  }
  return { valid: true as const, ...result.data };
}

export const clientConfig = validateConfig(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
export const providerConfig = {
  google: process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED === 'true',
  apple: process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED === 'true',
  scheme: process.env.EXPO_PUBLIC_APP_SCHEME,
  projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
  siteUrl: process.env.EXPO_PUBLIC_SITE_URL,
};
