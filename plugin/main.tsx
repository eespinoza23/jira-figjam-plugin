import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { AppState, JiraIssue } from './types';
import { searchJira, updateIssueInJira } from './api';
import { getToken, setToken, clearToken } from './auth';
import './styles.css';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    authenticated: false,
    token: null,
    issues: [],
    imported: [],
    selected: new Set(),
    diffs: {},
    loading: false,
    error: null,
    jiraInstance: 'intact.atlassian.net',
  });

  useEffect(() => {
    const token = getToken();
    if (token) {
      setState(prev => ({ ...prev, authenticated: true, token }));
    }
  }, []);

  const handleConnect = () => {
    const callbackUrl = `${window.location.origin}/callback`;
    window.location.href = `/api/jira-auth?redirect=${encodeURIComponent(callbackUrl)}`;
  };

  const handleJQLSearch = async () => {
    const jqlInput = document.querySelector('#jql') as HTMLTextAreaElement;
    if (!jqlInput || !state.token) return;

    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await searchJira(jqlInput.value, state.token);
      setState(prev => ({ ...prev, issues: response.issues, loading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Search failed',
        loading: false,
      }));
    }
  };

  const handleImport = () => {
    const selected = Array.from(state.selected).map(key =>
      state.issues.find(i => i.key === key)
    ).filter(Boolean) as JiraIssue[];

    setState(prev => ({
      ...prev,
      imported: selected,
      selected: new Set(),
    }));
  };

  const handleSaveEdit = async (issueKey: string, changes: Record<string, unknown>) => {
    if (!state.token) return;

    try {
      await updateIssueInJira(issueKey, changes, state.token);
      setState(prev => ({
        ...prev,
        imported: prev.imported.map(i =>
          i.key === issueKey
            ? { ...i, ...changes, lastSynced: new Date().toISOString() }
            : i
        ),
        diffs: { ...prev.diffs, [issueKey]: {} },
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Update failed',
      }));
    }
  };

  const handleLogout = () => {
    clearToken();
    setState({
      authenticated: false,
      token: null,
      issues: [],
      imported: [],
      selected: new Set(),
      diffs: {},
      loading: false,
      error: null,
      jiraInstance: 'intact.atlassian.net',
    });
  };

  return (
    <div id="app" style={{ display: 'flex', height: '100vh' }}>
      {/* Left Panel */}
      <div style={{ width: '320px', borderRight: '1px solid #ccc', padding: '16px', overflowY: 'auto' }}>
        <h2>🔌 Jira Multi-Import</h2>
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>for FigJam</p>

        {!state.authenticated ? (
          <button
            onClick={handleConnect}
            style={{
              width: '100%',
              padding: '12px',
              background: '#2563EB',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Connect Jira
          </button>
        ) : (
          <>
            <div style={{ fontSize: '12px', color: '#4ADE80', marginBottom: '12px', padding: '8px', background: '#0F2A1A', borderRadius: '4px' }}>
              ✓ {state.jiraInstance}
            </div>
            <label style={{ fontSize: '10px', color: '#666', letterSpacing: '0.1em' }}>JQL QUERY</label>
            <textarea
              id="jql"
              rows={3}
              defaultValue="project = CRT AND sprint in openSprints()"
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '11px',
              }}
            />
            <button
              onClick={handleJQLSearch}
              disabled={state.loading}
              style={{
                width: '100%',
                padding: '10px',
                background: state.loading ? '#ccc' : '#2563EB',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: state.loading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                marginBottom: '16px',
              }}
            >
              {state.loading ? '⟳ Searching...' : '▶ Execute JQL'}
            </button>

            {state.error && (
              <div style={{ fontSize: '12px', color: '#EF4444', background: '#FEE2E2', padding: '8px', borderRadius: '4px', marginBottom: '12px' }}>
                {state.error}
              </div>
            )}

            {state.issues.length > 0 && (
              <>
                <label style={{ fontSize: '10px', color: '#666', letterSpacing: '0.1em' }}>
                  {state.selected.size} of {state.issues.length} selected
                </label>
                <button
                  onClick={handleImport}
                  disabled={state.selected.size === 0}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: state.selected.size === 0 ? '#ccc' : '#10B981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: state.selected.size === 0 ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    marginTop: '8px',
                  }}
                >
                  ↗ Import {state.selected.size} selected
                </button>
              </>
            )}

            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '8px',
                background: '#f5f5f5',
                color: '#666',
                border: '1px solid #ddd',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                marginTop: '16px',
              }}
            >
              Logout
            </button>
          </>
        )}
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, background: '#f9fafb', padding: '20px', overflowY: 'auto' }}>
        {state.imported.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', paddingTop: '100px' }}>
            <div style={{ fontSize: '40px', marginBottom: '20px' }}>⬡</div>
            Import issues to see them here
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
            {state.imported.map(issue => (
              <div
                key={issue.key}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '12px', color: '#2563EB', fontWeight: '600', marginBottom: '4px' }}>
                  {issue.key}
                </div>
                <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: '#111827' }}>
                  {issue.title}
                </div>
                <div style={{ fontSize: '11px', color: '#666' }}>
                  {issue.assignee} • {issue.points}pts • {issue.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root') || document.body);
root.render(<App />);
