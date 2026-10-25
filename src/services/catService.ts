import {
  collection, doc, endAt, getDoc, getDocs, limit, orderBy, query,
  serverTimestamp, startAfter, startAt, writeBatch, type QueryDocumentSnapshot
} from 'firebase/firestore';
import { distanceBetween, geohashForLocation, geohashQueryBounds } from 'geofire-common';
import { db } from './firebase';
import { requireUser } from './authService';
import { prepareImage, uploadPreparedImage } from './imageService';
import { recordSighting } from './sightingService';
import type { Cat, CatStatus, CreatedRecord, ImageInput, Location, ServiceResult } from '../types/models';
import { cleanText, validateId, validateLocation, validateStatus } from '../utils/validation';
import { failure } from '../utils/serviceResult';

export interface CreateCatInput { image: ImageInput; location: Location; description: string; status: CatStatus }
export interface NearbyCats { cats: (Cat & { distanceMeters: number })[]; truncated: boolean; radiusMeters: number }

export async function createCat(data: CreateCatInput): Promise<ServiceResult<CreatedRecord>> {
  let created: CreatedRecord | undefined;
  try {
    if (!data) throw new Error('Cat details are required.');
    validateLocation(data.location); validateStatus(data.status);
    const description = cleanText(data.description, 'Description', 1000);
    const user = await requireUser();
    const blob = await prepareImage(data.image);
    const catRef = doc(collection(db, 'cats'));
    const path = `cats/${user.uid}/${catRef.id}/photo`;
    const batch = writeBatch(db);
    batch.set(catRef, {
      authorId: user.uid, description, status: data.status,
      location: { latitude: data.location.latitude, longitude: data.location.longitude },
      geohash: geohashForLocation([data.location.latitude, data.location.longitude], 9),
      imagePath: path, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    });
    batch.set(doc(db, 'users', user.uid, 'rateLimits', 'cats'), {
      targetId: catRef.id, lastCreatedAt: serverTimestamp()
    });
    await batch.commit();
    created = { id: catRef.id, imagePath: path, imageUrl: null, uploadState: 'pending' };
    created.imageUrl = await uploadPreparedImage(path, blob, data.image.contentType);
    created.uploadState = 'uploaded';
    return { success: true, data: created };
  } catch (error) { return failure(error, created); }
}
export async function getCatById(catId: string): Promise<ServiceResult<Cat>> {
  try {
    validateId(catId, 'Cat ID'); await requireUser();
    const snapshot = await getDoc(doc(db, 'cats', catId));
    if (!snapshot.exists()) throw new Error('Cat was not found.');
    return { success: true, data: { ...snapshot.data(), id: snapshot.id } as Cat };
  } catch (error) { return failure(error); }
}
/** Radius is in meters. Deduplicate bounds and remove geohash false positives. */
export async function getNearbyCats(lat: number, lng: number, radius: number): Promise<ServiceResult<NearbyCats>> {
  try {
    validateLocation({ latitude: lat, longitude: lng });
    if (!Number.isFinite(radius) || radius <= 0 || radius > 50_000) throw new Error('Radius must be greater than 0 and at most 50,000 meters.');
    await requireUser();
    const center: [number, number] = [lat, lng];
    const bounds = geohashQueryBounds(center, radius);
    const found = new Map<string, Cat & { distanceMeters: number }>();
    let remainingReads = 500;
    let truncated = false;
    // Sequential range pagination keeps one request within the shared read budget.
    for (const [lower, upper] of bounds) {
      let cursor: QueryDocumentSnapshot | undefined;
      while (true) {
        if (remainingReads === 0) { truncated = true; break; }
        const pageSize = Math.min(100, remainingReads);
        const rangeQuery = query(collection(db, 'cats'), orderBy('geohash'),
          cursor ? startAfter(cursor) : startAt(lower), endAt(upper), limit(pageSize));
        const snapshot = await getDocs(rangeQuery);
        remainingReads -= snapshot.size;
        for (const item of snapshot.docs) {
          if (found.has(item.id)) continue;
          const cat = { ...item.data(), id: item.id } as Cat;
          const distanceMeters = distanceBetween(center, [cat.location.latitude, cat.location.longitude]) * 1000;
          if (distanceMeters <= radius) found.set(item.id, { ...cat, distanceMeters });
        }
        if (snapshot.size < pageSize) break;
        cursor = snapshot.docs.at(-1);
      }
      if (truncated) break;
    }
    return { success: true, data: {
      cats: [...found.values()].sort((a, b) => a.distanceMeters - b.distanceMeters || a.id.localeCompare(b.id)),
      truncated, radiusMeters: radius
    } };
  } catch (error) { return failure(error); }
}
export async function updateCatStatus(catId: string, status: CatStatus): Promise<ServiceResult<CreatedRecord>> {
  // The transaction also records immutable history, as required by the rules.
  return recordSighting(catId, null, undefined, { status, note: 'Status updated' });
}
export async function retryCatImage(catId: string, image: ImageInput): Promise<ServiceResult<CreatedRecord>> {
  let created: CreatedRecord | undefined;
  try {
    validateId(catId, 'Cat ID');
    const user = await requireUser();
    const snapshot = await getDoc(doc(db, 'cats', catId));
    if (!snapshot.exists()) throw new Error('Cat was not found.');
    const cat = snapshot.data() as Omit<Cat, 'id'>;
    if (cat.authorId !== user.uid) throw new Error('Only the creator can upload this cat photo.');
    created = { id: catId, imagePath: cat.imagePath, imageUrl: null, uploadState: 'pending' };
    const blob = await prepareImage(image);
    created.imageUrl = await uploadPreparedImage(cat.imagePath, blob, image.contentType);
    created.uploadState = 'uploaded';
    return { success: true, data: created };
  } catch (error) { return failure(error, created); }
}
