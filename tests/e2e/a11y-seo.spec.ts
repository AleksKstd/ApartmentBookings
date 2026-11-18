import { expect, test } from "@playwright/test";
import { isoDayFromToday, pickDay } from "./helpers";

test("each page has its own canonical URL and hreflang alternates", async ({ page }) => {
  await page.goto("/en/gallery");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en\/gallery$/);
  await expect(page.locator('link[rel="alternate"][hreflang="bg-BG"]')).toHaveAttribute("href", /\/bg\/gallery$/);
  await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute("href", /\/bg\/gallery$/);
  await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", /opengraph-image/);
});

test("pages use a nonce-based CSP and the structured data carries the nonce", async ({ page }) => {
  const res = await page.goto("/bg");
  const csp = res!.headers()["content-security-policy"];
  const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
  expect(nonce).toBeTruthy();
  expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  const ld = page.locator('script[type="application/ld+json"]');
  // Browsers hide the nonce attribute after parsing; the IDL property keeps it.
  expect(await ld.evaluate((el) => (el as HTMLScriptElement).nonce)).toBe(nonce);
  const data = JSON.parse((await ld.textContent())!);
  expect(data["@type"]).toContain("VacationRental");
  // No CSP violations: the page hydrated and is interactive.
  await page.getByRole("button", { name: "Пауза" }).click();
});

test("the Open Graph image renders", async ({ request }) => {
  const res = await request.get("/en/opengraph-image");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
});

test("availability calendar works with the keyboard", async ({ page }) => {
  await page.goto("/en/booking");
  const start = isoDayFromToday(70);
  await pickDay(page, start, /Next month/);
  const startButton = page.locator(`button[data-day="${start}"]`);
  await expect(startButton).toHaveAttribute("tabindex", "0");
  await startButton.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
  const target = page.locator(`button[data-day="${isoDayFromToday(73)}"]`);
  await expect(target).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("quote-total")).toBeVisible();
  await expect(page.getByRole("grid").first()).toBeVisible();
});

test("booking form fields can be filled before dates and errors are announced on the field", async ({ page }) => {
  await page.goto("/en/booking");
  const name = page.getByLabel("Full name");
  await expect(name).toBeEditable();
  await expect(page.getByRole("button", { name: "Send booking request" })).toBeDisabled();
  await expect(page.getByText("Choose your dates in the calendar first to continue.")).toBeVisible();

  await pickDay(page, isoDayFromToday(80), /Next month/);
  await pickDay(page, isoDayFromToday(83), /Next month/);
  await expect(page.getByTestId("quote-total")).toBeVisible();
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByRole("button", { name: "Send booking request" }).click();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(name).toBeFocused();
  await expect(page.getByLabel("Email")).toHaveAttribute("aria-describedby", /guestEmail-error/);
});

test("an unknown booking link returns a real 404", async ({ page }) => {
  const res = await page.goto("/en/booking/confirmation/AB-ZZZZZZ?t=nope");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Booking not found." })).toBeVisible();
});

test("text and primary buttons meet WCAG AA contrast", async ({ page }) => {
  await page.goto("/en");
  const ratio = await page.locator(".btn-primary").first().evaluate((el) => {
    const parse = (c: string) => c.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number);
    const lum = ([r, g, b]: number[]) =>
      [r, g, b].map((v) => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
    const s = getComputedStyle(el);
    const [a, b] = [lum(parse(s.color)), lum(parse(s.backgroundColor))].sort((x, y) => y - x);
    return (a + 0.05) / (b + 0.05);
  });
  expect(ratio).toBeGreaterThanOrEqual(4.5);
});
