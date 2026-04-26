figma.showUI(__html__, { width: 360, height: 600 });

let _accessToken = null;

figma.ui.onmessage = async (msg) => {
  // Session management
  if (msg.type === 'check-auth') {
    try {
      let session = null;
      try { session = await figma.clientStorage.getAsync('session'); } catch (_) {}
      const response = await fetch('https://jira-figjam-plugin.vercel.app/api/jira-connect', {
        method: 'GET',
        credentials: 'include',
      });
      const authenticated = response.ok;
      figma.ui.postMessage({
        type: 'auth-checked',
        authenticated,
        instance: session && session.instance || null,
      });
    } catch (err) {
      figma.ui.postMessage({ type: 'auth-checked', authenticated: false, instance: null });
    }
  }

  if (msg.type === 'save-session') {
    try { await figma.clientStorage.setAsync('session', { instance: msg.instance, authenticated: true }); } catch (_) {}
    figma.ui.postMessage({ type: 'session-saved' });
  }

  if (msg.type === 'clear-session') {
    try { await figma.clientStorage.removeAsync('session'); } catch (_) {}
    figma.ui.postMessage({ type: 'session-cleared' });
  }

  // External links
  if (msg.type === 'open-external') {
    figma.openExternal(msg.url);
  }

  // OAuth flow
  if (msg.type === 'verify-code') {
    try {
      const response = await fetch('https://jira-figjam-plugin.vercel.app/api/jira-connect', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: msg.code }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Code verification failed (status ' + response.status + ')');
      _accessToken = data.access_token;
      try { await figma.clientStorage.setAsync('session', { instance: data.instance, authenticated: true }); } catch (_) {}
      figma.ui.postMessage({ type: 'authenticated', instance: data.instance });
    } catch (err) {
      figma.ui.postMessage({ type: 'auth-error', error: err.message || String(err) });
    }
  }

  // Search
  if (msg.type === 'search-jira') {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (_accessToken) headers['Authorization'] = 'Bearer ' + _accessToken;
      const response = await fetch('https://jira-figjam-plugin.vercel.app/api/jira-search', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ jql: msg.jql }),
      });

      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      figma.ui.postMessage({ type: 'search-results', issues: data.issues });
    } catch (err) {
      figma.ui.postMessage({ type: 'search-error', error: err.message });
    }
  }

  // Sync single issue
  if (msg.type === 'sync-issue') {
    try {
      const response = await fetch('https://jira-figjam-plugin.vercel.app/api/jira-search', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jql: `key = ${msg.key}` }),
      });

      if (!response.ok) throw new Error('Sync failed');
      const data = await response.json();
      const issue = data.issues && data.issues[0];
      figma.ui.postMessage({ type: 'sync-result', key: msg.key, issue });
    } catch (err) {
      figma.ui.postMessage({ type: 'sync-error', key: msg.key, error: err.message });
    }
  }

  // Update issue
  if (msg.type === 'update-issue') {
    try {
      const response = await fetch('https://jira-figjam-plugin.vercel.app/api/jira-update', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: msg.key, fields: msg.fields }),
      });

      if (!response.ok) throw new Error('Update failed');
      figma.ui.postMessage({ type: 'update-result', key: msg.key, ok: true });
    } catch (err) {
      figma.ui.postMessage({ type: 'update-result', key: msg.key, ok: false, error: err.message });
    }
  }

  // Canvas operations
  if (msg.type === 'add-to-canvas') {
    const issue = msg.issue;
    const sticky = figma.createSticky();
    sticky.x = msg.x || 0;
    sticky.y = msg.y || 0;
    sticky.width = 320;
    sticky.height = 180;
    sticky.text = `${issue.key}\n${issue.fields.summary}\nAssignee: ${issue.fields.assignee && issue.fields.assignee.displayName || 'Unassigned'}\nStatus: ${issue.fields.status.name}`;
    figma.currentPage.appendChild(sticky);
    figma.ui.postMessage({ type: 'added-to-canvas' });
  }
};

// Signal ready to UI
figma.ui.postMessage({ type: 'ready' });
