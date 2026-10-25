# Service API

[Project home](../README.md) · [Architecture](architecture.md) · [Schema](firestore-schema.md)

Services live in `src/services/`. These are TypeScript functions wrapping the Firebase client SDK, not HTTP endpoints. They require a configured Firebase app; use the Zustand actions to exercise demo mode instead of importing Firebase services into demo-only code.

## Results and shared types

Consumer-facing functions listed below return a promise of `ServiceResult<T>`:

```ts
type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; data?: T };
```

Always inspect `success`. Failure `data` can contain a committed record or authenticated user; it does not mean the operation had no effect. Firebase errors are converted to readable messages in `src/utils/serviceResult.ts`. Firebase initialization errors can occur at import time before a function returns a result.

Persisted types are defined in [models.ts](../src/types/models.ts). `Cat` and `Sighting` store `{ latitude, longitude }`, not Firestore GeoPoint. Read timestamps remain Firestore `Timestamp` instances; use `.toDate()` or `.toMillis()` for display. IDs are document IDs added to read results, not duplicate stored fields.

Statuses are `stray`, `needs_help`, `being_cared_for`, and `adopted`. The UI labels `being_cared_for` as **Cared for**.

```ts
interface CreatedRecord {
  id: string;
  imagePath: string | null;
  imageUrl: string | null;
  uploadState: 'uploaded' | 'pending' | 'none';
}
```

`id` belongs to the record created by that function: a cat for `createCat`, a sighting for `addSighting` and `updateCatStatus`. The download URL is returned to the caller; documents store the canonical `imagePath`, not that URL.

## Authentication — authService.ts

- `signUp(email: string, password: string): Promise<ServiceResult<User>>` normalizes email, accepts a password of 8–128 characters, creates the Firebase Auth user, then creates its missing public profile in a Firestore transaction. Firebase's configured password policy can impose additional requirements.
- `login(email: string, password: string): Promise<ServiceResult<User>>` signs in and creates a profile if it is missing. Passwords are not trimmed or lowercased.
- `logout(): Promise<ServiceResult<null>>` signs out through Firebase Auth.
- `getCurrentUser(): Promise<ServiceResult<User | null>>` waits for initial Auth restoration; this is asynchronous, not a direct synchronous getter.

Auth account creation and profile creation are separate operations. If the latter fails, signup/login can return `success: false` with the already signed-in `User` in `data`. Repair the profile through login instead of trying to create the same account again.

`requireUser()` is an internal helper that waits for Auth restoration and throws when no user is signed in. Unlike the consumer-facing functions, this helper does not wrap its result.

## Cats — catService.ts

### createCat(data)

Input:

```ts
interface CreateCatInput {
  image: ImageInput;
  location: { latitude: number; longitude: number };
  description: string;
  status: CatStatus;
}
```

Returns `ServiceResult<CreatedRecord>`. Ownership comes from Firebase Auth. The service validates the input, calculates a nine-character geohash, atomically creates the cat/quota records, then uploads the image. Description is trimmed, nonblank, and at most 1,000 characters. Coordinates must be finite and within latitude ±90 and longitude ±180. The rules enforce a 60-second per-user cat-creation cooldown.

### getCatById(catId)

Returns `ServiceResult<Cat>`. Invalid IDs and missing cats return an error. It performs a direct document fetch and does not fetch comments or resolve an image URL.

### getNearbyCats(lat, lng, radius)

Returns `ServiceResult<{ cats: (Cat & { distanceMeters: number })[]; truncated: boolean; radiusMeters: number }>`. Radius is **meters**, greater than zero and at most 50,000. The UI currently offers only 500–5,000 m presets.

Geohash ranges are read sequentially with pages of at most 100 documents. The request stops after scanning up to 500 documents across ranges, including repeated documents from overlapping bounds. Results are deduplicated, filtered by actual distance, and sorted nearest first. `truncated: true` means more matching cats might exist; narrow the search area. It does not promise the returned set contains every nearest cat.

The scan budget is not an exact cost cap: empty queries, rule lookups, and subsequent image URL requests are separate considerations. There is no status/text argument; current UI filters run against loaded records.

### updateCatStatus(catId, status)

Returns `ServiceResult<CreatedRecord>` for a **new status-only sighting**. The transaction records the original cat location, `note: 'Status updated'`, and `imagePath: null`, then updates the cat and sighting quota. `uploadState` is `none`. Any authenticated user may contribute a rule-compliant update; it shares the 60-second sighting cooldown.

### retryCatImage(catId, image)

Returns `ServiceResult<CreatedRecord>`. Only the original author may retry. The service fetches the saved cat and targets its immutable photo path. If the file already exists, the upload helper returns its download URL instead of replacing it.

## Sightings — sightingService.ts

- `addSighting(catId, image, location, options?)` returns `ServiceResult<CreatedRecord>`. A photo and observed coordinates are required. `options` accepts `{ status?: CatStatus; note?: string }`; notes are trimmed and at most 500 characters. Omitting status preserves the value read within the transaction. The transaction creates a sighting/quota and updates the cat status/time, then the service uploads the photo.
- `getSightingsByCat(catId, options?)` returns `ServiceResult<Page<Sighting>>`, newest first.
- `retrySightingImage(sightingId, image)` returns `ServiceResult<CreatedRecord>` and is restricted to the sighting author. It cannot attach a photo to a status-only sighting with `imagePath: null`.

Sightings do not change the original cat marker location. A photo-sighting's status update remains committed if its later upload fails. The shared `recordSighting()` helper implements both photo and status-only transaction paths. Photo sightings/history are available in services but not yet exposed as dedicated frontend flows.

## Comments — commentService.ts

- `addComment(catId, userId, content)` returns `ServiceResult<{ id: string }>`. The supplied `userId` must equal the current Firebase Auth UID. Content is trimmed, nonblank, and at most 1,000 characters. The service atomically writes the comment and its quota. The rules verify the parent cat exists and enforce a 10-second per-user cooldown.
- `getCommentsByCat(catId, options?)` returns `ServiceResult<Page<Comment>>`, newest first.

There is no comment-edit/delete service even though the rules permit authors to delete their own comments. The UI only supports adding and reading comments.

## Pagination

Comment and sighting reads accept `{ pageSize?: number; cursor?: QueryDocumentSnapshot }`. The default size is 25; valid sizes are integers from 1 through 100. Cursors must belong to the requested collection and cat.

```ts
const first = await getCommentsByCat(catId, { pageSize: 25 });
if (first.success && first.data.hasMore && first.data.nextCursor) {
  const next = await getCommentsByCat(catId, {
    pageSize: 25,
    cursor: first.data.nextCursor
  });
  // Append next.data.items only if next.success is true.
}
```

`Page<T>` contains `items`, `nextCursor`, and `hasMore`. A full page sets `hasMore: true`; it means another page **may** exist. An empty following page is valid. Snapshot cursors handle records with equal timestamps and should not be serialized as plain IDs for reuse.

## Images — imageService.ts

`getImageUrl(imagePath)` returns `ServiceResult<string>`, requires authentication, and accepts canonical cat/sighting photo paths. Its output is a Firebase download-token URL: anyone holding the URL can open the image. This is not authenticated-only image delivery.

`ImageInput` accepts exactly one of `uri` or `blob`, plus `contentType` (`image/jpeg`, `image/png`, or `image/webp`). URI schemes are `file:`, `content:`, or `blob:`; arbitrary HTTPS and data URLs are not accepted as URI inputs. Pass an in-memory Blob for a browser file or converted data URL.

The upload preparation checks nonempty size through 5 MiB, MIME consistency, and a JPEG/PNG/WebP header signature. It reads a FileReader data URL and uploads through Firebase `uploadString`. This is not full image decoding or malicious-file scanning. Storage independently enforces size, declared MIME, ownership, canonical paths, upload expiry, and no overwrites.

The current Add Cat screen uses ImageManipulator to convert selected images to JPEG before calling services. HEIC conversion depends on the target platform's decoder and remains part of native verification.

`prepareImage()` and `uploadPreparedImage()` are lower-level helpers that throw; callers catch them to produce `ServiceResult` failures.

## Partial success and retries

```ts
const result = await createCat(input);
if (!result.success) {
  if (result.data?.uploadState === 'pending') {
    const savedCatId = result.data.id;
    // Keep the ID and image; present a user-triggered retry.
    // await retryCatImage(savedCatId, input.image);
  } else {
    // Show result.error. No committed record ID was returned.
  }
}
```

An upload failure after commit returns failure `data` containing the saved ID, canonical path, null URL, and pending state. Retry the same ID within 10 minutes of its creation. Do not automatically call `createCat()` or `addSighting()` again: that can create duplicates and consume another quota. A missing failure `data` is not a guarantee that a timed-out request could never have committed; the services do not offer general idempotency keys for uncertain network outcomes.

Existing images are immutable. If the upload succeeded but retrieving its URL failed, retry retrieves the existing URL. It does not replace the image even if another file is supplied. After expiry, recovery needs trusted intervention; a cleanup/finalization backend is not implemented.

The frontend keeps a pending cat ID only while the Add Cat form remains mounted. Persisting recovery across reloads is not implemented.
