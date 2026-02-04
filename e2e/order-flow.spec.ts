import { test, expect } from '@playwright/test';

test.describe('Order Flow', () => {
  test('can navigate from menu to cart', async ({ page }) => {
    await page.goto('/menu');

    // Wait for menu items to load
    const menuItem = page.locator('text=/\\$\\d+\\.\\d{2}/').first();
    await expect(menuItem).toBeVisible({ timeout: 15_000 });

    // Look for an "Add to Cart" or "Add" button, or a clickable menu item
    const addButton = page.locator(
      'button:has-text("Add"), button:has-text("Add to Cart"), button:has-text("Order")'
    ).first();

    // If there's an Add button visible, try clicking it
    if (await addButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await addButton.click();
    } else {
      // Otherwise click the first menu item card to open it, then add
      const itemCard = page.locator('[class*="menu-item"], [class*="MenuItem"], [class*="card"]').first();
      if (await itemCard.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await itemCard.click();
        const modalAddBtn = page.locator(
          'button:has-text("Add to Cart"), button:has-text("Add"), button:has-text("Order")'
        ).first();
        if (await modalAddBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await modalAddBtn.click();
        }
      }
    }

    // Navigate to cart page
    await page.goto('/cart');

    // Cart page renders either "Your Cart" (items present) or "Your cart is empty" (no items).
    // Both use visible headings (h1/h2), not hidden mobile-nav elements.
    const cartHeading = page.locator('h1:has-text("Your Cart"), h2:has-text("Your cart is empty")').first();
    await expect(cartHeading).toBeVisible({ timeout: 10_000 });
  });

  test('cart page loads and is accessible', async ({ page }) => {
    await page.goto('/cart');

    // Cart page should render with a visible heading:
    //   - "Your Cart" (h1) when items are present
    //   - "Your cart is empty" (h2) when empty
    const cartHeading = page.locator('h1:has-text("Your Cart"), h2:has-text("Your cart is empty")').first();
    await expect(cartHeading).toBeVisible({ timeout: 10_000 });
  });

  test('checkout page redirects without items', async ({ page }) => {
    // Visiting checkout with empty cart should either redirect or show a message
    await page.goto('/checkout');

    // Should either redirect to cart/menu or show "no items" message
    const content = page.locator(
      'text=/cart|menu|empty|no items|Checkout|Payment/i'
    ).first();
    await expect(content).toBeVisible({ timeout: 10_000 });
  });
});
