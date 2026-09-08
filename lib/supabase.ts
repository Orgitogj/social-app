import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import { clientConfig } from './config';
import { sessionStorage } from './sessionStorage';
import type { Database } from '@/types/database';

let client: SupabaseClient<Database> | undefined;

export function getSupabase(): SupabaseClient<Database> {
  if (!clientConfig.valid) throw new Error(clientConfig.message);
  if (!client) client = createClient<Database>(clientConfig.url, clientConfig.anonKey, {
    auth: { ...(Platform.OS !== 'web' ? { storage: sessionStorage } : {}), autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, flowType: 'pkce', lock: processLock },
  });
  return client;
}

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, property) {
    const value = Reflect.get(getSupabase(), property);
    return typeof value === 'function' ? value.bind(getSupabase()) : value;
  },
});
