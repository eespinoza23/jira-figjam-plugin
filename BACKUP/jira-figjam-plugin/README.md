# Jira Multi-Import for FigJam

A FigJam **widget** that imports Jira issues as live, collaborative cards on the canvas — designed for PI Planning with multiple squads.

## Features

✅ **Widget Architecture** — Cards are live canvas objects visible to all collaborators  
✅ **OAuth 2.0 Authentication** — Secure Jira login via Atlassian OAuth + verification code  
✅ **JQL Search** — Query any Jira project with preset buttons or custom JQL  
✅ **Batch Import** — Select multiple issues, place as a 4-column grid  
✅ **Live Sync** — Refresh any card from Jira with one click  
✅ **Edit & Update** — Modify summary and story points, push back to Jira  
✅ **Expand/Collapse** — Compact mode (key, status, points, assignee) or expanded (all fields)  
✅ **Open in Jira** — Jump to any issue in your browser  

## Quick Start

### Prerequisites
- Node.js 18+
- [Figma Desktop](https://www.figma.com/downloads/) (widgets require the desktop app)
- Vercel account (for backend)
- Atlassian developer account (for OAuth credentials)

### Local Development

```bash
git clone https://github.com/eespinoza23/jira-figjam-plugin.git
cd jira-figjam-plugin
npm install

# Set environment variables
cp .env.example .env.local
# Edit with: ATLASSIAN_CLIENT_ID, ATLASSIAN_CLIENT_SECRET, JIRA_INSTANCE_URL

# Build the widget
npm run build

# Start backend dev server (for API endpoints)
npm run dev
```

Then in Figma Desktop:
1. Go to **Plugins → Development → Import plugin from manifest...**
2. Select the `manifest.json` in this repo
3. Open a FigJam board → **Widgets → Development → Jira Multi-Import**

### Production Deployment

```bash
npm run build          # Build widget (dist/code.js + dist/index.html)
vercel --prod          # Deploy backend to Vercel
# Register widget at https://www.figma.com/developers
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│  FigJam Canvas                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Widget   │ │ Widget   │ │ Widget   │  ...    │
│  │ Card     │ │ Card     │ │ Card     │        │
│  │(synced)  │ │(synced)  │ │(synced)  │        │
│  └──────────┘ └──────────┘ └──────────┘        │
│       ↕ useSyncedState (all collaborators)      │
│  ┌──────────────────────────────────────┐       │
│  │  Iframe UI (search / edit)           │       │
│  │  postMessage ↔ widget code           │       │
│  └──────────────────────────────────────┘       │
└─────────────────────────────────────────────────┘
         │ fetch() with Bearer token
         ↓
┌─────────────────────────────────────────────────┐
│  Vercel Backend                                 │
│  /api/jira-auth     → OAuth 2.0 (3LO)          │
│  /api/jira-callback → Token exchange + code     │
│  /api/jira-connect  → Verify code → set tokens  │
│  /api/jira-search   → JQL proxy                 │
│  /api/jira-update   → Issue field update         │
└─────────────────────────────────────────────────┘
         │
         ↓
   Atlassian Cloud API (api.atlassian.com)
```

**Widget (code.tsx):** Renders issue cards using Figma Widget API (`useSyncedState`, `usePropertyMenu`, `cloneWidget`). Each card is an independent widget instance.

**Iframe UI (index.html):** Search panel (JQL presets, results with checkboxes, select all) and edit panel (summary, story points). Communicates with widget via `postMessage`.

**Backend (api/):** Vercel serverless functions. OAuth flow produces a signed verification code; tokens stored in `figma.clientStorage` (not cookies — iframe sandbox blocks them).

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/jira-auth` | GET | Initiate OAuth login |
| `/api/jira-callback` | GET | OAuth redirect → verification code page |
| `/api/jira-connect` | POST | Verify code → return tokens |
| `/api/jira-search` | POST | JQL search (Bearer token) |
| `/api/jira-update` | POST | Update issue fields (Bearer token) |

## File Structure

```
├── widget-src/
│   └── code.tsx           # Widget component (JiraIssueCard)
├── ui-src/
│   └── index.html         # Iframe UI (search + edit)
├── api/                   # Vercel serverless functions
│   ├── _atlassian.ts      # Cloud ID helper
│   ├── jira-auth.ts       # OAuth initialization
│   ├── jira-callback.ts   # OAuth callback + verification code
│   ├── jira-connect.ts    # Verify code + return tokens
│   ├── jira-search.ts     # JQL search proxy
│   └── jira-update.ts     # Issue update proxy
├── dist/                  # Build output (gitignored)
│   ├── code.js            # Widget bundle (esbuild)
│   └── index.html         # UI bundle (vite singlefile)
├── manifest.json          # Figma widget manifest
├── package.json           # Dependencies + build scripts
├── vite.config.ts         # Vite config for UI
└── vercel.json            # Vercel routing config
```

## Security

- **Token Storage:** `figma.clientStorage` (per-user, sandboxed)
- **Verification Codes:** HMAC-signed, 5-minute expiry
- **API Proxy:** All Jira calls routed through Vercel backend
- **No Exposed Secrets:** OAuth credentials only in env vars

## Development

```bash
npm run build            # Build widget + UI
npm run build:widget     # Build widget only (esbuild)
npm run build:ui         # Build UI only (vite)
npm run dev              # Backend dev server (vercel dev)
```

## Support

- **Issues:** [GitHub Issues](https://github.com/eespinoza23/jira-figjam-plugin/issues)
- **Contact:** eespinoza23@pm.me
