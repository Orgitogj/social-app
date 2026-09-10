import { destinationFromUrl, storePendingDestination } from '@/lib/deepLinking';

export async function redirectSystemPath({ path }: { path: string }) {
  try {
    const destination = destinationFromUrl(path);
    if (destination) {
      await storePendingDestination(destination);
      return '/';
    }
    return path;
  } catch {
    return '/';
  }
}
