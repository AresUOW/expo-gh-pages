import type { QueryDocumentSnapshot, Timestamp } from 'firebase/firestore';

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; data?: T };
export const CAT_STATUSES = ['stray', 'needs_help', 'being_cared_for', 'adopted'] as const;
export type CatStatus = typeof CAT_STATUSES[number];
export interface Location { latitude: number; longitude: number }
export interface ImageInput {
  /** Local Expo picker URI or an in-memory Blob. URI is not a remote download URL. */
  uri?: string;
  blob?: Blob;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
}
export interface Cat {
  id: string;
  authorId: string;
  description: string;
  status: CatStatus;
  location: Location;
  geohash: string;
  imagePath: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
export interface Sighting {
  id: string;
  catId: string;
  authorId: string;
  location: Location;
  status: CatStatus;
  note: string;
  imagePath: string | null;
  createdAt: Timestamp;
}
export interface Comment {
  id: string;
  catId: string;
  authorId: string;
  text: string;
  createdAt: Timestamp;
}
export interface CreatedRecord {
  id: string;
  imagePath: string | null;
  imageUrl: string | null;
  uploadState: 'uploaded' | 'pending' | 'none';
}
export interface PageOptions {
  pageSize?: number;
  cursor?: QueryDocumentSnapshot;
}
export interface Page<T> {
  items: T[];
  nextCursor: QueryDocumentSnapshot | null;
  /** A full page may have another page; request it to find out. */
  hasMore: boolean;
}
