import { expect, test } from "@playwright/test";
import { adminLogin, isoDayFromToday } from "./helpers";

test("admin pages require login", async ({ page }) => {
  await page.goto("/admin/bookings");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("wrong credentials are rejected", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Потребителско име").fill("admin");
  await page.getByLabel("Парола").fill("wrong-password");
  await page.getByRole("button", { name: "Вход" }).click();
  await expect(page.getByText("Невалидно потребителско име или парола.")).toBeVisible();
});

test("a forged session cookie is rejected", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "ab_admin_session", value: "YWRtaW4.9999999999999.forged", url: baseURL! }]);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("admin edits homepage content and it appears on the site", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/content");
  await page.getByLabel("Заглавие (върху карусела) (en)").fill("Seaside calm in Varna");
  await page.getByRole("button", { name: "Запази началната страница" }).click();
  await expect(page.getByText("Началната страница е запазена.")).toBeVisible();
  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Seaside calm in Varna");
});

test("admin changes pricing and the quote follows", async ({ page, request }) => {
  await adminLogin(page);
  await page.goto("/admin/pricing");
  await page.getByLabel("Такса почистване").fill("45");
  await page.getByRole("button", { name: "Запази" }).first().click();
  await expect(page.getByText("Цените са запазени.")).toBeVisible();

  // Pick a weekday-only stay outside any season by using dates ~200 days ahead and checking the cleaning line.
  const res = await request.post("/api/quote", { data: { checkIn: isoDayFromToday(200), checkOut: isoDayFromToday(204), guests: 2, locale: "en" } });
  const body = await res.json();
  expect(res.ok()).toBe(true);
  expect(body.quote.lines.find((l: { kind: string }) => l.kind === "cleaning").amount).toBe(4500);
});

test("admin blocks dates and guests cannot book them", async ({ page, request }) => {
  await adminLogin(page);
  await page.goto("/admin/calendar");
  await page.getByLabel("От (първа нощ)").fill(isoDayFromToday(60));
  await page.getByLabel("До (ден на освобождаване)").fill(isoDayFromToday(63));
  await page.getByLabel("Причина").fill("Ремонт");
  await page.getByRole("button", { name: "Блокирай" }).click();
  await expect(page.getByText("Периодът е блокиран.")).toBeVisible();

  const res = await request.post("/api/quote", { data: { checkIn: isoDayFromToday(61), checkOut: isoDayFromToday(65), guests: 2, locale: "bg" } });
  expect((await res.json()).error).toBe("unavailable");
});

test("admin uploads a photo and rejects a non-image", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/media");
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  await page.locator('input[type="file"]').setInputFiles([
    { name: "pixel.png", mimeType: "image/png", buffer: png },
    { name: "evil.png", mimeType: "image/png", buffer: Buffer.from("<script>alert(1)</script>") },
  ]);
  await page.getByRole("button", { name: "Качи" }).click();
  await expect(page.getByText(/Качени снимки: 1\..*evil\.png/)).toBeVisible();
  await expect(page.locator("img[src^='/api/media/']")).toHaveCount(1);
});

test("calendar export is disabled without a token", async ({ request }) => {
  const res = await request.get("/api/calendar/export?token=anything");
  expect(res.status()).toBe(404);
});

test("cron endpoint requires the secret", async ({ request }) => {
  const res = await request.get("/api/cron/sync-calendars");
  expect(res.status()).toBe(401);
});
