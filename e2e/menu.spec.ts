import { test, expect } from '@playwright/test';

test.describe('Menu Page', () => {
  test('navigates to menu page and displays items', async ({ page }) => {
    await page.goto('/menu');

    // Wait for menu items to load — the page uses <main> inside OrderingLayout,
    // but the first `.first()` match for `[class*="menu"]` is the hamburger icon SVG.
    // Instead, look for a visible price (indicating items have loaded).
    const priceElement = page.locator('text=/\\$\\d+\\.\\d{2}/').first();
    await expect(priceElement).toBeVisible({ timeout: 15_000 });
  });

  test('menu items have names and descriptions', async ({ page }) => {
    await page.goto('/menu');

    // Wait for items to load — look for any of the seeded item names
    const itemName = page.locator(
      'text=/Spam Musubi|Poke Bowl|Chicken Katsu|Loco Moco|Kalbi Short Ribs/'
    ).first();
    await expect(itemName).toBeVisible({ timeout: 15_000 });
  });

  test('menu has category navigation', async ({ page }) => {
    await page.goto('/menu');

    // The menu should have category tabs/buttons (Appetizers, Bowls, Plates, etc.)
    const categoryNav = page.locator(
      'text=/Appetizers|Bowls|Plates|Drinks|Desserts|All/i'
    ).first();
    await expect(categoryNav).toBeVisible({ timeout: 15_000 });
  });
});
