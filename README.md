# Pokémon Training Camp

A Hebrew, right-to-left React app for personal Stage A gifted-test practice. It uses only renewable practice with 10–100 questions: calculated numerical variants and original authored reading stories. Extracted booklet questions and passages are no longer included. Each attempt uses its start timestamp to shuffle questions. The app shows one question at a time, with count-up timers and a live correct/submitted score. The question timer stops when an answer is submitted. Use “לשאלה הקודמת” to review earlier questions, then “לשאלה הבאה” to return. Submitted answers stay locked; reviewing does not change scores or award catches again. The unanswered question keeps its selected answer and elapsed time when navigating away, including across save/reload. The total timer runs while the quiz is visible, including feedback. Firebase Authentication supports email/password and Google sign-in. Attempts, results, and catches stay in browser local storage, separated by Firebase account UID. They do not yet sync between devices.

The top-bar “הגדלה” toggle opens a draggable 2× magnifying glass with an upper-right glass reflection. Drag it with a mouse or touch, or move the focused lens with arrow keys (Shift for larger steps). Escape closes it and returns focus to the toggle. The lens follows page scrolling and live question updates, including niqqud and selected answers.

Correct answers catch the Pokémon shown beside the question. Open the backpack to see the collection as cards. On the second catch, the card changes to the species’ next evolution if it has one. Epic, legendary, and mythical encounters are less frequent and have rarity badges in the backpack. The backpack is saved in browser local storage.

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

Generated content does not resolve permissions for Pokémon artwork, names or the app icon. See the in-app terms and the upstream artwork notices.

Run calculation, question-integrity and saved-attempt checks with `npm test`, and compile the production app with `npm run build`.

## GitHub Pages

1. Push the project to your GitHub repository.
2. In the repository, open **Settings → Pages** and select **GitHub Actions** as the source.
3. Run **Deploy to GitHub Pages** in **Actions**. Open the deployment URL and sign in with email/password or Google.

If Configure Pages returns 404, confirm that **Settings → Pages → Build and deployment → Source** is set to **GitHub Actions**, then start a new workflow run. GitHub Pages requires an eligible plan for private repositories. Private site access is a separate GitHub Enterprise Cloud setting. The Pages build contains generated-question templates, original reading stories, icons, and answer logic. Anyone who can access the deployed site can retrieve that data from the browser bundle. Firebase Authentication gates the app interface; it does not make bundled static assets private.

Pokémon illustrations are loaded from the [PokéAPI Sprites repository](https://github.com/PokeAPI/sprites).
