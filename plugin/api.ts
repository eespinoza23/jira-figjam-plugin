import { SearchResponse, JiraIssue } from './types';
import { mapJiraIssue, JiraAPIIssue } from './mapper';

const API_BASE = '/api';

async function apiCall<T>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' = 'POST',
  body?: unknown
): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    const detail = error.detail ? ` — ${JSON.stringify(error.detail)}` : '';
    throw new Error((error.error || `API Error: ${response.statusText}`) + detail);
  }

  return response.json();
}

export async function searchJira(jql: string): Promise<SearchResponse> {
  const issues = await apiCall<JiraIssue[]>('/jira-search', 'POST', { jql });
  return { issues, total: issues.length };
}

export async function updateIssueInJira(
  issueKey: string,
  changes: Record<string, unknown>
): Promise<JiraIssue> {
  await apiCall('/jira-update', 'PUT', { issueKey, updates: changes });
  return syncIssueFromJira(issueKey);
}

export async function syncIssueFromJira(issueKey: string): Promise<JiraIssue> {
  const result = await apiCall<JiraAPIIssue[]>('/jira-search', 'POST', { jql: `key = ${issueKey}` });
  if (!result || result.length === 0) throw new Error(`Issue ${issueKey} not found`);
  return mapJiraIssue(result[0]);
}

export async function fetchJiraFields() {
  return apiCall('/jira-fields', 'GET');
}
