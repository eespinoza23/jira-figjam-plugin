# Jira Multi-Import for FigJam — Full Project Spec

> Last updated: 2026-04-26  
> Status: Phase 2 complete, deployed to production

---

## Vision

Beat the official Atlassian Jira widget for FigJam in every dimension:

| Capability | Official Widget | Our Plugin |
|---|---|---|
| Bulk import via JQL | ❌ (one-at-a-time) | ✅ |
| Story points on cards | ❌ | ✅ |
| Sprint grouping | ❌ | ✅ |
| Edit fields → sync back to Jira | ❌ | ✅ |
| Canvas card updates in place | ❌ | ✅ |
| PI Planning (multi-squad) | ❌ | ✅ |
| Works on Jira Cloud | ✅ | ✅ |

Primary use case: **PI Planning** — squads import sprints of issues into FigJam, move them around, edit estimates, and sync changes back to Jira without leaving the board.

---

## Architecture

### FigJam Plugin (not a Widget)

Plugin = iframe sidebar (`ui.html`) + main thread (`code.js`). This is the right choice.

**Widgets** were considered but rejected: no fetch API in widget sandbox, no OAuth, canvas editing limited to widget-defined fields. Plugins have full browser APIs in the iframe.

### File Layout

```
jira-figjam-plugin/
├── public/
│   ├── code.js          # FigJam main thread (canvas ops only)
│   ├── ui.html          # Plugin sidebar (all network calls, UI)
│   └── manifest.json    # Plugin manifest
├── api/
│   ├── jira-auth.ts     # GET  /api/jira-auth  → redirect to Atlassian OAuth
│   ├── jira-callback.ts # GET  /api/jira-callback → exchange code for tokens
│   ├── jira-connect.ts  # POST /api/jira-connect → verify code, return tokens in body
│   ├── jira-search.ts   # POST /api/jira-search  → proxy JQL to Atlassian API
│   ├── jira-update.ts   # POST /api/jira-update  → PUT field edits to Atlassian API
│   └── _atlassian.ts    # Shared: getCloudId helper
├── build.js             # Simple file-copy build (no Vite — Windows symlink issues)
└── vercel.json          # outputDirectory: dist
```

### Desktop copy (required for FigJam testing)

```
C:\Users\learn\Desktop\jira-figjam-plugin\
├── code.js
└── ui.html
```

After every change: copy files here. Restore `value="eespinoza.atlassian.net"` on instance input if needed.

---

## Critical Architecture Rules (do not violate)

### code.js — main thread
- **NO fetch, NO setTimeout, NO XMLHttpRequest** — these do not exist here
- Only allowed: Figma canvas API (`figma.createFrame()`, etc.), `figma.clientStorage`, `figma.openExternal()`, `figma.ui.postMessage()`
- **NO optional chaining `?.`** — FigJam sandbox uses old JS parser
- **NO nullish coalescing `??`** — same reason; use `||` fallbacks
- Messages IN: `window.parent.postMessage({pluginMessage:{...}}, '*')`
- Messages OUT: `figma.ui.postMessage({...})`

### ui.html — iframe sidebar
- All network calls go here (fetch to Vercel API)
- Receives plugin messages as `evt.data.pluginMessage` (not `evt.data`)
- Sends to code.js: `window.parent.postMessage({pluginMessage:{type, ...}}, '*')`
- Tokens live in memory only (`_token`, `_refresh`) — cookies don't persist in FigJam sandbox
- Pass tokens as `Authorization: Bearer <token>` header and `X-Refresh-Token: <refresh>` header
- NEVER use `credentials: 'include'` on cross-origin fetch (CORS blocks it with `Access-Control-Allow-Origin: *`)

### Auth flow
1. User clicks Connect → `send('open-external', {url: /api/jira-auth?instance=...})` → browser opens
2. Atlassian OAuth → redirects to `/api/jira-callback` → encrypted JWT in URL
3. User copies JWT code, pastes into plugin
4. `POST /api/jira-connect` with code → returns `{ok, access_token, refresh_token, instance}` in body
5. ui.html stores tokens in memory (`_token`, `_refresh`)
6. `send('save-session', {instance})` → code.js stores instance in `figma.clientStorage`
7. On re-open: `get-session` → `session-data` → show Reconnect button (tokens gone, need new OAuth)

### Token refresh
- `jira-search.ts` and `jira-update.ts` both handle 401 by refreshing via Atlassian token endpoint
- On success, response includes `new_access_token` + `new_refresh_token`
- ui.html updates `_token` and `_refresh` in memory

---

## Message Protocol

### ui.html → code.js

| type | payload | purpose |
|---|---|---|
| `get-session` | — | Read clientStorage for saved instance |
| `save-session` | `{instance}` | Store instance after OAuth |
| `clear-session` | — | Wipe clientStorage on logout |
| `open-external` | `{url}` | Open URL in browser |
| `add-to-canvas` | `{issues[], groupBy}` | Build card frames on canvas |
| `update-canvas-card` | `{key, summaryId, ptsId, statusId, dotId, assigneeId, summary?, points?, status?, assignee?}` | Update specific text nodes by ID |

### code.js → ui.html

| type | payload | purpose |
|---|---|---|
| `ready` | — | Plugin loaded, ui.html should checkAuth |
| `session-data` | `{instance}` | Response to get-session |
| `added-to-canvas` | `{count, nodeMap}` | Cards created; nodeMap = `{key: {frameId, summaryId, ptsId, statusId, dotId, assigneeId}}` |
| `canvas-error` | `{error}` | Font load or other canvas failure |
| `update-canvas-done` | `{key}` | Card text updated |
| `edit-card` | `{key}` | User clicked a card on canvas → open inline edit |

---

## Canvas Card Design (code.js buildCard)

Each card is a `figma.createFrame()` 300×130px with:
- Accent bar (4px, type color) at top
- Type + Key label (8px Bold, type color)
- Points badge top-right (blue background, "Xpt")
- Summary text (11px Regular, truncated to 100 chars)
- Separator line at y=96
- Avatar circle (18px Ellipse) with initials
- Assignee name (8px Regular)
- Status dot (6px Ellipse, status color)
- Status text (8px Regular)

`buildCard()` returns `{frameId, summaryId, ptsId, statusId, dotId, assigneeId}` — all child node IDs stored in `nodeMap[key]`.

**Grouping:** Cards laid out in 3-column grid. Groups labeled (type or sprint name). Sprint sort: active → future → backlog/closed.

**Selection change hook:** `figma.on('selectionchange')` in code.js uses `frameToKey` reverse map to detect when user clicks a canvas card → sends `edit-card` to ui.html.

---

## UI Features (ui.html)

### Issue list
- Cards in scrollable list
- Checkbox (left) for bulk selection
- Click card body → expands inline
- 📍 badge = issue has a canvas card

### Inline expand panel (per card)
- **Summary** — textarea, editable
- **Story Points** — number input, editable
- **Status** — read-only display (changing status requires Jira transition API, not field update)
- **Save & Sync** — PUT to `/api/jira-update` → updates Jira + canvas card in one action
- **Pull** — fetch this issue fresh from Jira → update local + canvas

### Toolbar
- JQL presets: Current Sprint, Next Sprint, Epics, Unplanned
- Group By toggle: Type | Sprint
- Sync All button: re-fetch all imported issues in one JQL, update all canvas cards

### Auth states
- Default: Connect button + instance input
- After OAuth: Connected badge, Disconnect button, JQL visible
- Re-open without tokens: Reconnect button (instance known from clientStorage)

---

## API Endpoints (Vercel serverless)

### POST /api/jira-search
- Auth: `Authorization: Bearer <token>` header; falls back to cookie
- Body: `{jql: string}`
- Returns: `{issues: JiraIssue[]}` (raw Jira REST format)
- On 401: refreshes token, retries, returns `new_access_token` in response
- Fields fetched: summary, issuetype, priority, assignee, status, sprint (customfield_10020), story_points (customfield_10016), labels, components, parent, fixVersions, reporter, updated

### POST /api/jira-update
- Auth: same as search
- Body: `{key: string, fields: {summary?: string, customfield_10016?: number}}`
- Returns: `{ok: true}` or `{ok: true, new_access_token, new_refresh_token}`
- Uses PUT (not PATCH) to Atlassian REST API v3

### GET /api/jira-auth
- Query: `?instance=org.atlassian.net`
- Redirects to Atlassian OAuth consent URL

### GET /api/jira-callback
- Handles OAuth redirect from Atlassian
- Exchanges code for tokens
- Encrypts tokens into JWT, redirects to show-code page

### POST /api/jira-connect
- Body: `{code: string}` (JWT from callback)
- Returns: `{ok, instance, access_token, refresh_token}`

---

## Jira Field Normalization

`normalizeIssue(raw)` in ui.html maps Jira REST API → flat display object:

| Display field | Jira REST path |
|---|---|
| `type` | `fields.issuetype.name` |
| `status` | `fields.status.name` |
| `priority` | `fields.priority.name` |
| `summary` | `fields.summary` |
| `assignee` | `fields.assignee.displayName` or `'Unassigned'` |
| `points` | `fields.customfield_10016` or `fields.story_points` |
| `sprint` | `fields.customfield_10020[0].name` |
| `sprintState` | `fields.customfield_10020[0].state` (`active`/`future`/`closed`) |

---

## Deployment

- **Vercel project:** `jira-figjam-plugin` (auto-deploy from GitHub push)
- **Production URL:** https://jira-figjam-plugin.vercel.app
- **Build:** `node build.js` (copies public/ → dist/, copies index.html to dist root)
- **Output dir:** `dist/`
- **Manifest URL:** https://jira-figjam-plugin.vercel.app/manifest.json

### Environment variables (Vercel)
- `ATLASSIAN_CLIENT_ID`
- `ATLASSIAN_CLIENT_SECRET`
- `JWT_SECRET`

---

## Phase History

### Phase 1 — Stabilize (complete)
- Deleted dead code, hardened auth
- Added token refresh pattern
- Fixed CORS (`credentials:'include'` removed)
- Replaced Vite with simple `build.js` (Windows symlink issues with npm)
- Fixed Vercel 404 (index.html missing from dist root)

### Phase 2 — Real UI + Features (complete, 2026-04-26)
- `figma.clientStorage` session persistence (instance stored, tokens in memory)
- Full Jira field normalization (`normalizeIssue`)
- Polished issue list with inline card expansion
- JQL presets (Current Sprint, Next Sprint, Epics, Unplanned)
- Group By toggle (Type / Sprint)
- Sync All (bulk re-fetch + canvas update)
- Per-card Pull (single issue refresh)
- Canvas card design: accent bar, avatar, status dot, points badge
- Selection change hook: click canvas card → auto-expand in sidebar
- Restored `jira-update.ts` endpoint

---

## Next Steps (Phase 3)

### High priority
1. **Register plugin in FigJam dev dashboard** (manual, user action)
   - Go to FigJam developer console
   - Create new plugin → point manifest to https://jira-figjam-plugin.vercel.app/manifest.json
   - Complete OAuth app registration with Atlassian
   - This gives the native "Allow access" OAuth consent flow (like official widget)

2. **Status transitions** — allow changing status via Jira Transition API
   - GET `/rest/api/3/issue/{key}/transitions` to fetch available transitions
   - POST `/rest/api/3/issue/{key}/transitions` with `{transition: {id}}`
   - Show as dropdown in inline edit panel

3. **Native OAuth** — eliminate browser redirect + code paste
   - Requires Atlassian app registration with FigJam's redirect URI
   - Shows native "Figma would like to access your Jira account" dialog

### Medium priority
4. **Sprint management** — show available sprints from Jira (GET /agile/1.0/board/{id}/sprint)
5. **Assignee picker** — dropdown from Jira users (GET /rest/api/3/users/search)
6. **Canvas card click → open Jira** — right-click menu or button on card
7. **Multi-project** — support multiple Jira projects in one session

### Nice to have
8. Card size toggle (S/M/L) — different card heights/detail levels
9. Animated card entry (staggered fadeUp)
10. Mobile tab bar for smaller viewports

---

## Known Issues / Constraints

- **Status field is read-only in edit panel** — changing status needs Jira transition API (different from field PUT), not yet implemented
- **Tokens lost on plugin re-open** — FigJam iframe memory clears; user must re-OAuth each session (instance is remembered via clientStorage, tokens are not)
- **Canvas card positions fixed** — no re-layout after import; user moves cards manually
- **figma.clientStorage fails without registered plugin ID** — wrap in try/catch; works once plugin is registered in FigJam dashboard

---

## Key Commits

| Commit | What |
|---|---|
| Phase 1 stabilize | Auth hardening, CORS fix, Vite→build.js |
| Phase 2 UI port | Full ui.html rewrite, clientStorage, normalization |
| `648878f` | Fix: copy index.html to dist root for Vercel |
| `bfbdfd2` | Sprint grouping, JQL presets, Sync All, normalization |
| `49e381c` | Fix: edit button always visible; click canvas card → edit drawer |
| `9966845` | Inline card expansion replaces separate edit drawer |
