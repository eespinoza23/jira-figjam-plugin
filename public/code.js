figma.showUI(__html__, { width: 360, height: 600 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'open-external') {
    figma.openExternal(msg.url);
  }

  if (msg.type === 'verify-code') {
    try {
      const response = await fetch('https://jira-figjam-plugin.vercel.app/api/jira-connect', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: msg.code }),
      });

      if (!response.ok) throw new Error('Code verification failed');
      const data = await response.json();
      figma.ui.postMessage({ type: 'authenticated', instance: data.instance });
    } catch (err) {
      figma.ui.postMessage({ type: 'auth-error', error: err.message });
    }
  }

  if (msg.type === 'search-jira') {
    try {
      const response = await fetch('https://jira-figjam-plugin.vercel.app/api/jira-search', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jql: msg.jql }),
      });

      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      figma.ui.postMessage({ type: 'search-results', issues: data.issues });
    } catch (err) {
      figma.ui.postMessage({ type: 'search-error', error: err.message });
    }
  }

  if (msg.type === 'add-to-canvas') {
    const issue = msg.issue;
    const sticky = figma.createSticky();
    sticky.x = 0;
    sticky.y = 0;
    sticky.width = 280;
    sticky.height = 160;
    sticky.text = `${issue.key}\n${issue.fields.summary}\nAssignee: ${issue.fields.assignee?.displayName || 'Unassigned'}\nStatus: ${issue.fields.status.name}`;
    figma.currentPage.appendChild(sticky);
    figma.ui.postMessage({ type: 'added-to-canvas' });
  }
};
