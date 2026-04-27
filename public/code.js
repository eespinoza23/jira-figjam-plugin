figma.showUI(__html__, { width: 360, height: 600, resizable: true });

var COLORS = { Epic: '#7C3AED', Feature: '#0284C7', Story: '#2563EB', Bug: '#DC2626' };
var ICONS  = { Epic: '⚡', Feature: '✨', Story: '📖', Bug: '🐛' };

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255
  };
}

async function buildCard(issue, x, y) {
  var color  = COLORS[issue.type] || '#2563EB';
  var cardW  = 280;
  var cardH  = 130;

  var card = figma.createFrame();
  card.resize(cardW, cardH);
  card.x = x;
  card.y = y;
  card.fills        = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  card.cornerRadius = 8;
  card.strokeWeight = 1.5;
  card.strokes      = [{ type: 'SOLID', color: hexToRgb('#E5E7EB') }];
  card.clipsContent = true;
  card.name         = (issue.key || 'ISSUE') + ' — ' + (issue.summary || '').slice(0, 40);

  // Color accent bar
  var accent = figma.createRectangle();
  accent.resize(cardW, 4);
  accent.x = 0; accent.y = 0;
  accent.fills = [{ type: 'SOLID', color: hexToRgb(color) }];
  card.appendChild(accent);

  // Issue key
  var keyNode = figma.createText();
  keyNode.fontName  = { family: 'Inter', style: 'Bold' };
  keyNode.fontSize  = 9;
  keyNode.fills     = [{ type: 'SOLID', color: hexToRgb(color) }];
  keyNode.characters = issue.key || '';
  keyNode.x = 12; keyNode.y = 12;
  card.appendChild(keyNode);

  // Type label (top-right)
  var typeNode = figma.createText();
  typeNode.fontName   = { family: 'Inter', style: 'Regular' };
  typeNode.fontSize   = 8;
  typeNode.fills      = [{ type: 'SOLID', color: hexToRgb('#9CA3AF') }];
  typeNode.characters = (ICONS[issue.type] || '') + ' ' + (issue.type || 'Story');
  typeNode.x = cardW - 12 - typeNode.width;
  typeNode.y = 12;
  card.appendChild(typeNode);

  // Summary
  var summary = (issue.summary || '');
  if (summary.length > 72) summary = summary.slice(0, 72) + '…';
  var summaryNode = figma.createText();
  summaryNode.fontName         = { family: 'Inter', style: 'Regular' };
  summaryNode.fontSize         = 11;
  summaryNode.fills            = [{ type: 'SOLID', color: hexToRgb('#111827') }];
  summaryNode.textAutoResize   = 'HEIGHT';
  summaryNode.resize(cardW - 24, 20);
  summaryNode.characters       = summary;
  summaryNode.x = 12; summaryNode.y = 30;
  card.appendChild(summaryNode);

  // Assignee (bottom-left)
  var assigneeNode = figma.createText();
  assigneeNode.fontName   = { family: 'Inter', style: 'Regular' };
  assigneeNode.fontSize   = 8;
  assigneeNode.fills      = [{ type: 'SOLID', color: hexToRgb('#6B7280') }];
  assigneeNode.characters = '👤 ' + (issue.assignee || 'Unassigned');
  assigneeNode.x = 12; assigneeNode.y = cardH - 20;
  card.appendChild(assigneeNode);

  // Status (bottom-right)
  var statusNode = figma.createText();
  statusNode.fontName   = { family: 'Inter', style: 'Bold' };
  statusNode.fontSize   = 8;
  statusNode.fills      = [{ type: 'SOLID', color: hexToRgb('#059669') }];
  statusNode.characters = issue.status || '';
  statusNode.x = cardW - 12 - statusNode.width;
  statusNode.y = cardH - 20;
  card.appendChild(statusNode);

  // Points badge (if present)
  if (issue.points) {
    var ptsNode = figma.createText();
    ptsNode.fontName   = { family: 'Inter', style: 'Bold' };
    ptsNode.fontSize   = 8;
    ptsNode.fills      = [{ type: 'SOLID', color: hexToRgb('#2563EB') }];
    ptsNode.characters = String(issue.points) + 'pt';
    ptsNode.x = statusNode.x - ptsNode.width - 8;
    ptsNode.y = cardH - 20;
    card.appendChild(ptsNode);
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

    var cardW    = 280;
    var cardH    = 130;
    var cardGap  = 16;
    var cols     = 3;
    var groupGap = 48;
    var startX   = Math.round(figma.viewport.center.x - (cols * (cardW + cardGap)) / 2);
    var startY   = Math.round(figma.viewport.center.y - 80);
    var currentY = startY;
    var allNodes = [];

    for (var ti = 0; ti < typeOrder.length; ti++) {
      var type        = typeOrder[ti];
      var groupIssues = groups[type];
      if (!groupIssues.length) continue;

      var labelNode = figma.createText();
      labelNode.fontName   = { family: 'Inter', style: 'Bold' };
      labelNode.fontSize   = 12;
      labelNode.fills      = [{ type: 'SOLID', color: hexToRgb(COLORS[type] || '#2563EB') }];
      labelNode.characters = (ICONS[type] || '') + ' ' + type.toUpperCase() + 'S (' + groupIssues.length + ')';
      labelNode.x = startX; labelNode.y = currentY;
      figma.currentPage.appendChild(labelNode);
      allNodes.push(labelNode);
      currentY += 28;

      for (var i = 0; i < groupIssues.length; i++) {
        var col  = i % cols;
        var row  = Math.floor(i / cols);
        var cardX = startX + col * (cardW + cardGap);
        var cardY = currentY + row * (cardH + cardGap);
        var card  = await buildCard(groupIssues[i], cardX, cardY);
        allNodes.push(card);
      }

      var rows = Math.ceil(groupIssues.length / cols);
      currentY += rows * (cardH + cardGap) + groupGap;
    }

    figma.currentPage.selection = allNodes;
    figma.viewport.scrollAndZoomIntoView(allNodes);
    figma.ui.postMessage({ type: 'added-to-canvas', count: issues.length });
  }
};

figma.ui.postMessage({ type: 'ready' });
