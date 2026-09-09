import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { STORAGE_BUCKET } from '@/constants';
import { clientConfig } from '@/lib/config';

export function getUserImageSrc(imagePath?: string | null) { return imagePath ? getSupabaseFileUrl(imagePath) : require('../assets/images/defaultUser.png'); }
export function getSupabaseFileUrl(path?: string | null) { if (!path) return null; if (path.startsWith('http')) return { uri: path }; if (!clientConfig.valid) return null; return { uri: `${clientConfig.url}/storage/v1/object/public/${STORAGE_BUCKET}/${path}` }; }
export async function uploadFile(folderName: string, fileUri: string, mimeType = 'image/jpeg') { const extension = mimeType.split('/')[1] || 'bin'; const path = `${folderName}/${crypto.randomUUID()}.${extension}`; const file = await FileSystem.File.downloadFileAsync(fileUri, FileSystem.Paths.cache); const response = await fetch(file.uri); const bytes = await response.arrayBuffer(); const { data, error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, bytes, { contentType: mimeType, upsert: false }); return error ? { success: false, msg: 'Upload failed' } : { success: true, data: data.path }; }
export const getFilePath = (folderName: string, mimeType: string) => `${folderName}/${crypto.randomUUID()}.${mimeType.split('/')[1] || 'bin'}`;
export const getLocalFilePath = (filePath: string) => `${FileSystem.Paths.cache}/${filePath.split('/').pop()}`;
export async function downloadFile(url: string) { try { const result = await FileSystem.downloadAsync(url, getLocalFilePath(url)); return result.uri; } catch { return null; } }
