import {
  collection, getDocs, limit, orderBy, query, startAfter, where,
  type QueryConstraint
} from 'firebase/firestore';
import { db } from './firebase';
import type { Page, PageOptions } from '../types/models';

export async function readCatPage<T>(kind: 'comments' | 'sightings', catId: string, options: PageOptions): Promise<Page<T>> {
  const pageSize = options.pageSize ?? 25;
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new Error('Page size must be 1–100.');
  if (options.cursor && (options.cursor.ref.parent.path !== kind || options.cursor.data().catId !== catId)) {
    throw new Error('Cursor must belong to this cat and collection.');
  }
  const constraints: QueryConstraint[] = [where('catId', '==', catId), orderBy('createdAt', 'desc')];
  if (options.cursor) constraints.push(startAfter(options.cursor));
  constraints.push(limit(pageSize));
  const snapshot = await getDocs(query(collection(db, kind), ...constraints));
  return {
    items: snapshot.docs.map(item => ({ ...item.data(), id: item.id }) as T),
    nextCursor: snapshot.docs.at(-1) ?? null,
    hasMore: snapshot.size === pageSize
  };
}
