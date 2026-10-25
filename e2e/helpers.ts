import { expect, type Page } from "@playwright/test";

export const PIN = "123456";

/** Uhrzeit der Tests: Eröffnungsspiel läuft (Anpfiff 9.6.2028, 19:00 UTC). */
export const NOW = new Date("2028-06-09T19:40:00Z");

const iso = (minAgo: number) => new Date(NOW.getTime() - minAgo * 60_000).toISOString();

/** Antworten der Edge Function „admin“ je Aktion. */
export const ADMIN: Record<string, unknown> = {
  verify: { ok: true },
  stats: {
    online: 12,
    day: 140,
    week: 512,
    total: 1830,
    topTeams: [],
    push: { subscriptions: 640, upcoming: 220, sent24h: 410 },
    ext: {
      online: 12,
      today: 96,
      day: 140,
      week: 512,
      month: 1210,
      total: 1830,
      new7: 85,
      returning7: 300,
      installed: 410,
      pushOn: 640,
      subscriptions: 640,
      daily: Array.from({ length: 14 }, (_, i) => ({
        day: new Date(NOW.getTime() - (13 - i) * 86_400_000).toISOString().slice(0, 10),
        // Letzter Tag = heute (wie „today“), der Tag davor = gestern.
        count: i === 13 ? 96 : i === 12 ? 81 : 40 + ((i * 37) % 60),
      })),
      platforms: { ios: 700, android: 420, desktop: 90 },
      browsers: { safari: 690, chrome: 430, firefox: 40, samsung: 50 },
      versions: [
        { version: "2.14.6", count: 900 },
        { version: "2.14.5", count: 310 },
      ],
      topTeams: [
        { team: "GER", count: 410 },
        { team: "ENG", count: 120 },
      ],
    },
  },
  config: {
    liveSource: { league: "em", season: "2028", suffix: "", paused: false, backup: "uefa.euro" },
    defaults: { league: "em", season: "2028", backup: "uefa.euro" },
    announcement: null,
    cache: [{ id: "em-2028", fetched_at: iso(1) }],
    storedResults: 0,
  },
  alerts: {
    alerts: [
      {
        key: "espn",
        message: "ESPN liefert auf 3 Geräten keine Daten.",
        active: true,
        first_at: iso(12),
        last_seen_at: iso(2),
        resolved_at: null,
      },
      {
        key: "openligadb",
        message: "OpenLigaDB antwortete nicht.",
        active: false,
        first_at: iso(300),
        last_seen_at: iso(280),
        resolved_at: iso(270),
      },
    ],
  },
  groups: {
    data: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        code: "ABC123",
        name: "Bürorunde",
        created_at: iso(5000),
        owner: "Ben",
        members: 8,
        pending: 1,
        banned: 0,
        tips: 120,
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        code: "XYZ789",
        name: "Familie",
        created_at: iso(3000),
        owner: "Oma",
        members: 5,
        pending: 0,
        banned: 1,
        tips: 64,
      },
    ],
  },
  group: {
    data: [
      {
        memberId: "33333333-3333-4333-8333-333333333333",
        name: "Ben",
        owner: true,
        approved: true,
        banned: false,
        joinedAt: iso(5000),
        tips: 30,
        champion: "GER",
      },
      {
        memberId: "44444444-4444-4444-8444-444444444444",
        name: "Lena",
        owner: false,
        approved: true,
        banned: false,
        joinedAt: iso(4000),
        tips: 28,
        champion: "ESP",
      },
    ],
  },
  requests: {
    data: [
      {
        id: 7,
        scope: "group",
        status: "open",
        groupId: "11111111-1111-4111-8111-111111111111",
        groupName: "Bürorunde",
        name: "Tom",
        byOwner: false,
        message: "Sorry, war nur Spaß mit dem Namen!",
        reply: null,
        createdAt: iso(30),
        decidedAt: null,
        banReason: null,
      },
    ],
  },
  global_bans: { data: [] },
  feedback: {
    rows: [
      {
        id: 1,
        rating: 1,
        message: "Super App, die Tipprunde ist klasse!",
        created_at: iso(60),
        app_version: "2.14.6",
        category: "lob",
      },
      {
        id: 2,
        rating: null,
        message: "Beim Spielplan hängt manchmal das Scrollen.",
        created_at: iso(120),
        app_version: "2.14.5",
        category: "fehler",
      },
      {
        id: 3,
        rating: null,
        message: "Dunkelmodus für die Tabelle wäre toll.",
        created_at: iso(240),
        app_version: "2.14.6",
        category: "idee",
      },
    ],
  },
  find_person: {
    ok: true,
    data: [
      {
        device: "55555555-5555-4555-8555-555555555555",
        ban: null,
        memberships: [
          {
            groupId: "11111111-1111-4111-8111-111111111111",
            groupName: "Bürorunde",
            code: "ABC123",
            memberId: "44444444-4444-4444-8444-444444444444",
            name: "Lena",
            owner: false,
            approved: true,
            banned: false,
            bannedBy: null,
            joinedAt: iso(4000),
            tips: 28,
          },
          {
            groupId: "22222222-2222-4222-8222-222222222222",
            groupName: "Familie",
            code: "XYZ789",
            memberId: "66666666-6666-4666-8666-666666666666",
            name: "Lenchen",
            owner: true,
            approved: true,
            banned: false,
            bannedBy: null,
            joinedAt: iso(3000),
            tips: 30,
          },
        ],
        requests: [],
      },
    ],
  },
  group_board: {
    ok: true,
    data: {
      group: { id: "11111111-1111-4111-8111-111111111111", code: "ABC123", name: "Bürorunde" },
      members: [
        {
          id: "m-ben",
          name: "Ben",
          isOwner: true,
          champion: "GER",
          tips: { m01: { home: 1, away: 1 } },
        },
        {
          id: "m-lena",
          name: "Lena",
          isOwner: false,
          champion: "ESP",
          tips: { m01: { home: 2, away: 0 } },
        },
      ],
    },
  },
  team_log: {
    rows: [
      {
        id: 2,
        at: iso(5),
        action: "set",
        detail: "Korrektur m01: 2:0 live",
        device_id: null,
      },
      {
        id: 1,
        at: iso(90),
        action: "decide",
        detail: "Antrag von Tom angenommen",
        device_id: "77777777-7777-4777-8777-777777777777",
      },
    ],
  },
  passkey_login_options: {
    available: true,
    options: {
      challenge: "Y2hhbGxlbmdl",
      allowCredentials: [{ id: "Y3JlZA", type: "public-key", transports: ["internal"] }],
      timeout: 60000,
      userVerification: "required",
    },
  },
  passkey_login: { ok: true, token: "s1.Y3JlZA.9999999999999.c2ln", expiresAt: 9999999999999 },
  passkey_register_options: {
    ok: true,
    options: {
      challenge: "cmVnLWNoYWxsZW5nZQ",
      rp: { name: "KickTime-Team", id: "127.0.0.1" },
      user: { id: "a2lja3RpbWUtdGVhbQ", name: "kicktime-team", displayName: "KickTime-Team" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      timeout: 60000,
      attestation: "none",
      excludeCredentials: [],
      authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
    },
  },
  passkey_register: { ok: true, id: "Y3JlZA" },
  passkey_list: {
    ok: true,
    data: [
      {
        id: "Y3JlZA",
        label: "iPhone · 25.10.",
        rp_id: "127.0.0.1",
        created_at: iso(600),
        last_used_at: iso(5),
        here: true,
      },
    ],
  },
  team_device: {
    registered: false,
    count: 1,
    reachable: 1,
    selfPush: false,
    devices: [{ self: false, push: true, lastOk: iso(90), lastFail: null, lastStatus: null }],
  },
};

/** Live-Daten des eigenen Servers: Eröffnungsspiel läuft, ein Testspiel passt nirgends. */
export const LIVE = {
  fixtures: [
    {
      externalId: "70001",
      kickoffUtc: "2028-06-09T19:00:00Z",
      city: "Cardiff",
      stadium: "Principality Stadium",
      homeName: "Wales",
      awayName: "Spanien",
      status: "live",
      score: { home: 1, away: 0 },
      phase: "first",
      minute: 40,
    },
    {
      externalId: "69999",
      kickoffUtc: "2028-05-01T18:00:00Z",
      city: "Aurich",
      stadium: null,
      homeName: "Testverein",
      awayName: "SV Großefehn",
      status: "finished",
      score: { home: 2, away: 2 },
    },
  ],
  espn: "uefa.euro",
  url: "https://api.openligadb.de/getmatchdata/em/2028",
  cache: "miss",
};

/** ESPN meldet schon das 2:0. */
const ESPN = {
  events: [
    {
      id: 1,
      date: "2028-06-09T19:00Z",
      status: { displayClock: "41'", type: { name: "STATUS_FIRST_HALF", state: "in" } },
      competitions: [
        {
          venue: { fullName: "Principality Stadium", address: { city: "Cardiff" } },
          competitors: [
            { homeAway: "home", score: "2", team: { displayName: "Wales" } },
            { homeAway: "away", score: "0", team: { displayName: "Spain" } },
          ],
        },
      ],
    },
  ],
};

export type Calls = { action: string; body: Record<string, unknown> }[];

/**
 * Seite vorbereiten: feste Uhrzeit, Server nachstellen, fremde Adressen
 * blockieren, Konsolenfehler sammeln. `calls` sammelt alle Admin-Aufrufe.
 */
export async function setup(
  page: Page,
  opts: { admin?: Record<string, unknown>; wrongPin?: boolean } = {},
) {
  const errors: string[] = [];
  const calls: Calls = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource|net::ERR_/.test(m.text()))
      errors.push(m.text());
  });
  await page.clock.setFixedTime(NOW);
  const json = (body: unknown, status = 200) => ({
    status,
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*" },
    body: JSON.stringify(body),
  });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, async (route) => {
    const req = route.request();
    const url = req.url();
    if (/supabase\.co\/functions\/v1\/admin/.test(url)) {
      const body = (req.postDataJSON?.() ?? {}) as Record<string, unknown>;
      const action = String(body.action ?? "");
      calls.push({ action, body });
      if (action === "verify" && (opts.wrongPin || body.pin !== PIN))
        return route.fulfill(json({ error: "Falsche PIN" }, 401));
      const res = opts.admin?.[action] ?? ADMIN[action] ?? { ok: true };
      return route.fulfill(json(res));
    }
    if (/supabase\.co\/functions\/v1\/live-scores/.test(url)) return route.fulfill(json(LIVE));
    if (/supabase\.co\/rest\/v1\/rpc\//.test(url)) return route.fulfill(json(null));
    if (/supabase\.co\/rest\/v1\//.test(url)) return route.fulfill(json([]));
    if (/site\.api\.espn\.com/.test(url)) return route.fulfill(json(ESPN));
    return route.abort();
  });
  return { errors, calls };
}

/** PIN eingeben und entsperren. */
export async function unlock(page: Page) {
  await page.goto("/");
  await page.getByLabel("PIN").fill(PIN);
  await page.getByRole("button", { name: "Entsperren" }).click();
  await expect(page.getByRole("heading", { name: "Übersicht" })).toBeVisible();
}

/** Kein seitliches Scrollen. */
export async function expectNoOverflow(page: Page) {
  const over = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(over).toBeLessThanOrEqual(0);
}

/**
 * Face ID im Test: Statt eines echten Geräts liefert navigator.credentials
 * eine nachgestellte Antwort (Prüfen übernimmt im Test der nachgestellte Server).
 */
export async function fakeFaceId(page: Page, opts: { hint?: boolean } = {}) {
  await page.addInitScript((hint) => {
    if (hint) localStorage.setItem("kicktime-2028-team.faceid", "1");
    const buf = (s: string) => new TextEncoder().encode(s).buffer;
    const cred = (response: Record<string, unknown>) => ({
      id: "Y3JlZA",
      rawId: buf("cred"),
      type: "public-key",
      authenticatorAttachment: "platform",
      response,
      getClientExtensionResults: () => ({}),
    });
    Object.defineProperty(navigator, "credentials", {
      value: {
        get: async () =>
          cred({
            clientDataJSON: buf('{"type":"webauthn.get"}'),
            authenticatorData: buf("auth"),
            signature: buf("sig"),
            userHandle: buf("kicktime-team"),
          }),
        create: async () =>
          cred({
            clientDataJSON: buf('{"type":"webauthn.create"}'),
            attestationObject: buf("att"),
            getTransports: () => ["internal"],
          }),
      },
    });
  }, opts.hint ?? true);
}
