#!/usr/bin/env node
// Drive the static my-site page in headless Chromium and dump screenshots.
// Loads index.html via file:// so no local HTTP server is needed.
//
//   node .claude/skills/run-my-site/driver.cjs [url] [out-dir]
//
// Defaults: url = file://<repo>/index.html, out-dir = /tmp/my-site-shots
//
// Produces: home.png, projects.png (after clicking nav), dark.png (dark scheme).
// Prints a JSON line with the h1 text, the computed footer year, and any
// console/page errors; exits 1 if any errors were observed.

const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

const repo = path.resolve(__dirname, '..', '..', '..');
const defaultUrl = 'file://' + path.join(repo, 'index.html');
const url = process.argv[2] || defaultUrl;
const outDir = process.argv[3] || '/tmp/my-site-shots';

fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const errors = [];
  const viewport = { width: 1280, height: 900 };

  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto(url);
  await page.waitForSelector('h1');
  const h1 = await page.locator('h1').first().innerText();
  const year = await page.locator('#year').innerText();
  await page.screenshot({ path: path.join(outDir, 'home.png'), fullPage: true });

  await page.locator('nav a[href="#projects"]').click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(outDir, 'projects.png'), fullPage: true });
  await ctx.close();

  const dark = await browser.newContext({ viewport, deviceScaleFactor: 2, colorScheme: 'dark' });
  const dp = await dark.newPage();
  await dp.goto(url);
  await dp.waitForSelector('h1');
  await dp.screenshot({ path: path.join(outDir, 'dark.png'), fullPage: true });

  await browser.close();
  console.log(JSON.stringify({ url, h1, year, outDir, errors }));
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
