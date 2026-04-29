# Deployment Checklist — Jira Multi-Import for FigJam

## Pre-Deployment

- [ ] Verify all code is committed to GitHub
- [ ] Run `npm run build` successfully
- [ ] Test locally: `npm run dev` → http://localhost:3000
  - [ ] Login with Jira OAuth
  - [ ] Execute JQL search (e.g., "project = CRT")
  - [ ] Import issues to canvas
  - [ ] Edit issue fields in drawer
  - [ ] Sync updates back to Jira
- [ ] Verify environment variables are set in Vercel:
  - [ ] ATLASSIAN_CLIENT_ID
  - [ ] ATLASSIAN_CLIENT_SECRET
  - [ ] JIRA_INSTANCE_URL
  - [ ] VERCEL_URL (auto-set by Vercel)

## Vercel Backend Deployment

Backend is already deployed from Phase 1. Verify it's live:

```bash
# Check backend is running
curl https://<VERCEL_URL>/api/jira-search \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jql":"project = CRT AND maxResults=0"}' \
  -H "Cookie: jira_token=<valid_token>"
```

Expected response: `200` with empty issues array (or Jira error if not authenticated).

## Plugin Deployment to Figma

### Option 1: Distribution URL (For Testing)

Build the plugin and serve from a public URL:

```bash
npm run build

# Upload dist/ folder to a static host (GitHub Pages, Netlify, etc.)
# Share plugin URL: https://your-domain.com/dist/index.html
```

Users can then:
1. Open FigJam
2. Go to **Resources → Plugins → Development**
3. Paste manifest URL: `https://your-domain.com/figma.manifest.json`

### Option 2: Figma Marketplace (For Production)

1. **Create Figma Developer Account**
   - Go to https://figma.com/developers
   - Sign in with your Figma account
   - Create a new plugin

2. **Register Plugin Details**
   - Name: "Jira Multi-Import"
   - Description: "Import Jira issues into FigJam with real-time OAuth, local editing, and sync back to Jira"
   - Icon: Create a 300x300px icon (Jira + FigJam logo mashup)
   - Category: Productivity / Integrations

3. **Configure Plugin Manifest**
   - Host `figma.manifest.json` and `dist/` folder on static server
   - Point Figma to: `https://your-domain.com/figma.manifest.json`

4. **Submit for Review**
   - Figma will test plugin in sandbox
   - Expected review time: 3-5 business days

## Post-Deployment Testing

### Smoke Test (5 min)

1. Install plugin in FigJam
2. Create new FigJam file
3. Open Jira Multi-Import plugin
4. Click "Connect Jira" → complete OAuth
5. Run JQL query: `project = <YOUR_PROJECT>`
6. Select 3 issues → "Import"
7. Verify stickies appear on canvas with correct content
8. Click "↻ Sync" on one sticky → verify timestamp updates
9. Click "✎ Edit" on one sticky → change status → "Save & Sync"
10. Verify change appears in Jira

### Extended QA (1-2 hours)

See `QA_TESTS.md` for comprehensive test plan.

## Rollback Plan

If plugin breaks after deployment:

1. **For Distribution URL:** Replace `dist/` folder with previous version
2. **For Marketplace:** Figma will revert to previously approved version on request

## Environment Variables (Vercel)

Set in Vercel project settings:

```
ATLASSIAN_CLIENT_ID=<your-client-id>
ATLASSIAN_CLIENT_SECRET=<your-client-secret>
JIRA_INSTANCE_URL=intact.atlassian.net
```

Note: `VERCEL_URL` is auto-set by Vercel and used for OAuth callback.

## Troubleshooting

### Plugin won't load in FigJam
- Check `figma.manifest.json` is valid JSON
- Verify `dist/index.html` is being served
- Check browser console for CORS errors
- Ensure `editorType: ["figjam"]` in manifest

### OAuth redirect fails
- Verify `VERCEL_URL` matches authorized redirect URI in Atlassian
- Check `ATLASSIAN_CLIENT_ID` and `ATLASSIAN_CLIENT_SECRET` are correct
- Ensure cookies are being set: check `Set-Cookie` header in response

### Jira search returns empty
- Verify JQL syntax is correct
- Ensure user has permission to view issues in that project
- Check Jira instance URL matches `JIRA_INSTANCE_URL`

### Changes don't sync back to Jira
- Verify `updateIssueInJira()` API call succeeds (check network tab)
- Ensure token is still valid (re-auth if expired)
- Check Jira field names match update payload

## Deployment Script (Optional)

```bash
#!/bin/bash

echo "Building plugin..."
npm run build || exit 1

echo "Deploying to Vercel..."
npm run deploy || exit 1

echo "✓ Plugin built and deployed!"
echo "Next steps:"
echo "  1. Visit https://figma.com/developers to register plugin"
echo "  2. Upload manifest: <VERCEL_URL>/figma.manifest.json"
echo "  3. Run smoke test in FigJam"
```

## Support & Docs

- **Plugin Issues:** Check browser console → Figma dev tools
- **OAuth Issues:** Check Vercel function logs → `vercel logs`
- **Jira API Issues:** Reference https://developer.atlassian.com/cloud/jira/rest/v3/
