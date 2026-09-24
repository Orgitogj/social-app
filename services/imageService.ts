import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';
import { STORAGE_BUCKET } from '@/constants';
import { clientConfig } from '@/lib/config';

export function getUserImageSrc(imagePath?: string | null) { return imagePath ? getSupabaseFileUrl(imagePath) : require('../assets/images/defaultUser.png'); }
export function getSupabaseFileUrl(path?: string | null) { if (!path) return null; if (path.startsWith('http')) return { uri: path }; if (!clientConfig.valid) return null; return { uri: `${clientConfig.url}/storage/v1/object/public/${STORAGE_BUCKET}/${path}` }; }
export async function uploadFile(folderName: string, fileUri: string, mimeType = 'image/jpeg') { const extension = mimeType.split('/')[1] || 'bin'; return uploadFileToPath(`${folderName}/${crypto.randomUUID()}.${extension}`, fileUri, mimeType); }
export async function uploadFileToPath(path: string, fileUri: string, mimeType: string) { const file = await FileSystem.File.downloadFileAsync(fileUri, FileSystem.Paths.cache); const response = await fetch(file.uri); const bytes = await response.arrayBuffer(); const { data, error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, bytes, { contentType: mimeType, upsert: false }); return error ? { success: false, msg: 'Upload failed' } : { success: true, data: data.path }; }
export const getFilePath = (folderName: string, mimeType: string) => `${folderName}/${crypto.randomUUID()}.${mimeType.split('/')[1] || 'bin'}`;
export const getLocalFilePath = (filePath: string) => `${FileSystem.Paths.cache}/${filePath.split('/').pop()}`;
export async function downloadFile(url: string) { try { const result = await FileSystem.downloadAsync(url, getLocalFilePath(url)); return result.uri; } catch { return null; } }

export type UploadOutcome = { success: true; path: string; existed: boolean } | { success: false; retryable: boolean };

const isDuplicateUpload = (status: number, body: string) => status === 409 || /duplicate|already exists/i.test(body);

export async function uploadFileWithProgress(path: string, fileUri: string, mimeType: string, onProgress?: (fraction: number) => void): Promise<UploadOutcome> {
  if (!clientConfig.valid) return { success: false, retryable: false };
  try {
    if (Platform.OS === 'web') {
      const bytes = await (await fetch(fileUri)).arrayBuffer();
      const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, bytes, { contentType: mimeType, upsert: false });
      if (error && !isDuplicateUpload(Number((error as { statusCode?: string }).statusCode), error.message)) return { success: false, retryable: true };
      onProgress?.(1);
      return { success: true, path, existed: Boolean(error) };
    }
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { success: false, retryable: false };
    const url = `${clientConfig.url}/storage/v1/object/${STORAGE_BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
    const task = LegacyFileSystem.createUploadTask(url, fileUri, {
      httpMethod: 'POST',
      uploadType: LegacyFileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { Authorization: `Bearer ${token}`, apikey: clientConfig.anonKey, 'Content-Type': mimeType, 'x-upsert': 'false', 'cache-control': '3600' },
    }, progress => {
      if (progress.totalBytesExpectedToSend > 0) onProgress?.(Math.min(1, progress.totalBytesSent / progress.totalBytesExpectedToSend));
    });
    const response = await task.uploadAsync();
    if (!response) return { success: false, retryable: true };
    if (response.status >= 200 && response.status < 300) { onProgress?.(1); return { success: true, path, existed: false }; }
    if (isDuplicateUpload(response.status, response.body)) { onProgress?.(1); return { success: true, path, existed: true }; }
    return { success: false, retryable: response.status >= 500 || response.status === 429 || response.status === 408 };
  } catch {
    return { success: false, retryable: true };
  }
}
