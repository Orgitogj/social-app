import { z } from 'zod';

export type ErrorCode = 'networkError' | 'notAllowed' | 'notFound' | 'rateLimited' | 'invalidData' | 'unknownError';
export type ServiceError = { code: ErrorCode; message: string; retryable: boolean };
export type ServiceResult<T> = { success: true; data: T } | { success: false; error: ServiceError };

export class AppError extends Error {
  constructor(public code: ErrorCode, public retryable = false) { super(code); }
}

export function toServiceError(error: unknown): ServiceError {
  if (error instanceof AppError) return { code: error.code, message: error.message, retryable: error.retryable };
  if (error instanceof z.ZodError) return { code: 'invalidData', message: error.issues[0]?.message ?? 'invalidData', retryable: false };
  const value = typeof error === 'object' && error !== null ? error : {};
  const code = 'code' in value ? String(value.code) : '';
  if (code === '42501') return { code: 'notAllowed', message: 'notAllowed', retryable: false };
  if (code === 'P0001') return { code: 'rateLimited', message: 'rateLimited', retryable: true };
  if (code === 'PGRST116') return { code: 'notFound', message: 'notFound', retryable: false };
  if (code.startsWith('23')) return { code: 'invalidData', message: 'invalidData', retryable: false };
  return { code: 'networkError', message: 'networkError', retryable: true };
}

export async function service<T>(operation: () => Promise<T>): Promise<ServiceResult<T>> {
  try { return { success: true, data: await operation() }; }
  catch (error) { return { success: false, error: toServiceError(error) }; }
}

export function unwrap<T>(result: ServiceResult<T>): T {
  if (result.success) return result.data;
  throw new AppError(result.error.code, result.error.retryable);
}
