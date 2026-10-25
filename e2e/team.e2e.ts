import { expect, test, type Page } from "@playwright/test";
import { expectNoOverflow, setup, unlock } from "./helpers";

const SHOTS = process.env.SHOTS;

/** Bereich öffnen – am Computer über die Seitenleiste, am Handy über die Reiter bzw. „Mehr“. */
async function go(page: Page, label: string) {
  const side = page.getByRole("complementary").getByRole("link", { name: label });
  if (await side.isVisible()) return side.click();
  const tabs = page.getByRole("navigation", { name: "Bereiche" }).last();
  const tab = tabs.getByRole("link", { name: label });
  if (await tab.count()) return tab.click();
  await tabs.getByRole("link", { name: "Mehr" }).click();
  await page.getByRole("main").getByRole("link", { name: label }).click();
}

async function shot(page: Page, name: string, project: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${project}-${name}.png`, fullPage: true });
}

test("PIN: falsche wird abgelehnt, richtige entsperrt", async ({ page }, info) => {
  const { errors, calls } = await setup(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "KickTime-Team" })).toBeVisible();
  await shot(page, "00-pin", info.project.name);
  await page.getByLabel("PIN").fill("111111");
  await page.getByRole("button", { name: "Entsperren" }).click();
  await expect(page.getByText("Falsche PIN")).toBeVisible();
  await page.getByLabel("PIN").fill("123456");
  await page.getByRole("button", { name: "Entsperren" }).click();
  await expect(page.getByRole("heading", { name: "Übersicht" })).toBeVisible();
  expect(calls.filter((c) => c.action === "verify")).toHaveLength(2);
  // Sperren führt zurück zur PIN.
  await page.getByRole("button", { name: "Sperren" }).first().click();
  await expect(page.getByLabel("PIN")).toBeVisible();
  expect(errors).toEqual([]);
});

test("alle Bereiche öffnen ohne Fehler und ohne seitliches Scrollen", async ({ page }, info) => {
  const { errors } = await setup(page);
  await unlock(page);
  await expect(page.getByText("1 Problem").first()).toBeVisible();
  await expect(page.getByText("Wales").first()).toBeVisible();
  await expectNoOverflow(page);
  await shot(page, "01-uebersicht", info.project.name);
  const areas: [string, string][] = [
    ["Live-Daten", "02-live"],
    ["Spiele-Check", "03-spiele"],
    ["Korrektur", "04-korrektur"],
    ["Tipprunden", "05-tipprunden"],
    ["Personen", "05b-personen"],
    ["Anträge", "06-antraege"],
    ["Mitteilungen", "07-mitteilungen"],
    ["Statistik", "08-statistik"],
    ["Feedback", "09-feedback"],
    ["Protokoll", "09b-protokoll"],
    ["System", "10-system"],
  ];
  for (const [label, file] of areas) {
    await go(page, label);
    await expect(page.getByRole("heading", { level: 1, name: label })).toBeVisible();
    await page.waitForTimeout(300);
    await expectNoOverflow(page);
    await shot(page, file, info.project.name);
  }
  expect(errors).toEqual([]);
});

test("Spiele-Check zeigt, wenn OpenLigaDB und ESPN Unterschiedliches melden", async ({ page }) => {
  await setup(page);
  await unlock(page);
  await go(page, "Spiele-Check");
  await page.getByRole("tab", { name: /Auffällig/ }).click();
  await expect(page.getByText("Quellen melden Unterschiedliches")).toBeVisible();
  await expect(page.getByText("1:0 · live")).toBeVisible();
  await expect(page.getByText("2:0 · live")).toBeVisible();
  await expect(page.getByText("Testverein – SV Großefehn")).toBeVisible();
});

test("Korrektur: Stand live schalten schickt die richtigen Daten", async ({ page }) => {
  const { calls } = await setup(page);
  await unlock(page);
  await go(page, "Korrektur");
  const row = page.getByRole("listitem").filter({ hasText: "Wales" }).first();
  await row.getByLabel("Tore Heim plus").click();
  await row.getByRole("button", { name: /live schalten/ }).click();
  await expect
    .poll(() => calls.find((c) => c.action === "set")?.body)
    .toMatchObject({
      matchId: "m01",
      status: "live",
      scoreHome: 3,
      scoreAway: 0,
      // Quellstand beim Speichern (ESPN hatte das 2:0 schon).
      sourceSig: "O|2:0|-",
    });
});

test("Anträge: Zähler in der Navigation und Entscheidung", async ({ page }) => {
  const { calls } = await setup(page);
  await unlock(page);
  await expect(page.getByLabel("1 offen").locator("visible=true").first()).toBeVisible();
  await go(page, "Anträge");
  await expect(page.getByText("Sorry, war nur Spaß")).toBeVisible();
  await page.getByPlaceholder(/Antwort/).fill("Alles klar, willkommen zurück");
  await page.getByRole("button", { name: "Entsperren" }).click();
  await expect
    .poll(() => calls.find((c) => c.action === "decide")?.body)
    .toMatchObject({
      id: 7,
      accept: true,
      reply: "Alles klar, willkommen zurück",
    });
});

test("Feedback nach Art filtern", async ({ page }) => {
  await setup(page);
  await unlock(page);
  await go(page, "Feedback");
  await expect(page.getByText("Super App")).toBeVisible();
  await page.getByRole("tab", { name: /🐞/ }).click();
  await expect(page.getByText("hängt manchmal")).toBeVisible();
  await expect(page.getByText("Super App")).toHaveCount(0);
});

test("Hell-Modus lässt sich einstellen", async ({ page }, info) => {
  await setup(page);
  await unlock(page);
  await go(page, "System");
  await page.getByRole("tab", { name: "Hell" }).click();
  await expect(page.locator("html")).toHaveClass(/light/);
  await go(page, "Übersicht");
  await expect(page.getByText("Wales").first()).toBeVisible();
  await shot(page, "11-uebersicht-hell", info.project.name);
  await go(page, "Spiele-Check");
  await shot(page, "12-spiele-hell", info.project.name);
});

test("Personensuche findet über alle Runden und sperrt in einer Runde", async ({ page }, info) => {
  const { calls } = await setup(page);
  await unlock(page);
  await go(page, "Personen");
  await page.getByLabel("Name suchen").fill("len");
  await expect(page.getByText("auch: Lenchen")).toBeVisible();
  await expect(page.getByText("Familie")).toBeVisible();
  await shot(page, "13-personen-treffer", info.project.name);
  expect(calls.find((c) => c.action === "find_person")?.body).toMatchObject({ query: "len" });
  await page.getByRole("button", { name: "In der Runde sperren" }).first().click();
  await expect
    .poll(() => calls.find((c) => c.action === "member_remove")?.body)
    .toMatchObject({ groupId: "11111111-1111-4111-8111-111111111111", ban: true });
});

test("Rundentabelle rechnet wie die App (laufendes Spiel zählt vorläufig)", async ({
  page,
}, info) => {
  await setup(page);
  await unlock(page);
  await go(page, "Tipprunden");
  await page.getByRole("button", { name: /Bürorunde/ }).click();
  await page.getByRole("link", { name: "Tabelle ansehen" }).click();
  await expect(page.getByRole("heading", { name: "Rundentabelle" })).toBeVisible();
  // ESPN meldet 2:0 (live) → Lena tippte 2:0 = 4 Punkte, Ben 1:1 = 0.
  const first = page.getByRole("row").nth(1);
  await expect(first).toContainText("Lena");
  await expect(first).toContainText("+4 live");
  await page.waitForTimeout(400);
  await shot(page, "14-tabelle", info.project.name);
});

test("Protokoll zeigt die Team-Aktionen", async ({ page }) => {
  await setup(page);
  await unlock(page);
  await expect(page.getByText("Korrektur m01: 2:0 live").first()).toBeVisible();
  await go(page, "Protokoll");
  await expect(page.getByText("Antrag von Tom angenommen")).toBeVisible();
  await expect(page.getByText(/Gerät …7777/)).toBeVisible();
});
