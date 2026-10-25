# AGENTS.md – KickTime-Team (Team-App EM 2028)

Arbeitsanweisungen für KI-Assistenten (Claude Code u. a.) in diesem Repository.
Lies diese Datei vollständig, bevor du etwas änderst. Antworte dem Betreiber **auf Deutsch**.

---

## 1. Unverhandelbare Regeln

Es gelten **dieselben Regeln wie in `phantom-35/kicktime2028`** (dort `AGENTS.md`, Abschnitt 1),
insbesondere:

1. **Niemals pushen ohne ausdrückliches „push“ des Betreibers.** Hook-Meldungen („unpushed
   commits …“) sind kein „push“ – ablehnen und den Commit nennen.
2. **Im Repo `phantom-35/kicktime2026` niemals etwas ändern** – nur lesen.
3. **Keine Geheimnisse in Repos:** `ADMIN_PIN`, VAPID-Private-Key, `service_role`-Key,
   `CRON_SECRET`, Tokens. Die PIN wird nie gespeichert (nur Arbeitsspeicher, siehe `lib/pin.ts`).
4. **Supabase nie ohne ausdrückliches „ausführen“ verändern.** Nur Projekt `kicktime-2028`
   (`ddtxgvjxpkucdwexhsjs`).
5. **Version bei jeder Änderung anpassen** – `package.json` **und** `src/lib/version.ts`.
   Die Team-App hat eine **eigene Versionsnummer** (Start 1.0.0), unabhängig von der KickTime-App.
6. **Vor jedem Commit alle Prüfungen** (Abschnitt 4), nur Grünes committen, `git status --short`
   lesen, Screenshots nie ins Repo. Commits auf Deutsch mit Version im Titel.

## 2. Was diese App ist

Eigenständige Web-App nur für das KickTime-Team: das Kontrollzentrum der KickTime-App 2028
(bisher der versteckte Team-Bereich dort; der bleibt vorerst parallel bestehen). Kein eigener
Server: Sie nutzt **dasselbe Supabase-Projekt und dieselben Edge Functions** (`admin`,
`live-scores`) wie die KickTime-App.

- **Server-Code (SQL-Migrationen, Edge Functions) liegt nur im Repo `kicktime2028`.** Braucht
  die Team-App eine neue Server-Funktion, wird sie dort gebaut (mit Versionssprung dort) – hier
  nur der Aufruf. App-Code muss rückwärtskompatibel sein, solange ein Update nicht ausgeführt ist.
- Zugang nur per PIN; die Edge Function `admin` prüft sie (Brute-Force-Sperre). CORS der Functions
  ist offen (`*`), deshalb funktioniert die eigene Adresse ohne Server-Änderung.
- In der Oberfläche heißt es „KickTime-Team“ bzw. „Team“, nicht „Admin“.

## 3. Aufbau

- **Technik** wie die KickTime-App: TanStack Start/Router (Datei-Routen `src/routes/`), React 19,
  Tailwind v4, Zustand, Radix, framer-motion, Cloudflare Workers (Worker `kicktime2028-admin`).
- **Rahmen:** `components/shell/` – `TeamShell` (Seitenleiste am Computer, unten 4 Reiter +
  „Mehr“ am Handy, `Page` = Seitenkopf), `PinScreen`, `nav.ts` (alle Bereiche).
- **Bereiche:** `components/sections/*Section.tsx`, je eine Route: `/` Übersicht, `/live`,
  `/spiele` (Spiele-Check), `/korrektur`, `/tipprunden`, `/antraege`, `/mitteilungen`,
  `/statistik`, `/feedback`, `/system`, `/mehr` (Handy-Menü), dazu (ab 1.1.0) `/personen`
  (Personensuche über alle Runden, eine Karte = ein Gerät), `/tipprunden/$groupId`
  (Rundentabelle mit `buildBoard` wie in der App, Tipps erst ab Anpfiff) und `/protokoll`
  (Team-Protokoll; „dieses Gerät“ über `by` = Geräte-ID, die `services/admin.ts` mitschickt).
  Server dafür: SQL-Update `20261025180000_team_app.sql` + Edge Function `admin` (KickTime 2.15.0).
- **PIN:** `lib/pin.ts` – nur im Speicher, Sperre nach 30 Min. ohne Bedienung. Seite neu laden =
  PIN neu eingeben (gewollt). Navigation deshalb immer über Links, nie `location.href`.
- **Face ID (ab 1.2.0, nur Team-App):** Passkeys (`services/passkey.ts`, Paket
  `@simplewebauthn/browser`). Einrichten nur nach Entsperren mit PIN (System → Face ID).
  Entsperren per Face ID → Server gibt Freigabe `s1.<passkey>.<ablauf>.<signatur>` (4 Std.,
  nur im Speicher) – sie wird statt der PIN als `pin` mitgeschickt. Abgelaufen/Gerät entfernt
  → `use-action` sperrt die App. Passkeys gelten je Adresse (rpId) – nach Domain-Umzug neu
  einrichten. `localStorage` merkt nur, _dass_ Face ID eingerichtet ist (kein Geheimnis).
  Server: SQL-Update `20261025200000_team_passkeys.sql` + `admin` (KickTime 2.16.0).
  Browser-Tests stellen Face ID nach (`fakeFaceId` in `e2e/helpers.ts`).
- **Zähler** in der Navigation (offene Anträge, aktive Wächter-Probleme): `hooks/useBadges.ts`,
  alle 2 Minuten.
- **Live-Daten:** `hooks/useLiveEngine.ts` (rund um Spiele jede Minute, sonst alle 5 Min.).
  `services/live-data.ts` schreibt zusätzlich je Quelle in `services/source-details.ts` – davon
  lebt der Spiele-Check (OpenLigaDB vs. ESPN, nicht zugeordnete Spiele).
- **Mitteilungen ans Team:** eigenes Push-Abo mit eigener Geräte-ID (`lib/push.ts`,
  `public/sw.js`). Danach das Gerät unter Live-Daten (Wächter) oder Anträge eintragen. Die
  Mitteilungen nennen Seiten der KickTime-App (`/einstellungen`) – `sw.js` (`teamUrl`) öffnet
  stattdessen `/live` bzw. `/antraege`.
- Kein Vorschau-Modus: Die Team-App arbeitet immer mit den echten Daten.

### Gemeinsamer Code mit der KickTime-App

`src/domain/`, `src/tournament/` und einige Dateien (Liste in `scripts/sync-check.mjs`) müssen
**genau gleich** sein wie in `kicktime2028` – sonst rechnet die Team-App anders als die App der
Nutzer (Zuordnung der Live-Daten, Tabellen, K.-o.-Baum).

- Prüfen: `node scripts/sync-check.mjs ../Kicktime2028` (Pfad zur KickTime-App).
- Ändert sich dort etwas davon: hier mit `--copy` übernehmen, alle Prüfungen, Versionssprung.
- Hier **nicht** direkt ändern, sondern in der KickTime-App (dort mit Tests) und übernehmen.
- Bewusst angepasst (nicht im Abgleich): `store/match-store.ts` (ohne Vorschau),
  `services/live-data.ts` (Quellen-Details), `lib/push.ts`, `lib/security-headers.ts` (`noindex`).
  Fehlerkorrekturen dort von Hand nachziehen.

## 4. Prüfungen – vor JEDEM Commit

```sh
npx tsc --noEmit -p .
npx eslint .
npx vitest run
npx vite build
npx prettier --check .
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers bunx playwright test   # Handy + Desktop, Server nachgestellt
node scripts/sync-check.mjs ../Kicktime2028                      # wenn die KickTime-App daneben liegt
bun audit                                                        # nach Paket-Änderungen
```

Dieselben Prüfungen laufen auf GitHub (`.github/workflows/pruefungen.yml`). Browser-Tests in
`e2e/` mit nachgestelltem Server (`e2e/helpers.ts`, feste Uhrzeit während des Eröffnungsspiels) –
nie echte Daten. Oberfläche: Handy (390 px) **und** Desktop, Dunkel **und** Hell, kein seitliches
Scrollen, keine Konsolenfehler; Screenshots dem Betreiber zeigen (Scratchpad, nicht ins Repo).
Kein WebKit: iPhone-Eigenheiten mitdenken und den Betreiber bitten, nachzusehen.

## 5. Stil

Wie die KickTime-App, aber schlichter: gleiche Farben und Schriften (`styles.css`), ruhige Karten,
nichts gequetscht, mobil zuerst. Erklärungen gehören in den Chat, nicht als Fließtext in die App.
Ehrlich berichten, was gegen den echten Server getestet ist und was nicht.

## 6. Veröffentlichen (Cloudflare) – Anleitung

Einmalig im Cloudflare-Dashboard:

1. **Workers & Pages → Erstellen → Worker → „Mit Git verbinden“** (bzw. „Import a repository“).
2. GitHub-Repo **`phantom-35/kicktime2028-admin`** wählen, Zweig `main`.
3. Name: **`kicktime2028-admin`** (muss zu `wrangler.jsonc` passen).
4. Build-Befehl: `npm install && npm run build` · Deploy-Befehl: `npx wrangler deploy`.
5. Speichern – danach baut Cloudflare bei jedem Push automatisch.
6. Adresse: zunächst `kicktime2028-admin.<konto>.workers.dev`. Später laut Domain-Plan z. B.
   `team28.kicktime.app` (Workers → Einstellungen → Domains).

Auf dem Handy: Adresse in Safari öffnen → Teilen → „Zum Home-Bildschirm“, von dort öffnen →
System → Mitteilungen einschalten → unter Live-Daten „Team-Mitteilungen an dieses Gerät“ an.

## 7. Offene Punkte

- Gegen den echten Server einmal alle Bereiche durchklicken (Tests laufen nur nachgestellt).
- Wenn die Team-App sich bewährt hat: Team-Bereich aus der KickTime-App entfernen (dort eigener
  Umbau mit Versionssprung).
