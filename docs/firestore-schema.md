# KitoKato Firebase foundation

[Project home](../README.md) · [Setup](getting-started.md) · [Service API](service-api.md) · [Testing](testing.md)

This foundation is independent of the existing `my-app` Svelte/Prisma starter. Firebase services, the Expo/React Native frontend, and the Zustand store live in the root `src/` directory. Without Firebase credentials the app runs as a labeled demo with sample data. No Firebase project is selected and nothing has been deployed.

## Collections

All IDs are document IDs, not duplicated fields. Use Firebase-generated IDs for cats, sightings, and comments. All timestamps are Firestore `Timestamp` values; create/update writes use `serverTimestamp()`.

### `users/{uid}`

- `displayName`: nonblank string, at most 50 characters.
- `createdAt`, `updatedAt`: timestamps.

The document ID is the Firebase Auth UID. Only the owner creates/edits the profile; authenticated users can fetch a profile by UID. Listing profiles is disabled. Email and credentials remain in Firebase Auth; never add them to these readable profiles.

### `cats/{catId}`

- `authorId`: creator's Auth UID, immutable.
- `description`: nonblank string, at most 1,000 characters.
- `status`: `stray`, `needs_help`, `being_cared_for`, or `adopted`.
- `location`: map with numeric `latitude` (-90 through 90) and `longitude` (-180 through 180).
- `geohash`: nine-character geohash computed from `location`.
- `imagePath`: `cats/{authorId}/{catId}/photo` in Firebase Storage.
- `createdAt`, `updatedAt`: timestamps.

The creator may edit the description. Any authenticated user may update status only alongside a matching sighting. Creator, initial location, geohash, photo path, and creation time cannot be changed by clients. Client deletion is disabled to avoid orphaning related records and images.

### `sightings/{sightingId}`

- `catId`: existing cat document ID.
- `authorId`: reporting user's Auth UID.
- `location`: observed coordinates with the same validation as cats.
- `status`: same enum as cats.
- `note`: string, at most 500 characters; may be empty.
- `imagePath`: `sightings/{authorId}/{sightingId}/photo`, or `null` for a status-only update.
- `createdAt`: timestamp.

Sightings are immutable observations. Create one together with a cat status/`updatedAt` update and the sighting quota write. Its status must match the updated cat. A sighting records observed coordinates but does not move the original map marker in this MVP. Photo sightings use the same 5 MiB limit, owner permissions, 10-minute upload window, and overwrite protection as cat photos.

### `comments/{commentId}`

- `catId`: existing cat document ID.
- `authorId`: commenting user's Auth UID.
- `text`: nonblank string, at most 1,000 characters.
- `createdAt`: timestamp.

Authenticated users read comments. Authors may delete their own comments; editing is disabled. Use references rather than embedded comment arrays so cat documents remain small.

### `users/{uid}/rateLimits/{kind}`

Internal subcollection; `kind` is `cats`, `sightings`, or `comments`.

- `targetId`: document created in that collection by the same atomic batch.
- `lastCreatedAt`: server timestamp.

Cats and sightings each have a 60-second cooldown per user; comments have a 10-second cooldown. Create the target and set its quota in one `writeBatch` or transaction. Both sides validate each other with `getAfter()`. A quota cannot be deleted, reset by itself, reused for an existing document, or authorize multiple new records. Only its owner can fetch it; listing is disabled. No user profile is required before the first quota write.

## Queries and indexes

- Nearby cats: compute geohash bounds for a center/radius, query each range using `orderBy('geohash')`, `startAt`, `endAt`, and `limit(100)`. Deduplicate document IDs and filter by actual distance; geohash bounds include false positives. The implemented service scans at most 500 documents across ranges and returns `truncated` when that budget is reached before exhaustion. Current status filters run on loaded data; the supplied `status + geohash` composite index supports a future server-filtered query.
- Cat details: direct document fetch by `catId`.
- Comments: `where('catId', '==', catId)`, `orderBy('createdAt', 'desc')`, `limit(25)`. Page with `startAfter(lastDocumentSnapshot)`; the snapshot handles equal timestamps.
- Sightings: the same per-cat query and cursor pattern as comments.
- All collection queries must have a limit of at most 100. Limits bound individual responses, not total reads or repeated queries. A paginated map range must be exhausted before claiming all cats in that area have been loaded.

Single-field geohash indexing is automatic. Composite indexes and exemptions for unused text/location fields are in `firebase/firestore.indexes.json`.

## Photo flow and validation limits

1. Allocate a cat ID and calculate its canonical photo path.
2. Atomically create the cat and its quota.
3. Upload one JPEG, PNG, or WebP image (1 byte through 5 MiB) to that path within 10 minutes of cat creation. Retry failed uploads within that window; overwrites are forbidden.
4. Treat the cat as pending until the upload succeeds and show a placeholder/retry state for a missing photo.

Firestore and Storage cannot commit atomically. This simple direct-client flow can leave a cat or sighting with a missing photo if upload fails; trusted cleanup can remove abandoned records later. Services return the saved ID and `uploadState: 'pending'` in failure data so the caller can retry without creating another record. Firestore rules cannot verify that a Storage file exists or that a geohash mathematically corresponds to coordinates. Storage rules check declared MIME and size, not image bytes. Services calculate geohashes and check image size, MIME, and binary signatures. Signature validation is not full image decoding or tamper-proof server validation. If that becomes required, use a trusted server finalization path.

Services return Firebase `getDownloadURL()` URLs as requested. These are shareable bearer links: anyone holding one can view the image without signing in. Storage SDK reads and all uploads still enforce the rules; do not treat a token URL as authenticated-only access. Cross-service rules require the Storage service's Firestore permissions to be enabled on deployment.

These are per-UID creation cooldowns, not network/IP limits or multi-account abuse prevention. All unrecognized paths deny access. Trusted Admin SDK operations bypass rules and must perform their own validation and cleanup.

## Verification and deployment

From `firebase/`, run `npm ci`, then `npm test` with Node supported by Firebase CLI and Java 21+ installed. The tests use `demo-kitokato` and local Firestore/Storage emulators; they never target production. They cover anonymous access, owner permissions, unknown fields, coordinates/text, atomic quotas, cooldowns, pagination, status history, and photo permissions/size/MIME.

The Step 1 rule version passed all 12 emulator tests on October 8, 2026, including photo overwrite rejection. Step 2 adds sighting photo fields/rules; full emulator and end-to-end verification of the current version is deferred until the user requests final project testing. The existing sighting test fixture has been updated to match the new schema.

After tests pass and a real project is configured, use the [deployment instructions](getting-started.md#3-prepare-firebase-for-live-use), which invoke the CLI installed in the separate Firebase package and explicitly select the target project. Review existing deployed rules first: these files deny paths outside this schema. Frontend-to-emulator wiring is not implemented; see the distinction in [testing](testing.md#firestore-and-storage-rule-tests).

References: [atomic writes and getAfter](https://firebase.google.com/docs/firestore/manage-data/transactions), [geohash queries](https://firebase.google.com/docs/firestore/solutions/geoqueries), [field validation](https://firebase.google.com/docs/firestore/security/rules-fields), [Storage validation](https://firebase.google.com/docs/storage/security), [emulator rule tests](https://firebase.google.com/docs/rules/unit-tests).
