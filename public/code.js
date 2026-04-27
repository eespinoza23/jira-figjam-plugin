figma.showUI(__html__, { width: 380, height: 640 });

var TYPE_COLORS = {
  Epic: '#7C3AED', Feature: '#0284C7', Story: '#2563EB',
  Bug: '#DC2626', Task: '#059669', Subtask: '#0891B2'
};
var STATUS_COLORS = {
  'To Do':       { dot: '#9CA3AF', label: '#6B7280' },
  'In Progress': { dot: '#3B82F6', label: '#2563EB' },
  'In Review':   { dot: '#F97316', label: '#EA580C' },
  'Done':        { dot: '#22C55E', label: '#16A34A' },
  'Blocked':     { dot: '#EF4444', label: '#DC2626' },
  'Closed':      { dot: '#22C55E', label: '#16A34A' }
};
var SPRINT_COLORS = { active: '#059669', future: '#2563EB', closed: '#9CA3AF' };
var AVATAR_PALETTE = [
  {r:0.09,g:0.46,b:0.82},{r:0.39,g:0.13,b:0.83},{r:0.02,g:0.55,b:0.47},
  {r:0.76,g:0.12,b:0.17},{r:0.02,g:0.53,b:0.30},{r:0.84,g:0.33,b:0.00}
];

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1,3),16)/255,
    g: parseInt(hex.slice(3,5),16)/255,
    b: parseInt(hex.slice(5,7),16)/255
  };
}
function trunc(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0,max) + '...' : str;
}
function nameToColor(name) {
  var h = 0;
  for (var i = 0; i < (name||'').length; i++) h = (h*31 + (name||'').charCodeAt(i)) & 0xffff;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}
function initials(name) {
  if (!name || name === 'Unassigned') return '?';
  var parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
  return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
}
function statusColor(status) {
  return STATUS_COLORS[status] || { dot: '#9CA3AF', label: '#6B7280' };
}

async function buildCard(issue, x, y) {
  var color = TYPE_COLORS[issue.type] || '#6B7280';
  var sc    = statusColor(issue.status);
  var cardW = 300;
  var cardH = 130;

  var card = figma.createFrame();
  card.resize(cardW, cardH);
  card.x = x; card.y = y;
  card.fills = [{ type: 'SOLID', color: { r:1, g:1, b:1 } }];
  card.strokes = [{ type: 'SOLID', color: hexToRgb('#E5E7EB') }];
  card.strokeWeight = 1;
  card.cornerRadius = 8;

  // Accent bar
  var accent = figma.createRectangle();
  accent.resize(cardW, 4);
  accent.fills = [{ type: 'SOLID', color: hexToRgb(color) }];
  card.appendChild(accent);
  accent.x = 0; accent.y = 0;

  // Type · Key (combined to avoid width-read positioning)
  var keyNode = figma.createText();
  keyNode.fontName = { family: 'Inter', style: 'Bold' };
  keyNode.fontSize = 8;
  keyNode.fills = [{ type: 'SOLID', color: hexToRgb(color) }];
  keyNode.characters = (issue.type || 'Story') + '  ·  ' + (issue.key || '');
  card.appendChild(keyNode);
  keyNode.x = 12; keyNode.y = 10;

  // Points badge (top-right)
  var ptsId = null;
  if (issue.points !== undefined && issue.points !== null && issue.points !== '') {
    var ptsBg = figma.createRectangle();
    ptsBg.resize(32, 16);
    ptsBg.fills = [{ type: 'SOLID', color: hexToRgb('#EFF6FF') }];
    ptsBg.strokes = [{ type: 'SOLID', color: hexToRgb('#BFDBFE') }];
    ptsBg.strokeWeight = 1;
    ptsBg.cornerRadius = 4;
    card.appendChild(ptsBg);
    ptsBg.x = cardW - 44; ptsBg.y = 8;

    var ptsNode = figma.createText();
    ptsNode.fontName = { family: 'Inter', style: 'Bold' };
    ptsNode.fontSize = 8;
    ptsNode.fills = [{ type: 'SOLID', color: hexToRgb('#2563EB') }];
    ptsNode.characters = String(issue.points) + 'pt';
    card.appendChild(ptsNode);
    ptsNode.x = cardW - 40; ptsNode.y = 11;
    ptsId = ptsNode.id;
  }

  // Summary
  var summaryNode = figma.createText();
  summaryNode.fontName = { family: 'Inter', style: 'Regular' };
  summaryNode.fontSize = 11;
  summaryNode.fills = [{ type: 'SOLID', color: hexToRgb('#111827') }];
  summaryNode.characters = trunc(issue.summary, 100);
  card.appendChild(summaryNode);
  summaryNode.x = 12; summaryNode.y = 27;

  // Separator
  var sep = figma.createRectangle();
  sep.resize(cardW - 24, 1);
  sep.fills = [{ type: 'SOLID', color: hexToRgb('#F3F4F6') }];
  card.appendChild(sep);
  sep.x = 12; sep.y = 96;

  // Assignee avatar
  var avatar = figma.createEllipse();
  avatar.resize(18, 18);
  avatar.fills = [{ type: 'SOLID', color: nameToColor(issue.assignee || '') }];
  card.appendChild(avatar);
  avatar.x = 12; avatar.y = 103;

  var avText = figma.createText();
  avText.fontName = { family: 'Inter', style: 'Bold' };
  avText.fontSize = 7;
  avText.fills = [{ type: 'SOLID', color: { r:1, g:1, b:1 } }];
  avText.characters = initials(issue.assignee || 'Unassigned');
  card.appendChild(avText);
  avText.x = 16; avText.y = 107;

  // Assignee name
  var assigneeNode = figma.createText();
  assigneeNode.fontName = { family: 'Inter', style: 'Regular' };
  assigneeNode.fontSize = 8;
  assigneeNode.fills = [{ type: 'SOLID', color: hexToRgb('#6B7280') }];
  assigneeNode.characters = trunc(issue.assignee || 'Unassigned', 16);
  card.appendChild(assigneeNode);
  assigneeNode.x = 34; assigneeNode.y = 106;
  var assigneeId = assigneeNode.id;

  // Status dot
  var dot = figma.createEllipse();
  dot.resize(6, 6);
  dot.fills = [{ type: 'SOLID', color: hexToRgb(sc.dot) }];
  card.appendChild(dot);
  dot.x = 178; dot.y = 108;
  var dotId = dot.id;

  // Status text
  var statusNode = figma.createText();
  statusNode.fontName = { family: 'Inter', style: 'Regular' };
  statusNode.fontSize = 8;
  statusNode.fills = [{ type: 'SOLID', color: hexToRgb(sc.label) }];
  statusNode.characters = trunc(issue.status || '', 14);
  card.appendChild(statusNode);
  statusNode.x = 188; statusNode.y = 105;
  var statusId = statusNode.id;

  figma.currentPage.appendChild(card);
  return {
    frameId: card.id,
    summaryId: summaryNode.id,
    ptsId: ptsId,
    statusId: statusId,
    dotId: dotId,
    assigneeId: assigneeId
  };
}

figma.ui.onmessage = async function(msg) {

  if (msg.type === 'save-session') {
    try { await figma.clientStorage.setAsync('session', { instance: msg.instance }); } catch (_) {}
  }
  if (msg.type === 'get-session') {
    var s = null;
    try { s = await figma.clientStorage.getAsync('session'); } catch (_) {}
    figma.ui.postMessage({ type: 'session-data', instance: s && s.instance || null });
  }
  if (msg.type === 'clear-session') {
    try { await figma.clientStorage.removeAsync('session'); } catch (_) {}
  }
  if (msg.type === 'open-external') {
    figma.openExternal(msg.url);
  }

  if (msg.type === 'add-to-canvas') {
    var issues  = msg.issues || [];
    var groupBy = msg.groupBy || 'type';
    if (!issues.length) return;

    try {
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
    } catch (e) {
      figma.ui.postMessage({ type: 'canvas-error', error: 'Font load failed: ' + e.message });
      return;
    }

    // Build groups
    var groupKeys = [];
    var groups = {};

    if (groupBy === 'sprint') {
      issues.forEach(function(issue) {
        var g = issue.sprint || 'Backlog';
        if (!groups[g]) { groups[g] = []; groupKeys.push(g); }
        groups[g].push(issue);
      });
      // Sort: active first, then future, then backlog/closed
      groupKeys.sort(function(a, b) {
        var sa = issues.find(function(i) { return (i.sprint||'Backlog') === a; });
        var sb = issues.find(function(i) { return (i.sprint||'Backlog') === b; });
        var stateOrder = { active:0, future:1, closed:3 };
        var oa = sa && sa.sprintState ? (stateOrder[sa.sprintState] || 2) : 4;
        var ob = sb && sb.sprintState ? (stateOrder[sb.sprintState] || 2) : 4;
        return oa - ob;
      });
    } else {
      var typeOrder = ['Epic', 'Feature', 'Story', 'Bug', 'Task', 'Subtask'];
      typeOrder.forEach(function(t) { groups[t] = []; });
      issues.forEach(function(issue) {
        var t = issue.type || 'Story';
        if (!groups[t]) { groups[t] = []; }
        groups[t].push(issue);
      });
      groupKeys = typeOrder.filter(function(t) { return groups[t] && groups[t].length; });
    }

    var cardW = 300, cardH = 130, cardGap = 16, cols = 3;
    var startX = Math.round(figma.viewport.center.x - (cols * (cardW + cardGap)) / 2);
    var startY = Math.round(figma.viewport.center.y - 100);
    var curY = startY;
    var allFrames = [];
    var nodeMap = {};

    for (var gi = 0; gi < groupKeys.length; gi++) {
      var gKey   = groupKeys[gi];
      var gItems = groups[gKey];
      if (!gItems.length) continue;

      // Group label
      var labelColor = '#374151';
      if (groupBy === 'sprint') {
        var sample = gItems[0];
        labelColor = SPRINT_COLORS[sample.sprintState] || '#374151';
      } else {
        labelColor = TYPE_COLORS[gKey] || '#374151';
      }

      var label = figma.createText();
      label.fontName = { family: 'Inter', style: 'Bold' };
      label.fontSize = 13;
      label.fills = [{ type: 'SOLID', color: hexToRgb(labelColor) }];
      label.characters = gKey.toUpperCase() + '  (' + gItems.length + ')';
      figma.currentPage.appendChild(label);
      label.x = startX; label.y = curY;
      allFrames.push(label);
      curY += 30;

      for (var i = 0; i < gItems.length; i++) {
        var col  = i % cols;
        var row  = Math.floor(i / cols);
        var ids  = await buildCard(gItems[i], startX + col * (cardW + cardGap), curY + row * (cardH + cardGap));
        nodeMap[gItems[i].key] = ids;
        var frame = figma.getNodeById(ids.frameId);
        if (frame) allFrames.push(frame);
      }

      curY += Math.ceil(gItems.length / cols) * (cardH + cardGap) + 52;
    }

    figma.currentPage.selection = allFrames;
    figma.viewport.scrollAndZoomIntoView(allFrames);
    figma.ui.postMessage({ type: 'added-to-canvas', count: issues.length, nodeMap: nodeMap });
  }

  if (msg.type === 'update-canvas-card') {
    try {
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });

      if (msg.summaryId && msg.summary !== undefined) {
        var sn = figma.getNodeById(msg.summaryId);
        if (sn && sn.type === 'TEXT') sn.characters = trunc(msg.summary, 100);
      }
      if (msg.ptsId && msg.points !== undefined && msg.points !== null) {
        var pn = figma.getNodeById(msg.ptsId);
        if (pn && pn.type === 'TEXT') pn.characters = String(msg.points) + 'pt';
      }
      if (msg.statusId && msg.status !== undefined) {
        var stNode = figma.getNodeById(msg.statusId);
        if (stNode && stNode.type === 'TEXT') stNode.characters = trunc(msg.status, 14);
      }
      if (msg.dotId && msg.status !== undefined) {
        var dotNode = figma.getNodeById(msg.dotId);
        var sc = statusColor(msg.status);
        if (dotNode) dotNode.fills = [{ type: 'SOLID', color: hexToRgb(sc.dot) }];
      }
      if (msg.assigneeId && msg.assignee !== undefined) {
        var anNode = figma.getNodeById(msg.assigneeId);
        if (anNode && anNode.type === 'TEXT') anNode.characters = trunc(msg.assignee || 'Unassigned', 16);
      }
    } catch (e) {}
    figma.ui.postMessage({ type: 'update-canvas-done', key: msg.key });
  }
};

figma.ui.postMessage({ type: 'ready' });
