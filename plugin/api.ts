import { SearchResponse, JiraIssue } from './types';

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
    throw new Error(error.error || `API Error: ${response.statusText}`);
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
): Promise<void> {
  await apiCall('/jira-update', 'PUT', { issueKey, updates: changes });
}

export async function syncIssueFromJira(issueKey: string): Promise<JiraIssue> {
  return apiCall<JiraIssue>(`/jira-search?key=${issueKey}`, 'GET');
}

export async function fetchJiraFields() {
  return apiCall('/jira-fields', 'GET');
}
