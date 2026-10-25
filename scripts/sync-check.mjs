// Prüft, ob der gemeinsame Code noch genau dem der KickTime-App entspricht.
// Die Turnierlogik (Spielplan, Zuordnung der Live-Daten, Tabellen) muss in
// beiden Apps gleich rechnen – sonst zeigt die Team-App etwas anderes als die
// Nutzer sehen.
//
//   node scripts/sync-check.mjs [Pfad zur KickTime-App]   (Standard: ../Kicktime2028)
//   node scripts/sync-check.mjs --copy                    (Dateien von dort übernehmen)
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const copy = args.includes("--copy");
const main = path.resolve(args.find((a) => !a.startsWith("--")) ?? "../Kicktime2028");

/** Genau gleich wie in der KickTime-App (ganze Ordner bzw. einzelne Dateien). */
const SHARED_DIRS = ["src/domain", "src/tournament"];
const SHARED_FILES = [
  "src/demo/demo.ts",
  "src/services/admin.ts",
  "src/services/announcement.ts",
  "src/services/source-report.ts",
  "src/services/supabase.ts",
  "src/public-config.ts",
  "src/lib/device-id.ts",
  "src/lib/error-log.ts",
  "src/lib/haptics.ts",
  "src/lib/theme.ts",
  "src/lib/utils.ts",
  "src/components/team/Flag.tsx",
  "src/components/common/Segmented.tsx",
  "src/components/ui/alert-dialog.tsx",
  "src/components/ui/button.tsx",
  "src/components/ui/sonner.tsx",
  "src/components/ui/switch.tsx",
  "public/flags",
];

if (!fs.existsSync(path.join(main, "package.json"))) {
  console.error(`KickTime-App nicht gefunden: ${main}`);
  process.exit(2);
}

const list = (dir) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { recursive: true })
        .filter((f) => fs.statSync(path.join(dir, f)).isFile())
    : [];

const files = new Set(SHARED_FILES.filter((f) => !fs.existsSync(f) || fs.statSync(f).isFile()));
for (const d of [
  ...SHARED_DIRS,
  ...SHARED_FILES.filter((f) => fs.existsSync(f) && fs.statSync(f).isDirectory()),
]) {
  for (const f of list(path.join(main, d))) {
    // Tests dürfen sich auf Teile beziehen, die die Team-App nicht hat.
    if (/\.test\.tsx?$/.test(f) && !fs.existsSync(path.join(d, f))) continue;
    files.add(path.join(d, f));
  }
  for (const f of list(d)) files.add(path.join(d, f));
}

let diff = 0;
for (const f of [...files].sort()) {
  const a = path.join(main, f);
  const here = fs.existsSync(f) ? fs.readFileSync(f) : null;
  const there = fs.existsSync(a) ? fs.readFileSync(a) : null;
  if (here && there && here.equals(there)) continue;
  // Was die Team-App nicht braucht, darf fehlen.
  if (!here && there && SHARED_DIRS.some((d) => f.startsWith(d))) continue;
  diff++;
  if (copy && there) {
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, there);
    console.log(`übernommen: ${f}`);
  } else {
    console.log(
      `${!there ? "fehlt in der KickTime-App" : !here ? "fehlt hier" : "abweichend"}: ${f}`,
    );
  }
}
if (diff === 0) console.log("Gemeinsamer Code ist gleich ✓");
else if (!copy) {
  console.log(`\n${diff} Unterschied(e). Mit --copy übernehmen (danach alle Prüfungen).`);
  process.exit(1);
}
