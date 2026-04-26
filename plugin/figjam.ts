import { JiraIssue } from './types';

export interface FigJamIssueShape {
  id: string;
  issueKey: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Professional default dimensions for cards
const DEFAULT_WIDTH = 280;
const DEFAULT_HEIGHT = 160;
const MIN_WIDTH = 200;
const MAX_WIDTH = 600;
const MIN_HEIGHT = 120;
const MAX_HEIGHT = 400;

let issueShapes: Map<string, FigJamIssueShape> = new Map();

export async function addIssueToCanvas(issue: JiraIssue, x: number, y: number): Promise<void> {
  if (typeof figma === 'undefined') {
    console.warn('Figma API not available');
    return;
  }

  try {
    // Create a sticky note on FigJam with issue info
    const sticky = figma.createSticky();
    sticky.x = x;
    sticky.y = y;
    // Set professional default dimensions
    sticky.width = DEFAULT_WIDTH;
    sticky.height = DEFAULT_HEIGHT;
    sticky.text = `${issue.key}\n${issue.title}\n${issue.assignee} • ${issue.points || '?'}pts`;

    // Store reference with dimensions for later syncing
    issueShapes.set(issue.key, {
      id: sticky.id,
      issueKey: issue.key,
      x,
      y,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
    });
  } catch (error) {
    console.error('Failed to create FigJam sticky:', error);
  }
}

export async function updateIssueOnCanvas(issue: JiraIssue): Promise<void> {
  if (typeof figma === 'undefined') return;

  const shape = issueShapes.get(issue.key);
  if (!shape) return;

  try {
    const node = figma.getNodeById(shape.id);
    if (node && 'text' in node) {
      (node as any).text = `${issue.key}\n${issue.title}\n${issue.assignee} • ${issue.points || '?'}pts`;
    }
  } catch (error) {
    console.error('Failed to update FigJam sticky:', error);
  }
}

export function getSelectedIssuePosition(): { x: number; y: number } {
  if (typeof figma === 'undefined') {
    return { x: 0, y: 0 };
  }

  const selection = figma.currentPage.selection;
  if (selection.length > 0) {
    const lastSelected = selection[selection.length - 1];
    return {
      x: lastSelected.x + lastSelected.width + 16,
      y: lastSelected.y,
    };
  }

  // Default position on canvas
  return { x: 200, y: 200 };
}

export function enforceCardConstraints(): void {
  if (typeof figma === 'undefined') return;

  const selection = figma.currentPage.selection;
  selection.forEach(node => {
    let modified = false;

    // Enforce width constraints
    if (node.width < MIN_WIDTH) {
      node.width = MIN_WIDTH;
      modified = true;
    } else if (node.width > MAX_WIDTH) {
      node.width = MAX_WIDTH;
      modified = true;
    }

    // Enforce height constraints
    if (node.height < MIN_HEIGHT) {
      node.height = MIN_HEIGHT;
      modified = true;
    } else if (node.height > MAX_HEIGHT) {
      node.height = MAX_HEIGHT;
      modified = true;
    }

    // Update tracked dimensions if it's an issue card
    const matchingEntry = Array.from(issueShapes.entries()).find(([_, shape]) => shape.id === node.id);
    if (matchingEntry && modified) {
      const [key, shape] = matchingEntry;
      issueShapes.set(key, {
        ...shape,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
      });
    }
  });
}

export function trackCardPositions(): void {
  if (typeof figma === 'undefined') return;

  const selection = figma.currentPage.selection;
  selection.forEach(node => {
    const matchingEntry = Array.from(issueShapes.entries()).find(([_, shape]) => shape.id === node.id);
    if (matchingEntry) {
      const [key, shape] = matchingEntry;
      issueShapes.set(key, {
        ...shape,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
      });
    }
  });
}

export function setupFigJamListeners(): void {
  if (typeof figma === 'undefined') return;

  // Listen for selection changes to provide context for placement and track dimensions
  figma.on('selectionchange', () => {
    trackCardPositions();
    enforceCardConstraints();
    const { x, y } = getSelectedIssuePosition();
    // Emit event to React component for UI update if needed
    window.postMessage({ type: 'selectionchange', x, y }, '*');
  });
}
