import { expect, test } from "@playwright/test";

test("completes the demo happy path and restores the dataset after reset", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Демо системы для управления этапами перевозки" })).toBeVisible();
  await expect(page.getByText(/Начните с DEMO-001: подтвердите прибытие автомобиля/)).toBeVisible();
  await expect(page.getByText(/Демо работает только с синтетическими данными/)).toBeVisible();
  const cta = page.getByRole("link", { name: "Обсудить похожую систему" });
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute("href", "https://stalarvision.ru");
  await expect(
    page.getByText("Демонстрационный интерфейс. Используются только синтетические данные.")
  ).toBeVisible();

  const demoShipment = page.getByRole("button", { name: /DEMO-001/ });
  await expect(demoShipment).toBeVisible();
  await expect(demoShipment).toHaveAttribute("aria-current", "true");

  await expect(page.getByRole("heading", { name: "Текущая перевозка" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "События перевозки" })).toBeVisible();
  await expect(page.getByText("Ожидает прибытия на погрузку").first()).toBeVisible();

  await page.getByRole("button", { name: /Подтвердить прибытие автомобиля/ }).click();

  await expect(page.getByText("Погрузка").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Автомобиль прибыл" })).toBeVisible();

  await page.getByRole("button", { name: /Завершить погрузку/ }).click();

  await expect(page.getByText("В пути").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Погрузка завершена" })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Автомобиль прибыл" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Погрузка завершена" })).toBeVisible();

  await page.getByRole("button", { name: "Начать демо заново" }).click();

  await expect(
    page.getByText("Все изменения в текущих синтетических данных будут сброшены.")
  ).toBeVisible();

  await page.getByRole("button", { name: "Сбросить демо" }).click();

  await expect(demoShipment).toBeVisible();
  await expect(demoShipment).toHaveAttribute("aria-current", "true");
  await expect(page.getByText("Ожидает прибытия на погрузку").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Погрузка завершена" })).toHaveCount(0);
  await expect(
    page.getByText("Демонстрационный интерфейс. Используются только синтетические данные.")
  ).toBeVisible();
  await expect(page.getByRole("main")).toHaveAttribute("aria-busy", "false");
  await expect(page.getByRole("button", { name: /Подтвердить прибытие автомобиля/ })).toBeEnabled();
});
