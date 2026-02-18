import { test, expect } from '@playwright/test';

test.describe('Order Flow', () => {
  test('can add a simple item to cart', async ({ page }) => {
    await page.goto('/menu');

    // Wait for items with prices to load
    await expect(page.getByText(/\$\d+\.\d{2}/).first()).toBeVisible({ timeout: 15_000 });

    // Click the first "Add" button (accessible name is "Add", the "+" is an icon)
    await page.getByRole('button', { name: /^Add$/i }).first().click();

    // After adding, the cart badge in the nav should update to show ≥1 item
    await expect(
      page.getByRole('link', { name: /cart with [1-9]/i })
    ).toBeVisible({ timeout: 5_000 });
  });

  test('cart page shows empty state when empty', async ({ page }) => {
    await page.goto('/cart');

    // The main content should show "Your cart is empty" heading
    await expect(
      page.getByRole('heading', { name: /your cart is empty/i })
    ).toBeVisible({ timeout: 10_000 });

    // And a "Browse Menu" link
    await expect(page.getByRole('link', { name: /Browse Menu/i })).toBeVisible();
  });

  test('cart page shows items after adding', async ({ page }) => {
    // First add an item from the menu
    await page.goto('/menu');
    await expect(page.getByText(/\$\d+\.\d{2}/).first()).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /^Add$/i }).first().click();

    // Wait for cart badge to show an item
    await expect(
      page.getByRole('link', { name: /cart with [1-9]/i })
    ).toBeVisible({ timeout: 5_000 });

    // Navigate to cart
    await page.goto('/cart');

    // Should NOT show the empty state
    await expect(
      page.getByRole('heading', { name: /your cart is empty/i })
    ).not.toBeVisible({ timeout: 5_000 });
  });

  test('full flow: menu → add to cart → view cart', async ({ page }) => {
    // Browse menu
    await page.goto('/menu');
    await expect(page.getByText(/\$\d+\.\d{2}/).first()).toBeVisible({ timeout: 15_000 });

    // Add item
    await page.getByRole('button', { name: /^Add$/i }).first().click();
    await expect(
      page.getByRole('link', { name: /cart with [1-9]/i })
    ).toBeVisible({ timeout: 5_000 });

    // Click cart link in nav
    await page.getByRole('link', { name: /cart with [1-9]/i }).click();

    // Should be on the cart page with items
    await page.waitForURL('**/cart', { timeout: 10_000 });
    await expect(
      page.getByRole('heading', { name: /your cart is empty/i })
    ).not.toBeVisible({ timeout: 5_000 });
  });
});
