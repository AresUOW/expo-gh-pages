import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, test } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, Timestamp, getDocs, collection, query, limit, where, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getBytes } from 'firebase/storage';

let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-kitokato',
    firestore: { rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') },
    storage: { rules: await readFile(new URL('../storage.rules', import.meta.url), 'utf8') }
  });
});
after(async () => env?.cleanup());
beforeEach(async () => { await env.clearFirestore(); await env.clearStorage(); });
const dbFor = (uid = 'alice') => env.authenticatedContext(uid).firestore();
const cat = (id, authorId = 'alice') => ({
  authorId, description: 'Tabby near the market', status: 'stray',
  location: { latitude: 3.139, longitude: 101.6869 }, geohash: 'w283fd0q0',
  imagePath: `cats/${authorId}/${id}/photo`, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
});
function create(db, kind, id, data) {
  const batch = writeBatch(db);
  batch.set(doc(db, kind, id), data);
  batch.set(doc(db, 'users', 'alice', 'rateLimits', kind), { targetId: id, lastCreatedAt: serverTimestamp() });
  return batch.commit();
}
async function seedCat(id = 'cat1') { await assertSucceeds(create(dbFor(), 'cats', id, cat(id))); }

test('anonymous access is denied; authenticated bounded map reads succeed', async () => {
  await seedCat();
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'cats', 'cat1')));
  await assertSucceeds(getDoc(doc(dbFor('bob'), 'cats', 'cat1')));
  await assertSucceeds(getDocs(query(collection(dbFor(), 'cats'), orderBy('geohash'), limit(100))));
  await assertFails(getDocs(collection(dbFor(), 'cats')));
  await assertFails(getDocs(query(collection(dbFor(), 'cats'), limit(101))));
});
test('cat creation requires quota; immediate second upload and quota reset fail', async () => {
  await assertFails(setDoc(doc(dbFor(), 'cats', 'cat1'), cat('cat1')));
  await seedCat();
  await assertFails(create(dbFor(), 'cats', 'cat2', cat('cat2')));
  await assertFails(deleteDoc(doc(dbFor(), 'users', 'alice', 'rateLimits', 'cats')));
  await assertFails(setDoc(doc(dbFor(), 'users', 'alice', 'rateLimits', 'comments'), {
    targetId: 'missing', lastCreatedAt: serverTimestamp()
  }));
});
test('a single quota cannot authorize multiple cats in one batch', async () => {
  const db = dbFor(); const batch = writeBatch(db);
  batch.set(doc(db, 'cats', 'cat1'), cat('cat1'));
  batch.set(doc(db, 'cats', 'cat2'), cat('cat2'));
  batch.set(doc(db, 'users', 'alice', 'rateLimits', 'cats'), { targetId: 'cat1', lastCreatedAt: serverTimestamp() });
  await assertFails(batch.commit());
});
test('cooldown allows a new cat after 60 seconds', async () => {
  await seedCat();
  await env.withSecurityRulesDisabled(async context => {
    await updateDoc(doc(context.firestore(), 'users', 'alice', 'rateLimits', 'cats'), {
      lastCreatedAt: Timestamp.fromMillis(Date.now() - 61_000)
    });
  });
  await assertSucceeds(create(dbFor(), 'cats', 'cat2', cat('cat2')));
});
test('invalid inputs, spoofed ownership, and unexpected fields fail', async () => {
  for (const patch of [
    { location: { latitude: 91, longitude: 0 } }, { location: { latitude: 0, longitude: -181 } },
    { description: '   ' }, { description: 'x'.repeat(1001) }, { status: 'unknown' },
    { geohash: 'invalid!' }, { authorId: 'bob' }, { imagePath: 'arbitrary/path' },
    { createdAt: Timestamp.fromMillis(0) }, { admin: true }
  ]) await assertFails(create(dbFor(), 'cats', 'cat1', { ...cat('cat1'), ...patch }));
});
test('owners edit description; immutable fields and unlogged status updates fail', async () => {
  await seedCat();
  await assertSucceeds(updateDoc(doc(dbFor(), 'cats', 'cat1'), { description: 'Friendly tabby', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(dbFor('bob'), 'cats', 'cat1'), { description: 'Hijack', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(dbFor(), 'cats', 'cat1'), { authorId: 'bob', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(dbFor(), 'cats', 'cat1'), { status: 'adopted', updatedAt: serverTimestamp() }));
});
test('community status updates require a matching immutable sighting and quota', async () => {
  await seedCat(); const db = dbFor('bob'); const batch = writeBatch(db);
  batch.set(doc(db, 'sightings', 's1'), {
    catId: 'cat1', authorId: 'bob', location: { latitude: 3.139, longitude: 101.6869 },
    status: 'being_cared_for', note: 'Food and water provided', imagePath: null, createdAt: serverTimestamp()
  });
  batch.set(doc(db, 'users', 'bob', 'rateLimits', 'sightings'), { targetId: 's1', lastCreatedAt: serverTimestamp() });
  batch.update(doc(db, 'cats', 'cat1'), { status: 'being_cared_for', updatedAt: serverTimestamp() });
  await assertSucceeds(batch.commit());
  await assertFails(updateDoc(doc(db, 'sightings', 's1'), { status: 'adopted' }));
});
test('comments validate parent, text, quota, ownership and pagination', async () => {
  await seedCat(); const db = dbFor();
  const comment = { catId: 'cat1', authorId: 'alice', text: 'Seen today', createdAt: serverTimestamp() };
  await assertFails(create(db, 'comments', 'c1', { ...comment, catId: 'missing' }));
  await assertFails(create(db, 'comments', 'c1', { ...comment, text: '' }));
  await assertSucceeds(create(db, 'comments', 'c1', comment));
  await assertFails(create(db, 'comments', 'c2', comment));
  await assertSucceeds(getDocs(query(collection(db, 'comments'), where('catId', '==', 'cat1'), orderBy('createdAt', 'desc'), limit(25))));
  await assertFails(deleteDoc(doc(dbFor('bob'), 'comments', 'c1')));
  await assertSucceeds(deleteDoc(doc(db, 'comments', 'c1')));
});
test('profiles allow only owner edits and public-safe fields', async () => {
  const data = { displayName: 'Alice', createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  await assertFails(setDoc(doc(dbFor(), 'users', 'alice'), { ...data, email: 'private@example.com' }));
  await assertSucceeds(setDoc(doc(dbFor(), 'users', 'alice'), data));
  await assertFails(updateDoc(doc(dbFor('bob'), 'users', 'alice'), { displayName: 'Bob', updatedAt: serverTimestamp() }));
  await assertFails(setDoc(doc(dbFor(), 'unrecognized', 'anything'), { value: true }));
});
test('rate limit documents are private and cannot be forged by another user', async () => {
  await seedCat();
  await assertFails(getDoc(doc(dbFor('bob'), 'users', 'alice', 'rateLimits', 'cats')));
  await assertFails(setDoc(doc(dbFor('bob'), 'users', 'alice', 'rateLimits', 'cats'), {
    targetId: 'cat2', lastCreatedAt: serverTimestamp()
  }));
});
test('an expired cat cannot receive a new photo', async () => {
  await seedCat();
  await env.withSecurityRulesDisabled(async context => {
    await updateDoc(doc(context.firestore(), 'cats', 'cat1'), {
      createdAt: Timestamp.fromMillis(Date.now() - 11 * 60_000)
    });
  });
  await assertFails(uploadBytes(ref(env.authenticatedContext('alice').storage(), 'cats/alice/cat1/photo'),
    new Uint8Array([1]), { contentType: 'image/jpeg' }));
});
test('photos require a cat, owner, image MIME and size, and cannot be overwritten', async () => {
  await seedCat();
  const storage = env.authenticatedContext('alice').storage();
  const photo = ref(storage, 'cats/alice/cat1/photo');
  const bytes = new Uint8Array([1, 2, 3]);
  await assertFails(uploadBytes(ref(storage, 'cats/alice/missing/photo'), bytes, { contentType: 'image/jpeg' }));
  await assertFails(uploadBytes(ref(env.authenticatedContext('bob').storage(), 'cats/alice/cat1/photo'), bytes, { contentType: 'image/jpeg' }));
  await assertFails(uploadBytes(photo, bytes, { contentType: 'text/plain' }));
  await assertFails(uploadBytes(photo, new Uint8Array(5 * 1024 * 1024 + 1), { contentType: 'image/jpeg' }));
  await assertSucceeds(uploadBytes(photo, bytes, { contentType: 'image/jpeg' }));
  await assertFails(uploadBytes(photo, bytes, { contentType: 'image/jpeg' }));
  await assertFails(uploadBytes(photo, new Uint8Array([4, 5, 6]), { contentType: 'image/jpeg' }));
  await assertSucceeds(getBytes(ref(env.authenticatedContext('bob').storage(), 'cats/alice/cat1/photo')));
  await assertFails(getBytes(ref(env.unauthenticatedContext().storage(), 'cats/alice/cat1/photo')));
});
