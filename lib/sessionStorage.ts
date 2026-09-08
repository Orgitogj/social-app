import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1800;
type Manifest = { version: string; count: number };

async function manifest(key: string): Promise<Manifest | null> {
  const value = await SecureStore.getItemAsync(key);
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed === 'object' && parsed && 'version' in parsed && 'count' in parsed && typeof parsed.version === 'string' && typeof parsed.count === 'number' && parsed.count > 0 && parsed.count < 100) return { version: parsed.version, count: parsed.count };
  } catch { return null; }
  return null;
}

async function removeChunks(key: string, value: Manifest | null) {
  if (value) await Promise.all(Array.from({ length: value.count }, (_, i) => SecureStore.deleteItemAsync(`${key}.${value.version}.${i}`)));
}

export const sessionStorage = {
  async getItem(key: string) {
    const value = await manifest(key);
    if (!value) return null;
    const parts = await Promise.all(Array.from({ length: value.count }, (_, i) => SecureStore.getItemAsync(`${key}.${value.version}.${i}`)));
    return parts.every(part => part !== null) ? parts.join('') : null;
  },
  async setItem(key: string, data: string) {
    const previous = await manifest(key);
    const next = { version: `${Date.now()}`, count: Math.ceil(data.length / CHUNK_SIZE) };
    try {
      await Promise.all(Array.from({ length: next.count }, (_, i) => SecureStore.setItemAsync(`${key}.${next.version}.${i}`, data.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY })));
      await SecureStore.setItemAsync(key, JSON.stringify(next), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    } catch (error) { await removeChunks(key, next); throw error; }
    await removeChunks(key, previous);
  },
  async removeItem(key: string) {
    const previous = await manifest(key);
    await SecureStore.deleteItemAsync(key);
    await removeChunks(key, previous);
  },
};
