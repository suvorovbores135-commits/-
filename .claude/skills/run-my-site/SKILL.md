---
name: run-my-site
description: Build, run, and drive my-site. Use when asked to start my-site, preview it, screenshot it, verify its HTML/CSS/JS renders, check its dark theme, or sanity-check a change before commit. It is a static HTML+CSS page with one inline script; this skill drives it headlessly via Playwright and produces screenshots.
---

Static personal-page site: `index.html` + `style.css` + one inline `<script>` that stamps the current year into the footer. No build, no framework, no package manager. The agent path opens the file directly via `file://` in headless Chromium — no local HTTP server needed. The driver is `.claude/skills/run-my-site/driver.cjs`.

All paths below are relative to the repo root (`/home/user/-`).

## Prerequisites

Playwright + Chromium are pre-installed on this container (`require('playwright')` resolves from any cwd; Chromium lives at `/opt/pw-browsers/chromium`). No `apt-get` or `npm install` is needed.

Sanity check:

```bash
node -e "const {chromium}=require('playwright'); console.log(!!chromium)"
# -> true
```

## Setup

None. There is no `package.json`, no lockfile, no deps to install.

## Build

None. Edits to `index.html` / `style.css` are picked up on the next page load.

## Run (agent path)

One command. Loads `index.html` via `file://`, screenshots light + dark + a post-click state, and prints a one-line JSON summary. Exit 0 = no page or console errors; exit 1 = errors (text in the JSON `errors` field); exit 2 = driver crash.

```bash
node .claude/skills/run-my-site/driver.cjs
```

Example output:

```
{"url":"file:///home/user/-/index.html","h1":"Hi, I'm a placeholder name.","year":"2026","outDir":"/tmp/my-site-shots","errors":[]}
```

Screenshots → `/tmp/my-site-shots/`:

| file | what it shows |
|---|---|
| `home.png` | Full-page light theme on initial load |
| `projects.png` | After clicking the `Projects` nav link (scroll anchor) |
| `dark.png` | Full-page with `prefers-color-scheme: dark` |

Override URL or output dir with positional args:

```bash
node .claude/skills/run-my-site/driver.cjs file:///home/user/-/index.html /tmp/shots
```

**Looking at the screenshots:** use the `Read` tool on the PNG path — e.g. `Read /tmp/my-site-shots/home.png`. Don't trust the exit code alone for visual changes.

## Run (human path)

For a loopback-served preview that matches how browsers normally fetch the page (relative URL resolution, no `file://` quirks), the README's command works:

```bash
python3 -m http.server 8000     # then open http://localhost:8000, Ctrl-C to stop
```

Not useful headlessly (there's no window to view). Note: in some sandboxed agent sessions the classifier blocks starting an HTTP server; the `file://` path in the driver above sidesteps that.

## Test

No test suite. The driver script is the smoke test — it asserts the page loads, the `<h1>` is present, the inline script populated `#year`, and no page/console errors fired.

## Gotchas

- **`file://` vs `http://`.** This page is self-contained (one stylesheet, no fetches, no modules), so `file://` works. If you add a `<script type="module">`, cross-origin fetches, or anything that needs an actual origin, the `file://` driver will stop working and you'll need to serve over HTTP first.
- **Footer year is JS-generated.** `#year` is empty in the source; it's filled by `new Date().getFullYear()` at load. If a test asserts on the year, it drifts yearly — compare against `new Date().getFullYear()`, not a literal.
- **Dark theme is media-query driven, not a toggle.** The page has no theme switch — dark comes from `@media (prefers-color-scheme: dark)`. To screenshot dark, you have to pass `colorScheme: 'dark'` to the browser context (the driver does this); you cannot flip it from inside the page.
- **Chromium needs `--no-sandbox` here.** Launching without it dies silently in this container. The driver passes it.

## Troubleshooting

- **`Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'playwright'`**: you used ESM (`import`) from a file outside a package. The driver is `.cjs` and uses `require('playwright')`, which resolves from any cwd here. Keep it that way, or set `NODE_PATH=/opt/node-tools/node_modules` before running an `.mjs` version.
- **Driver exits 1 with `errors: [...]`**: the page rendered but something threw. Read the message — most likely a bad selector you just added, or a broken inline-script edit.
- **Screenshots look blank / all one color**: the `file://` path resolved to a missing or empty file. Re-check the first positional arg; the driver echoes it as `url` in the JSON output.
