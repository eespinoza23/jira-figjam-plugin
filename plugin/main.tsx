import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { AppState, JiraIssue } from './types';
import { mapJiraIssue, JiraAPIIssue } from './mapper';
import { syncIssueFromJira, updateIssueInJira } from './api';
import { Card } from './components/Card';
import { Drawer } from './components/Drawer';
import { addIssueToCanvas, setupFigJamListeners, getSelectedIssuePosition } from './figjam';
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
  const [editingIssue, setEditingIssue] = useState<JiraIssue | null>(null);
  const [instanceInput, setInstanceInput] = useState<string>('');

  useEffect(() => {
    checkAuth();
    setupFigJamListeners();
  }, []);

  const normalizeInstance = (instance: string): string => {
    return instance
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .trim();
  };

  const validateInstance = (instance: string): boolean => {
    return /^[a-z0-9-]+\.atlassian\.net$/.test(instance);
  };

  const handleConnect = () => {
    const cleanInstance = normalizeInstance(instanceInput);
    if (!validateInstance(cleanInstance)) {
      setState(prev => ({ ...prev, error: 'Invalid Jira instance. Use format: myinstance.atlassian.net' }));
      return;
    }
    sessionStorage.setItem('jira_instance', cleanInstance);
    setState(prev => ({ ...prev, jiraInstance: cleanInstance }));
    window.location.href = `/api/jira-auth?instance=${encodeURIComponent(cleanInstance)}`;
  };

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/jira-me', {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        setState(prev => ({ ...prev, authenticated: true, error: null }));
      } else {
        const data = await response.json().catch(() => ({}));
        setState(prev => ({
          ...prev,
          authenticated: false,
          error: `Auth failed (${response.status}): ${data.error || 'unknown error'}`,
        }));
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };

  const handleJQLSearch = async () => {
    const jqlInput = document.querySelector('#jql') as HTMLTextAreaElement;
    if (!jqlInput || !jqlInput.value.trim()) {
      setState(prev => ({ ...prev, error: 'Enter a JQL query' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch('/api/jira-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jql: jqlInput.value }),
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          setState(prev => ({ ...prev, authenticated: false, error: 'Not authenticated', loading: false }));
          return;
        }
        const errData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errData.error || `Search failed: ${response.statusText}`);
      }

      const rawIssues = await response.json() as JiraAPIIssue[];
      const mappedIssues = rawIssues.map(mapJiraIssue);
      setState(prev => ({ ...prev, issues: mappedIssues, loading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Search failed',
        loading: false,
      }));
    }
  };

  const handleImport = async () => {
    const selected = Array.from(state.selected).map(key =>
      state.issues.find(i => i.key === key)
    ).filter(Boolean) as JiraIssue[];

    // Place issues on FigJam canvas
    let yOffset = 0;
    const { x: baseX, y: baseY } = getSelectedIssuePosition();
    for (const issue of selected) {
      await addIssueToCanvas(issue, baseX, baseY + yOffset);
      yOffset += 160; // Spacing between stickies
    }

    setState(prev => ({
      ...prev,
      imported: selected,
      selected: new Set(),
    }));
  };

  const handleLogout = () => {
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

  const handleSync = async (issueKey: string) => {
    try {
      const freshIssue = await syncIssueFromJira(issueKey);
      const currentIssue = state.imported.find(i => i.key === issueKey);

      if (currentIssue) {
        const detectedDiffs: Record<string, unknown> = {};
        const fieldsToCheck: (keyof JiraIssue)[] = ['title', 'status', 'assignee', 'points', 'priority'];

        fieldsToCheck.forEach(field => {
          if (currentIssue[field] !== freshIssue[field]) {
            detectedDiffs[field] = {
              old: currentIssue[field],
              new: freshIssue[field],
            };
          }
        });

        setState(prev => ({
          ...prev,
          imported: prev.imported.map(i =>
            i.key === issueKey
              ? { ...freshIssue, lastSynced: new Date().toISOString() }
              : i
          ),
          diffs: { ...prev.diffs, [issueKey]: detectedDiffs },
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Sync failed',
      }));
    }
  };

  const handleEdit = (issue: JiraIssue) => {
    setEditingIssue(issue);
  };

  const handleSaveEdit = async (issueKey: string, changes: Record<string, unknown>) => {
    try {
      const updatedIssue = await updateIssueInJira(issueKey, changes);

      setState(prev => ({
        ...prev,
        imported: prev.imported.map(i =>
          i.key === issueKey
            ? { ...updatedIssue, lastSynced: new Date().toISOString() }
            : i
        ),
        diffs: { ...prev.diffs, [issueKey]: {} },
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Update failed',
      }));
      throw error;
    }
  };

  return (
    <div id="app" style={{ display: 'flex', height: '100vh', position: 'relative' }}>
      {/* Left Panel */}
      <div style={{ width: '320px', borderRight: '1px solid #ccc', padding: '16px', overflowY: 'auto' }}>
        <h2>🔌 Jira Multi-Import</h2>
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>for FigJam</p>

        {!state.authenticated ? (
          <>
            <label style={{ fontSize: '10px', color: '#666', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>
              JIRA INSTANCE URL
            </label>
            <input
              type="text"
              placeholder="e.g., mycompany.atlassian.net"
              value={instanceInput}
              onChange={e => setInstanceInput(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '11px',
              }}
            />
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
          </>
        ) : (
          <>
            <div style={{ fontSize: '12px', color: '#4ADE80', marginBottom: '12px', padding: '8px', background: '#0F2A1A', borderRadius: '4px' }}>
              ✓ {state.jiraInstance} - Connected
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
                <label style={{ fontSize: '10px', color: '#666', letterSpacing: '0.1em', display: 'block', marginTop: '12px', marginBottom: '8px' }}>
                  {state.selected.size} of {state.issues.length} selected
                </label>
                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '8px' }}>
                  {state.issues.map(issue => (
                    <div
                      key={issue.key}
                      onClick={() => {
                        const newSelected = new Set(state.selected);
                        if (newSelected.has(issue.key)) {
                          newSelected.delete(issue.key);
                        } else {
                          newSelected.add(issue.key);
                        }
                        setState(prev => ({ ...prev, selected: newSelected }));
                      }}
                      style={{
                        padding: '8px',
                        borderBottom: '1px solid #eee',
                        cursor: 'pointer',
                        background: state.selected.has(issue.key) ? '#EFF6FF' : '#fff',
                        transition: 'background 0.15s',
                      }}
                    >
                      <div style={{ fontSize: '9px', color: '#2563EB', fontWeight: '600', marginBottom: '2px' }}>
                        {issue.key} · {issue.type}
                      </div>
                      <div style={{ fontSize: '10px', color: '#111827', fontWeight: '500', marginBottom: '4px' }}>
                        {issue.title}
                      </div>
                      <div style={{ fontSize: '8px', color: '#666' }}>
                        {issue.assignee} · {issue.points ? issue.points + 'pts' : '—'} · {issue.status}
                      </div>
                    </div>
                  ))}
                </div>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {state.imported.map(issue => (
              <Card
                key={issue.key}
                issue={issue}
                diffs={state.diffs[issue.key] || {}}
                onSync={handleSync}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}
      </div>

      <Drawer
        issue={editingIssue}
        onClose={() => setEditingIssue(null)}
        onSave={handleSaveEdit}
      />
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root') || document.body);
root.render(<App />);
