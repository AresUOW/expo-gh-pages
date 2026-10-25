import { collection, doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { requireUser } from './authService';
import { prepareImage, uploadPreparedImage } from './imageService';
import { readCatPage } from './pagination';
import type { Cat, CatStatus, CreatedRecord, ImageInput, Location, Page, PageOptions, ServiceResult, Sighting } from '../types/models';
import { cleanText, validateId, validateLocation, validateStatus } from '../utils/validation';
import { failure } from '../utils/serviceResult';

export interface SightingOptions { status?: CatStatus; note?: string }

/** Shared atomic write for photo sightings and status-only observations. */
export async function recordSighting(
  catId: string, image: ImageInput | null, location?: Location, options: SightingOptions = {}
): Promise<ServiceResult<CreatedRecord>> {
  let created: CreatedRecord | undefined;
  try {
    validateId(catId, 'Cat ID');
    if (location) validateLocation(location);
    if (options.status !== undefined) validateStatus(options.status);
    const note = cleanText(options.note ?? '', 'Sighting note', 500, true);
    const user = await requireUser();
    const blob = image ? await prepareImage(image) : null;
    const sightingRef = doc(collection(db, 'sightings'));
    const catRef = doc(db, 'cats', catId);
    const path = image ? `sightings/${user.uid}/${sightingRef.id}/photo` : null;
    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(catRef);
      if (!snapshot.exists()) throw new Error('Cat was not found.');
      const cat = snapshot.data() as Omit<Cat, 'id'>;
      const observedLocation = location ?? cat.location;
      const status = options.status ?? cat.status;
      validateLocation(observedLocation);
      validateStatus(status);
      transaction.set(sightingRef, {
        catId, authorId: user.uid,
        location: { latitude: observedLocation.latitude, longitude: observedLocation.longitude }, status, note,
        imagePath: path, createdAt: serverTimestamp()
      });
      transaction.set(doc(db, 'users', user.uid, 'rateLimits', 'sightings'), {
        targetId: sightingRef.id, lastCreatedAt: serverTimestamp()
      });
      transaction.update(catRef, { status, updatedAt: serverTimestamp() });
    });
    created = { id: sightingRef.id, imagePath: path, imageUrl: null, uploadState: image ? 'pending' : 'none' };
    if (image && blob && path) {
      created.imageUrl = await uploadPreparedImage(path, blob, image.contentType);
      created.uploadState = 'uploaded';
    }
    return { success: true, data: created };
  } catch (error) { return failure(error, created); }
}
export async function addSighting(
  catId: string, image: ImageInput, location: Location, options: SightingOptions = {}
): Promise<ServiceResult<CreatedRecord>> {
  // This public function always requires a photo and observed location.
  try {
    validateLocation(location);
    if (!image) throw new Error('Choose a sighting photo.');
    return await recordSighting(catId, image, location, options);
  } catch (error) { return failure(error); }
}
export async function getSightingsByCat(catId: string, options: PageOptions = {}): Promise<ServiceResult<Page<Sighting>>> {
  try {
    validateId(catId, 'Cat ID'); await requireUser();
    return { success: true, data: await readCatPage<Sighting>('sightings', catId, options) };
  } catch (error) { return failure(error); }
}
export async function retrySightingImage(sightingId: string, image: ImageInput): Promise<ServiceResult<CreatedRecord>> {
  let created: CreatedRecord | undefined;
  try {
    validateId(sightingId, 'Sighting ID');
    const user = await requireUser();
    const snapshot = await getDoc(doc(db, 'sightings', sightingId));
    if (!snapshot.exists()) throw new Error('Sighting was not found.');
    const sighting = snapshot.data() as Omit<Sighting, 'id'>;
    if (sighting.authorId !== user.uid || !sighting.imagePath) throw new Error('You cannot upload a photo for this sighting.');
    created = { id: sightingId, imagePath: sighting.imagePath, imageUrl: null, uploadState: 'pending' };
    const blob = await prepareImage(image);
    created.imageUrl = await uploadPreparedImage(sighting.imagePath, blob, image.contentType);
    created.uploadState = 'uploaded';
    return { success: true, data: created };
  } catch (error) { return failure(error, created); }
}
