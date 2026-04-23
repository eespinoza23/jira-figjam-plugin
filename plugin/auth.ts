const TOKEN_KEY = 'jira_access_token';
const INSTANCE_KEY = 'jira_instance';

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string, instance: string = 'intact.atlassian.net'): void {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(INSTANCE_KEY, instance);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(INSTANCE_KEY);
}

export function getInstance(): string {
  return sessionStorage.getItem(INSTANCE_KEY) || 'intact.atlassian.net';
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

export function getAuthHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
