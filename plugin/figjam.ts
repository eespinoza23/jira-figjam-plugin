import { JiraIssue } from './types';

export interface FigJamIssueShape {
  id: string;
  issueKey: string;
  x: number;
  y: number;
}

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
    sticky.text = `${issue.key}\n${issue.title}\n${issue.assignee} • ${issue.points || '?'}pts`;

    // Store reference for later syncing
    issueShapes.set(issue.key, {
      id: sticky.id,
      issueKey: issue.key,
      x,
      y,
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

export function setupFigJamListeners(): void {
  if (typeof figma === 'undefined') return;

  // Listen for selection changes to provide context for placement
  figma.on('selectionchange', () => {
    const { x, y } = getSelectedIssuePosition();
    // Emit event to React component for UI update if needed
    window.postMessage({ type: 'selectionchange', x, y }, '*');
  });
}
