/**
 * Real-content import trials.
 * Uses actual files from the machine and a live URL to verify the full
 * parse → reader pipeline end-to-end. Keep these as a permanent regression suite.
 */
import { test, expect } from '@playwright/test';

// Set these environment variables to point at local test files:
//   E2E_PDF_PATH  — any PDF file
//   E2E_MD_PATH   — any Markdown file
const PDF_PATH = process.env.E2E_PDF_PATH ?? '';
const MD_PATH = process.env.E2E_MD_PATH ?? '';
const TRIAL_URL = 'https://en.wikipedia.org/wiki/Speed_reading';

// ─── File upload helpers ──────────────────────────────────────────────────────
async function openFileTab(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('tab', { name: /upload file/i }).click();
  // Drop-zone should appear
  await expect(page.getByText(/drop a file/i)).toBeVisible({ timeout: 3000 });
}

// ─── PDF ──────────────────────────────────────────────────────────────────────
test.describe('Real file imports', () => {
  test('PDF → reader loads with word count', async ({ page }) => {
    test.skip(!PDF_PATH, 'Set E2E_PDF_PATH to run this test');
    await openFileTab(page);
    // setInputFiles works on hidden inputs without needing visibility
    await page.locator('[data-testid="file-input"]').setInputFiles(PDF_PATH);
    // Reader transitions automatically (no submit button in file mode)
    await expect(page.locator('[data-testid="progress-track"]')).toBeVisible({ timeout: 20000 });
    const bar = await page.getByText(/\d+\s*words/i).first().textContent();
    console.log('PDF word count:', bar);
    expect(bar).toMatch(/\d+/);
  });

  // ─── Markdown ────────────────────────────────────────────────────────────────
  test('Markdown → reader loads with sections', async ({ page }) => {
    test.skip(!MD_PATH, 'Set E2E_MD_PATH to run this test');
    await openFileTab(page);
    await page.locator('[data-testid="file-input"]').setInputFiles(MD_PATH);
    await expect(page.locator('[data-testid="progress-track"]')).toBeVisible({ timeout: 10000 });
    const bar = await page.getByText(/\d+\s*words/i).first().textContent();
    console.log('Markdown word count:', bar);
    expect(bar).toMatch(/\d+/);
  });

  // ─── URL ─────────────────────────────────────────────────────────────────────
  test('URL → reader fetches Wikipedia article', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /url/i }).click();
    await expect(page.getByPlaceholder(/https/i)).toBeVisible();
    await page.getByPlaceholder(/https/i).fill(TRIAL_URL);
    await page.getByRole('button', { name: /fetch|read/i }).click();
    await expect(page.locator('[data-testid="progress-track"]')).toBeVisible({ timeout: 30000 });
    const bar = await page.getByText(/\d+\s*words/i).first().textContent();
    console.log('URL word count:', bar);
    expect(bar).toMatch(/\d+/);
  });
});
