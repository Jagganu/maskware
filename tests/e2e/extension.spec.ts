import { test, expect } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.join(__dirname, '../../dist');

test.describe('Maskware Extension', () => {
  let context;
  let page;

  test.beforeAll(async ({ chromium }) => {
    context = await chromium.launchPersistentContext('', {
      headless: true,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('extension loads without errors', async () => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    
    await page.goto('https://example.com');
    await page.waitForLoadState('networkidle');
    
    expect(errors.filter(e => e.includes('maskware')).length).toBe(0);
  });

  test('popup can be opened', async () => {
    const extensionId = await getExtensionId(context);
    const popupUrl = `chrome-extension://${extensionId}/popup.html`;
    
    const popupPage = await context.newPage();
    await popupPage.goto(popupUrl);
    await popupPage.waitForLoadState('domcontentloaded');
    
    await expect(popupPage.locator('.header-title')).toHaveText('Maskware');
    await expect(popupPage.locator('.shield-row')).toHaveCount(9);
  });

  test('seed script injects', async () => {
    await page.goto('https://example.com');
    
    const hasMaskware = await page.evaluate(() => {
      return window.__maskware_ready === true;
    });
    expect(hasMaskware).toBe(true);
  });

  async function getExtensionId(context) {
    const backgrounds = context.serviceWorkers();
    if (backgrounds.length > 0) {
      const url = new URL(backgrounds[0].url());
      return url.hostname;
    }
    const pages = context.pages();
    for (const p of pages) {
      const url = new URL(p.url());
      if (url.protocol === 'chrome-extension:') return url.hostname;
    }
    throw new Error('Could not find extension ID');
  }
});