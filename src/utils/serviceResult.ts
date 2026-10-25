import type { ServiceResult } from '../types/models';

const messages: Record<string, string> = {
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/user-not-found': 'Email or password is incorrect.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/email-already-in-use': 'An account already uses this email.',
  'auth/weak-password': 'Choose a stronger password.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/network-request-failed': 'Connection failed. Please try again.',
  'permission-denied': 'This action is not allowed, or you are posting too quickly. Please wait and try again.',
  'storage/unauthorized': 'Photo upload is not allowed. Check the owner, format, size, and 10-minute upload window.',
  'storage/object-not-found': 'The photo has not been uploaded yet.',
  'storage/retry-limit-exceeded': 'Photo upload timed out. Please try again.',
  'unavailable': 'Firebase is unavailable. Please try again.',
  'deadline-exceeded': 'The request timed out. Please try again.'
};
export function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String(error.code);
    if (messages[code]) return messages[code];
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
export function failure<T>(error: unknown, data?: T): ServiceResult<T> {
  return { success: false, error: errorMessage(error), ...(data === undefined ? {} : { data }) };
}
