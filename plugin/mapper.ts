import { JiraIssue } from './types';

export interface JiraAPIIssue {
  key: string;
  fields: {
    summary: string;
    issuetype: { name: string };
    priority: { name: string } | null;
    assignee: { displayName: string } | null;
    customfield_10000?: number | null; // Story points (varies by Jira config)
    status: { name: string };
    sprint?: { name: string } | null;
    labels: string[];
    components: Array<{ name: string }>;
    parent?: { key: string };
    fixVersions: Array<{ name: string }>;
    reporter: { displayName: string };
    updated: string;
  };
}

export function mapJiraIssue(jiraIssue: JiraAPIIssue): JiraIssue {
  const fields = jiraIssue.fields;

  return {
    key: jiraIssue.key,
    type: mapIssuetype(fields.issuetype?.name || ''),
    priority: mapPriority(fields.priority?.name || 'Medium'),
    title: fields.summary || jiraIssue.key,
    assignee: fields.assignee?.displayName || 'Unassigned',
    points: fields.customfield_10000 || null,
    status: mapStatus(fields.status?.name || ''),
    sprint: fields.sprint?.name || 'Backlog',
    labels: fields.labels || [],
    components: fields.components?.map(c => c.name) || [],
    epicLink: fields.parent?.key || null,
    fixVersion: fields.fixVersions?.[0]?.name || 'Unassigned',
    reporter: fields.reporter?.displayName || 'Unknown',
    updated: fields.updated ? formatDate(fields.updated) : 'Unknown',
  };
}

function mapIssuetype(type: string): 'Epic' | 'Feature' | 'Story' | 'Bug' {
  const normalized = type.toLowerCase();
  if (normalized.includes('epic')) return 'Epic';
  if (normalized.includes('bug')) return 'Bug';
  if (normalized.includes('story')) return 'Story';
  if (normalized.includes('task') || normalized.includes('feature')) return 'Feature';
  return 'Story';
}

function mapPriority(priority: string): 'Critical' | 'High' | 'Medium' | 'Low' {
  const normalized = priority.toLowerCase();
  if (normalized.includes('critical') || normalized.includes('blocker')) return 'Critical';
  if (normalized.includes('high')) return 'High';
  if (normalized.includes('low')) return 'Low';
  return 'Medium';
}

function mapStatus(status: string): 'To Do' | 'In Progress' | 'Done' {
  const normalized = status.toLowerCase();
  if (normalized.includes('done') || normalized.includes('closed')) return 'Done';
  if (normalized.includes('progress') || normalized.includes('development')) return 'In Progress';
  return 'To Do';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
