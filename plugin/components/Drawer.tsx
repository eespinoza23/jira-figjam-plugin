import React, { useState } from 'react';
import { JiraIssue } from '../types';

interface DrawerProps {
  issue: JiraIssue | null;
  onClose: () => void;
  onSave: (issueKey: string, changes: Record<string, unknown>) => Promise<void>;
}

export const Drawer: React.FC<DrawerProps> = ({ issue, onClose, onSave }) => {
  const [changes, setChanges] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!issue) return null;

  const currentValue = (field: keyof JiraIssue) => {
    return (changes[field] ?? issue[field]) as string | number;
  };

  const handleChange = (field: keyof JiraIssue, value: unknown) => {
    setChanges(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSave = async () => {
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      await onSave(issue.key, changes);
      setChanges({});
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.3)',
        display: 'flex',
        justifyContent: 'flex-end',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          width: '400px',
          height: '100vh',
          overflowY: 'auto',
          boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, marginBottom: '16px', color: '#111827' }}>
          {issue.key}: {issue.title}
        </h2>

        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
              Title
            </label>
            <input
              type="text"
              value={currentValue('title')}
              onChange={e => handleChange('title', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
              Status
            </label>
            <select
              value={currentValue('status')}
              onChange={e => handleChange('status', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            >
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
              Assignee
            </label>
            <input
              type="text"
              value={currentValue('assignee')}
              onChange={e => handleChange('assignee', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
              Story Points
            </label>
            <input
              type="number"
              value={currentValue('points') || ''}
              onChange={e => handleChange('points', e.target.value ? parseInt(e.target.value) : null)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
              Priority
            </label>
            <select
              value={currentValue('priority')}
              onChange={e => handleChange('priority', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>

        {error && (
          <div
            style={{
              background: '#FEE2E2',
              color: '#DC2626',
              padding: '8px',
              borderRadius: '4px',
              fontSize: '12px',
              marginBottom: '12px',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              flex: 1,
              padding: '10px',
              background: '#f5f5f5',
              color: '#666',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || Object.keys(changes).length === 0}
            style={{
              flex: 1,
              padding: '10px',
              background:
                saving || Object.keys(changes).length === 0 ? '#ccc' : '#10B981',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: saving || Object.keys(changes).length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            {saving ? '↻ Syncing...' : '✓ Save & Sync'}
          </button>
        </div>
      </div>
    </div>
  );
};
