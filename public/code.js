figma.showUI(__html__, { width: 360, height: 600 });

figma.ui.onmessage = async (msg) => {

  if (msg.type === 'save-session') {
    try { await figma.clientStorage.setAsync('session', { instance: msg.instance }); } catch (_) {}
  }

  if (msg.type === 'get-session') {
    let session = null;
    try { session = await figma.clientStorage.getAsync('session'); } catch (_) {}
    figma.ui.postMessage({ type: 'session-data', instance: session && session.instance || null });
  }

  if (msg.type === 'clear-session') {
    try { await figma.clientStorage.removeAsync('session'); } catch (_) {}
  }

  if (msg.type === 'open-external') {
    figma.openExternal(msg.url);
  }

  if (msg.type === 'add-to-canvas') {
    const issue = msg.issue;
    const sticky = figma.createSticky();
    sticky.x = msg.x || 0;
    sticky.y = msg.y || 0;
    sticky.width = 320;
    sticky.text = issue.key + '\n' + (issue.summary || '') + '\nAssignee: ' + (issue.assignee || 'Unassigned') + '\nStatus: ' + (issue.status || '');
    figma.currentPage.appendChild(sticky);
    figma.ui.postMessage({ type: 'added-to-canvas' });
  }
};

figma.ui.postMessage({ type: 'ready' });
