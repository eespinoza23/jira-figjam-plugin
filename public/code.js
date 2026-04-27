figma.showUI(__html__, { width: 360, height: 600 });

var COLORS = { Epic: '#7C3AED', Feature: '#0284C7', Story: '#2563EB', Bug: '#DC2626' };

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255
  };
}

function trunc(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '...' : str;
}

async function buildCard(issue, x, y) {
  var color = COLORS[issue.type] || '#2563EB';
  var cardW = 280;
  var cardH = 130;

  var card = figma.createFrame();
  card.resize(cardW, cardH);
  card.x = x;
  card.y = y;
  card.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  card.strokes = [{ type: 'SOLID', color: hexToRgb('#E5E7EB') }];
  card.strokeWeight = 1.5;
  card.cornerRadius = 8;

  var accent = figma.createRectangle();
  accent.resize(cardW, 4);
  accent.x = 0; accent.y = 0;
  accent.fills = [{ type: 'SOLID', color: hexToRgb(color) }];
  card.appendChild(accent);

  var keyNode = figma.createText();
  keyNode.name = 'key';
  keyNode.fontName = { family: 'Inter', style: 'Bold' };
  keyNode.fontSize = 9;
  keyNode.fills = [{ type: 'SOLID', color: hexToRgb(color) }];
  keyNode.characters = issue.key || '';
  card.appendChild(keyNode);
  keyNode.x = 12; keyNode.y = 12;

  var typeNode = figma.createText();
  typeNode.name = 'type';
  typeNode.fontName = { family: 'Inter', style: 'Regular' };
  typeNode.fontSize = 8;
  typeNode.fills = [{ type: 'SOLID', color: hexToRgb('#9CA3AF') }];
  typeNode.characters = issue.type || 'Story';
  card.appendChild(typeNode);
  typeNode.x = 200; typeNode.y = 12;

  var summaryNode = figma.createText();
  summaryNode.name = 'summary';
  summaryNode.fontName = { family: 'Inter', style: 'Regular' };
  summaryNode.fontSize = 11;
  summaryNode.fills = [{ type: 'SOLID', color: hexToRgb('#111827') }];
  summaryNode.characters = trunc(issue.summary, 80);
  card.appendChild(summaryNode);
  summaryNode.x = 12; summaryNode.y = 30;

  var assigneeNode = figma.createText();
  assigneeNode.name = 'assignee';
  assigneeNode.fontName = { family: 'Inter', style: 'Regular' };
  assigneeNode.fontSize = 8;
  assigneeNode.fills = [{ type: 'SOLID', color: hexToRgb('#6B7280') }];
  assigneeNode.characters = trunc(issue.assignee || 'Unassigned', 20);
  card.appendChild(assigneeNode);
  assigneeNode.x = 12; assigneeNode.y = cardH - 20;

  var statusNode = figma.createText();
  statusNode.name = 'status';
  statusNode.fontName = { family: 'Inter', style: 'Bold' };
  statusNode.fontSize = 8;
  statusNode.fills = [{ type: 'SOLID', color: hexToRgb('#059669') }];
  statusNode.characters = trunc(issue.status, 16) || '';
  card.appendChild(statusNode);
  statusNode.x = 160; statusNode.y = cardH - 20;

  if (issue.points) {
    var ptsNode = figma.createText();
    ptsNode.name = 'points';
    ptsNode.fontName = { family: 'Inter', style: 'Bold' };
    ptsNode.fontSize = 8;
    ptsNode.fills = [{ type: 'SOLID', color: hexToRgb('#2563EB') }];
    ptsNode.characters = String(issue.points) + 'pt';
    card.appendChild(ptsNode);
    ptsNode.x = 230; ptsNode.y = cardH - 20;
  }

  figma.currentPage.appendChild(card);
  return card;
}

figma.ui.onmessage = async function(msg) {

  if (msg.type === 'save-session') {
    try { await figma.clientStorage.setAsync('session', { instance: msg.instance }); } catch (_) {}
  }

  if (msg.type === 'get-session') {
    var session = null;
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
    var issues = msg.issues || [];
    if (!issues.length) return;

    try {
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
    } catch (e) {
      figma.ui.postMessage({ type: 'canvas-error', error: 'Font load failed: ' + e.message });
      return;
    }

    var typeOrder = ['Epic', 'Feature', 'Story', 'Bug'];
    var groups = {};
    typeOrder.forEach(function(t) { groups[t] = []; });
    issues.forEach(function(issue) {
      var t = issue.type || 'Story';
      if (!groups[t]) groups[t] = [];
      groups[t].push(issue);
    });

    var cardW = 280, cardH = 130, cardGap = 16, cols = 3;
    var startX = Math.round(figma.viewport.center.x - (cols * (cardW + cardGap)) / 2);
    var startY = Math.round(figma.viewport.center.y - 80);
    var curY = startY;
    var allNodes = [];
    var nodeMap = {};

    for (var ti = 0; ti < typeOrder.length; ti++) {
      var type  = typeOrder[ti];
      var group = groups[type];
      if (!group.length) continue;

      var label = figma.createText();
      label.fontName = { family: 'Inter', style: 'Bold' };
      label.fontSize = 12;
      label.fills = [{ type: 'SOLID', color: hexToRgb(COLORS[type] || '#2563EB') }];
      label.characters = type.toUpperCase() + 'S (' + group.length + ')';
      figma.currentPage.appendChild(label);
      label.x = startX; label.y = curY;
      allNodes.push(label);
      curY += 28;

      for (var i = 0; i < group.length; i++) {
        var col  = i % cols;
        var row  = Math.floor(i / cols);
        var card = await buildCard(group[i], startX + col * (cardW + cardGap), curY + row * (cardH + cardGap));
        nodeMap[group[i].key] = card.id;
        allNodes.push(card);
      }

      curY += Math.ceil(group.length / cols) * (cardH + cardGap) + 48;
    }

    figma.currentPage.selection = allNodes;
    figma.viewport.scrollAndZoomIntoView(allNodes);
    figma.ui.postMessage({ type: 'added-to-canvas', count: issues.length, nodeMap: nodeMap });
  }

  if (msg.type === 'update-canvas-card') {
    try {
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
      var node = figma.getNodeById(msg.nodeId);
      if (node && node.children) {
        for (var ci = 0; ci < node.children.length; ci++) {
          var child = node.children[ci];
          if (child.type !== 'TEXT') continue;
          if (child.name === 'summary' && msg.summary !== undefined) {
            child.characters = trunc(msg.summary, 80);
          }
          if (child.name === 'points' && msg.points !== undefined) {
            child.characters = String(msg.points) + 'pt';
          }
        }
      }
      figma.ui.postMessage({ type: 'update-canvas-done', key: msg.key });
    } catch (e) {
      figma.ui.postMessage({ type: 'update-canvas-done', key: msg.key });
    }
  }
};

figma.ui.postMessage({ type: 'ready' });
