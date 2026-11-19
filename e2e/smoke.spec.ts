import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const email = process.env.E2E_EMAIL ?? "admin@spgps.local";
const password = process.env.E2E_PASSWORD ?? "admin123";

test.describe("SPGPS smoke", () => {
  test("login → map shell → history + theme toggle", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "เข้าสู่ระบบ" })).toBeVisible();

    const loginAxe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .analyze();
    expect(loginAxe.violations, JSON.stringify(loginAxe.violations, null, 2)).toEqual([]);

    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();

    await expect(page).toHaveURL(/\/map/, { timeout: 15_000 });
    await expect(page.getByTestId("app-shell")).toBeVisible();
    await expect(page.getByTestId("app-sidebar")).toBeVisible();

    await page.getByRole("link", { name: "ประวัติ" }).first().click();
    await expect(page).toHaveURL(/\/history/);
    await expect(page.getByTestId("app-shell")).toBeVisible();

    const themeToggle = page.getByRole("button", { name: /สลับเป็นโหมด/ });
    await expect(themeToggle).toBeVisible();
    await themeToggle.click();
    await expect(page.getByTestId("app-shell")).toBeVisible();
  });
});
