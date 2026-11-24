# Pokémon Training Camp

A Hebrew, right-to-left React app for personal Stage A gifted-test practice. It supports the five booklet tests, a mixed booklet session with 10, 20, 30, or all questions, and renewable practice with 10–100 questions. Each attempt uses its start timestamp to shuffle questions. The app shows one question at a time, with count-up timers and a live correct/submitted score. The question timer stops when an answer is submitted. Use “לשאלה הקודמת” to review earlier questions, then “לשאלה הבאה” to return. Submitted answers stay locked; reviewing does not change scores or award catches again. The unanswered question keeps its selected answer and elapsed time when navigating away, including across save/reload. The total timer runs while the quiz is visible, including feedback. Firebase Authentication supports email/password and Google sign-in. Attempts, results, and catches stay in browser local storage, separated by Firebase account UID. They do not yet sync between devices.

The top-bar “הגדלה” toggle opens a draggable 2× magnifying glass with an upper-right glass reflection. Drag it with a mouse or touch, or move the focused lens with arrow keys (Shift for larger steps). Escape closes it and returns focus to the toggle. The lens follows page scrolling and live question updates, including niqqud and selected answers.

Correct answers catch the Pokémon shown beside the question. Open the backpack to see the collection as cards. On the second catch, the card changes to the species’ next evolution if it has one. Epic, legendary, and mythical encounters are less frequent and have rarity badges in the backpack. The backpack is saved in browser local storage.

## Run locally

Install Node.js 22.12 or newer, then run:

```sh
npm ci
npm run dev
```

The text question bank is bundled from `src/question-bank.json`. All 139 questions, answer choices, explanations, and 12 reading passages/price lists use the same text renderer as generated content. To regenerate it from your copy of the booklet, install Python 3.10+, Poppler and Tesseract with Hebrew language data (`brew install poppler tesseract tesseract-lang` on macOS), then run:

```sh
python3 scripts/make-bank.py "/absolute/path/to/booklet.pdf"
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

Without that variable, `npm test` runs the unit checks and skips the emulator integration test. Firebase signs users in; local account profiles remain browser data, rather than access-controlled cloud storage. The bundled booklet remains downloadable as a static site asset.

The importer first extracts PDF text and crops, then transcribes the crops with Hebrew OCR. It applies reviewed text corrections from `scripts/booklet-corrections.json`, restores numeric formulas from PDF text, and writes a text-only bank. Reading passage line numbers remain available for questions that refer to them. Unicode niqqud is retained. The checked-in corrections include restored vowel points and contextual corrections for ambiguous words; damaged PDF/OCR marks were reconstructed locally rather than claimed as a verbatim transcription. Original question IDs and answer ordering remain compatible with saved booklet attempts. Explanations include the trainer math walkthroughs and concise reading solution reasoning.

To transcribe an existing image-backed bank directly:

```sh
python3 scripts/extract-crops.py /path/to/image-bank.json --output src/question-bank.json
```

Use `--tessdata /path/to/tessdata` on either command if Hebrew language data is installed outside Tesseract's default directory.

Renewable practice uses `src/question-generator.js`: 12 structured numerical templates define bounded parameter sampling, a question prompt, a solution function and a calculated explanation. They cover arithmetic, equations, sequences, comparison, change, saving, part-to-whole and multi-step word problems. All four answer options are distinct; their order changes between attempts. New numerical templates can be added to `numericalTemplates` without changing the quiz UI. The current templates cover a subset of the booklet's numerical formats; the five booklet tests retain their original values.

`src/reading-bank.js` contains three original fictional passages with six questions each, covering details, cause and effect, vocabulary, references, figurative language, inference and main idea. These are authored content sets, rather than substitutions of names in existing stories. Length and skills are modeled on the booklet; difficulty has not been calibrated with learners. Add another story with its questions and evidence to expand this bank. A session uses roughly one-third reading questions, capped at the 18 available items, and fills the rest with numerical variants. Reading sets stay together, and no prompt repeats within a session.

Generated rounds save a complete text snapshot with parameters, choices, correct answer, explanation and passage, so resuming or reviewing an attempt never regenerates its questions. Existing booklet attempts continue to resolve their question IDs.

For future niqqud restoration, `scripts/restore-niqqud.py` runs entirely offline with [DictaBERT-large-char-menaked](https://huggingface.co/dicta-il/dictabert-large-char-menaked) by Dicta (CC BY 4.0), through [dicta-onnx](https://github.com/thewh1teagle/dicta-onnx). Install `dicta-onnx==1.0.9` in a Python environment and download its ONNX model and the model tokenizer separately; neither is shipped to the browser. Example:

```sh
python scripts/restore-niqqud.py src/question-bank.json \
  --model /path/to/dicta-1.0.int8.onnx \
  --tokenizer /path/to/tokenizer.json \
  --output /tmp/pointed-bank.json
```

The script verifies that restoration changes only combining marks. Review reconstructed text against the booklet before updating `src/question-bank.json` and the complete text snapshots in `scripts/booklet-corrections.json`, especially proper nouns and context-sensitive readings. Generated template and story text also contains niqqud directly in its source. Existing saved generated attempts retain their original snapshots; new attempts use the pointed content.

Run calculation, question-integrity and saved-attempt checks with `npm test`, and compile the production app with `npm run build`.

## GitHub Pages

1. Push the project, including `src/question-bank.json`, to your GitHub repository. The original PDF is excluded by `.gitignore`.
2. In the repository, open **Settings → Pages** and select **GitHub Actions** as the source.
3. Run **Deploy to GitHub Pages** in **Actions**. Open the deployment URL and sign in with email/password or Google.

If Configure Pages returns 404, confirm that **Settings → Pages → Build and deployment → Source** is set to **GitHub Actions**, then start a new workflow run. GitHub Pages requires an eligible plan for private repositories. Private site access is a separate GitHub Enterprise Cloud setting. The Pages build contains the extracted questions, illustrations, and answers. Anyone who can access the deployed site can retrieve that data from the browser bundle. Firebase Authentication gates the app interface; it does not make bundled static assets private.

Pokémon illustrations are loaded from the [PokéAPI Sprites repository](https://github.com/PokeAPI/sprites).
