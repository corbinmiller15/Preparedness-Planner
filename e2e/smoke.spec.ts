import { expect, test } from "@playwright/test";

const disclaimer = "Not an official alert source. In an emergency, call 911.";

test("placeholder home page states it is not an alert source", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Northroom" })).toBeVisible();
  await expect(page.getByTestId("disclaimer")).toHaveText(disclaimer);
  await expect(page.getByText("Free beta")).toBeVisible();
  await expect(page.getByText("design approval")).toBeVisible();
  await expect(page.locator("img")).toHaveCount(0);
});

test("disclaimer fits a phone width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const box = await page.getByTestId("disclaimer").boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeLessThanOrEqual(390);
  await expect(page.getByTestId("disclaimer")).toBeVisible();
});
