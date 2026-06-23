# Wilder Chestnuts Farm Map

A mobile-friendly web app for tracking every tree and planting on the farm (Newberg, OR):
year planted, stock type (seedling / grafted / tissue culture), graft status and scion,
planned grafts, notes, and yearly vigor check-ins — plus a map view with your live GPS
position while walking the field.

Works as an installable app (PWA) on iPad, phone, and desktop, and keeps working offline
in the field, syncing automatically once you're back near WiFi/cell signal.

## Tech stack

- **Vite + TypeScript** — app shell, no heavy UI framework
- **Leaflet** — map rendering, with your own farm sketch/aerial photo as an overlay
- **Firebase** — Firestore (data, with offline persistence) + Authentication (Google sign-in)

Firebase needs a free account that you create yourself (I can't sign up for third-party
services on your behalf). Setup takes about 10 minutes — steps below.

## 1. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a new project (the free **Spark** plan is enough — no credit card required).
2. In the project, click **Build > Authentication > Get started**, then enable the **Google** sign-in provider.
3. Click **Build > Firestore Database > Create database**. Choose a region close to Oregon (e.g. `us-west1` or `us-west3`), and start in **production mode**.
4. Click the gear icon > **Project settings** > scroll to **Your apps** > **Add app** > Web (`</>`). Register it (no need for Firebase Hosting setup yet) and copy the `firebaseConfig` values.

## 2. Configure the app

```bash
cp .env.example .env
```

Paste the values from step 1.4 into `.env`:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## 3. Add yourself (and anyone else) to the access list

The app only lets in people you've explicitly approved. In the Firebase console, go to
**Firestore Database**, and create a collection called `access`. Add one document per
person who should have access:

- **Document ID**: their exact Google account email (e.g. `you@gmail.com`)
- **Fields**: doesn't matter, e.g. `role: "owner"` — the document just needs to exist

Do this for yourself and for any family/helpers who'll use the app.

## 4. Deploy security rules

The rules in `firestore.rules` make sure only people on the `access` list can read or
write farm data.

```bash
npm install -g firebase-tools
firebase login
firebase use --add        # pick your project, alias it "default"
firebase deploy --only firestore:rules
```

## 5. Run it locally

```bash
npm install
npm run dev
```

Open the URL it prints, sign in with Google, and you're in.

## 6. Deploy it somewhere you can reach from the field

Easiest path is Firebase Hosting (free):

```bash
npm run build
firebase deploy --only hosting
```

This gives you a `https://<project-id>.web.app` URL. Open it on your iPad/phone in
Safari/Chrome, then **Share > Add to Home Screen** for an app-like icon. Allow location
access when prompted — that's what powers the live position dot on the map.

(Vercel/Netlify work too if you'd rather use those — just point them at this repo with
build command `npm run build` and output directory `dist`.)

## Adding your field map

Once you send over your Google Sheets layout and drawings, the fastest way to get your
farm's actual map showing is:

1. Get an image of your layout (a photo/scan of the drawing, or a screenshot of the
   satellite view with your rows sketched on it). Save it into `public/farm-map.jpg`
   (or host it anywhere and use that URL).
2. In the **Map** tab of the app, click **"Set up field map image"**.
3. Paste the image URL (if you saved it into `public/`, the URL is just `/farm-map.jpg`).
4. Find the GPS coordinates of the image's four corners — easiest way is to open Google
   Maps, right-click each corner of your field, and copy the coordinates shown — and
   enter them as North/South/East/West. Approximate is fine to start; you can refine
   later.
5. Save. Your drawing now appears as an overlay on the satellite map, in the right place.

## Importing your existing trees

Rather than adding each tree one at a time, use the **Import** tab:

1. Click **"Download CSV template"** to see the expected columns.
2. In your Google Sheet, add/rename columns to match those headers (order doesn't
   matter; extra columns are ignored).
3. File > Download > Comma Separated Values (.csv) from Google Sheets.
4. Upload (or paste) the CSV in the Import tab, review the preview, and confirm.

Recognized values:
- `plantType`: `chestnut`, `understory`, `companion`, `other`
- `stockType`: `seedling`, `grafted`, `tissue_culture`, `unknown`
- `graftStatus`: `not_applicable`, `not_grafted`, `planned`, `grafted`, `failed_regraft_needed`
- `status`: `planted`, `planned`

Anything unrecognized gets a sensible default and is flagged in the preview so you can
fix it before importing.

## Recording a tree's real GPS position

Trees don't need GPS coordinates to exist in the app — row/grid position from your
sheet is enough to get started. When you're standing at a tree in the field, open its
detail page, hit **Edit**, then **"Use my current location"** to stamp its real
coordinates. Once enough trees have real GPS, they'll show up correctly placed on the
satellite map regardless of the overlay image.

Note: GPS accuracy can degrade to 10–20m under tree canopy — good enough to confirm
you're near the right tree, not survey-grade.

## Limitations / not included yet

- No photo attachments (by design, for now — easy to add later via Firebase Storage).
- The field map image needs corner GPS coordinates entered by hand; there's no
  click-to-place calibration UI yet.
- Single shared access list (everyone with access can edit everything) — no per-role
  permissions.
