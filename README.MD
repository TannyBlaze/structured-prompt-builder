# Structured Prompt Builder

A lightweight, browser-based tool for creating structured AI prompts. Built with React + TailwindCSS and deployed on Vercel.

## Features
- Define structured prompts with:
  - Role
  - Task
  - Audience
  - Style & Tone
  - Constraints
  - Steps
  - Inputs (name: value format)
  - Few-shot examples
- Live preview in **Markdown**, **JSON**, and **YAML** formats
- One-click copy or download for each format
- Import existing prompt definitions from JSON
- Adjustable model parameters:
  - Temperature
  - Top-p
  - Max tokens
  - Presence penalty
  - Frequency penalty
- Built-in dark/light theme toggle
- Reading mode for long-form prompt review

## Tech Stack
- **React 18 (UMD build)** for UI
- **TailwindCSS** for styling
- **Babel Standalone** for in-browser JSX transpilation
- **Vercel** for deployment

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
│   ├── app.jsx              # Main application logic
│   ├── components/
│   │   └── Section.jsx      # Reusable input list component
│   └── utils/
│       └── jsonToYaml.js    # Utility for JSON → YAML conversion
├── index.html               # Entry point
└── vercel.json              # Deployment config
```

## Development
No build step required. The project runs entirely in the browser.

### Running locally
1. Clone the repo:
   ```bash
   git clone https://github.com/Siddhesh2377/structured-prompt-builder.git
   cd structured-prompt-builder
   ```
2. Open `index.html` directly in your browser, or serve via a static server:
   ```bash
   npx serve .
   ```
3. Start editing `src/app.jsx` or components. The page will reload on refresh.

## Deployment
The project is optimized for Vercel:
```bash
vercel
```
Vercel will automatically detect the static site and deploy.

## Contributing
Contributions are welcome. Ideas for improvements:
- Prompt metadata (name, version, author, tags)
- Template gallery
- Export/import via cloud storage

Fork, branch, and submit a PR.

## License
MIT License. See [LICENSE](LICENSE) for details.

