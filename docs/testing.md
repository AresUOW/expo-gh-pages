# Testing and readiness

[Project home](../README.md) · [Setup](getting-started.md) · [Schema](firestore-schema.md)

Last documented: October 25, 2026. This page separates earlier results from work still to run. Creating this documentation did not rerun the application, deploy Firebase, or perform the deferred final test cycle.

## Previously checked

- TypeScript checking and Expo web export passed during the MVP preview work.
- The browser demo was manually exercised for profile viewing, demo sign-in, comment posting, status changes, status filtering, photo selection/conversion, and adding a cat to the map.
- Both narrow and wider browser layouts were inspected. [Saved screenshot](../artifacts/mvp-preview.jpg) records a sample-data overview, not a live Firebase deployment.
- The original Step 1 rules passed 12 emulator tests on October 8, 2026. Sighting photo fields/rules were added afterward, and that newer version has not been reverified as a complete rules/live-app test cycle. The sighting fixture was updated to the new shape.

The browser checks used demo memory, not Firestore/Storage. They do not establish real Auth persistence, rules enforcement, quota behavior, upload recovery, or native-device correctness.

## Static checks and browser build

From the root:

```sh
npm ci --legacy-peer-deps
npm run typecheck
npm run export:web
```

Expected: both commands exit successfully and the export appears in `dist/`. Exporting does not serve or deploy the app. The previous export reported Leaflet CSS local-resource warnings for default image assets; custom markers/controls rendered in the preview, but check the actual deployed web build too. The demo still needs network access for tiles and sample photos.

There is no root unit-test runner, automated browser suite, or CI pipeline configured.

## Firestore and Storage rule tests

The separate `firebase/` package uses the Firebase Emulator Suite, Node's built-in test runner, and `@firebase/rules-unit-testing`. Have Java 21+ available to the CLI; the original run used a temporary Java 21 runtime instead of the machine's Java 8.

```sh
cd firebase
npm ci
java -version
npm test
```

The script explicitly targets `demo-kitokato`, starts Firestore on 8080 and Storage on 9199, and shuts them down afterward. It mocks authenticated clients in tests; it does not start an Auth emulator or test actual signup/login. Local socket access and initial emulator downloads must be allowed. Port 8081 is the separate Expo web server.

The 12 existing test cases cover authentication/bounded reads, atomic quotas, batch abuse, cooldown expiry, invalid fields/ownership, owner edits, sighting-backed status changes, comments/pagination, profiles, private quotas, expired photo windows, and cat-photo upload/overwrite permissions.

Add explicit sighting-photo Storage cases before accepting the newer photo rules: allowed author upload/read, nonauthor denial, canonical path enforcement, null-photo sightings, expiry, size/MIME, and overwrite rejection. Existing cat-photo tests alone do not verify the new sighting-photo paths.

**The frontend does not currently connect to emulators.** There are no `connectAuthEmulator`, `connectFirestoreEmulator`, or `connectStorageEmulator` calls. Starting these tests does not reroute a configured app away from its real Firebase project. Frontend demo mode and Firebase emulators are different mechanisms.

## Final manual acceptance checklist

Run this when the project is ready for the final testing session. Use a dedicated development Firebase project and synthetic records for live checks.

### Browser demo

- [ ] Start without Firebase values and confirm the Demo preview label and original sample cats.
- [ ] Search, change each status filter, and change the radius; the list and marker set agree.
- [ ] Open profiles through a list card and a marker; close with the close control, Escape, and browser back.
- [ ] Enter the demo account from Add Cat and from a comment prompt; the intended flow resumes.
- [ ] Choose a photo, submit coordinates/description/status, and verify the new cat's profile and marker.
- [ ] Check empty description, missing photo, invalid coordinates, canceled picker, and denied location permission.
- [ ] Post a comment and update a status; reload and verify demo contributions reset.
- [ ] Inspect a phone-sized viewport and a wide layout, including modal scrolling and the on-screen keyboard.

### Development Firebase

- [ ] Deploy the intended rules/indexes, wait for index readiness, and confirm all six client values point to the development project.
- [ ] Sign up, sign out, sign in, and reload; verify profile creation and restored Auth state.
- [ ] Create a cat and inspect its record, image path, file, geohash, and coordinates.
- [ ] Confirm records survive reload and are readable by a second signed-in development account.
- [ ] Verify comment pagination, empty lists, equal-timestamp cursors, and ownership checks.
- [ ] Verify status changes create matching sightings and cannot be written independently of history/quota.
- [ ] Attempt repeated creations within and after cooldowns: cats/sightings 60 seconds, comments 10 seconds.
- [ ] Fail an upload after document commit; retry the saved ID and confirm there is only one record.
- [ ] Verify recovery behavior when the upload completed but fetching its URL failed, when the form closes/reloads, and when the 10-minute window expires.
- [ ] Exercise dense nearby queries and confirm `truncated` is handled as incomplete data.
- [ ] Check unauthenticated and forged direct SDK requests against the actual deployed rules.

### Native iOS and Android

- [ ] Complete standalone Google Maps SDK/key setup and create the appropriate development build.
- [ ] Check map rendering, markers, location permission, denied permission, and manual coordinates on both platforms.
- [ ] Check photo permission, cancel behavior, HEIC/JPEG/PNG inputs, conversion, and upload size limits.
- [ ] Check persisted Auth after app restart and cleared UI/session after sign-out.
- [ ] Check modal back behavior, safe areas, keyboard visibility, and long comment lists on a device.

## Remaining implementation boundaries

- Firebase provisioning, deployed rule verification, and native signing/build configuration are not completed by the demo.
- No deployment hosting target, CI pipeline, automated UI suite, or app-store submission is configured.
- The current UI exposes status updates; photo sightings/history exist only in the service layer.
- Photo retry context is not durable across closing/reloading the add form; no trusted abandoned-record cleanup exists.
- Cat/comment reads are explicit fetches rather than real-time subscriptions. Map panning does not trigger a new geographic query.
- Search/filtering covers only loaded cats; geohash consistency and full image integrity are not server-verified.
- Download URLs are shareable bearer links. Creation cooldowns are per UID, not IP-wide or multi-account spam prevention.

Record future test dates/results against the exact source/rule version tested. Historical passes should not be treated as proof for later changes.
