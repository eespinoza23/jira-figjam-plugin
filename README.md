# Jira Multi-Import for FigJam

A powerful FigJam plugin that seamlessly imports Jira issues with real-time OAuth authentication, local editing, and bidirectional sync back to Jira.

## Features

✅ **OAuth 2.0 Authentication** — Secure Jira login via Atlassian OAuth  
✅ **JQL Search** — Query any Jira project using standard JQL syntax  
✅ **Batch Import** — Select multiple issues and import to FigJam canvas as stickies  
✅ **Live Sync** — Fetch fresh data from Jira and detect local changes  
✅ **Edit & Update** — Modify issue fields (status, assignee, points, priority) and sync changes back to Jira  
✅ **Diff Detection** — Visual indicators show which issues have unsaved local changes  
✅ **Timestamp Tracking** — Know when each issue was last synced from Jira  

## Quick Start

### Prerequisites
- Node.js 18+
- Vercel account (for backend)
- Atlassian developer account (for OAuth credentials)

### Local Development

```bash
# Clone and install
git clone <your-repo>
cd jira-figjam-plugin
npm install

# Set environment variables
cp .env.example .env.local
# Edit with: ATLASSIAN_CLIENT_ID, ATLASSIAN_CLIENT_SECRET, JIRA_INSTANCE_URL

# Start dev server
npm run dev
# Opens plugin UI at http://localhost:3000 with backend at http://localhost:3001
```

### Production Deployment

See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for step-by-step guide:

```bash
npm run build      # Build plugin (dist/)
npm run deploy     # Deploy backend to Vercel
# Then register plugin with Figma at https://figma.com/developers
```

## Architecture

**Backend (Vercel):**
- OAuth flow → stores refresh token in HTTP-only cookie
- JQL search proxy → calls Jira REST API
- Issue update proxy → syncs changes back to Jira

**Frontend (React):**
- Auth flow with cookie-based tokens (XSS-safe)
- JQL panel with search + results list
- Canvas grid with issue cards
- Edit drawer for field modification
- Diff detection with visual indicators

**FigJam Integration:**
- Plugin manifest declares editorType: figjam
- Creates stickies on canvas for each imported issue
- Listeners for selection-based smart placement

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/jira-auth` | GET | Initiate OAuth login |
| `/api/jira-callback` | GET | OAuth redirect handler |
| `/api/jira-search` | POST | Search by JQL query |
| `/api/jira-search?key=X` | GET | Fetch single issue |
| `/api/jira-update` | PUT | Update issue fields |

## File Structure

```
├── api/                    # Vercel serverless functions
│   ├── jira-auth.ts       # OAuth initialization
│   ├── jira-callback.ts   # OAuth handler
│   ├── jira-search.ts     # JQL proxy
│   └── jira-update.ts     # Update proxy
├── plugin/                # React frontend
│   ├── main.tsx           # Root component
│   ├── api.ts             # Fetch wrapper
│   ├── mapper.ts          # Response normalizer
│   ├── figjam.ts          # FigJam API integration
│   └── components/
│       ├── Card.tsx       # Issue card
│       └── Drawer.tsx     # Edit form
├── index.html             # Entry point
├── figma.manifest.json    # FigJam declaration
├── vite.config.ts         # Build config
└── DEPLOYMENT_CHECKLIST.md # Pre-launch guide
```

## Security

- **Token Storage:** HTTP-only cookies (XSS-safe)
- **No Exposed Secrets:** All credentials in env vars
- **API Proxy:** Jira calls routed through backend
- **CSRF Protection:** Cookies sent automatically

## Development

```bash
npm run dev          # Start dev server (plugin + backend)
npm run build        # Build for production
npm run preview      # Preview built plugin
```

Changes hot-reload automatically in dev mode.

## Testing

Comprehensive QA tests in [QA_TESTS.md](./QA_TESTS.md):
- OAuth flow validation
- JQL parsing edge cases
- Concurrent edits and conflict detection
- Network failure recovery
- Cross-browser compatibility

## Support

- **Issues:** GitHub Issues
- **Questions:** GitHub Discussions
- **Feedback:** eespinoza23@pm.me
