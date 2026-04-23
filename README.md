# Jira Multi-Import Plugin for FigJam

Import Jira issues into FigJam canvas via serverless backend. Real-time OAuth, edit locally, sync changes back to Jira.

## Phase 1: Vercel Serverless Setup ✅

**Files created:**
- `package.json` — dependencies + scripts
- `vercel.json` — Vercel config
- `api/jira-auth.ts` — OAuth login flow
- `api/jira-callback.ts` — OAuth redirect handler
- `api/jira-search.ts` — JQL search endpoint
- `api/jira-update.ts` — Sync changes back to Jira
- `tsconfig.json` — TypeScript config

## Next: Phase 2 (FigJam Plugin UI)

- Convert `jira-multi-import.html` to TypeScript
- Integrate with Vercel API endpoints
- Register plugin at figma.com/developers
- Test locally + deploy

## Environment Variables

Create `.env.local` (git-ignored):

```
ATLASSIAN_CLIENT_ID=your_id
ATLASSIAN_CLIENT_SECRET=your_secret
JIRA_INSTANCE_URL=https://intact.atlassian.net
VERCEL_URL=your-app.vercel.app
```

## Deploy to Vercel

```bash
npm install
vercel
# Follow prompts to set environment variables in dashboard
```

## Security

- Tokens stored in HTTP-only cookies (browser can't read)
- Client Secret never exposed (server-side only)
- CORS handled automatically by Vercel
