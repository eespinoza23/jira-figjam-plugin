import axios, { AxiosError } from 'axios';
import { SearchResponse, JiraIssue } from './types';

const API_BASE = '/api';

export async function searchJira(jql: string, token: string): Promise<SearchResponse> {
  try {
    const response = await axios.post<JiraIssue[]>(`${API_BASE}/jira-search`, { jql }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { issues: response.data, total: response.data.length };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error || 'JQL search failed');
    }
    throw error;
  }
}

export async function updateIssueInJira(
  issueKey: string,
  changes: Record<string, unknown>,
  token: string
): Promise<void> {
  try {
    await axios.put(`${API_BASE}/jira-update`, { issueKey, updates: changes }, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error || 'Failed to update issue');
    }
    throw error;
  }
}

export async function syncIssueFromJira(
  issueKey: string,
  token: string
): Promise<JiraIssue> {
  try {
    const response = await axios.get<JiraIssue>(`${API_BASE}/jira-search?key=${issueKey}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error || 'Failed to sync issue');
    }
    throw error;
  }
}

export async function fetchJiraFields(token: string) {
  try {
    const response = await axios.get(`${API_BASE}/jira-fields`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error || 'Failed to fetch fields');
    }
    throw error;
  }
}
