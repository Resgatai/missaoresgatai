import { expect, test } from "@playwright/test";

test("a área pública apresenta a igreja e o acesso", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Pedir oração" })).toBeVisible();
});
