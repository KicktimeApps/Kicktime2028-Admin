# KickTime-Team · EM 2028

Eigene Web-App für das KickTime-Team: das Kontrollzentrum der
[KickTime-App 2028](https://github.com/phantom-35/kicktime2028) – mit allen Funktionen
des bisherigen Team-Bereichs, schlichter und mit mehr Platz.

- **Übersicht** – Dashboard: Systemstatus, Kennzahlen mit Verlauf, Spieltag mit Quellen-Abgleich,
  Nutzer pro Tag, „Zu erledigen“, neuestes Feedback
- **Live-Daten** – Wächter mit Test-Mitteilung, Quelle (OpenLigaDB/ESPN) einstellen und testen,
  Anstoßzeiten abgleichen, Zwischenspeicher und gespeicherte Ergebnisse
- **Spiele-Check** (neu) – alle 51 Spiele mit dem, was OpenLigaDB, ESPN und Korrekturen melden;
  Abweichungen und nicht zugeordnete Spiele auf einen Blick
- **Korrektur**, **Tipprunden**, **Anträge**, **Mitteilungen**, **Statistik**
- **Feedback** (eigene Seite, nach Art filterbar), **System** (Mitteilungen, Hell/Dunkel)

## Sicherheit

- Zugang nur mit der PIN (Supabase-Secret `ADMIN_PIN`, Prüfung und Sperre nach Fehlversuchen in
  der Edge Function `admin`). Die PIN bleibt nur im Arbeitsspeicher; nach 30 Minuten ohne
  Bedienung sperrt sich die App.
- Kein eigener Server-Code mit Geheimnissen: Die App nutzt dasselbe Supabase-Projekt und dieselben
  Edge Functions wie die KickTime-App. Suchmaschinen werden ausgesperrt (`noindex`, robots.txt).

## Entwicklung

```sh
bun install
bun run dev            # http://localhost:8080
bun run check          # Typen + Lint + Unit-Tests
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers bunx playwright test   # Browser-Tests
node scripts/sync-check.mjs   # gemeinsamer Code noch gleich wie in der KickTime-App?
```

Arbeitsregeln: [AGENTS.md](AGENTS.md).

## Veröffentlichen (Cloudflare)

Wie die KickTime-App: eigener Worker `kicktime-2028-team`, Build `npm install && npm run build`,
Deploy `npx wrangler deploy`. Einrichtung siehe AGENTS.md, Abschnitt 6.
