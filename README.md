# Pokémon Training Camp

A Hebrew, right-to-left React app for personal Stage A gifted-test practice. It supports the five booklet tests and a mixed session with 10, 20, 30, or all questions. Each attempt uses its start timestamp to shuffle questions. The app shows one question at a time, with count-up timers and a live correct/submitted score. The question timer stops when an answer is submitted. The total timer runs while the quiz is visible, including feedback. Attempts, results, and the PIN verifier stay in browser local storage.

## Run locally

Install Node.js 22.12 or newer, then run:

```sh
npm ci
npm run dev
```

The extracted question bank is bundled from `src/question-bank.json`. To regenerate it from your copy of the booklet, install Python 3.10+ and Poppler (`brew install poppler` on macOS), then run:

```sh
python3 scripts/make-bank.py "/absolute/path/to/booklet.pdf"
```

Open the app and create a 4–8 digit PIN. The tests are ready as soon as you unlock the app. The app asks for the PIN again on reload.

The importer preserves the printed typography and formulas as cropped images, includes the associated reading passages and price lists, and imports the worked explanations. It matches the five test sections to the answer tables and worked solutions. For the exercise that asks which expression equals 100, it uses the worked solution (`100 ÷ 1`). It matches the two transposed Mary Anning explanations to their questions. For the eleven arithmetic exercises without worked explanations, it shows the completed equation.

## GitHub Pages

1. Push the project, including `src/question-bank.json`, to your GitHub repository. The original PDF is excluded by `.gitignore`.
2. In the repository, open **Settings → Pages** and select **GitHub Actions** as the source.
3. Run **Deploy to GitHub Pages** in **Actions**. Open the deployment URL and set a PIN for that browser.

If Configure Pages returns 404, confirm that **Settings → Pages → Build and deployment → Source** is set to **GitHub Actions**, then start a new workflow run. GitHub Pages requires an eligible plan for private repositories. Private site access is a separate GitHub Enterprise Cloud setting. The Pages build contains the extracted questions, illustrations, and answers. Anyone who can access the deployed site can retrieve that data from the browser bundle. The PIN locks the interface on that browser.

Pokémon illustrations are loaded from the [PokéAPI Sprites repository](https://github.com/PokeAPI/sprites).
