import React, { useState } from 'react';
import { JiraIssue } from '../types';

interface CardProps {
  issue: JiraIssue;
  diffs: Record<string, unknown>;
  onSync: (issueKey: string) => Promise<void>;
  onEdit: (issue: JiraIssue) => void;
}

export const Card: React.FC<CardProps> = ({ issue, diffs, onSync, onEdit }) => {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await onSync(issue.key);
    } finally {
      setSyncing(false);
    }
  };

  const hasDiffs = Object.keys(diffs).length > 0;
  const lastSyncedTime = issue.lastSynced
    ? new Date(issue.lastSynced).toLocaleTimeString()
    : 'Never';

  return (
    <div
      style={{
        background: '#fff',
        border: hasDiffs ? '2px solid #FCD34D' : '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '12px',
        cursor: 'pointer',
        position: 'relative',
        transition: 'border-color 0.2s',
      }}
      onClick={() => onEdit(issue)}
    >
      {hasDiffs && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: '#FCD34D',
            color: '#78350F',
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '8px',
            fontWeight: '600',
          }}
        >
          MODIFIED
        </div>
      )}

      <div style={{ fontSize: '12px', color: '#2563EB', fontWeight: '600', marginBottom: '4px' }}>
        {issue.key}
      </div>
      <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: '#111827' }}>
        {issue.title}
      </div>
      <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
        {issue.assignee} • {issue.points}pts • {issue.status}
      </div>

      <div
        style={{
          fontSize: '9px',
          color: '#999',
          marginBottom: '8px',
          borderTop: '1px solid #eee',
          paddingTop: '6px',
        }}
      >
        Synced: {lastSyncedTime}
      </div>

      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSync();
          }}
          disabled={syncing}
          style={{
            flex: 1,
            padding: '6px',
            background: syncing ? '#ccc' : '#3B82F6',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: syncing ? 'not-allowed' : 'pointer',
            fontSize: '10px',
            fontWeight: '600',
          }}
        >
          {syncing ? '⟳ Syncing...' : '↻ Sync'}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(issue);
          }}
          style={{
            flex: 1,
            padding: '6px',
            background: '#10B981',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '10px',
            fontWeight: '600',
          }}
        >
          ✎ Edit
        </button>
      </div>
    </div>
  );
};
