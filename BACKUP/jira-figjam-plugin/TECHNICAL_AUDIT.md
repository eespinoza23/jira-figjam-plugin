# Jira Multi-Import for FigJam — Technical Audit

**Date:** 2026-04-25
**Reviewer:** Architecture pre-flight check before launch
**Verdict:** ⚠️ **NOT READY FOR REGISTRATION** — Significant cleanup required before this can be the "best app out there."

---

## Executive Summary

This codebase contains **two distinct, incompatible plugin implementations** living side-by-side, with build pipelines that don't match the deployment target. The version currently deployed to Vercel (vanilla JS in `/public/`) has only ~20% of the features visible in the polished demo HTML (`jira-multi-import.html`). Before registering with FigJam, we need to make a **single explicit architectural decision** and consolidate.

**Three blocking issues, eight high-priority issues, twelve cleanup items.** Detailed below.

---

## Part 1 — Inventory: What's Actually in This Repo

### 1.1 Plugin Implementations (TWO exist)

| Implementation | Location | Stack | Status | Features |
|----------------|----------|-------|--------|----------|
| **A. Vanilla JS (NEW)** | `public/code.js`, `public/ui.html` | Plain JS, no build | ✅ Deployed to Vercel | Auth, JQL search, basic sticky on canvas |
| **B. React (LEGACY)** | `plugin/*.ts`, `index.html` | React + Vite + TS | ❌ Not deployed | Mapper, types, full data model |
| **C. Standalone HTML (DEMO)** | `jira-multi-import.html` | Vanilla JS, mock data | ❌ Not deployed | The polished UI everyone wants — cards, drawers, sprint filters, edit forms, diff highlighting |

### 1.2 Manifest Files (TWO conflict)

| File | Content | Issues |
|------|---------|--------|
| `/manifest.json` (root) | `editorType:"figjam"`, `main` and `ui` point to correct file URLs, `permissions:["figjam:read","figjam:write"]`, `documentAccess:"dynamic-page"` | ✅ Correct (this is what gets served) |
| `/public/manifest.json` | `editorType:"figJam"` (wrong case), `main` missing the file path, missing `ui` field, `documentAccess:"owner"` (invalid) | ❌ Broken — same bugs already noted in primer |
| `/figma.manifest.json` | Points to `dist/index.html`, references React build | ❌ Legacy — references retired build path |

**Risk:** Vite's `copy-manifest` plugin copies root `manifest.json` to `dist/manifest.json` AFTER `public/manifest.json` is auto-copied. Order should make root win, but race conditions across deploys are dangerous.

### 1.3 API Endpoints (12 — at Vercel Hobby ceiling)

| File | Purpose | Used by deployed plugin? |
|------|---------|--------------------------|
| `jira-auth.ts` | OAuth start (redirect to Atlassian) | ✅ |
| `jira-callback.ts` | OAuth callback → verification code | ✅ |
| `jira-connect.ts` | GET status / POST verify code | ✅ |
| `jira-search.ts` | JQL search via Jira REST | ✅ |
| `jira-update.ts` | Update issue in Jira | ❌ (legacy plugin only) |
| `jira-issue.ts` | Single issue fetch | ❌ |
| `jira-fields.ts` | Field metadata | ❌ |
| `jira-users.ts` | User picker source | ❌ |
| `jira-me.ts` | Current user | ❌ |
| `jira-issue-types.ts` | Issue type metadata | ❌ |
| `jira-sprints.ts` | Sprint list | ❌ |
| `jira-logout.ts` | Clear session cookies | ❌ |
| `_atlassian.ts` | Helper (getCloudId) | ✅ used by jira-search |

**8 of 12 endpoints are dead code** for the deployed plugin. We're at the function ceiling without using two-thirds of them.

### 1.4 Configuration & Build

| File | Purpose | Status |
|------|---------|--------|
| `vercel.json` | Build config, output to `dist/` | ✅ Clean (already cleared of bad runtime/env) |
| `vite.config.ts` | React + Vite + custom copy-manifest plugin | ⚠️ Builds React app that isn't deployed |
| `package.json` | React, Vite, Express, Axios | ⚠️ Mixed deps (React unused in production) |
| `index.html` | Mounts React app at `/plugin/main.tsx` | ❌ References `plugin/main.tsx` which doesn't exist |
| `vercel-jira-handler.ts` (root) | Unknown | ❌ Stray file at root, unused |

---

## Part 2 — Critical Issues (BLOCKERS)

### 🔴 BLOCKER 1: Architectural Schism

**Problem:** The repo simultaneously claims to be a React/Vite app (per `package.json`, `vite.config.ts`, `index.html`, `plugin/`) AND a vanilla-JS static site (per `public/`, deployed manifest). There is no single source of truth.

**Why it matters:** Future changes to one will silently not affect the other. Adding the polished UI from `jira-multi-import.html` will require knowing which path to put it in. Onboarding any helper (or future-you) is a coin flip.

**Decision required:** Pick ONE.
- **Option A:** Strip down to vanilla JS in `/public/`. Delete `plugin/`, `index.html`, React deps, vite. Simpler, smaller, faster cold-starts.
- **Option B:** Commit to React+Vite. Move `public/code.js` and `public/ui.html` into `plugin/`. Delete `/public/` shortcuts. Heavier, but the rich UI from `jira-multi-import.html` ports more easily.
- **Option C:** Hybrid — vanilla JS for `code.js` (FigJam main thread, must be plain JS anyway), React for `ui.html` (the iframe sidebar). This is actually the cleanest split.

**Recommendation:** **Option C.** FigJam's main thread (`code.js`) does not support React; it must be plain JS. The UI sidebar (`ui.html`) is a regular iframe and benefits from React for the rich card grid + drawer + filtering UX from the demo HTML. This is the FigJam-canonical pattern.

### 🔴 BLOCKER 2: Deployed UI Has Almost None of the Promised Features

**Problem:** What's currently live (`public/ui.html`) is a 3-section auth flow with a single textarea and basic search results. The polished UX from `jira-multi-import.html` (cards, edit drawers, field config, sprint filters, diff highlighting, type filtering, mobile tabs) **is not deployed**.

**Why it matters:** Registering this with FigJam now means shipping the bare-bones version as v1. Users who try it will see a primitive search box and ask "this is it?" The polished demo page is what we should be deploying.

**Decision required:** Bring the demo HTML's UI to production. This is the core "make it work as expected" gap. The demo has mock data; real version needs to wire its UI to `/api/jira-search` (and other endpoints).

### 🔴 BLOCKER 3: At Vercel Hobby Function Ceiling With No Headroom

**Problem:** 12 API files = exactly the Hobby plan limit. Any new endpoint (e.g., a webhook for live sync, an OAuth refresh handler, a healthcheck) will hit the wall again.

**Why it matters:** We just cleaned this up by merging `jira-status` into `jira-connect`. Doing it again under deadline pressure is fragile.

**Decision required:**
1. **Delete the 8 unused endpoints now** (jira-update, jira-issue, jira-fields, jira-users, jira-me, jira-issue-types, jira-sprints, jira-logout) → frees 8 slots. OR
2. **Consolidate into a single dispatcher endpoint** (`/api/jira/[action].ts` Next.js-style or `/api/jira.ts` with `?action=` param) → 1 slot for many operations. OR
3. **Upgrade to Vercel Pro** if we want the legacy endpoints back when wiring up the rich UI.

**Recommendation:** Option 1 — delete the dead code now. Then if we add features, design intentionally with a dispatcher pattern (#2) to stay efficient.

---

## Part 3 — High-Priority Issues

### 🟠 H1: Custom Verification Code Pattern (Security & UX)

**What:** OAuth callback (`jira-callback.ts`) generates a base64url payload + 8-char HMAC signature, displays it in the browser, user copy-pastes into FigJam plugin sidebar. This bypasses the cookie-sandbox issue but introduces fragility.

**Risks:**
- Payload includes raw `access_token` and `refresh_token` in URL-displayed text. If user pastes into wrong field (e.g., chat, email), tokens leak.
- 8-char HMAC truncation reduces signature strength to 48 bits. Replay window is 5 min, so practically OK, but cryptographically weak.
- HMAC fallback secret (`'fallback'`) if env var missing — silent degradation to no-security mode.

**Fix:**
- Make `ATLASSIAN_CLIENT_SECRET` a hard requirement; throw if missing instead of fallback.
- Use full HMAC (no truncation) — saves no real space, doubles security.
- Consider one-time-use codes (mark used in a KV store) instead of time-limited.
- UI: warn user prominently "Do not paste this anywhere except FigJam."

### 🟠 H2: Cookie-Based Auth in Iframe Will Eventually Break

**What:** The plugin uses `SameSite=None; Secure` cookies for `access_token`, `refresh_token`, `jira_instance`, `oauth_state`, `cloud_id`. Modern browsers (Chrome especially) are progressively restricting third-party cookies in iframes.

**Risks:** Plugin is hosted at `jira-figjam-plugin.vercel.app`, loaded into FigJam at `figma.com`. Any third-party cookie crackdown breaks auth silently for some/all users.

**Fix Options:**
- **Short-term:** Storage Access API (`document.requestStorageAccess()`) prompt before auth flow.
- **Medium-term:** Move tokens to FigJam's `figma.clientStorage` (encrypted at rest, plugin-scoped). Tokens never leave plugin context.
- **Long-term:** Use Atlassian Connect or token-bound sessions instead of cookies.

**Recommendation:** Move to `figma.clientStorage` in `code.js` — that's the canonical FigJam pattern. UI iframe sends "save these tokens" message to main thread, which stores them, and proxies authenticated requests back. Eliminates the cookie problem entirely.

### 🟠 H3: No Token Refresh Logic

**What:** `jira-callback.ts` stores `refresh_token` in cookie but nothing ever uses it. When `access_token` expires (1 hour for Atlassian), users get 401 and have to re-auth from scratch.

**Fix:** Add refresh logic in `jira-search.ts` (and any future protected endpoint): on 401, attempt refresh with stored refresh_token, retry once. Update both cookies. Never expose refresh logic to client.

### 🟠 H4: No Error Surfacing in UI

**What:** `ui.html`'s error display is a 4-second auto-hiding banner. Network failures, OAuth errors, expired tokens, malformed JQL all show the same generic "Search failed: [message]" toast.

**Fix:** 
- Persistent error region (don't auto-hide network/auth errors)
- Distinct UI states for: no results, network error, auth required, malformed JQL, server error
- Surface Jira's own error response (it returns useful messages like "JQL parse error at line 1 column 5")

### 🟠 H5: No Loading States on Async Actions

**What:** Click "Search" → button just sits there. Click "Add to canvas" → silent until success message. No spinner, no "Searching..." text, no disabled-button-during-request.

**Fix:** Standard async pattern — disable buttons, show spinner or progress text, restore on completion. The demo HTML actually does this correctly (`exec-btn` shows "⟳ Fetching…" with spin animation). Port that pattern.

### 🟠 H6: Hardcoded Production URLs Throughout

**What:** `public/code.js` and `public/ui.html` both hardcode `https://jira-figjam-plugin.vercel.app/api/...`. Local development requires manually swapping URLs.

**Fix:**
- Inject API base URL at build time via `__API_BASE__` global (Vite define option)
- For UI: derive base from `window.location.origin` since UI is served from same host as API
- For code.js: still need an env-aware URL since it runs in FigJam sandbox; use a build-time constant

### 🟠 H7: No Input Validation Beyond Instance URL

**What:** JQL is sent to Jira as-is. No length limit, no syntax pre-check, no rate limiting on the proxy endpoint.

**Risks:**
- Pathological JQL could hit Jira's per-app rate limit (10 req/sec per user) and lock out the user.
- No app-side rate limiting means a bad actor with a token could hammer the proxy.

**Fix:**
- Add request rate limiting on `jira-search.ts` (e.g., 10 req/min per token, in-memory or via Vercel KV)
- Truncate JQL to reasonable length (e.g., 4000 chars)
- Validate `maxResults` parameter — currently hardcoded 100, should be configurable but capped

### 🟠 H8: Two-Manifest Bug Will Bite Again

**What:** `public/manifest.json` still exists with broken content. If someone (or a tool) ever invalidates root `manifest.json` or the Vite copy plugin fails silently, FigJam reads the broken one.

**Fix:** Delete `public/manifest.json` immediately. Single source of truth at root. Verify build output includes only the correct one.

---

## Part 4 — Cleanup Items (Lower Priority)

| # | Item | Action |
|---|------|--------|
| C1 | Delete `figma.manifest.json` | Stale, references retired build |
| C2 | Delete `vercel-jira-handler.ts` (root) | Unknown purpose, stray file |
| C3 | Delete `index.html` (root) | References non-existent `/plugin/main.tsx` |
| C4 | Delete `plugin/auth.ts` | Conflicts with cookie-based auth model |
| C5 | Delete React deps if going Option A | `react`, `react-dom`, `@vitejs/plugin-react`, `@types/react*` |
| C6 | Move `jira-multi-import.html` features into `public/ui.html` | This is the actual UX target |
| C7 | Add an example file documenting required environment variables | `ATLASSIAN_CLIENT_ID`, `ATLASSIAN_CLIENT_SECRET`, `APP_URL`, `JIRA_INSTANCE_URL` |
| C8 | Add JSDoc to `code.js` message handlers | Each `msg.type` should have brief contract |
| C9 | Pin Node version in `package.json` | Add `"engines": {"node": "20.x"}` |
| C10 | Add basic README with architecture diagram | Currently no developer onboarding doc |
| C11 | Add `.gitignore` entry for `.vercel/` | Currently committed (project ID is fine, but pattern is bad) |
| C12 | Run TypeScript check on api/ folder | Several endpoints have implicit any in axios responses |

---

## Part 5 — Risk Assessment

### What works today (verified)
- ✅ OAuth flow completes end-to-end (per latest session: console showed "Auth successful")
- ✅ Verification code transfer pattern works
- ✅ JQL search returns results
- ✅ Sticky note creation works on canvas
- ✅ Vercel deployment is stable

### What's untested
- ⚠️ Plugin behavior in actual FigJam (only tested via direct browser access)
- ⚠️ Token refresh on expiry (not implemented at all)
- ⚠️ Behavior with large result sets (>50 issues)
- ⚠️ Behavior with no results / malformed JQL
- ⚠️ Cross-browser (only Chrome implied from session)
- ⚠️ Mobile FigJam (does the plugin even work there?)

### Production risks if registered as-is
1. Users see a barebones UI vs. the polished demo → reputational damage
2. Token expires after 1 hour, user can't re-auth without restarting flow → support tickets
3. Cookie restrictions in 2026 Chrome could break auth silently → mass user breakage
4. No telemetry / error tracking → can't debug user issues

---

## Part 6 — Recommended Path Forward

### Phase 1 — Stabilize (no new features, ~1 session)
1. ✅ **Decide:** Architecture (Option A/B/C from Blocker 1). I recommend **C: vanilla JS for `code.js`, React for `ui.html`**.
2. ✅ **Delete dead code:** 8 unused API endpoints, `figma.manifest.json`, `index.html` (root), `vercel-jira-handler.ts`, `plugin/auth.ts`, `public/manifest.json`.
3. ✅ **Hardenings:** Make `ATLASSIAN_CLIENT_SECRET` required (no fallback), full HMAC (no truncation), surface Jira errors.
4. ✅ **Add token refresh** in `jira-search.ts`.
5. ✅ **Move tokens to `figma.clientStorage`** (eliminate cookie risk).
6. ✅ **Add example variables file, README, architecture diagram.**

### Phase 2 — Bring the Real UI (~2-3 sessions)
1. Port `jira-multi-import.html` UI into `ui.html` (or React component if going Option B/C).
2. Wire mock data to actual `/api/jira-search`.
3. Add field config persistence in `figma.clientStorage`.
4. Add card/drawer pattern with edit + sync-to-Jira flow (requires reviving `jira-update.ts`).
5. Add sprint filtering, type filtering, diff highlighting.
6. Add loading states everywhere.

### Phase 3 — Ship & Polish (~1 session)
1. Register in FigJam dev dashboard.
2. End-to-end test in actual FigJam (not browser).
3. Add basic telemetry (Vercel Analytics or Plausible).
4. Document user-facing setup (Atlassian app creation, OAuth scopes).
5. Submit to FigJam community.

### Total estimate: 4-5 focused sessions to get to "best app out there."

---

## Part 7 — Decisions Required From You

Before any code is written, I need answers to these:

1. **Architecture (Blocker 1):** A / B / **C** (recommended)?
2. **Function ceiling (Blocker 3):** Delete unused now / consolidate into dispatcher / upgrade to Vercel Pro?
3. **Polished UI (Blocker 2):** Yes, port `jira-multi-import.html` features → production? (I assume yes)
4. **Auth storage:** Migrate to `figma.clientStorage` (recommended) or keep cookies?
5. **Scope of v1 launch:** Minimum viable (search + add to canvas) OR full polish (cards/drawers/edit/sync)?
6. **Timeline:** Phased (Stabilize → UI → Ship) or single sprint?

---

## Final Note

The current deployed version "works" in the narrow sense that auth + search + sticky-creation function. But it's nowhere near "best app out there" — it's a working prototype. The good news: the demo HTML proves you already designed the right UX. The work is connecting the polished demo to the working backend, plus the hardenings above.

Recommend: review this doc, answer the 6 decisions, then we plan Phase 1 in detail.
