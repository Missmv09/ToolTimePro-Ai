# Task Iguana — Rebrand Documentation

**Formerly:** ToolTime Pro
**Status:** In progress on branch `claude/task-iguana-rebrand-docs-6xh501`
**Product:** AI-powered field service management (FSM) SaaS for contractors — HVAC, plumbing, electrical, landscaping, roofing, and cleaning trades.

---

## 1. Brand Identity

| Element | Value |
|---|---|
| **Product name** | Task Iguana |
| **Previous name** | ToolTime Pro |
| **Primary domain** | taskiguana.com |
| **Page title** | Task Iguana \| AI-Powered Field Service Management |
| **Meta description** | AI-powered FSM for HVAC, plumbing, electrical, landscaping, and roofing contractors. Jenny AI dispatch, Spanish language support, mobile app — starting at $49/month. |
| **Homepage hero tagline** | *Runs your whole operation — so you can run the jobs.* |
| **AI assistant** | Jenny (Lite / Pro / Exec Admin tiers) — name unchanged |

---

## 2. Logo & Icon Assets

The visual identity is an **agave / iguana crest** on a limestone field. All assets were swapped **in place** (same filenames) so no code references changed.

| Asset | File | Notes |
|---|---|---|
| PWA maskable icon (small) | `public/icons/icon-192.svg` | Agave field + limestone crest |
| PWA maskable icon (large) | `public/icons/icon-512.svg` | Agave field + limestone crest |
| Square logo | `public/logo-01262026.png` | Agave tile |
| Horizontal logo (dark headers) | `public/logo-horizontal-white-01262026.png` | On-dark lockup, teal→blue spike mark |
| Google OAuth consent logo | `public/google-oauth-logo-120x120.png` | Staged for later upload to Google |

---

## 3. Color Palette — "Electric" System

Electric teal + electric blue on near-black ink. Defined in `tailwind.config.js`. Legacy token **names** (`navy`, `gold`) were kept for backward compatibility but now map to the new brand values.

| Role | Color | Hex | Token |
|---|---|---|---|
| Brand ink (near-black) | Near-black | `#0A0C11` | `navy-500` |
| CTAs / primary action | Electric blue | `#2E9BFF` | `blue-500`, `info`, (legacy `orange-*`) |
| Highlights / accents | Electric teal | `#1FE3C4` | `teal-500`, `gold-500`, (legacy `amber-*`) |
| PWA theme / splash | Agave green | `#2F7A55` | `manifest.json` `theme_color` / `background_color` |

**Migration mechanics:**
- Global accent swap done via Tailwind token remap + a deterministic hex sweep across all pages.
- Tailwind's built-in warm palettes were overridden: `orange-*` (CTAs) → electric blue, `amber-*` (highlights) → electric teal.
- **Homepage (`src/app/page.tsx`):** full dark theme — dark sections, white text, dark cards, blue CTA buttons, teal highlights/checkmarks. Device mockups (phone, dashboard) intentionally kept light.
- **App / dashboard:** intentionally left light for now (readability in daily use).

---

## 4. Scope of the Rename

User-visible brand text was renamed across:

- The Next.js app (`src/app/**`) and React components
- Marketing pages (homepage, compare, industries, tools, blog)
- Static marketing site (`tooltimepro/`)
- PWA manifest (`public/manifest.json`)
- Transactional email templates
- i18n strings — English **and** Spanish (`messages/en/*`, `messages/es/*`)
- Wiki (`wiki/*`) and docs (`docs/*`, `README.md`, roadmaps, `CLAUDE.md`)
- Default URLs and email addresses now point at **taskiguana.com**

---

## 5. Deliberately Left Untouched

These are identifiers, historical records, or externally-coordinated names — **not** cosmetic brand text — and were intentionally **not** changed:

- **npm package name** (`tooltime-pro`) and `package-lock.json`
- Lowercase `tooltime` object keys, `TOOLTIME_CUSTOMER_FIELDS`
- `ToolTimeProOffline` (IndexedDB store name)
- `ToolTimePro/1.0` (HTTP User-Agent string)
- **GitHub repo URLs** (`Missmv09/ToolTimePro-Ai`) — coordinated rename to follow
- **`ToolTime-Shield`** wiki page name — coordinated rename to follow
- Database migrations, seed data, and sandbox demo data
- The `tooltimepro/` static site **directory name** (contents rebranded; folder name is a path identifier)

> ⚠️ These represent the follow-up backlog. The GitHub repo rename, npm package rename, IndexedDB/User-Agent identifiers, and the `ToolTime-Shield` page rename should be scheduled as a coordinated cutover to avoid breaking auth, storage, and external links.

---

## 6. Quality Gates (verified during rebrand)

Per `CLAUDE.md`, each rebrand commit was validated:

- ✅ `npm run build` — passes
- ✅ `npm test` — **539 tests pass**
- ✅ `npm run lint` — no new lint errors

---

## 7. Commit History

The rebrand landed as this sequence on the branch:

| Commit | Summary |
|---|---|
| `d575cf0` | Rebrand display name: ToolTime Pro → Task Iguana |
| `7b5ee66` | Replace brand logo/icon assets with Task Iguana crest |
| `198cd36` | Apply Task Iguana electric palette + dark homepage |
| `998790f` | Set homepage hero tagline: *Runs your whole operation — so you can run the jobs* |
| `6168355` | Add "Built for your trade" photo section to homepage |
| `d4f6544` / `5d2d928` | Add trade photos (cleaning, roofing, + all 8 trades) |
| `6af0849` | Dark theme + electric palette across marketing pages + real logo mark |
| `17db81c` | Fix dark-on-dark hero headlines on tools + blog pages |

---

## 8. Follow-up Checklist

- [ ] Rename GitHub repo `Missmv09/ToolTimePro-Ai` → coordinate URL updates
- [ ] Rename npm package `tooltime-pro` (verify no external consumers)
- [ ] Migrate IndexedDB store `ToolTimeProOffline` (needs data-migration path)
- [ ] Update User-Agent string `ToolTimePro/1.0`
- [ ] Rename wiki page `ToolTime-Shield`
- [ ] Upload `google-oauth-logo-120x120.png` to Google OAuth consent screen
- [ ] Point production DNS / Netlify at `taskiguana.com`
- [ ] Update Stripe product/branding + customer-facing receipts
