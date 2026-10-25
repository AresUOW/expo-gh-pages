# Getting started

[Project home](../README.md) · [Architecture](architecture.md) · [Testing](testing.md)

## 1. Run a demo without Firebase

Use the repository root: it contains `App.tsx`, `app.json`, and the active `package.json`. The `my-app/` folder is an older Svelte/Prisma starter and is not needed to run KitoKato.

Prerequisites:

- Node.js and npm. The installed Expo/RN packages accept Node 22.13+, Node 24.3+, or Node 26+ within their declared engine ranges. Node 24.3+ within 24.x is a shared baseline; Node 26.4 was used for the earlier browser build.
- Internet access for dependency installation, web map tiles, and sample photos.
- A browser. No Firebase account, Java runtime, or Google Maps key is needed for the browser demo.

```sh
npm ci --legacy-peer-deps
npm run web
```

Open [http://localhost:8081](http://localhost:8081) and keep the terminal running. Stop the server with `Ctrl+C`. The install command matches the dependency-resolution mode used for this workspace's lockfile.

### Try the main flows

1. Select a cat card or photo marker to open its profile.
2. Select **Needs help**, **Cared for**, **Stray**, or **Adopted** to filter cats. Search matches names, descriptions, and display areas among loaded cats.
3. Select **Add a cat**. When prompted, choose **Continue as a demo explorer**; this returns you to the form as Alex.
4. Choose a photo, add a description, choose a status, and check the coordinates. Start the description with a short name followed by a period if you want a recognizable display name: `Chai. Friendly tabby near the café.`
5. Submit the cat, open its profile, add a neighborhood note, or choose **Update** to change its status.
6. Reload to return to the original sample data. Signing out alone does not clear demo contributions.

On narrow screens, **List view** switches away from the map. The location pill offers 500 m, 1 km, 2 km, or 5 km search radii. **Use my current location** requests permission only when selected. If your location is far from Kuala Lumpur, the demo may have no cats nearby; the empty list offers a return to the sample neighborhood.

## 2. Choose demo or Firebase mode

Mode selection lives in [runtime.ts](../src/config/runtime.ts). The app uses demo data when **any** of the six Firebase values is missing or when `EXPO_PUBLIC_DEMO_MODE` is exactly `true`. Supplying only some values does not enable a partial Firebase connection. Removing the demo flag enables live mode only when all six values are present.

To configure the app:

```sh
cp .env.example .env
```

Edit the root `.env`, using the web-app configuration from your Firebase project:

```dotenv
EXPO_PUBLIC_FIREBASE_API_KEY=your-client-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-actual-storage-bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-web-app-id
EXPO_PUBLIC_DEMO_MODE=false
```

Copy the actual bucket value; do not infer its hostname. These values identify the client app and are included in the bundle. Service-account credentials and other private server keys do not belong in `EXPO_PUBLIC_*` variables. `.env` is ignored by Git. The old `my-app/.env` is not the active app configuration.

Restart Expo after editing `.env`; rebuild exported/native bundles when their configuration changes. Configuration presence does not prove that the project, credentials, rules, or services work.

## 3. Prepare Firebase for live use

Use a development project for the first live verification. This section documents setup; no project has been provisioned or deployed by this repository's completed work.

1. Register a Firebase web app and copy its configuration into `.env`.
2. Enable Email/Password authentication. The signup service accepts passwords of 8–128 characters; any stronger Firebase password policy still applies.
3. Provision Firestore's default database and a Firebase Storage bucket. Default-database paths are used by the Storage rules.
4. Install the separate Firebase CLI/test dependencies and sign in:

   ```sh
   cd firebase
   npm ci
   npx firebase login
   npx firebase projects:list
   ```

5. After reviewing the target project and completing rule verification, deploy this repository's rules and indexes from the same `firebase/` directory:

   ```sh
   npx firebase deploy --config ../firebase.json --project YOUR_PROJECT_ID --only firestore:rules,firestore:indexes,storage
   ```

   Replace `YOUR_PROJECT_ID` with the intended project ID. This changes the remote project's rules and indexes. Rules deny paths outside this app's schema, so review existing project usage before replacing them. The CLI may request permission to let Storage rules access Firestore; these cross-service checks require it. See [Firebase's rule-condition documentation](https://firebase.google.com/docs/storage/security/rules-conditions).

6. Wait for composite indexes to finish building. Return to the root with `cd ..`, start the app, and create a test account through the real signup form.

Live mode starts without sample cats. Sign in, then add a real development record near the selected search center. Data persists in Firebase; the application does not seed or copy demo records into it. Firebase deployment does not publish the frontend.

## 4. Native app setup

The native commands are `npm run ios` and `npm run android`. A suitable simulator, emulator, or device and a compatible Expo runtime are needed. Native device behavior has not yet been verified.

Both native platforms currently use `PROVIDER_GOOGLE` in [CatMap.tsx](../src/components/CatMap.tsx). `app.json` configures photo/location permissions but **does not yet configure Google Maps SDK keys for standalone builds**. Complete the platform SDK/key configuration and rebuild before treating a standalone native map as ready. Adding Firebase values does not configure Google Maps. Follow the [Expo Google Maps deployment instructions](https://docs.expo.dev/versions/latest/sdk/map-view/).

Expo Go has different setup requirements from a standalone binary; compatibility with this project's Expo 58 dependency set should be checked on the target device. No signing, native build pipeline, or store submission has been configured here.

## Troubleshooting

### The app still says Demo preview

Check all six root `.env` values and the exact `EXPO_PUBLIC_DEMO_MODE` value. Restart the server after changes. Do not change the Firebase services merely to bypass the missing-config check.

### The map or cat list is empty

Clear the text/status filters and check the search radius. Live Firebase starts with no cats. Panning the map does not run a new nearby query; the query uses the stored search center. In demo mode, return to the Kuala Lumpur sample neighborhood if you moved the search center elsewhere.

### A write says it is not allowed or too fast

In live mode, sign in and allow the per-user cooldown to expire: cats and sightings each have 60 seconds; comments have 10 seconds. Status updates consume the sighting cooldown. If the error persists, check the deployed rules, project ID, and the service's atomic write shape. Demo mode does not enforce these cooldowns.

### A cat was saved but its photo failed

Keep the add-cat form open and use **Retry photo upload**. The retry targets the saved ID rather than creating another cat. Uploads expire 10 minutes after record creation. Pending IDs are currently held only in component state; closing or reloading the form loses the UI retry context. Recovery after that requires the service API or trusted cleanup.

### The preview is unavailable

Start `npm run web` again; the localhost link only works while the development server is running on this computer. If port 8081 is occupied, stop the conflicting process you own or start Expo with a different explicit port. A web build in `dist/` is not a running server or a hosted deployment.
