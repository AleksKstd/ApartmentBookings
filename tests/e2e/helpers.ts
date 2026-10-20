import type { Page } from "@playwright/test";

export function isoDayFromToday(offset: number): string {
  const sofiaToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" }).format(new Date());
  const d = new Date(`${sofiaToday}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

/** Clicks a day in the availability calendar, paging forward until it is visible. */
export async function pickDay(page: Page, day: string, nextMonthLabel: RegExp) {
  for (let i = 0; i < 14; i++) {
    const button = page.locator(`button[data-day="${day}"]`);
    if (await button.isVisible()) {
      await button.click();
      return;
    }
    await page.getByRole("button", { name: nextMonthLabel }).click();
  }
  throw new Error(`Day ${day} not reachable in calendar`);
}

export async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Потребителско име").fill("admin");
  await page.getByLabel("Парола").fill("demo-admin-2026");
  await page.getByRole("button", { name: "Вход" }).click();
  await page.waitForURL("**/admin");
}
