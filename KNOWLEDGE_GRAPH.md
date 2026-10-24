# CBN Check-in — Knowledge Graph

Daily check-in gamification for the CBN fiber app: an **admin** for the CBN team, a **webview** embedded in the app, and an **API**. One Next.js 15 + Postgres repo. The design source is in `project/` (Claude Design export). It is a reference only and is not served.

## System

```mermaid
flowchart LR
  subgraph App["CBN fiber app (native, unknown stack)"]
    Home[Beranda] -->|GET /api/v1/popup| Pop[/app/popup overlay/]
    Home --> Card[/app/kartu embed/ or native card]
    Card --> Detail[/app Poin Saya/]
    Detail --> Rank[/app/peringkat/]
  end
  App -- "#token=SESSION (fragment)" --> WV[Webview pages]
  WV -- "Bearer token" --> V1[/api/v1/*/]
  V1 --> AppAuth[appAuth.ts: token → customer_id]
  AppAuth -. APP_AUTH_MODE=cbn .-> CBNAuth[(CBN auth verify URL)]
  V1 --> Svc[checkin.ts]
  Svc --> DB[(Postgres)]
  Svc --> Cust[customers.ts adapter + cache]
  Cust -. batch ids .-> CBNAPI[(CBN customer API)]
  Admin[/admin/*/] -- cookie session --> AAPI[/api/admin/*/]
  AAPI --> DB
  AAPI --> Cust
  Points[points.ts pure formula] --> Svc
  Points --> Admin
  View[view.ts pure tiles/copy] --> Svc
  View --> Admin
```

## Files → responsibility

| File | Owns |
|---|---|
| `src/lib/points.ts` | **Single source of the formula**: WIB day key, reset, multiplier tiers, level bonus, cycle/milestone, event bonus, number/time format. Pure, tested. |
| `src/lib/view.ts` | 7-tile week, "next bonus" copy, event description. Pure (shared by server and admin previews). |
| `src/lib/checkin.ts` | `getStatus`, `claim` (transaction), leaderboard, ranks. |
| `src/lib/customers.ts` | CBN customer API adapter (batch `{ids}`, field map with dot paths, API key/OAuth, timeout, in-memory cache), mock mode, segment matching. |
| `src/lib/settings.ts` | Setting key/value + defaults; rules apply **from the next reset** (`{prev,next,from}`). |
| `src/lib/validate.ts` | Server validation for rules/levels/popup/board/events. |
| `src/lib/appAuth.ts` | Session token → customer_id (mock / CBN verify). Device from `X-Device`/UA. |
| `src/lib/session.ts`, `adminAuth.ts` | HMAC admin cookie (edge-safe), roles `cs < marketing < admin`. |
| `src/lib/crypto.ts` | AES-256-GCM for API credentials, scrypt passwords. |
| `src/lib/bridge.ts` | `postToApp()` → RN / WKWebView `cbnCheckin` / Android `CbnCheckin` / Flutter / iframe. |
| `src/components/checkin.tsx` | All webview UI (port of `CheckinPhone.dc.html`) + `PhoneHome` mock for admin previews only. |
| `src/components/ui.tsx` | Admin primitives (port of the admin design's inline styles), `api()`, toast, `ImageDrop`, `useServerClock`, `useFresh`. |
| `src/components/sample.ts` | Sample status/board for admin previews, built with the same logic. |
| `src/app/admin/*` | Dashboard, Aturan Poin, Event (list/new/edit), Level, Pop-up, Peringkat, Log, Integrasi. |
| `src/app/app/*` | Webview: `/app` Poin Saya, `/app/peringkat`, `/app/popup` (transparent overlay), `/app/kartu` (Beranda card embed). |
| `prisma/schema.prisma` | Data model below. `prisma/seed.ts` admin + `--demo` data. |

## Data model

```mermaid
erDiagram
  Member ||--o{ CheckIn : has
  CheckIn ||--o{ CheckInEvent : applied
  Event ||--o{ CheckInEvent : in
  CheckIn ||--o{ PointTx : grants
  Member { string customerId PK; int streak; string lastDay; datetime lastCheckInAt }
  CheckIn { int id PK; string customerId; string day "UNIQUE(customerId,day)"; datetime at "server time"; int base; int levelBonus; int cycleBonus; int milestone; int eventBonus; int total }
  PointTx { int id PK; string customerId; datetime at; string label; int points; datetime expiresAt }
  Event { string id PK; enum type; float value; datetime start; datetime end; string windowFrom; string windowTo; int targetDays; string[] segments; bool draft }
  DailyOpen { string customerId; string day; bool dismissed }
  Setting { string key PK; json value }
  Asset { string id PK; bytes data }
  AdminUser { string email UK; enum role; string passwordHash }
```

- Only **customer_id** is stored. Names, paket, area and status come from the CBN API.
- **Balance** = sum of unexpired `PointTx`. **Lifetime** (decides the level) = sum of all `PointTx`, so expiry never lowers a level.
- **One check-in per day** is guaranteed by `UNIQUE(customerId, day)`. A race between parallel requests returns 409 (tested: 10 parallel requests → 1 success).
- An event bonus is its own `PointTx` row, which the Riwayat (history) shows as a separate line.

## Formula (from the design system, numbers still need business approval)

`base = round(basePts × tierMult(streak))` → `lb = round(base × level%)` → `+cycle if streak%7==0` → `+milestone[streak]` → events:
- `multiplier`: `+round((base+lb) × (v−1))`. Never multiplies the cycle or milestone bonus. Max ×3.
- `time_window`: `+v` when the WIB server time falls in `[from, to)`, to the second.
- `challenge`: `+v` once, on the check-in that makes the count within the period equal N.
- Max 1 non-draft event **per type** in any overlapping period. This is enforced by the server, and the form shows a "Bentrok" warning.
- Segments: OR within a dimension (area / paket / level), AND across dimensions. If the profile can't be fetched, segmented events are not applied.

## Webview ↔ app contract (for the app team)

1. The app opens `https://<host>/app#token=<session token>`. The token is in the URL fragment, so it never reaches server logs. Other pages: `/app/peringkat`, `/app/popup` (transparent overlay), `/app/kartu` (~150px card).
2. The server verifies the token at `CBN_AUTH_VERIFY_URL` (GET with Bearer token, expects `{ customer_id }`). **Needed from the CBN backend team.**
3. Before showing the popup, the app calls `GET /api/v1/popup` → `{ show, billingFirst, waitOnboarding, path }`. **Billing-first and onboarding rules must be enforced by the app**, because the webview can't see them.
4. The webview calls `postToApp(msg)`: `close`, `open {path}`, `openPopup`, `claimed {total, streak}`. The app listens on: RN `onMessage`, iOS `webkit.messageHandlers.cbnCheckin`, Android JS interface `CbnCheckin.postMessage`, or Flutter handler `cbnCheckin`.
5. Optional: `X-Device: iOS|Android` header. Without it the device is read from the user agent; in the webview, API calls are plain fetches, so the UA is the webview's own.
6. The app can render the Beranda card natively from `GET /api/v1/me` instead of embedding `/app/kartu`.

## Decisions (and why)

- **No Strapi.** Points are a money-like ledger and need transactions and unique constraints. Coupling them to the website CMS means a CMS outage or deploy stops check-ins.
- **Status/claim are server-authoritative.** Time comes from the server clock, and the client only offsets its countdown with `serverNow`.
- **Rule changes apply at the next reset.** A single day never mixes two rule sets.
- **A running event can't change type, value or start.** Points already granted have to stay explainable.
- **The KPI says "Dari user yang buka check-in"**, not "user aktif", because the app's DAU is not visible from this system.
- **Log search by name** only covers the latest 500 check-ins, because names live in the CBN API. Search by ID covers all rows.
- **The design's fake Home screen** is used only in admin previews. The real Beranda is native.

## Run

```bash
cp .env.example .env              # fill SESSION_SECRET, DATA_KEY (openssl rand -base64 32), admin seed
npm install && npx prisma migrate deploy
npm run seed                      # first admin  (add -- --demo for fake data, dev only)
npm run dev                       # /login → /admin ; webview: /app#token=30110910 (APP_AUTH_MODE=mock)
npm test                          # formula tests
```
**Minimum deploy = one variable: `DATABASE_URL`.** `SESSION_SECRET`/`DATA_KEY` fall back to keys derived from it (rotating the DB password then logs admins out and requires re-entering the integration secret). Auth mode defaults to demo (`mock`, token = customer_id) until `CBN_AUTH_VERIFY_URL` is set; the admin header shows a red **Token demo aktif** badge while demo is on. `/api/health` reports what is set and, if the Supabase pooler host is wrong, which `aws-0`/`aws-1` host works.

## Claude tooling (Claude Code Game Studios)

Installed as-is from `Donchitos/Claude-Code-Game-Studios@05ad7c8` by owner request, despite the mismatch: it targets Godot/Unity/Unreal, this repo is Next.js. Owns `.claude/` (agents, skills, 16 hooks, path-scoped rules), `CLAUDE.md`, `project.yaml`, `docs/`, `design/`, `production/`, `studio-tests/`, `src/CLAUDE.md`, `UPGRADING.md`. Not copied: upstream README/CHANGELOG/CONTRIBUTING/SECURITY and `.github/` (CODEOWNERS/FUNDING belong to upstream). License: `.claude/LICENSE-claude-code-game-studios` (MIT).
- **This file stays the source of truth** for the app; the template's `CLAUDE.md` and rules do not know this codebase.
- Hooks need `bash`, `python3` (reads `project.yaml`), optional `jq`. A commit staging data JSON is blocked without Python.
- `/setup-engine` has no Next.js option. Leave the engine unset; skip engine-specialist agents.
- Uninstall: delete the paths above and the `Claude Code Game Studios` block in `.gitignore`.
- **Plugin `universal-modder@universal-modder`** (`rehan-remade/universal-modder`, PC-game modding: recon, reverse engineering, fal assets, `um` CLI). Not vendored: `.claude/settings.json` declares the marketplace + `enabledPlugins`, so Claude Code fetches it on trust. Adds a fal MCP server (needs `FAL_KEY` or browser OAuth) and a SessionStart hook putting `um` on PATH. Unrelated to this app. Remove: drop both keys.

## Video (`video/`, Remotion)

Separate npm project scaffolded with `npx create-video@latest --yes --hello-world video` (Remotion 4.0.538). Not part of the Next app: root `tsconfig.json` excludes `video/`, own `package.json`/lockfile. Compositions: `HelloWorld`, `Logo`, `Title` (template demo, no CBN content yet).
- `cd video && npm install && npm run dev` (Studio) / `npx remotion render HelloWorld out.mp4`.
- Cloud container: Remotion's headless-shell download (`remotion.media`) is blocked; pass `--browser-executable=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`.
- **License:** free only for individuals/companies up to 3 people. CBN as a company likely needs a Remotion company license (remotion.pro/license) before production use.

## Not built / open

- **Push notifications** (event start, 3 hours before end): the flags are stored, but no sender exists, because the CBN push provider is unknown.
- **Streak Freeze** (Gold/Platinum perk): shown as text only. There are no rules yet.
- **Profile cache** is in-memory per instance. Move it to Redis when running more than 1 instance.
- **Admin users**: only seeded. There is no user-management UI. Roles are cs, marketing and admin.
- **Leaderboard / level user counts** are aggregated live. Materialize them at large scale (>1M ledger rows).
- **Waiting on CBN:** the auth verify endpoint, the customer API spec (batch support, fields, auth type), and business approval of every number.
