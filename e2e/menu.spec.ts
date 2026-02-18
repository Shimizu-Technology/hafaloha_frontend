import { test, expect } from '@playwright/test';

test.describe('Menu Page', () => {
  test('displays menu items with prices', async ({ page }) => {
    await page.goto('/menu');

    // "Our Menu" heading
    await expect(page.getByRole('heading', { name: /Our Menu/i })).toBeVisible({ timeout: 10_000 });

    // Wait for items to load — look for a price like "$12.99"
    await expect(page.getByText(/\$\d+\.\d{2}/).first()).toBeVisible({ timeout: 15_000 });
  });

  test('shows seeded menu item names', async ({ page }) => {
    await page.goto('/menu');

    // At least one of our seeded items should appear
    const item = page.getByText(/Spam Musubi|Poke Bowl|Chicken Katsu|Loco Moco|Kalbi Short Ribs/).first();
    await expect(item).toBeVisible({ timeout: 15_000 });
  });

  test('has category navigation tabs', async ({ page }) => {
    await page.goto('/menu');

    // Category tabs
    await expect(page.getByRole('button', { name: 'All Items' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Appetizers' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bowls' })).toBeVisible();
  });

  test('has Add/Customize buttons for ordering', async ({ page }) => {
    await page.goto('/menu');

    // Wait for items to load first
    await expect(page.getByText(/\$\d+\.\d{2}/).first()).toBeVisible({ timeout: 15_000 });

    // Items have "Add" or "Customize" buttons (the "+" is an icon, not text)
    const addBtn = page.getByRole('button', { name: /^Add$|^Customize$/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 5_000 });
  });
});
