import React, { useState } from 'react';
import { JiraIssue } from '../types';

interface DrawerProps {
  issue: JiraIssue | null;
  onClose: () => void;
  onSave: (issueKey: string, changes: Record<string, unknown>) => Promise<void>;
}

// Color maps from main.tsx
const TC: Record<string, { color: string; icon: string }> = {
  Epic:    { color: '#7C3AED', icon: '⚡' },
  Feature: { color: '#0284C7', icon: '✨' },
  Story:   { color: '#2563EB', icon: '📖' },
  Bug:     { color: '#DC2626', icon: '🐛' },
};
const PC: Record<string, { color: string }> = {
  Critical: { color: '#EF4444' },
  High:     { color: '#F97316' },
  Medium:   { color: '#EAB308' },
  Low:      { color: '#D1D5DB' },
};
const SC: Record<string, { bg: string; c: string; b: string }> = {
  'To Do':      { bg: '#F3F4F6', c: '#6B7280', b: '#E5E7EB' },
  'In Progress':{ bg: '#EFF6FF', c: '#2563EB', b: '#BFDBFE' },
  Done:         { bg: '#F0FDF4', c: '#16A34A', b: '#BBF7D0' },
};

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

  const typeColor = TC[issue.type]?.color || '#0284C7';
  const priColor = PC[issue.priority]?.color || '#D1D5DB';
  const statusStyle = SC[issue.status] || SC['To Do'];

  return (
    <div
      className="draw-overlay"
      onClick={onClose}
    >
      <div className="draw-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="draw-header">
          <div className="draw-key-row">
            {issue.typeIconUrl ? (
              <img src={issue.typeIconUrl} width={18} height={18} alt={issue.type} />
            ) : (
              <span style={{ fontSize: 16 }}>{TC[issue.type]?.icon || '📝'}</span>
            )}
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1E293B' }}>
              {issue.key}
            </h2>
          </div>
          <button className="draw-close" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {/* Main layout: content + sidebar */}
        <div className="draw-body">
          {/* Left content */}
          <div className="draw-content">
            {/* Title */}
            <div className="draw-section">
              <label className="draw-label">Summary</label>
              <input
                type="text"
                value={currentValue('title')}
                onChange={e => handleChange('title', e.target.value)}
                className="draw-title-input"
                placeholder="Issue summary"
              />
            </div>

            {/* Description */}
            <div className="draw-section">
              <label className="draw-label">Description</label>
              <textarea
                value={currentValue('description') || ''}
                onChange={e => handleChange('description', e.target.value)}
                className="draw-desc-input"
                placeholder="Add a description..."
                rows={4}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="draw-error">
                {error}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="draw-sidebar">
            {/* Status */}
            <div className="draw-sidebar-field">
              <div className="draw-sidebar-label">Status</div>
              <select
                value={currentValue('status')}
                onChange={e => handleChange('status', e.target.value)}
                className="draw-status-select"
                style={{
                  background: statusStyle.bg,
                  color: statusStyle.c,
                  borderColor: statusStyle.b,
                }}
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>
            </div>

            {/* Assignee */}
            <div className="draw-sidebar-field">
              <div className="draw-sidebar-label">Assignee</div>
              <input
                type="text"
                value={currentValue('assignee')}
                onChange={e => handleChange('assignee', e.target.value)}
                className="draw-sidebar-input"
                placeholder="Unassigned"
              />
            </div>

            {/* Priority */}
            <div className="draw-sidebar-field">
              <div className="draw-sidebar-label">Priority</div>
              <div className="draw-priority-row">
                {issue.priorityIconUrl ? (
                  <img src={issue.priorityIconUrl} width={16} height={16} alt={issue.priority} style={{ flexShrink: 0 }} />
                ) : (
                  <span
                    className="draw-priority-dot"
                    style={{ background: priColor }}
                  />
                )}
                <select
                  value={currentValue('priority')}
                  onChange={e => handleChange('priority', e.target.value)}
                  className="draw-sidebar-select"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Story Points */}
            <div className="draw-sidebar-field">
              <div className="draw-sidebar-label">Story Points</div>
              <input
                type="number"
                value={currentValue('points') || ''}
                onChange={e => handleChange('points', e.target.value ? parseInt(e.target.value) : null)}
                className="draw-sidebar-input draw-points-input"
                placeholder="—"
              />
            </div>

            {/* Divider */}
            <div className="draw-divider" />

            {/* Type */}
            <div className="draw-sidebar-field draw-sidebar-readonly">
              <div className="draw-sidebar-label">Type</div>
              <div style={{ color: '#1E293B', fontSize: 13, fontWeight: 500 }}>
                {issue.type}
              </div>
            </div>

            {/* Created/Updated timestamps */}
            <div className="draw-sidebar-field draw-sidebar-readonly">
              <div className="draw-sidebar-label">Updated</div>
              <div style={{ color: '#64748B', fontSize: 11 }}>
                Just now
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="draw-footer">
          <button
            onClick={onClose}
            disabled={saving}
            className="draw-btn draw-btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || Object.keys(changes).length === 0}
            className="draw-btn draw-btn-primary"
          >
            {saving ? '↻ Syncing...' : '✓ Save & Sync'}
          </button>
        </div>
      </div>
    </div>
  );
};
