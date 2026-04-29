const { widget } = figma;
const {
  AutoLayout,
  Text,
  SVG,
  Image,
  useSyncedState,
  usePropertyMenu,
  useWidgetNodeId,
  Rectangle,
} = widget;

// --- Jira-native issue type SVG icons (16x16) ---
const TYPE_SVGS: Record<string, string> = {
  Story: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#63BA3C"/><path d="M9.5 4H5.2c-.1 0-.2.1-.2.2v7.6c0 .1.1.2.2.2h5.6c.1 0 .2-.1.2-.2V6.5L9.5 4zM10 11H6V5h3v2h2l-.1 4z" fill="#fff"/></svg>',
  'Tech Story': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#63BA3C"/><path d="M9.5 4H5.2c-.1 0-.2.1-.2.2v7.6c0 .1.1.2.2.2h5.6c.1 0 .2-.1.2-.2V6.5L9.5 4zM10 11H6V5h3v2h2l-.1 4z" fill="#fff"/></svg>',
  Epic: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#904EE2"/><path d="M8.87 3H5.6l-.1.12L5 8h2.6L6 13l.13 0L11 7H8.4L10 3.12 9.87 3z" fill="#fff"/></svg>',
  Feature: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#904EE2"/><path d="M8.87 3H5.6l-.1.12L5 8h2.6L6 13l.13 0L11 7H8.4L10 3.12 9.87 3z" fill="#fff"/></svg>',
  Bug: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#E5493A"/><circle cx="8" cy="8" r="3.5" fill="#fff"/><circle cx="8" cy="8" r="1.5" fill="#E5493A"/></svg>',
  Task: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#4BAEE8"/><path d="M11.5 5.5L7 10l-2.5-2.5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  'Sub-task': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#4BAEE8"/><path d="M11 5.5L7 9.5l-2-2" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  Spike: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#F79232"/><path d="M8 3.5L5.5 8h2L6.5 12.5 10.5 7h-2L10 3.5z" fill="#fff"/></svg>',
  Enabler: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#F79232"/><circle cx="8" cy="6.5" r="2" fill="none" stroke="#fff" stroke-width="1.3"/><path d="M7 8.5v2.5h2V8.5" fill="none" stroke="#fff" stroke-width="1.3"/><path d="M6.5 12.5h3" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/></svg>',
  Initiative: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#CD519D"/><path d="M8 3l1.5 3H11l-2 2.5.8 3.5L8 10.5 6.2 12l.8-3.5L5 6h1.5z" fill="#fff"/></svg>',
};

// --- Type colors by issue type ---
const TYPE_COLORS: Record<string, string> = {
  Epic: '#904EE2',
  Feature: '#904EE2',
  Story: '#63BA3C',
  'Tech Story': '#63BA3C',
  Bug: '#E5493A',
  Task: '#4BAEE8',
  Spike: '#F79232',
  Enabler: '#F79232',
  Initiative: '#CD519D',
};

// --- Priority indicator colors ---
const PRIORITY_COLORS: Record<string, string> = {
  Highest: '#FF5630',
  High: '#FF7452',
  Medium: '#FFAB00',
  Low: '#36B37E',
  Lowest: '#6554C0',
};

// --- Jira-native priority SVG icons (16x16) ---
const PRIORITY_SVGS: Record<string, string> = {
  Highest: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M3.5 9.9L8 5.4l4.5 4.5" fill="none" stroke="#FF5630" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 5.9L8 1.4l4.5 4.5" fill="none" stroke="#FF5630" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  High: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M3.5 10L8 5.5l4.5 4.5" fill="none" stroke="#FF7452" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  Medium: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M3.5 10L8 5.5l4.5 4.5" fill="none" stroke="#FFAB00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  Low: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M3.5 6L8 10.5l4.5-4.5" fill="none" stroke="#36B37E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  Lowest: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M3.5 6.1L8 10.6l4.5-4.5" fill="none" stroke="#6554C0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 10.1L8 14.6l4.5-4.5" fill="none" stroke="#6554C0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

// --- Jira logo SVG (small blue mark) ---
var JIRA_LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><defs><linearGradient id="jl" x1="98%" y1="10%" x2="58%" y2="70%"><stop offset="18%" stop-color="#0052CC" stop-opacity="0"/><stop offset="100%" stop-color="#2684FF"/></linearGradient></defs><path d="M14.4 7.6L8.4 1.6 8 1.2 2.8 6.4 1.6 7.6a.5.5 0 000 .8l4.8 4.8L8 14.8l5.2-5.2 .2-.2 1-1a.5.5 0 000-.8zM8 10.4L5.6 8 8 5.6 10.4 8z" fill="#2684FF"/></svg>';

// --- Status category colors ---
const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  done: { bg: '#DCFFF1', fg: '#216E4E' },
  indeterminate: { bg: '#DEEBFF', fg: '#0055CC' },
  new: { bg: '#F1F2F4', fg: '#626F86' },
};

// --- Issue data shape stored in synced state ---
interface IssueData {
  key: string;
  summary: string;
  description: string;
  status: string;
  statusCategory: string;
  issueType: string;
  issueTypeIconUrl: string;
  issueTypeIconData: string; // base64 data URL fetched by iframe
  priority: string;
  priorityIconUrl: string;
  priorityIconData: string;  // base64 data URL fetched by iframe
  assignee: string;
  storyPoints: number | null;
  sprint: string | null;
  epicKey: string | null;
  labels: string[];
  projectKey: string;
}

const EMPTY_ISSUE: IssueData = {
  key: '',
  summary: 'Click ▸ Add Issues to get started',
  description: '',
  status: '',
  statusCategory: 'new',
  issueType: 'Task',
  issueTypeIconUrl: '',
  issueTypeIconData: '',
  priority: 'Medium',
  priorityIconUrl: '',
  priorityIconData: '',
  assignee: 'Unassigned',
  storyPoints: null,
  sprint: null,
  epicKey: null,
  labels: [],
  projectKey: '',
};

const API_BASE = 'https://jira-figjam-plugin.vercel.app';

// --- Storage keys for figma.clientStorage ---
const STORAGE_ACCESS_TOKEN = 'jira_access_token';
const STORAGE_REFRESH_TOKEN = 'jira_refresh_token';
const STORAGE_INSTANCE = 'jira_instance';

// --- Helper: get stored auth tokens ---
async function getStoredTokens(): Promise<{ accessToken: string | null; refreshToken: string | null; instance: string | null }> {
  const [accessToken, refreshToken, instance] = await Promise.all([
    figma.clientStorage.getAsync(STORAGE_ACCESS_TOKEN),
    figma.clientStorage.getAsync(STORAGE_REFRESH_TOKEN),
    figma.clientStorage.getAsync(STORAGE_INSTANCE),
  ]);
  return { accessToken, refreshToken, instance };
}

async function storeTokens(accessToken: string, refreshToken: string, instance: string): Promise<void> {
  await Promise.all([
    figma.clientStorage.setAsync(STORAGE_ACCESS_TOKEN, accessToken),
    figma.clientStorage.setAsync(STORAGE_REFRESH_TOKEN, refreshToken),
    figma.clientStorage.setAsync(STORAGE_INSTANCE, instance),
  ]);
}

// --- Main widget component ---
function JiraIssueCard() {
  const widgetId = useWidgetNodeId();
  const [issue, setIssue] = useSyncedState<IssueData>('issue', EMPTY_ISSUE);
  const [expanded, setExpanded] = useSyncedState<boolean>('expanded', false);
  const [lastSynced, setLastSynced] = useSyncedState<string>('lastSynced', '');

  const typeColor = TYPE_COLORS[issue.issueType] || '#626F86';
  const statusStyle = STATUS_COLORS[issue.statusCategory] || STATUS_COLORS.new;
  const isPlaceholder = issue.key === '';

  // --- Property menu ---
  const menuItems: WidgetPropertyMenuItem[] = [];

  if (!isPlaceholder) {
    menuItems.push(
      {
        itemType: 'action',
        propertyName: 'sync',
        tooltip: 'Sync from Jira',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.65 2.35A8 8 0 1 0 16 8h-2a6 6 0 1 1-1.76-4.24L10 6h6V0l-2.35 2.35z" fill="white"/></svg>`,
      },
      {
        itemType: 'toggle',
        propertyName: 'expanded',
        tooltip: expanded ? 'Collapse' : 'Expand',
        isToggled: expanded,
      },
      {
        itemType: 'action',
        propertyName: 'open-jira',
        tooltip: 'Open in Jira',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3H3v10h10v-3M9 2h5v5M14 2L7 9" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      },
      {
        itemType: 'action',
        propertyName: 'edit-issue',
        tooltip: 'Edit Issue',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" stroke="white" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
      },
      {
        itemType: 'action',
        propertyName: 'link-issue',
        tooltip: 'Link to Card',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6.5 9.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5L7 4" stroke="white" stroke-width="1.5" stroke-linecap="round"/><path d="M9.5 6.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5L9 12" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>`,
      },
    );
  }

  menuItems.push({
    itemType: 'action',
    propertyName: 'add-issues',
    tooltip: 'Add Issues',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>`,
  });

  usePropertyMenu(menuItems, async ({ propertyName }) => {
    if (propertyName === 'expanded') {
      setExpanded(!expanded);
    }

    if (propertyName === 'open-jira' && issue.key) {
      return new Promise<void>(async () => {
        var tokens = await getStoredTokens();
        var inst = tokens.instance || '';
        if (!inst) {
          figma.notify('Not connected — use Add Issues to connect first');
          return;
        }
        figma.openExternal('https://' + inst + '/browse/' + issue.key);
      });
    }

    if (propertyName === 'add-issues') {
      await new Promise<void>(() => {
        figma.showUI(__html__, { width: 420, height: 540, title: 'Jira Multi-Import' });

        // Send stored tokens to iframe on open
        getStoredTokens().then(({ accessToken, refreshToken, instance }) => {
          if (accessToken) {
            figma.ui.postMessage({ type: 'set-token', token: accessToken, refreshToken: refreshToken || '', instance: instance || '' });
          }
        });

        figma.ui.onmessage = async (msg: any) => {
          if (msg.type === 'add-issues' && msg.issues) {
            // Issues are already normalized by ui-src/index.html before sending
            await createIssueCards(msg.issues as IssueData[], widgetId);
            figma.closePlugin();
          }

          if (msg.type === 'open-auth') {
            const inst = msg.instance ? encodeURIComponent(msg.instance) : '';
            figma.openExternal(`${API_BASE}/api/jira-auth${inst ? '?instance=' + inst : ''}`);
          }

          // User pasted verification code from OAuth callback
          if (msg.type === 'verify-code' && msg.code) {
            try {
              const res = await fetch(`${API_BASE}/api/jira-connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: msg.code }),
              });
              const text = await res.text();
              const data = JSON.parse(text);
              if (data.ok && data.access_token) {
                await storeTokens(data.access_token, data.refresh_token, data.instance);
                figma.ui.postMessage({ type: 'set-token', token: data.access_token, instance: data.instance });
                figma.notify('Connected to Jira!');
              } else {
                figma.ui.postMessage({ type: 'auth-error', error: data.error || 'Invalid code' });
              }
            } catch (e) {
              figma.ui.postMessage({ type: 'auth-error', error: 'Connection failed' });
            }
          }
        };
      });
    }

    if (propertyName === 'edit-issue' && issue.key) {
      await new Promise<void>(() => {
        figma.showUI(__html__, { width: 380, height: 580, title: `Edit ${issue.key}` });

        // Send current issue data + token to iframe in edit mode
        getStoredTokens().then(({ accessToken, refreshToken, instance }) => {
          figma.ui.postMessage({
            type: 'edit-mode',
            issue,
            token: accessToken,
            refreshToken: refreshToken || '',
            instance: instance || '',
          });
        });

        figma.ui.onmessage = async (msg: any) => {
          if (msg.type === 'save-issue' && msg.key) {
            // Update local synced state
            setIssue(Object.assign({}, issue, msg.updates));
            setLastSynced(new Date().toLocaleTimeString());
            figma.notify(`${msg.key} updated`);
            figma.closePlugin();
          }
          if (msg.type === 'edit-error') {
            figma.notify(`Update failed: ${msg.error}`);
          }
          if (msg.type === 'cancel-edit') {
            figma.closePlugin();
          }
        };
      });
    }

    if (propertyName === 'sync' && issue.key) {
      var tokens = await getStoredTokens();
      if (!tokens.accessToken) {
        figma.notify('Not connected to Jira — use Add Issues to connect first');
        return;
      }
      try {
        var res = await fetch(API_BASE + '/api/jira-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + tokens.accessToken,
          },
          body: JSON.stringify({ jql: 'key = ' + issue.key }),
        });
        if (res.status === 401) {
          figma.notify('Session expired — use Add Issues to reconnect');
          return;
        }
        var text = await res.text();
        var data = JSON.parse(text);
        if (data.issues && data.issues.length > 0) {
          var fresh = normalizeIssue(data.issues[0]);
          setIssue(fresh);
          setLastSynced(new Date().toLocaleTimeString());
          figma.notify(issue.key + ' synced');
        }
      } catch (e) {
        figma.notify('Sync failed for ' + issue.key);
      }
    }

    if (propertyName === 'link-issue' && issue.key) {
      await new Promise<void>(() => {
        // Find all other widget instances on the current page
        var allWidgets = figma.currentPage.findAll(function(n) {
          return n.type === 'WIDGET' && n.id !== widgetId;
        }) as WidgetNode[];
        var targets = allWidgets
          .filter(function(w) { return w.name && w.name.indexOf('-') !== -1; })
          .map(function(w) { return { id: w.id, key: w.name }; });

        figma.showUI(__html__, { width: 360, height: 260, title: 'Link ' + issue.key });
        figma.ui.postMessage({ type: 'link-mode', targets: targets, sourceKey: issue.key });

        figma.ui.onmessage = async function(msg: any) {
          if (msg.type === 'create-link') {
            var targetNode = await figma.getNodeByIdAsync(msg.targetId) as SceneNode | null;
            var sourceNode = await figma.getNodeByIdAsync(widgetId) as SceneNode | null;
            if (targetNode && sourceNode) {
              var connector = figma.createConnector();
              connector.connectorStart = { endpointNodeId: widgetId, magnet: 'AUTO' };
              connector.connectorEnd = { endpointNodeId: msg.targetId, magnet: 'AUTO' };
              connector.strokeWeight = 2;
              var linkColors: Record<string, { r: number; g: number; b: number }> = {
                'blocks':        { r: 0.90, g: 0.28, b: 0.23 },
                'is blocked by': { r: 0.90, g: 0.28, b: 0.23 },
                'depends on':    { r: 1.00, g: 0.67, b: 0.00 },
                'relates to':    { r: 0.05, g: 0.40, b: 0.90 },
                'duplicates':    { r: 0.39, g: 0.44, b: 0.52 },
              };
              var linkColor = linkColors[msg.linkType] || linkColors['relates to'];
              connector.strokes = [{ type: 'SOLID', color: linkColor }];
              figma.notify(issue.key + ' → ' + msg.targetKey + ' (' + msg.linkType + ')');
            }
            figma.closePlugin();
          }
          if (msg.type === 'cancel-link') {
            figma.closePlugin();
          }
        };
      });
    }
  });

  // --- Render: Placeholder ---
  if (isPlaceholder) {
    return (
      <AutoLayout
        direction="vertical"
        padding={20}
        cornerRadius={10}
        fill="#FFFFFF"
        stroke="#DFE1E6"
        strokeWidth={1}
        spacing={10}
        width={260}
        effect={[
          { type: 'drop-shadow', color: { r: 0, g: 0, b: 0, a: 0.06 }, offset: { x: 0, y: 2 }, blur: 8 },
          { type: 'drop-shadow', color: { r: 0, g: 0, b: 0, a: 0.04 }, offset: { x: 0, y: 0 }, blur: 1 },
        ]}
      >
        <AutoLayout direction="horizontal" spacing={6} verticalAlignItems="center">
          <Text fontSize={16}>🔌</Text>
          <Text fontSize={14} fill="#172B4D" fontWeight={700}>
            Jira Multi-Import
          </Text>
        </AutoLayout>
        <Text fontSize={11} fill="#626F86" fontWeight={400} width={220} lineHeight={16}>
          Select this widget, then use the property menu ▸ Add Issues to search and import Jira issues onto the canvas.
        </Text>
      </AutoLayout>
    );
  }

  // --- Render: Issue card ---
  var typeSvg = TYPE_SVGS[issue.issueType] || TYPE_SVGS['Task'];
  var priorityColor = PRIORITY_COLORS[issue.priority] || '#FFAB00';
  // Use Jira's native icon if fetched as base64, otherwise fall back to our SVGs
  var typeIconSvg = issue.issueTypeIconData
    ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><image href="' + issue.issueTypeIconData + '" width="16" height="16"/></svg>'
    : typeSvg;
  var priorityIconSvg = issue.priorityIconData
    ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><image href="' + issue.priorityIconData + '" width="16" height="16"/></svg>'
    : (PRIORITY_SVGS[issue.priority] || PRIORITY_SVGS['Medium']);
  var cardWidth = expanded ? 360 : 280;

  return (
    <AutoLayout
      direction="vertical"
      cornerRadius={10}
      fill="#FFFFFF"
      stroke={expanded ? '#0055CC' : '#DFE1E6'}
      strokeWidth={expanded ? 2 : 1}
      width={cardWidth}
      overflow="visible"
      effect={[
        { type: 'drop-shadow', color: { r: 0, g: 0, b: 0, a: 0.08 }, offset: { x: 0, y: 2 }, blur: 12 },
        { type: 'drop-shadow', color: { r: 0, g: 0, b: 0, a: 0.04 }, offset: { x: 0, y: 0 }, blur: 2 },
      ]}
    >
      {/* Type color bar */}
      <Rectangle
        width="fill-parent"
        height={expanded ? 6 : 5}
        fill={typeColor}
        cornerRadius={{ topLeft: 10, topRight: 10, bottomLeft: 0, bottomRight: 0 }}
      />

      {/* ── COMPACT MODE ── */}
      {!expanded && (
        <AutoLayout direction="vertical" padding={{ top: 10, bottom: 14, left: 14, right: 14 }} spacing={8} width="fill-parent">
          {/* Header: icon + type + key + priority */}
          <AutoLayout direction="horizontal" spacing={6} verticalAlignItems="center" width="fill-parent">
            <SVG src={typeIconSvg} />
            <Text fontSize={10} fill={typeColor} fontWeight={700} letterSpacing={0.5}>
              {issue.issueType.toUpperCase()}
            </Text>
            <Text fontSize={12} fill="#0055CC" fontWeight={700}>
              {issue.key}
            </Text>
            <SVG src={priorityIconSvg} />
          </AutoLayout>

          {/* Summary */}
          <Text fontSize={13} fill="#172B4D" fontWeight={500} width="fill-parent" lineHeight={18}>
            {issue.summary.length > 90 ? issue.summary.slice(0, 87) + '…' : issue.summary}
          </Text>

          {/* Description preview */}
          {issue.description ? (
            <Text fontSize={11} fill="#6B778C" fontWeight={400} width="fill-parent" lineHeight={16}>
              {issue.description.length > 80 ? issue.description.slice(0, 77) + '…' : issue.description}
            </Text>
          ) : null}

          {/* Status + Story Points */}
          <AutoLayout direction="horizontal" spacing={8} verticalAlignItems="center" width="fill-parent">
            <AutoLayout padding={{ top: 3, bottom: 3, left: 8, right: 8 }} cornerRadius={4} fill={statusStyle.bg}>
              <Text fontSize={10} fill={statusStyle.fg} fontWeight={700} letterSpacing={0.3}>
                {issue.status.toUpperCase()}
              </Text>
            </AutoLayout>
            {issue.storyPoints != null && (
              <AutoLayout padding={{ top: 3, bottom: 3, left: 7, right: 7 }} cornerRadius={4} fill="#F4F5F7" stroke="#EBECF0" strokeWidth={1}>
                <Text fontSize={10} fill="#505F79" fontWeight={700}>{String(issue.storyPoints)} SP</Text>
              </AutoLayout>
            )}
          </AutoLayout>

          {/* Assignee */}
          <AutoLayout direction="horizontal" spacing={6} verticalAlignItems="center" width="fill-parent">
            <AutoLayout width={20} height={20} cornerRadius={10} fill={issue.assignee === 'Unassigned' ? '#DFE1E6' : '#0055CC'} horizontalAlignItems="center" verticalAlignItems="center">
              <Text fontSize={9} fill="#FFFFFF" fontWeight={700}>
                {issue.assignee === 'Unassigned' ? '?' : issue.assignee.split(' ').map(function(w) { return w[0]; }).join('').slice(0, 2).toUpperCase()}
              </Text>
            </AutoLayout>
            <Text fontSize={11} fill="#6B778C" fontWeight={400}>{issue.assignee}</Text>
          </AutoLayout>
        </AutoLayout>
      )}

      {/* ── EXPANDED MODE (Atlassian-style) ── */}
      {expanded && (
        <AutoLayout direction="vertical" spacing={0} width="fill-parent">

          {/* ── Jira · Details header (outside padding, like Atlassian) ── */}
          <AutoLayout direction="horizontal" spacing={6} verticalAlignItems="center" width="fill-parent" padding={{ top: 12, bottom: 10, left: 20, right: 20 }}>
            <SVG src={JIRA_LOGO_SVG} />
            <Text fontSize={12} fill="#0055CC" fontWeight={700}>Jira</Text>
            <Text fontSize={12} fill="#6B778C" fontWeight={400}>·</Text>
            <Text fontSize={12} fill="#0055CC" fontWeight={500}>Details</Text>
          </AutoLayout>

          {/* ── Card body ── */}
          <AutoLayout direction="vertical" padding={{ top: 0, bottom: 20, left: 20, right: 20 }} spacing={0} width="fill-parent">

            {/* Project / parent breadcrumb + key */}
            <AutoLayout direction="horizontal" spacing={6} verticalAlignItems="center" width="fill-parent" padding={{ bottom: 6 }}>
              <SVG src={typeIconSvg} />
              {issue.projectKey ? (
                <Text fontSize={13} fill="#6B778C" fontWeight={400}>
                  {issue.projectKey} / {issue.key}
                </Text>
              ) : (
                <Text fontSize={13} fill="#6B778C" fontWeight={400}>
                  {issue.key}
                </Text>
              )}
            </AutoLayout>

            {/* Summary — large title */}
            <Text fontSize={20} fill="#172B4D" fontWeight={700} width="fill-parent" lineHeight={28}>
              {issue.summary}
            </Text>

            {/* ── Field rows ── */}
            <AutoLayout direction="vertical" spacing={0} width="fill-parent" padding={{ top: 16 }}>

              {/* Assignee */}
              <ExpandedFieldRow label="Assignee">
                <AutoLayout direction="horizontal" spacing={8} verticalAlignItems="center">
                  <AutoLayout width={28} height={28} cornerRadius={14} fill={issue.assignee === 'Unassigned' ? '#DFE1E6' : '#0055CC'} horizontalAlignItems="center" verticalAlignItems="center">
                    <Text fontSize={11} fill="#FFFFFF" fontWeight={700}>
                      {issue.assignee === 'Unassigned' ? '?' : issue.assignee.split(' ').map(function(w) { return w[0]; }).join('').slice(0, 2).toUpperCase()}
                    </Text>
                  </AutoLayout>
                  <Text fontSize={14} fill="#172B4D" fontWeight={400}>{issue.assignee}</Text>
                </AutoLayout>
              </ExpandedFieldRow>

              <Rectangle width="fill-parent" height={1} fill="#EBECF0" />

              {/* Priority */}
              <ExpandedFieldRow label="Priority">
                <AutoLayout direction="horizontal" spacing={6} verticalAlignItems="center">
                  <SVG src={priorityIconSvg} />
                  <Text fontSize={14} fill="#172B4D" fontWeight={400}>{issue.priority}</Text>
                </AutoLayout>
              </ExpandedFieldRow>

              <Rectangle width="fill-parent" height={1} fill="#EBECF0" />

              {/* Status */}
              <ExpandedFieldRow label="Status">
                <AutoLayout padding={{ top: 3, bottom: 3, left: 10, right: 10 }} cornerRadius={4} fill={statusStyle.bg}>
                  <Text fontSize={12} fill={statusStyle.fg} fontWeight={700} letterSpacing={0.3}>
                    {issue.status.toUpperCase()}
                  </Text>
                </AutoLayout>
              </ExpandedFieldRow>

              <Rectangle width="fill-parent" height={1} fill="#EBECF0" />

              {/* Story Points */}
              {issue.storyPoints != null && (
                <AutoLayout direction="vertical" spacing={0} width="fill-parent">
                  <ExpandedFieldRow label="Story Points">
                    <AutoLayout padding={{ top: 2, bottom: 2, left: 10, right: 10 }} cornerRadius={10} fill="#F4F5F7">
                      <Text fontSize={14} fill="#172B4D" fontWeight={700}>{String(issue.storyPoints)}</Text>
                    </AutoLayout>
                  </ExpandedFieldRow>
                  <Rectangle width="fill-parent" height={1} fill="#EBECF0" />
                </AutoLayout>
              )}

              {/* Sprint */}
              {issue.sprint && (
                <AutoLayout direction="vertical" spacing={0} width="fill-parent">
                  <ExpandedFieldRow label="Sprint">
                    <Text fontSize={14} fill="#172B4D" fontWeight={400}>{issue.sprint}</Text>
                  </ExpandedFieldRow>
                  <Rectangle width="fill-parent" height={1} fill="#EBECF0" />
                </AutoLayout>
              )}

              {/* Epic */}
              {issue.epicKey && (
                <AutoLayout direction="vertical" spacing={0} width="fill-parent">
                  <ExpandedFieldRow label="Epic">
                    <Text fontSize={14} fill="#0055CC" fontWeight={500}>{issue.epicKey}</Text>
                  </ExpandedFieldRow>
                  <Rectangle width="fill-parent" height={1} fill="#EBECF0" />
                </AutoLayout>
              )}

              {/* Labels */}
              {issue.labels.length > 0 && (
                <AutoLayout direction="vertical" spacing={0} width="fill-parent">
                  <ExpandedFieldRow label="Labels">
                    <AutoLayout direction="horizontal" spacing={4} verticalAlignItems="center">
                      {issue.labels.map(function(lbl) {
                        return (
                          <AutoLayout key={lbl} padding={{ top: 3, bottom: 3, left: 8, right: 8 }} cornerRadius={4} fill="#F4F5F7">
                            <Text fontSize={12} fill="#505F79" fontWeight={500}>{lbl}</Text>
                          </AutoLayout>
                        );
                      })}
                    </AutoLayout>
                  </ExpandedFieldRow>
                  <Rectangle width="fill-parent" height={1} fill="#EBECF0" />
                </AutoLayout>
              )}
            </AutoLayout>

            {/* ── Description section ── */}
            {issue.description ? (
              <AutoLayout direction="vertical" spacing={8} width="fill-parent" padding={{ top: 16 }}>
                <Rectangle width="fill-parent" height={1} fill="#DFE1E6" />
                <Text fontSize={12} fill="#6B778C" fontWeight={700}>Description</Text>
                <Text fontSize={13} fill="#172B4D" fontWeight={400} width="fill-parent" lineHeight={20}>
                  {issue.description.length > 500 ? issue.description.slice(0, 497) + '…' : issue.description}
                </Text>
              </AutoLayout>
            ) : null}

            {/* ── Last synced footer ── */}
            <AutoLayout direction="vertical" spacing={0} width="fill-parent" padding={{ top: 16 }}>
              <Rectangle width="fill-parent" height={1} fill="#DFE1E6" />
              <AutoLayout direction="horizontal" width="fill-parent" padding={{ top: 10 }} verticalAlignItems="center">
                <AutoLayout direction="vertical" spacing={2}>
                  <Text fontSize={11} fill="#6B778C" fontWeight={700}>Last synced</Text>
                  <Text fontSize={11} fill="#6B778C" fontWeight={400}>{lastSynced || 'Not yet synced'}</Text>
                </AutoLayout>
              </AutoLayout>
            </AutoLayout>
          </AutoLayout>
        </AutoLayout>
      )}
    </AutoLayout>
  );
}

// --- Helper: field row for compact view ---
function FieldRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <AutoLayout direction="horizontal" spacing={8} width="fill-parent" verticalAlignItems="center">
      <Text fontSize={10} fill="#8993A4" fontWeight={600} width={80}>
        {label}
      </Text>
      {color ? (
        <AutoLayout direction="horizontal" spacing={4} verticalAlignItems="center">
          <AutoLayout width={6} height={6} cornerRadius={3} fill={color} />
          <Text fontSize={11} fill="#172B4D" fontWeight={400}>
            {value}
          </Text>
        </AutoLayout>
      ) : (
        <Text fontSize={11} fill="#172B4D" fontWeight={400}>
          {value}
        </Text>
      )}
    </AutoLayout>
  );
}

// --- Helper: Atlassian-style expanded field row with children ---
function ExpandedFieldRow({ label, children }: { label: string; children: FigmaDeclarativeNode }) {
  return (
    <AutoLayout direction="horizontal" spacing={12} verticalAlignItems="center" width="fill-parent" padding={{ top: 14, bottom: 14 }}>
      <Text fontSize={13} fill="#6B778C" fontWeight={700} width={110}>
        {label}
      </Text>
      {children}
    </AutoLayout>
  );
}

// --- Normalize Jira API response to IssueData ---
function normalizeIssue(raw: any): IssueData {
  const f = raw.fields || {};

  // Sprint extraction
  const sprintField = f.customfield_10020;
  let sprint: string | null = null;
  if (sprintField) {
    const arr = Array.isArray(sprintField) ? sprintField : [sprintField];
    const active = arr.find((s: any) => s.state === 'active') || arr[arr.length - 1];
    sprint = active?.name || null;
  }

  // Epic / parent key
  const epicKey = f.parent?.key || f.customfield_10014 || null;

  // Labels
  const labels: string[] = Array.isArray(f.labels) ? f.labels : [];

  // Description — plain text extract (strip ADF/markdown)
  var desc = '';
  if (typeof f.description === 'string') {
    desc = f.description;
  } else if (f.description && f.description.content) {
    // ADF format — extract text nodes
    desc = extractAdfText(f.description);
  }

  // Project key from issue key (e.g. "CRT-123" → "CRT")
  var projectKey = raw.key ? raw.key.split('-')[0] : '';

  return {
    key: raw.key,
    summary: f.summary || '',
    description: desc,
    status: f.status?.name || 'Unknown',
    statusCategory: f.status?.statusCategory?.key || 'new',
    issueType: f.issuetype?.name || 'Task',
    issueTypeIconUrl: f.issuetype?.iconUrl || '',
    issueTypeIconData: '',
    priority: f.priority?.name || 'Medium',
    priorityIconUrl: f.priority?.iconUrl || '',
    priorityIconData: '',
    assignee: f.assignee?.displayName || 'Unassigned',
    storyPoints: f.customfield_10016 ?? null,
    sprint,
    epicKey,
    labels,
    projectKey,
  };
}

// --- Extract plain text from Atlassian Document Format ---
function extractAdfText(adf: any): string {
  if (!adf) return '';
  if (adf.type === 'text') return adf.text || '';
  if (adf.type === 'hardBreak') return '\n';
  if (!adf.content) return '';
  var parts: string[] = [];
  for (var i = 0; i < adf.content.length; i++) {
    var child = adf.content[i];
    var text = extractAdfText(child);
    if (child.type === 'paragraph' || child.type === 'heading') {
      parts.push(text + '\n');
    } else if (child.type === 'bulletList' || child.type === 'orderedList') {
      parts.push(text);
    } else if (child.type === 'listItem') {
      parts.push('• ' + text + '\n');
    } else {
      parts.push(text);
    }
  }
  return parts.join('').trim();
}

// --- Create new widget instances for imported issues ---
async function createIssueCards(issues: IssueData[], sourceWidgetId: string) {
  const sourceNode = await figma.getNodeByIdAsync(sourceWidgetId) as WidgetNode | null;
  if (!sourceNode) return;

  var CARD_WIDTH = 290;
  var CARD_HEIGHT = 160;
  var GAP = 20;
  var COLS = 5;

  var startX = sourceNode.x + 320;
  var startY = sourceNode.y;
  var created: SceneNode[] = [];
  var syncedTime = new Date().toLocaleTimeString();

  for (var i = 0; i < issues.length; i++) {
    var col = i % COLS;
    var row = Math.floor(i / COLS);

    // cloneWidget expects raw values, not JSON.stringify'd strings
    var cloned = sourceNode.cloneWidget({
      issue: issues[i],
      expanded: false,
      lastSynced: syncedTime,
    });

    cloned.name = issues[i].key; // used by link-issue to identify this widget on canvas
    cloned.x = startX + col * (CARD_WIDTH + GAP);
    cloned.y = startY + row * (CARD_HEIGHT + GAP);
    created.push(cloned);
  }

  figma.notify('Added ' + issues.length + ' issue' + (issues.length > 1 ? 's' : '') + ' to canvas');
  if (created.length > 0) {
    figma.viewport.scrollAndZoomIntoView(created);
  }
}

widget.register(JiraIssueCard);
