// The harness of the browser tests: it builds the real CSS (Tailwind 4 with the tokens and the geometry of the
// contracts) and opens one page in the Chrome of the computer (playwright-core, channel "chrome"). No browser download.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { type Browser, chromium, type Page } from 'playwright-core'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')

/** The CSS of the fixture, built one time for each test file. */
export function buildCss(): string {
  const out = path.join(os.tmpdir(), `mono-browser-${process.pid}-${Date.now()}.css`)
  execFileSync(path.join(ROOT, 'node_modules/.bin/tailwindcss'), ['-i', path.join(ROOT, 'test/browser/fixture.css'), '-o', out], { stdio: 'pipe' })
  return fs.readFileSync(out, 'utf8')
}

/** One cell: a context of the axes with an id, so that a test can find the component in it. */
export const cell = (id: string, attrs: string, inner: string): string =>
  `<div id="${id}" ${attrs} style="width:320px;padding:8px">${inner}</div>`

export async function openPage(body: string): Promise<{ browser: Browser; page: Page }> {
  const css = buildCss()
  const browser = await chromium.launch({ channel: 'chrome' })
  const page = await browser.newPage()
  await page.setContent(`<!doctype html><html data-theme="dark"><head><style>${css}</style></head><body>${body}</body></html>`)
  return { browser, page }
}

/** The box of the first element that matches the selector. */
export async function box(page: Page, selector: string): Promise<{ x: number; y: number; width: number; height: number }> {
  const b = await page.locator(selector).first().boundingBox()
  if (!b) throw new Error(`No box for ${selector}`)
  return b
}

/** A computed style of the first element that matches the selector, or of its pseudo-element. */
export const style = (page: Page, selector: string, prop: string, pseudo?: string): Promise<string> =>
  page
    .locator(selector)
    .first()
    .evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? null).getPropertyValue(p as string).trim(), [prop, pseudo] as const)
