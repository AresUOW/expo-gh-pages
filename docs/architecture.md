# Architecture

[Project home](../README.md) · [Service API](service-api.md) · [Data model](firestore-schema.md)

This document describes the implemented MVP, not a proposed production architecture.

## App entry and screens

`index.ts` registers `App.tsx` with Expo. The app shell loads DM Sans, supplies safe-area handling, renders Home, and manages modal screens. In live mode it also subscribes to Firebase Auth state.

- **HomeScreen:** map/list, loaded-data search, status filters, radius selection, and a foreground location request.
- **AddCatScreen:** photo selection and conversion, description/status inputs, coordinates, submission, and an in-form photo retry.
- **CatDetailScreen:** image/details, comments, and status updates.
- **AuthScreen:** real email/password signup/login in live mode; a clearly labeled demo explorer in demo mode; account/sign-out controls.

The About sheet explains the app and demo. Navigation uses Zustand's `modal`, `selectedId`, and `afterAuth` values with React Native `Modal`; it does not use Expo Router or React Navigation. The app handles Android back, browser Escape, and a browser-history entry for an open sheet. Public cat deep links are not implemented.

## State and service boundary

The flow is:

```text
Screen action
  -> Zustand action in src/store/useAppStore.ts
     -> demo: update in-memory sample records
     -> live: call Firebase service, then update/reload UI state
```

The store owns cats/comments, session display information, search center/radius, filters, selected cat, modal state, and loading/error/notice state. `visibleCats()` filters the loaded set and sorts it by distance. Form text, selected photo, and the pending upload ID stay in their screen components.

The UI does not directly construct Firestore writes. Services validate inputs and use the Firebase SDK; Firestore/Storage rules independently enforce server-side permissions and constraints. There is no custom HTTP API, Cloud Function, or Admin SDK service in this MVP.

`ServiceResult<T>` is the service contract. Store actions usually simplify it to `ActionResult`. UI models such as `DisplayCat` are separate from persisted models such as `Cat`.

## Demo mode

`src/config/runtime.ts` chooses demo mode before Firebase initialization. `src/data/demo.ts` supplies six cats and example comments around Kuala Lumpur. The store starts as a guest; entering the demo creates only an in-memory Alex session.

Demo actions modify memory. Reloading resets cats, comments, status updates, and session state. Demo contributions are not written to Firebase or AsyncStorage. The demo is useful for trying the UI but does not test real authentication, Firestore rules, upload permissions, or cooldowns.

Sample photos are remote Unsplash images. Map tiles are remote OpenStreetMap resources. These still need network access even though demo records are local.

## Firebase initialization

- `firebaseApp.ts` initializes or reuses the default Firebase app and rejects missing config when imported.
- `firebase.ts` exports web/default Auth, Firestore, and Storage instances.
- `firebase.native.ts` is selected by Metro on iOS/Android and configures Auth persistence with AsyncStorage.
- `firebase-auth-native.d.ts` declares the documented native persistence export omitted from the installed Firebase root typings. Only the native file should use that export.

The store dynamically imports services on live actions. Demo startup does not need to initialize Firebase. `App.tsx` subscribes to Auth changes in live mode; cats and comments are fetched explicitly, not subscribed to in real time.

## Creating a cat

1. The picker accepts an image; sources above 25 MiB are rejected when source size is available.
2. ImageManipulator resizes images wider than 1,600 pixels and saves a JPEG at compression 0.82. Web creates a Blob; native passes a local URI.
3. The service validates the prepared image, coordinates, description, status, and authenticated user.
4. A batch creates the cat and its matching per-user quota record with server timestamps.
5. The image is uploaded to the canonical Storage path, followed by a download-URL request.
6. The store reloads nearby cats around the submitted location and selects the new cat.

Firestore and Storage cannot commit as one atomic operation. If step 5 fails, the saved ID and `uploadState: 'pending'` return with the error. Retrying reuses that ID; it does not consume another cat-creation quota. See [API recovery](service-api.md#partial-success-and-retries).

## Status updates and sightings

`updateCatStatus()` delegates to the shared sighting transaction. It reads the cat, records a status-only sighting (`imagePath: null`), updates the cat status/time, and writes the sighting quota. Status-only sightings use the original cat location and the note `Status updated`.

`addSighting()` supports a new photo and observed coordinates through the service layer. Omitting status preserves the transaction's current cat status. Neither path moves the original map marker. The current UI has no photo-sighting form or sighting-history viewer.

## Reading nearby cats and comments

Nearby queries use geohash bounds, 100-document pages, a shared 500-document scan budget, deduplication, and exact-distance filtering. A `truncated` result is an incomplete area, not a complete nearest-500 guarantee. Status/text filtering is currently performed on loaded records; the existing status/geohash index is available for future server-side status queries.

The store resolves download URLs for newly loaded cats and reuses URLs already in its in-memory cat list. This can make one Storage metadata request per new cat. The service result's scan budget does not include these requests or security-rule reads.

Comments and sightings use indexed per-cat queries, newest first, with document-snapshot cursors. Comments load when a profile opens and after posting; there is no background multi-user synchronization. The comment list can request another page.

## Platform differences and display data

The web map is `CatMap.web.tsx` with Leaflet/OpenStreetMap and CSS; `CatMap.tsx` uses native Google Maps. Map panning/zooming changes the visual viewport only. Queries use the store's search center, updated by a location request or successful cat submission, and its selected radius.

Below 850 pixels the layout uses a map/list toggle and bottom navigation. At wider widths, cards and map appear side by side. Shared components and the theme live in `src/components/` and `src/theme.ts`.

The schema has no separate cat-name, neighborhood, or public reporter-name fields. Live display names are derived from a short first sentence of the description, falling back to `Cat #…`; area/reporter text uses generic labels. Sample records have curated display names/areas. Reverse geocoding and loading other users' public profile names are not implemented.

## Current boundaries

The MVP has no moderation/reporting flow, App Check setup, IP/account-abuse limiter, trusted image finalizer, abandoned-upload cleanup job, or offline write queue. Authentication email verification/password recovery and owner editing/deletion screens are also absent. These are implementation boundaries, not claims that all should be added before the next preview. See [readiness](testing.md) for the outstanding verification work.
