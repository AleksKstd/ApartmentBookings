import { expect, test } from "@playwright/test";
import { isoDayFromToday, pickDay } from "./helpers";

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

test("Escape closes the mobile menu and returns focus to the toggle", async ({ page }) => {
  await page.goto("/en");
  const toggle = page.getByRole("button", { name: "Open menu" });
  await toggle.click();
  await expect(page.locator("#mobile-menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#mobile-menu")).toBeHidden();
  await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
});

test("mobile booking shows a sticky price bar that leads to the guest details", async ({ page }) => {
  await page.goto("/bg/booking");
  await pickDay(page, isoDayFromToday(120), /Следващ месец/);
  await pickDay(page, isoDayFromToday(123), /Следващ месец/);
  const bar = page.getByTestId("mobile-booking-bar");
  await expect(bar).toBeVisible();
  await bar.getByRole("link", { name: "Продължи" }).click();
  await expect(page.getByLabel("Име и фамилия")).toBeInViewport();
});

test("admin bookings list is readable on a phone", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Потребителско име").fill("admin");
  await page.getByLabel("Парола").fill("demo-admin-2026");
  await page.getByRole("button", { name: "Вход" }).click();
  await page.waitForURL("**/admin");
  await page.goto("/admin/bookings?status=all");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.getByRole("table")).toBeHidden();
});
