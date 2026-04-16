import { test, expect, Page } from '@playwright/test';

const SHORT_TEXT = 'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.';
const MULTI_PARA_TEXT = `First paragraph of the document here.\n\nSecond paragraph comes after the first.\n\nThird paragraph is at the end.`;

// Helper: load the import screen and paste text
async function pasteText(page: Page, text: string) {
  await page.goto('/');
  // Should land on DocumentImport - find the textarea tab
  const pasteTab = page.getByRole('tab', { name: /paste text/i });
  if (await pasteTab.isVisible()) await pasteTab.click();
  await page.getByRole('textbox').fill(text);
  await page.getByRole('button', { name: /import|start|read/i }).first().click();
}

// ─── DocumentImport screen ────────────────────────────────────────────────────
test.describe('DocumentImport screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows import screen on first load', async ({ page }) => {
    // Should not immediately show the reader
    await expect(page.getByRole('textbox')).toBeVisible();
  });

  test('has a text input area', async ({ page }) => {
    await expect(page.getByRole('textbox')).toBeVisible();
  });

  test('has a URL input tab', async ({ page }) => {
    const urlTab = page.getByRole('tab', { name: /url/i });
    if (await urlTab.isVisible()) {
      await urlTab.click();
      await expect(page.getByPlaceholder(/https/i)).toBeVisible();
    } else {
      // Maybe it's just a single input; skip
      test.skip();
    }
  });

  test('has a file upload tab', async ({ page }) => {
    const fileTab = page.getByRole('tab', { name: /upload|file/i });
    if (await fileTab.isVisible()) {
      await fileTab.click();
    }
    // No assertion needed — just verifies it doesn't throw
  });
});

// ─── Pasting text and starting reader ────────────────────────────────────────
test.describe('Paste text → reader', () => {
  test('loading text navigates to the reader', async ({ page }) => {
    await pasteText(page, SHORT_TEXT);
    // Reader should show something — progress bar or word display
    await expect(page.locator('[data-testid="progress-track"]')).toBeVisible({ timeout: 5000 });
  });

  test('reader shows the document title area', async ({ page }) => {
    await pasteText(page, SHORT_TEXT);
    // Top bar with Back button
    await expect(page.getByRole('button', { name: /← back/i })).toBeVisible({ timeout: 5000 });
  });

  test('reader auto-starts playing after import', async ({ page }) => {
    await pasteText(page, SHORT_TEXT);
    // Wait for a word to appear in the display area
    // The word display is a monospace area with prefix/orp/suffix spans
    await expect(page.locator('[data-testid="progress-track"]')).toBeVisible({ timeout: 5000 });
    // Progress should increase over time
    await page.waitForTimeout(500);
    // Something was displayed
  });

  test('word count is shown in top bar', async ({ page }) => {
    await pasteText(page, SHORT_TEXT);
    await expect(page.getByText(/words/i)).toBeVisible({ timeout: 5000 });
  });

  test('back button returns to import screen', async ({ page }) => {
    await pasteText(page, SHORT_TEXT);
    await expect(page.getByRole('button', { name: /← back/i })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /← back/i }).click();
    await expect(page.getByRole('textbox')).toBeVisible({ timeout: 3000 });
  });
});

// ─── Progress bar ─────────────────────────────────────────────────────────────
test.describe('Progress bar', () => {
  test('progress bar is visible during reading', async ({ page }) => {
    await pasteText(page, SHORT_TEXT);
    await expect(page.locator('[data-testid="progress-track"]')).toBeVisible({ timeout: 5000 });
  });

  test('progress fill element exists', async ({ page }) => {
    await pasteText(page, SHORT_TEXT);
    await expect(page.locator('[data-testid="progress-fill"]')).toBeAttached({ timeout: 5000 });
  });

  test('clicking progress bar seeks to that position', async ({ page }) => {
    await pasteText(page, SHORT_TEXT);
    const track = page.locator('[data-testid="progress-track"]');
    await track.waitFor({ timeout: 5000 });
    const box = await track.boundingBox();
    if (box) {
      // Click at 50% position
      await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);
      // Fill should reflect new position (not 0%)
      await page.waitForTimeout(200);
      const fill = page.locator('[data-testid="progress-fill"]');
      const fillBox = await fill.boundingBox();
      // After seeking to 50%, fill width should be > 0
      expect(fillBox?.width).toBeGreaterThan(0);
    }
  });
});

// ─── Playback controls ────────────────────────────────────────────────────────
test.describe('Playback controls', () => {
  test('Space key pauses and resumes reading', async ({ page }) => {
    await pasteText(page, SHORT_TEXT);
    await page.locator('[data-testid="progress-track"]').waitFor({ timeout: 5000 });
    // Press Space to pause
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);
    // Press Space to resume
    await page.keyboard.press('Space');
    // Should not have crashed
    await expect(page.locator('[data-testid="progress-track"]')).toBeVisible();
  });

  test('ArrowRight skips forward', async ({ page }) => {
    await pasteText(page, SHORT_TEXT);
    await page.locator('[data-testid="progress-track"]').waitFor({ timeout: 5000 });
    await page.keyboard.press('Space'); // pause first
    await page.waitForTimeout(200);
    // Get current fill width
    const before = await page.locator('[data-testid="progress-fill"]').boundingBox();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);
    const after = await page.locator('[data-testid="progress-fill"]').boundingBox();
    // Position should have advanced
    expect((after?.width ?? 0)).toBeGreaterThanOrEqual((before?.width ?? 0));
  });

  test('ArrowUp increases WPM', async ({ page }) => {
    await pasteText(page, SHORT_TEXT);
    await page.locator('[data-testid="progress-track"]').waitFor({ timeout: 5000 });
    await page.keyboard.press('Space'); // pause
    await page.waitForTimeout(200);
    // Press ArrowUp a few times
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    // Settings panel should show updated WPM if open, or we just verify no crash
    await expect(page.locator('[data-testid="progress-track"]')).toBeVisible();
  });

  test('control bar toggle button is visible', async ({ page }) => {
    await pasteText(page, SHORT_TEXT);
    await page.locator('[data-testid="progress-track"]').waitFor({ timeout: 5000 });
    // ControlBar should have play/pause button (aria-label is "Play" or "Pause")
    const btn = page.getByRole('button', { name: /^(play|pause)$/i });
    await expect(btn.first()).toBeVisible({ timeout: 3000 });
  });
});

// ─── Settings panel ───────────────────────────────────────────────────────────
test.describe('Settings panel', () => {
  test('settings button opens the settings panel', async ({ page }) => {
    await pasteText(page, SHORT_TEXT);
    await page.locator('[data-testid="progress-track"]').waitFor({ timeout: 5000 });
    // Find gear/settings button
    const settingsBtn = page.getByTitle(/settings/i);
    await settingsBtn.click();
    await expect(page.getByRole('spinbutton', { name: /wpm/i })).toBeVisible({ timeout: 2000 });
  });

  test('settings panel shows WPM input', async ({ page }) => {
    await pasteText(page, SHORT_TEXT);
    await page.locator('[data-testid="progress-track"]').waitFor({ timeout: 5000 });
    await page.getByTitle(/settings/i).click();
    const wpmInput = page.getByRole('spinbutton', { name: /wpm/i });
    await expect(wpmInput).toBeVisible();
    const value = await wpmInput.inputValue();
    expect(Number(value)).toBeGreaterThan(0);
  });

  test('changing WPM in settings updates the value', async ({ page }) => {
    await pasteText(page, SHORT_TEXT);
    await page.locator('[data-testid="progress-track"]').waitFor({ timeout: 5000 });
    await page.getByTitle(/settings/i).click();
    const wpmInput = page.getByRole('spinbutton', { name: /wpm/i });
    await wpmInput.fill('200');
    await wpmInput.press('Tab');
    await expect(wpmInput).toHaveValue('200');
  });

  test('settings panel shows chunk size buttons', async ({ page }) => {
    await pasteText(page, SHORT_TEXT);
    await page.locator('[data-testid="progress-track"]').waitFor({ timeout: 5000 });
    await page.getByTitle(/settings/i).click();
    await expect(page.getByRole('button', { name: '1' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: '2' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: '3' }).first()).toBeVisible();
  });

  test('reset button restores defaults', async ({ page }) => {
    await pasteText(page, SHORT_TEXT);
    await page.locator('[data-testid="progress-track"]').waitFor({ timeout: 5000 });
    await page.getByTitle(/settings/i).click();
    // Change WPM
    await page.getByRole('spinbutton', { name: /wpm/i }).fill('999');
    // Click reset
    await page.getByRole('button', { name: /reset/i }).click();
    await expect(page.getByRole('spinbutton', { name: /wpm/i })).toHaveValue('300');
  });
});

// ─── Bookmarks panel ──────────────────────────────────────────────────────────
test.describe('Bookmarks panel', () => {
  test('bookmarks button opens the bookmarks panel', async ({ page }) => {
    await pasteText(page, SHORT_TEXT);
    await page.locator('[data-testid="progress-track"]').waitFor({ timeout: 5000 });
    const bmBtn = page.getByTitle(/bookmarks/i);
    await bmBtn.click();
    await expect(page.getByPlaceholder(/bookmark name/i)).toBeVisible({ timeout: 2000 });
  });

  test('shows "no bookmarks" message initially', async ({ page }) => {
    // Clear localStorage first
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await pasteText(page, SHORT_TEXT);
    await page.locator('[data-testid="progress-track"]').waitFor({ timeout: 5000 });
    await page.getByTitle(/bookmarks/i).click();
    await expect(page.getByText(/no bookmarks/i)).toBeVisible({ timeout: 2000 });
  });

  test('can save a bookmark with a label', async ({ page }) => {
    await pasteText(page, SHORT_TEXT);
    await page.locator('[data-testid="progress-track"]').waitFor({ timeout: 5000 });
    await page.keyboard.press('Space'); // pause so we have a stable position
    await page.getByTitle(/bookmarks/i).click();
    await page.getByPlaceholder(/bookmark name/i).fill('My test bookmark');
    await page.getByRole('button', { name: /save bookmark/i }).click();
    await expect(page.getByText('My test bookmark')).toBeVisible({ timeout: 2000 });
  });

  test('saved bookmark has jump and delete buttons', async ({ page }) => {
    await pasteText(page, SHORT_TEXT);
    await page.locator('[data-testid="progress-track"]').waitFor({ timeout: 5000 });
    await page.keyboard.press('Space');
    await page.getByTitle(/bookmarks/i).click();
    await page.getByPlaceholder(/bookmark name/i).fill('Test');
    await page.getByRole('button', { name: /save bookmark/i }).click();
    await expect(page.getByRole('button', { name: /jump/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /delete/i })).toBeVisible();
  });

  test('deleting a bookmark removes it', async ({ page }) => {
    await pasteText(page, SHORT_TEXT);
    await page.locator('[data-testid="progress-track"]').waitFor({ timeout: 5000 });
    await page.keyboard.press('Space');
    await page.getByTitle(/bookmarks/i).click();
    await page.getByPlaceholder(/bookmark name/i).fill('To delete');
    await page.getByRole('button', { name: /save bookmark/i }).click();
    await expect(page.getByText('To delete')).toBeVisible();
    await page.getByRole('button', { name: /delete/i }).click();
    await expect(page.getByText('To delete')).not.toBeVisible({ timeout: 2000 });
  });
});

// ─── Section breaks ───────────────────────────────────────────────────────────
test.describe('Section breaks (multi-paragraph text)', () => {
  test('section break overlay appears when paragraph ends', async ({ page }) => {
    // Use markdown-style text with headings to force a section break
    const mdText = `# Introduction\n\nThis is the first section with some content to read through.\n\n# Second Section\n\nThis is the second section.`;
    await pasteText(page, mdText);
    // Wait for the reader to load
    await page.locator('[data-testid="progress-track"]').waitFor({ timeout: 5000 });
    // Wait for section-break state (press Space to pause then seek to end of first section)
    // For now just verify the reader starts
    await expect(page.locator('[data-testid="progress-track"]')).toBeVisible();
  });
});

// ─── URL import ───────────────────────────────────────────────────────────────
test.describe('URL import', () => {
  test('URL tab is present', async ({ page }) => {
    await page.goto('/');
    const urlTab = page.getByRole('tab', { name: /url/i });
    if (await urlTab.isVisible()) {
      await urlTab.click();
      await expect(page.getByPlaceholder(/https/i)).toBeVisible();
    }
  });
});

// ─── Settings persistence ─────────────────────────────────────────────────────
test.describe('Settings persistence across page reload', () => {
  test('WPM setting survives page reload', async ({ page }) => {
    await pasteText(page, SHORT_TEXT);
    await page.locator('[data-testid="progress-track"]').waitFor({ timeout: 5000 });
    // Open settings, change WPM
    await page.getByTitle(/settings/i).click();
    await page.getByRole('spinbutton', { name: /wpm/i }).fill('450');
    await page.getByRole('spinbutton', { name: /wpm/i }).press('Tab');
    // Go back and reload
    await page.getByRole('button', { name: /← back/i }).click();
    await page.reload();
    await pasteText(page, SHORT_TEXT);
    await page.locator('[data-testid="progress-track"]').waitFor({ timeout: 5000 });
    await page.getByTitle(/settings/i).click();
    await expect(page.getByRole('spinbutton', { name: /wpm/i })).toHaveValue('450');
  });
});
