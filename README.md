# Creature Training Camp

A Hebrew, right-to-left React app for personal Stage A gifted-test practice. It uses only renewable practice with 10–100 questions: calculated numerical variants and original authored reading stories. Extracted booklet questions and passages are no longer included. Each attempt uses its start timestamp to shuffle questions. The app shows one question at a time, with count-up timers and a live correct/submitted score. The question timer stops when an answer is submitted. Use “לשאלה הקודמת” to review earlier questions, then “לשאלה הבאה” to return. Submitted answers stay locked; reviewing does not change scores or award catches again. The unanswered question keeps its selected answer and elapsed time when navigating away, including across save/reload. The total timer runs while the quiz is visible, including feedback. Firebase Authentication supports email/password and Google sign-in. Attempts, results, and catches stay in browser local storage, separated by Firebase account UID. They do not yet sync between devices.

The top-bar “הגדלה” toggle opens a draggable 2× magnifying glass with an upper-right glass reflection. Drag it with a mouse or touch, or move the focused lens with arrow keys (Shift for larger steps). Escape closes it and returns focus to the toggle. The lens follows page scrolling and live question updates, including niqqud and selected answers.

Correct answers add SRD creatures to the collection. The avatar menu selects one of four visual worlds: 32 SRD creatures, 23 mythological companions, 25 natural animals, or 20 animated voxel companions (עולם הקוביות). SRD names come from the supplied SRD 5.2.1 (CC BY 4.0), with Hebrew translations. Collection rarity and the second-catch "experienced friend" rank are app mechanics, not SRD rules or species evolution. Existing generated attempts and local reward totals migrate to the new roster without changing question snapshots, answers or scores.

All creature artwork is bundled locally from verified free public-domain sources: CC0 releases by Kenney, LuizMelo, Clint Bellanger, Hexany Ives and PulsarCP, plus explicit public-domain illustrations by Gordy Higgins, CC0 Openclipart illustrations, and CC0 voxel sprites by Cole Foster. The voxel world uses independent blocky designs, with no Minecraft game artwork or affiliation. New animal sprites use 24–96 pixel source cells, fantasy animations use cells up to 264×184, and selected illustrations are downsampled to 512 pixels. Every mythology companion now has native artwork of at least 32×32, including eight 512×512 illustrations. No 16px artwork is upscaled to claim added detail. Some SRD fallback creatures still use 16×16 sprites. These are not claimed as high-resolution artwork. Animation frame counts vary by source. Static illustrations use a gentle CSS bob. Reduced-motion preferences disable all animations. The bat app icon uses Kenney's CC0 Bat tile. No remote creature-image requests are needed. The service worker precaches the sprites, icons and license notices.

Choose a world using the avatar menu in the top bar. The profile remembers this choice per Firebase account in this browser. Home-screen art and unanswered companions follow the selected world. Each world filters its own collection using stable creature IDs; switching never discards another world's rewards. Submitted answers save their awarded companion and keep it during review, even after switching worlds. Old numeric reward IDs use the original fixed eight-creature mapping so adding creatures cannot remap existing collections. Incorrect-answer encouragement includes the current companion's Hebrew name.

The required SRD attribution, adaptations, art source URLs, archive hashes and bundled CC0 notice are in `public/licenses/`. The same attribution and reuse rights appear in the in-app terms. These establish documented license provenance, not a blanket legal guarantee. Earlier assets may still exist in Git history and old deployments.

## Run locally

Install Node.js 22.12 or newer, then run:

```sh
npm ci
npm run dev
```

Open the app and sign in with Google, or create an account with an email and password. The sign-in screen also supports password-reset email. Firebase restores the signed-in session on reload; use “יציאה” in the top bar to sign out. Auth state changes unmount the previous account's training UI and load the next account's local profile.

If this browser has progress from the former PIN version, a new empty account can explicitly import it from the home-screen banner. The original data remains intact, the PIN verifier is not copied, and the import cannot overwrite an existing profile or be claimed twice.

## Firebase setup

The Firebase project is [Gifted Test Prep](https://console.firebase.google.com/project/gifted-test-prep-2026/authentication/providers), project ID `gifted-test-prep-2026`. Email/Password and Google are enabled, including a provisioned Google OAuth client. The authorized hosts are `shyalon.github.io`, `localhost`, `127.0.0.1`, and the project's default Firebase hosts. If hosting moves, add the new hostname in **Authentication → Settings → Authorized domains**.

`src/firebase-config.json` contains the public web app configuration used by the client and GitHub Pages builds. It is not a service-account key and requires no GitHub secret. Environment overrides are listed in `.env.example`. Never add a service-account key or CLI access/refresh token to the frontend or Git repository.

`firebase.json` records the enabled providers and the Google support contact. With Firebase CLI 15.37 or newer, reproduce the provider configuration using:

```sh
firebase login
firebase deploy --only auth --project gifted-test-prep-2026
```

This command configures authentication only; it does not deploy the GitHub Pages website. Deploy website changes through the existing Pages workflow after committing/pushing them. Updating Firebase providers does not automatically redeploy the app.

For offline authentication testing, start the emulator in one terminal:

```sh
firebase emulators:start --only auth --project demo-gifted-test-prep
```

Then start an emulator-only development preview in another terminal:

```sh
VITE_FIREBASE_AUTH_EMULATOR_URL=http://127.0.0.1:9099 \
VITE_FIREBASE_PROJECT_ID=demo-gifted-test-prep \
VITE_FIREBASE_API_KEY=demo-api-key npm run dev
```

The emulator accepts disposable email/password accounts and provides a fake Google popup. It sends no real password-reset email and creates no production users. Emulator routing is ignored in production builds. Run the full test suite against it with:

```sh
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 npm test
```

Without that variable, `npm test` skips the emulator integration checks. Firebase signs users in; local account profiles remain browser data.

## Practice content

`src/question-generator.js` contains 12 numerical templates with bounded parameters, calculated solutions and explanations. `src/reading-bank.js` contains three original fictional stories with six comprehension questions each. Reading stories are authored content sets, not live AI generation. A session includes about one-third reading questions (up to the 18 available) and fills the rest with numerical variants. All Hebrew learning content retains niqqud. Difficulty has not been calibrated with learners.

Every generated attempt saves its complete questions, answer choices, explanations and passages, so resuming and reviewing do not change them. Existing generated attempts and collections remain available. Old booklet/mixed attempts are excluded from the UI; the app no longer resolves or bundles their content. Legacy local storage is not erased in bulk.

The extracted bank, correction snapshots and booklet import scripts have been removed from the current tree. This does not erase past commits or previously deployed artifacts. Publishing this version replaces the site content, and its service worker clears older app caches when it activates after existing windows close. Historical repository content and downloadable Actions artifacts may need separate removal if previously published.

The app uses SRD creature names under CC BY 4.0 and CC0/public-domain artwork; keep `public/licenses/` with deployments.

Run calculation, question-integrity and saved-attempt checks with `npm test`, and compile the production app with `npm run build`.

## GitHub Pages

1. Push the project to your GitHub repository.
2. In the repository, open **Settings → Pages** and select **GitHub Actions** as the source.
3. Run **Deploy to GitHub Pages** in **Actions**. Open the deployment URL and sign in with email/password or Google.

If Configure Pages returns 404, confirm that **Settings → Pages → Build and deployment → Source** is set to **GitHub Actions**, then start a new workflow run. GitHub Pages requires an eligible plan for private repositories. Private site access is a separate GitHub Enterprise Cloud setting. The Pages build contains generated-question templates, original reading stories, icons, and answer logic. Anyone who can access the deployed site can retrieve that data from the browser bundle. Firebase Authentication gates the app interface; it does not make bundled static assets private.

Artwork sources: [Tiny Dungeon](https://kenney-assets.itch.io/tiny-dungeon) and [Monsters Creatures Fantasy](https://luizmelo.itch.io/monsters-creatures-fantasy).

Artwork download records, original frame sizes, source files and archive hashes are in `public/licenses/`. Only selected visual assets are shipped; downloaded third-party generator scripts are not executed or included. PulsarCP discloses AI-assisted graphics on its source pages; the Openclipart Fire Horse uploader uses the ai_art tag. Gordy Higgins declares public-domain status explicitly; we do not relabel that declaration as a formal CC0 license. All use is documented in the in-app terms.

## Source layout

`src/main.jsx` mounts authentication and the app and registers offline support. `src/App.jsx` owns navigation, saved game updates and tracking. `src/components/` holds the practice screens, avatar menu, collection, guidance, terms and bottom bar. `UI.jsx` provides shared buttons, branding, external links and the native modal shell; `QuestionContent.jsx` shares pointed Hebrew text, reading passages and answer/explanation rendering. `practice-summary.js` centralizes labels, scores and date formatting. Only generated question snapshots are resolved; there is no booklet-bank loader.

`npm test` includes server-rendered component checks for button/form semantics, modal title relationships, retained attribution and saved-question review. These run without opening a server port. Browser smoke checks remain useful for native dialogs, focus return and the magnifier.

## Fixed tests and local theme packs

The home training map has five fixed 30-question tests. Their question and answer order is saved in `src/fixed-tests.json`, independent of date and visual world. Finishing a test marks its tile complete using the account's saved history; starting or pausing it does not. The renewable practice option remains available.

Open the avatar menu and choose **העלאת ערכת נושא** to import a ZIP. The latest imported pack replaces the previous imported pack and is stored in this browser's IndexedDB (`gifted-local-themes`), separately from account progress. Older localStorage packs remain readable; a successful new save removes only the old theme copy. IndexedDB avoids the localStorage quota shared with saved progress. Importing makes no upload request; custom pack names, IDs, images and contents are excluded from analytics. Packs contain only embedded raster images, so using them makes no external image requests. Storage failures leave the previous saved pack intact. Clearing browser site data removes the pack.

Load your local `artifacts/pokemon-theme.zip` for the original 116-entry Pokémon roster, encounter rarity tiers and evolutions after two catches. It includes still artwork, animations, the avatar icon and branding from the former experience. Images are compressed and animation frames sampled to fit local storage. Assets originate from PokeAPI/sprites; third-party character/artwork rights remain with their respective owners. Generated packs and artwork in `artifacts/` are ignored by Git and are not included in a fresh checkout. The ZIP stays outside `public/` and is not included in the deployed app or service-worker cache.

Theme ZIP format (version 1): root `theme.json` plus referenced PNG, GIF, JPEG or WebP files. Both ZIP size and total expanded size must be at most 3 MiB, with at most 450 entries and 200 creatures. Images must decode and be at most 2048×2048. Absolute/remote paths, traversal, duplicate paths, SVG/HTML/scripts, missing references, invalid rarity/color values and duplicate creature IDs are rejected. An optional `README.txt` can hold source/rights notes. No scripts, stylesheets or remote resources are supported.

The manifest has `version: 1`, a lowercase alphanumeric/hyphen `id`, `name`, `description`, `avatar` and `companion` creature IDs, and a `creatures` array. Each creature has `id`, `name`, `english`, `color` (grass/fire/water/air/electric/psychic/earth/fairy), `rarity` (standard/epic/legendary/mythical), and an `image` archive path. Optional `animation` is an animated raster path; optional `evolution` has `name`, `english`, `image` and optional `animation`. `encounter: false` keeps historical entries out of encounters. Optional manifest fields: `icon`, `brand`, `tagline`, `hero`, `singular`, `plural`, and `mark: "ball"`. The Pokémon ZIP is a complete example.

Theme manifests may include `testImages: { "incomplete": "images/closed.webp", "completed": "images/open.webp" }`. Both images must be embedded raster assets and pass the same validation as creature images. Fixed test cards select the image from saved completion state, with a shadow, keyboard focus and hover motion (disabled for reduced motion). Without these fields, a world's avatar/companion artwork is used. The updated Pokémon ZIP includes closed/open Poké Ball backgrounds; reimport it to update an already-installed pack.

Pages deployment is self-contained in `.github/workflows/pages.yml`: install, test, build, upload, and deploy. The inline deployment uses the upload's exact artifact ID and the job's OIDC token, avoiding the failed name-based artifact lookup. Uploads time out after five minutes. No separate deployment script is needed.

## Local usage spreadsheet

Run `firebase login` with an account that can read this project's Firestore data and Firebase Authentication users, then:

```sh
npm run usage:export
```

This creates an Excel workbook in the ignored `artifacts/usage/` directory. It starts with **Summary** (one row per user, identified by email, with sessions, active days, completed tests, answers, accuracy, hints, active minutes and last activity), followed by **Users** (sessions, active days, tests, answered/seen questions, correct/wrong answers, accuracy, hints, focused time, explanation/passage/help usage and account timestamps), **Question types**, **Questions** (one row per user + attempt + question), and **Notes** (definitions, sources and limits). It only reads Firebase; it does not change accounts, rules, progress or telemetry. Names and emails are included, but passwords, password hashes and credentials are neither requested nor written to the report.

```sh
# Optional reporting window; end is exclusive, ISO timestamps use UTC here
npm run usage:export -- --from 2026-11-01T00:00:00Z --to 2026-12-01T00:00:00Z
# Select a Firebase CLI login or another project
npm run usage:export -- --account you@example.com --project gifted-test-prep-2026
# UID-only report when the account cannot list Firebase Auth users
npm run usage:export -- --no-users
# Dependency-free spreadsheet-readable CSV files instead of XLSX
npm run usage:export -- --format csv --out artifacts/usage/csv
# Exercise the whole exporter locally with synthetic data and no Firebase access
npm run usage:export -- --demo --out artifacts/usage/demo.xlsx
```

XLSX generation uses the bundled Codex spreadsheet runtime, discovered under `~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules`. Set `ARTIFACT_NODE_MODULES` to the bundled `node_modules` path if yours differs. CSV output needs only this project's installed dependencies. The script locates the installed Firebase CLI on `PATH` and uses its account selection/token refresh; it does not ask for a service-account key. If necessary, set `FIREBASE_CLI_PATH` to the installed Firebase CLI's `lib/bin/firebase.js` entry. The authentication adapter uses the installed CLI's internal auth module (tested with firebase-tools 15.37.0); a future CLI layout change may require updating that adapter. Authentication/permission failures stop the export rather than writing an incomplete report. `--no-users` deliberately omits Auth metadata and users without recorded activity.

**Interpretation:** explicit login events were never recorded, so the workbook labels session counts as a **login proxy**. Reloads/new tabs and restored sign-in sessions also increment sessions. Auth's last sign-in timestamp is included separately. Historical renewable questions without type metadata stay **Unknown**; fixed-test questions can be classified from their bank. New telemetry includes `questionType`, so math/reading counts become available as users run the updated app. Counts describe retained uploaded telemetry (normally up to 85 days), not lifetime usage. Unanswered questions are separate from wrong answers. Duplicate telemetry and repeated submissions for the same question attempt are not counted twice. Timestamps are UTC; active days use Asia/Jerusalem.

For offline troubleshooting, `--input path/to/usage.json` accepts `{ "users": [{ "uid", "email", "name", "created", "lastLogin", "disabled" }], "batches": [{ "id", "uid", "sessionId", "events": [...] }] }`; timestamps in this input are epoch milliseconds. This does not require a Firebase login. `--preview` additionally writes local workbook QA images. Generated workbooks and CSVs remain outside Git and the deployed site.

## Creature battles

Every built-in world and imported pack supplies attack, defense, health and an elemental type. Older ZIPs without combat fields receive random in-range stats and a randomly rotated, balanced eight-element distribution on import. Generated fields are saved with the theme, including evolution stats, so they do not reroll on refresh or account switches. Previously saved themes without fields receive stable seeded defaults. Explicit values are preserved; invalid supplied values are rejected. Generated base ranges are attack 22–30, defense 10–17 and health 85–110, with a small rarity multiplier (up to 1.12), within the full allowed limits. New packs can explicitly set `element` (fire/grass/earth/electric/water/air/psychic/fairy), `attack` and `defense` (integers 1–100), and `health` (integer 10–500). The same fields are optional on `evolution`; omitted evolution stats receive a random 5–15% increase, capped at the allowed limits. Combat elements are independent of card artwork colors. The updated local Pokémon ZIP explicitly retains each species' original theme element/color.

Only correct answers recruit a creature, once per question. Each successful capture snapshots its battle stats in the saved answer. The speed multiplier is `1 + 0.5 × max(0, 1 − answerMs / windowMs)`: a 30-second window for math, 60 seconds for reading. It is capped at +50%, never penalizes slow answers, and missing/invalid legacy timing grants no bonus. Reading time and timing while the quiz is active follow the existing question timer; hiding the timer does not stop measurement. The collection keeps each species' strongest captured stats, while each test's correct-answer count determines its enemy count and maximum number of deployed champions.

Finishing a test creates one deterministic enemy per correct answer and opens a battle in its results. Before fighting each enemy, the player selects a champion from the owned bag for that battle world, with stats and elemental advantage shown. This includes earlier captures. Surviving deployed champions can be reused; defeated champions cannot return during that battle. New deployments consume a battle-local bag copy and cannot exceed the number of correct answers. The permanent collection is never consumed. Older in-progress battles retain their existing fighters. Autoplay attacks within the current encounter and pauses for the next champion choice; quick finish chooses automatically. Attacks alternate; guard heals 8% of maximum health (without exceeding it) and reduces the next incoming hit. The elemental ring is fire → grass → earth → electric → water → air → psychic → fairy → fire: damage is ×1.5 against the next element, ×0.75 against the previous, otherwise ×1. A minimal damage floor guarantees that attacking battles end. Enemies use base stats with a slight attack/health reduction; speed bonuses benefit only the player's recruits.

Manual attacks, autoplay, faster playback and an instant resolve are available. **Skip battle** opens a styled confirmation dialog that pauses autoplay; cancelling returns to the fight and confirming permanently marks that battle skipped. Battles, including skipped/won/lost states, are saved with the test result and resume after navigation/reload. Battles do not award extra captures, change the test score or remove collected creatures. Zero correct answers show an encouraging empty-team message. Sounds follow the app's sound toggle and respect browser audio restrictions; reduced-motion preferences disable battle animations.

To add explicit combat fields to a local theme ZIP, run `node scripts/upgrade-theme-combat.mjs path/to/theme.zip` (updates that ZIP in place). The helper validates the resulting archive before writing. Existing installed packs work without reimport; reimport the updated Pokémon ZIP to use its explicit assignments. Generated ZIPs stay in ignored `artifacts/`.


## Updating the installed app

Production PWAs check for a new service worker at launch, when returning to the app/going online, and every minute while visible. A downloaded update normally waits until all old windows close. The top bar now shows **נדרש עדכון** when an update is ready; tapping it saves the current test, activates the waiting worker and reloads that window. Battles are already saved after each turn. If saving fails, the app shows an error and does not request activation. Other open windows are offered an update rather than force-reloaded. Local development does not register a service worker. Devices running a version from before this button was introduced need to close and reopen the app once to receive the new update controls.

Quiz companions display their names. Unanswered questions use the selected world; previously earned companions retain their capture identity and show their original world when different. Review question types include math/reading/general icons alongside text. Results have a Share dialog with native device sharing, WhatsApp message sharing, Facebook link sharing, and copyable text. Shared messages contain scores and optional battle victories, without names, emails, user IDs, query strings or URL fragments.

PWA lifecycle diagnostics use the console prefix `[PWA update]`. They include the update attempt number, elapsed time, worker states, registration scope, activation messages and failure stage with the original error/stack. Periodic checks use debug-level logging; errors and failures are visible at warn/error level. Service-worker cache installation and activation failures are also logged. Enable **Preserve log** in browser developer tools before retrying an update, so a successful reload does not erase the first failed attempt. No saved game, theme content or credentials are included in these logs.
