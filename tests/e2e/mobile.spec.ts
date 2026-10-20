import { expect, test } from "@playwright/test";

test("mobile navigation menu works and there is no horizontal scroll", async ({ page }) => {
  await page.goto("/bg");
  await page.getByRole("button", { name: "Отвори менюто" }).click();
  const menu = page.locator("#mobile-menu");
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: "Галерия" }).click();
  await expect(page).toHaveURL(/\/bg\/gallery$/);
  await expect(menu).toBeHidden();

  for (const path of ["/bg", "/bg/apartment", "/bg/booking", "/en/gallery", "/admin/login"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
