import { expect, test } from "@playwright/test";
import { adminLogin, isoDayFromToday, pickDay } from "./helpers";

const checkIn = isoDayFromToday(40);
const checkOut = isoDayFromToday(44);

test.describe.serial("guest booking → admin confirmation", () => {
  let reference = "";

  test("guest requests a booking", async ({ page }) => {
    await page.goto("/en/booking");
    await pickDay(page, checkIn, /Next month/);
    await pickDay(page, checkOut, /Next month/);
    await expect(page.getByTestId("quote-total")).toBeVisible();

    await page.getByLabel("Guests").selectOption("3");
    await expect(page.getByText(/Extra guests/)).toBeVisible();

    // Server-side validation messages
    await page.getByRole("button", { name: "Send booking request" }).click();
    await expect(page.getByText("Please enter your full name.")).toBeVisible();

    await page.getByLabel("Full name").fill("Jane Traveller");
    await page.getByLabel("Email").fill("jane@example.com");
    await page.getByLabel("Phone").fill("+44 20 7946 0000");
    await page.getByLabel("Message to the host (optional)").fill("Arriving around 18:00");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Send booking request" }).click();

    await page.waitForURL(/\/en\/booking\/confirmation\/AB-/);
    await expect(page.getByTestId("confirmation-title")).toHaveText("Your request has been sent!");
    reference = (await page.getByTestId("booking-reference").textContent()) ?? "";
    expect(reference).toMatch(/^AB-[A-Z0-9]{6}$/);
  });

  test("the booked dates are no longer available", async ({ page, request }) => {
    const res = await request.post("/api/quote", { data: { checkIn, checkOut, guests: 2, locale: "en" } });
    expect(res.status()).toBe(422);
    expect((await res.json()).error).toBe("unavailable");

    await page.goto("/en/booking");
    await pickDay(page, isoDayFromToday(39), /Next month/);
    const blockedNight = page.locator(`button[data-day="${isoDayFromToday(41)}"]`);
    await expect(blockedNight).toBeDisabled();
  });

  test("the confirmation page requires the secret token", async ({ page }) => {
    await page.goto(`/en/booking/confirmation/${reference}?t=wrong`);
    await expect(page.getByRole("heading", { name: "Booking not found." })).toBeVisible();
  });

  test("admin confirms the request and the guest is emailed", async ({ page }) => {
    await adminLogin(page);
    await expect(page.getByText("Чакащи потвърждение")).toBeVisible();
    await page.goto("/admin/bookings?status=pending");
    await page.getByRole("link", { name: reference }).click();
    await expect(page.getByText("Jane Traveller")).toBeVisible();
    await expect(page.getByText("Arriving around 18:00")).toBeVisible();
    await page.getByRole("button", { name: "Потвърди" }).click();
    await expect(page.locator(".badge", { hasText: "Потвърдена" })).toBeVisible();

    await page.goto("/admin/emails");
    await expect(page.locator("summary", { hasText: `Your booking is confirmed — ${reference}` })).toBeVisible();
    await expect(page.locator("summary", { hasText: `We received your booking request — ${reference}` })).toBeVisible();
  });
});
