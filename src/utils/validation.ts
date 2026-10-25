import { CAT_STATUSES, type CatStatus, type Location } from '../types/models';

export function validateId(value: string, label = 'ID'): void {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) throw new Error(`${label} is invalid.`);
}
export function validateLocation(value: Location): void {
  if (!value || !Number.isFinite(value.latitude) || !Number.isFinite(value.longitude)
    || value.latitude < -90 || value.latitude > 90 || value.longitude < -180 || value.longitude > 180) {
    throw new Error('Location must contain valid latitude and longitude.');
  }
}
export function validateStatus(value: CatStatus): void {
  if (!CAT_STATUSES.includes(value)) throw new Error('Cat status is invalid.');
}
export function cleanText(value: string, label: string, maximum: number, allowEmpty = false): string {
  if (typeof value !== 'string') throw new Error(`${label} must be text.`);
  const cleaned = value.trim();
  if ((!allowEmpty && !cleaned) || cleaned.length > maximum) {
    throw new Error(`${label} must ${allowEmpty ? '' : 'not be blank and must '}contain at most ${maximum} characters.`);
  }
  return cleaned;
}
export function normalizeEmail(value: string): string {
  if (typeof value !== 'string') throw new Error('Enter a valid email address.');
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  return email;
}
