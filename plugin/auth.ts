const INSTANCE_KEY = 'jira_instance';

export function getInstance(): string {
  return sessionStorage.getItem(INSTANCE_KEY) || 'intact.atlassian.net';
}

export function setInstance(instance: string): void {
  sessionStorage.setItem(INSTANCE_KEY, instance);
}

export function clearSession(): void {
  sessionStorage.removeItem(INSTANCE_KEY);
}

// Verify auth by attempting an API call
export async function checkAuthenticated(): Promise<boolean> {
  try {
    const response = await fetch('/api/jira-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jql: 'project = CRT AND maxResults=0' }),
      credentials: 'include',
    });
    return response.ok || response.status !== 401;
  } catch {
    return false;
  }
}

// Logout by clearing session storage
export async function logout(): Promise<void> {
  clearSession();
  // Could call an API endpoint to invalidate server-side session if needed
}
