# Structured Prompt Builder

A lightweight, browser‑first tool for designing **well‑structured AI prompts** with a clean UI, live previews, a local **Prompt Library**, and optional **Gemini‑powered prompt optimization**.

## Highlights

* **Structured fields**: Role, Task, Audience, Style, Tone, Constraints, Steps, Inputs (`name: value`), Few‑shot examples
* **Live preview** in **Markdown**, **JSON**, and **YAML**
* **Copy / Download** each format in one click; **Import from JSON**
* **Model parameters**: Temperature, Top‑p, Max tokens, Presence & Frequency penalties
* **Local Prompt Library** (save, load, duplicate, delete) using `localStorage`
* **Gemini Optimizer** (optional): cleans grammar/clarity **without changing your schema**
* Built‑in dark/light friendly styles; focused **reading mode** for long prompts

## Tech Stack

* **React 18 (UMD)** for UI
* **Tailwind‑style utility classes** (or your own CSS)
* **Babel Standalone** (optional) for in‑browser JSX
* **Vercel** for zero‑config deploys

## Quick Start (no build step)

1. **Clone** the repo

   ```bash
   git clone https://github.com/Siddhesh2377/structured-prompt-builder.git
   cd structured-prompt-builder
   ```
2. **Open** `index.html` directly in the browser **or** serve the folder:

   ```bash
   npx serve .
   ```
3. Start editing `src/app.jsx` (or the inlined script). Refresh to see changes.

## Usage

1. Fill out the **Prompt Composition** fields (Role, Task, etc.).
2. Use **Sections** to add Constraints, Steps, Inputs, and Examples.
3. Switch **Preview** tabs (MD/JSON/YAML). Click **Copy** or **Download**.
4. **Save** to the local **Prompt Library**; later **Load**, **Duplicate**, or **Delete**.
5. To **Import**, choose a JSON file that matches the app’s schema.

### Gemini Prompt Optimizer (optional)

1. Paste your **Gemini API key** (stored locally under `gemini_api_key`).
2. Choose a **model** (e.g., `gemini-1.5-flash`) and an **Output format** (MD/JSON/YAML).
3. Click **Generate with Gemini**.

**What it does:**

* Fixes spelling/grammar and clarifies wording.
* **Preserves the original structure/keys** and array order/length.
* Returns **only** the selected format—no commentary or code fences.

> Tip: For the strictest structure preservation, choose **JSON** as the output format.

## Project Structure

```
structured-prompt-builder/
├── public/
│   ├── favicon.ico
│   ├── image.png
│   ├── robots.txt
│   ├── sitemap.xml
│   └── site.webmanifest
├── src/
│   ├── app.jsx              # Main application logic (builder + library + Gemini)
│   ├── components/
│   │   └── Section.jsx      # Reusable list editor
│   └── utils/
│       └── jsonToYaml.js    # JSON → YAML helper (small, dependency‑free)
├── index.html               # Entry point (loads React UMD, app script, styles)
└── vercel.json              # Static deploy config
```

## Deployment (Vercel)

```bash
vercel
```

Vercel will detect a static site and deploy automatically.

## Privacy & Storage

* **No server**: All data (library items, API key) lives in your **browser** (`localStorage`).
* **Keys** are never sent anywhere except directly to Google’s Gemini endpoint when you click **Generate**.

## Roadmap / Contributions

PRs and ideas are welcome. Potential improvements:

* Prompt metadata (name, version, author, tags)
* Template gallery & sharing
* Cloud export/import providers (Drive, Dropbox, GitHub Gist)
* Streaming + token usage stats

Fork → branch → PR. Please include a brief description and before/after screenshots for UI changes.

## License

MIT. See [LICENSE](LICENSE).
