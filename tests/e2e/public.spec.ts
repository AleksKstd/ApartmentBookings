import { expect, test } from "@playwright/test";

test("root redirects by Accept-Language, defaulting to Bulgarian", async ({ browser, baseURL }) => {
  for (const [locale, expected, lang] of [
    ["bg-BG", /\/bg$/, "bg-BG"],
    ["en-US", /\/en$/, "en-GB"],
    ["de-DE", /\/bg$/, "bg-BG"],
  ] as const) {
    const ctx = await browser.newContext({ locale, baseURL });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(expected);
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
    await ctx.close();
  }
});

test("homepage shows the carousel, facts and gallery", async ({ page }) => {
  await page.goto("/bg");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Вашият дом край морето");
  const carousel = page.locator('[aria-roledescription="carousel"]');
  await expect(carousel).toBeVisible();
  await expect(carousel.locator('[aria-roledescription="slide"]')).toHaveCount(4);

  // Manual navigation moves to the next slide
  await page.getByRole("button", { name: "Пауза" }).click();
  await page.getByRole("button", { name: "Следваща снимка" }).click();
  await expect(carousel.locator('[aria-roledescription="slide"][aria-hidden="false"]')).toHaveAttribute("aria-label", "Снимка 2 от 4");

  await expect(page.getByText("Спални")).toBeVisible();
  await expect(page.getByRole("button", { name: /Отвори снимка 1/ })).toBeVisible();
});

test("language switch keeps the current page", async ({ page }) => {
  await page.goto("/bg/apartment");
  await page.getByRole("link", { name: /English/ }).click();
  await expect(page).toHaveURL(/\/en\/apartment$/);
  await expect(page.getByRole("heading", { name: "About the apartment" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en-GB");
  await page.getByRole("link", { name: /Български/ }).click();
  await expect(page).toHaveURL(/\/bg\/apartment$/);
});

test("gallery lightbox opens, navigates and closes with Escape", async ({ page }) => {
  await page.goto("/en/gallery");
  await page.getByRole("button", { name: "Open photo 1" }).click();
  const dialog = page.getByRole("dialog", { name: "Photo viewer" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Photo 1 of \d+/)).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByText(/Photo 2 of \d+/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("unknown pages return 404", async ({ page }) => {
  const res = await page.goto("/en/does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("security headers are present", async ({ request }) => {
  const res = await request.get("/bg");
  expect(res.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  expect(res.headers()["x-powered-by"]).toBeUndefined();
});
