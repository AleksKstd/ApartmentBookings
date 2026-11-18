import { expect, test } from "@playwright/test";
import { adminLogin, isoDayFromToday } from "./helpers";

test.describe.serial("admin manages a booking end to end", () => {
  let bookingUrl = "";
  let guestLink = "";

  test("creates a manual booking", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/bookings/new");
    await page.getByLabel("Настаняване").fill(isoDayFromToday(90));
    await page.getByLabel("Напускане").fill(isoDayFromToday(93));
    await page.getByLabel("Име и фамилия").fill("Phone Guest");
    await page.getByLabel("Имейл").fill("phone@example.com");
    await page.getByLabel("Език на госта").selectOption("en");
    await page.getByRole("button", { name: "Създай резервация" }).click();
    await page.waitForURL(/\/admin\/bookings\/[0-9a-f-]{36}$/);
    bookingUrl = page.url();
    await expect(page.getByRole("heading", { name: /Резервация AB-/ })).toBeVisible();
    guestLink = (await page.getByRole("link", { name: /booking\/confirmation/ }).getAttribute("href"))!;
  });

  test("finds it by search and status filter", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/bookings?status=confirmed");
    await page.getByLabel("Търсене").fill("phone@example");
    await page.getByRole("button", { name: "Търси" }).click();
    await expect(page.getByRole("table").getByText("Phone Guest")).toBeVisible();
  });

  test("marks it paid, saves a note and resends the email", async ({ page }) => {
    await adminLogin(page);
    await page.goto(bookingUrl);
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Отбележи като платена" }).click();
    await expect(page.locator(".badge", { hasText: /^Платена$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Отбележи като платена" })).toBeHidden();
    await page.getByLabel("Вътрешна бележка", { exact: true }).fill("Paid in cash on arrival");
    await page.getByRole("button", { name: "Запази" }).last().click();
    await expect(page.getByText("Бележката е запазена.")).toBeVisible();
    await page.getByRole("button", { name: "Изпрати имейл отново" }).click();
    await expect(page.getByText(/Имейлът е (изпратен|записан)/)).toBeVisible();
  });

  test("cancels it and the guest sees a host-cancelled message, not a payment error", async ({ page }) => {
    await adminLogin(page);
    await page.goto(bookingUrl);
    await page.getByLabel("Причина (вътрешна бележка)").fill("Owner unavailable");
    await page.getByRole("button", { name: "Откажи резервацията" }).click();
    await expect(page.locator(".badge", { hasText: "Отказана" })).toBeVisible();
    await page.goto(guestLink);
    await expect(page.getByTestId("confirmation-title")).toHaveText("The host couldn't accept this request");
  });
});

test("seasonal prices can be added and removed", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/pricing");
  const form = page.locator("form", { has: page.getByRole("button", { name: "Добави сезон" }) });
  await form.getByLabel("Име").fill("Test season");
  await form.getByLabel("Първа нощ").fill(isoDayFromToday(300));
  await form.getByLabel("Последна нощ").fill(isoDayFromToday(310));
  await form.getByLabel("Цена на нощ").fill("0");
  await form.getByRole("button", { name: "Добави сезон" }).click();
  await expect(page.getByText("Сезонната цена трябва да е по-голяма от 0.")).toBeVisible();
  await form.getByLabel("Цена на нощ").fill("150");
  await form.getByRole("button", { name: "Добави сезон" }).click();
  await expect(page.getByText("Сезонната цена е запазена.")).toBeVisible();
  await page.reload();
  await expect(page.locator('input[value="Test season"]')).toHaveCount(1);
});

test("pricing rules are validated on the server and the form keeps its values", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/pricing");
  await page.getByLabel("Включени гости в цената").fill("10");
  await page.getByLabel("Максимален брой гости").fill("4");
  await page.getByRole("button", { name: "Запази" }).first().click();
  await expect(page.getByText("Включените гости не може да са повече от максималния брой.")).toBeVisible();
  await expect(page.getByLabel("Включени гости в цената")).toHaveValue("10");
});

test("property details editor updates the public site", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/content");
  await page.getByLabel("Спални").fill("3");
  await page.getByRole("button", { name: /Запази информацията|Запази обекта|Запази/ }).last().click();
  await expect(page.getByText("Информацията за обекта е запазена.")).toBeVisible();
  await page.goto("/en/apartment");
  await expect(page.locator("dl, ul").filter({ hasText: "Bedrooms" }).first()).toContainText("3");
});

test("calendar feeds reject private addresses with a Bulgarian message", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/sync");
  await expect(page.getByRole("heading", { name: "Как да свържете Booking.com" })).toBeVisible();
  await page.locator('input[name="name"]').fill("Booking.com");
  await page.getByLabel(/iCal адрес/).fill("https://169.254.169.254/latest/meta-data");
  await page.getByRole("button", { name: "Добави календар" }).click();
  await expect(page.getByText("Адресът трябва да сочи към публичен сървър.")).toBeVisible();
});

test("integrations page reports readiness and tests the database", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/integrations");
  for (const title of ["Supabase (база данни и снимки)", "Stripe (онлайн плащания)", "Имейли чрез Resend", "Booking.com, Airbnb и други (iCal)", "Хостинг (Vercel)"]) {
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  }
  await page.getByRole("button", { name: "Провери връзката" }).click();
  await expect(page.getByText("Supabase не е конфигуриран — сайтът работи в демо режим.")).toBeVisible();
  await expect(page.getByText(/sk_|whsec_|re_[A-Za-z0-9]/)).toHaveCount(0); // never shows secret values
});

test("media: edit alt text, reorder and delete", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/media");
  const photos = page.locator("ul > li.card");
  await photos.first().getByLabel("Описание EN").fill("Sunny living room");
  await photos.first().getByRole("button", { name: "Запази" }).click();
  await expect(photos.first().getByText("Запазено.")).toBeVisible();
  await photos.first().getByRole("button", { name: "Премести надолу" }).click();
  await expect(photos.nth(1).getByLabel("Описание EN")).toHaveValue("Sunny living room");
  const count = await page.getByRole("button", { name: "Изтрий" }).count();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Изтрий" }).last().click();
  await expect(page.getByRole("button", { name: "Изтрий" })).toHaveCount(count - 1);
});

test("dashboard shows key panels", async ({ page }) => {
  await adminLogin(page);
  await expect(page.getByRole("heading", { name: "Предстоящи пристигания" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Последни резервации" })).toBeVisible();
});
