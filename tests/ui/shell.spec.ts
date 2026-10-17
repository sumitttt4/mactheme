import { test, expect } from "@playwright/test";
test("browser cannot silently act like native desktop", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("MacTheme is a desktop app.")).toBeVisible();
});
test("menu bar and dock render; native actions explain preview limitations", async ({
  page,
}) => {
  await page.goto("/?preview");
  await expect(
    page.getByRole("toolbar", { name: "Application dock" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open Control Center" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "unavailable in the browser preview",
  );
  await page.getByRole("button", { name: "Dismiss error" }).click();
  await page.screenshot({ path: "test-results/desktop.png" });
});
test("launcher search, keyboard navigation, pinning, errors", async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 500 });
  await page.goto("/?preview&view=spotlight");
  const input = page.getByRole("combobox");
  await input.fill("code");
  await expect(page.getByRole("option")).toHaveCount(1);
  await expect(page.getByRole("option")).toContainText("Visual Studio Code");
  await input.fill("");
  await input.press("ArrowDown");
  await expect(input).toHaveAttribute("aria-activedescendant", "result-1");
  await input.press("Enter");
  await expect(page.getByRole("alert")).toContainText("unavailable");
  await input.fill("Notepad");
  await page.getByRole("button", { name: "Pin Notepad" }).click();
  await expect(
    page.getByRole("button", { name: "Unpin Notepad" }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/spotlight.png" });
});
test("settings theme and dock preferences persist through bridge", async ({
  page,
}) => {
  await page.setViewportSize({ width: 484, height: 730 });
  await page.goto("/?preview&view=settings");
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("checkbox", { name: "Automatically hide Dock" }).check();
  await expect(
    page.getByRole("checkbox", { name: "Automatically hide Dock" }),
  ).toBeChecked();
  await page.screenshot({ path: "test-results/settings-dark.png" });
});
test("hardware has honest fallbacks rather than pretend sliders", async ({
  page,
}) => {
  await page.setViewportSize({ width: 344, height: 438 });
  await page.goto("/?preview&view=panel");
  await expect(page.getByRole("slider")).toHaveCount(0);
  await expect(page.getByText("Brightness in Windows settings")).toBeVisible();
  await page.screenshot({ path: "test-results/control-center.png" });
});
test("reduced motion disables decorative transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 484, height: 730 });
  await page.goto("/?preview&view=settings");
  await expect(page.locator(".settings-window")).toHaveCSS(
    "transition-duration",
    "0s",
  );
});
