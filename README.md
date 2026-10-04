# Health Tracker

A personal health and habit tracker: daily habits, training routines with a hold timer,
lift logging with progress charts, rehab check-ins and notes. Dark theme, works offline,
installable on a phone's home screen.

Plain HTML, CSS and JavaScript with no build step. The only outside resources are Chart.js (from cdnjs) and the Manrope font (Google Fonts); both are saved for offline use.

## Files

| File | What it is |
|------|-----------|
| `index.html` | Page shell, navigation and tab containers |
| `styles.css` | All styling. Colours and sizes are variables at the top (`:root`) |
| `app.js` | App logic, in numbered sections (see the list at the top of the file) |
| `data.js` | Default routines, weekly schedule, pain rule and progressions |
| `sw.js` | Service worker: lets the app open with no signal |
| `manifest.webmanifest` | App name, colours and icons for "Add to Home Screen" |
| `icons/` | App icons (regenerate with `tools/make-icons.ps1`) |
| `tools/serve.ps1` | Optional local web server for testing offline/install features |

## Running it

- **Quickest:** double-click `index.html`. Everything works except offline mode and keeping the screen awake during timers.
- **Like it runs when hosted:** `powershell -ExecutionPolicy Bypass -File tools\serve.ps1`, then open http://localhost:8766.

## Your data

Everything is saved in the browser's `localStorage` on each device, under the key `tracker.v1`.
Nothing is sent anywhere. Phone and laptop each keep their own copy: use
**Settings → Export data / Import data** to back up or move data between them.

On iPhone, the home-screen app and Safari keep **separate** data. Use the home-screen app.

## Making changes

- Edit routines inside the app (Routines → a routine → Edit). To change the built-in defaults, edit `data.js`.
- If you add, rename or remove a file the app needs, add it to `APP_FILES` in `sw.js` and bump `CACHE_VERSION`.
- If you change the shape of saved data, bump `SCHEMA_VERSION` in `app.js` and add a step to `MIGRATIONS`, so existing data upgrades instead of breaking.
