import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { JiraIssue } from './types';
import { mapJiraIssue, JiraAPIIssue } from './mapper';
import { updateIssueInJira, syncIssueFromJira } from './api';
import { addIssueToCanvas, setupFigJamListeners, getSelectedIssuePosition } from './figjam';
import './styles.css';

// ── Constants ──────────────────────────────────────────────────
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

const FIELD_DEFS = [
  { k: 'assignee',   label: 'Assignee',           def: true },
  { k: 'priority',   label: 'Priority',            def: true },
  { k: 'points',     label: 'Story Points',        def: true },
  { k: 'status',     label: 'Status',              def: true },
  { k: 'sprint',     label: 'Sprint / Iteration',  def: true },
  { k: 'labels',     label: 'Labels',              def: true },
  { k: 'components', label: 'Components',          def: false },
  { k: 'epicLink',   label: 'Epic Link',           def: false },
  { k: 'fixVersion', label: 'Fix Version',         def: false },
  { k: 'reporter',   label: 'Reporter',            def: false },
  { k: 'updated',    label: 'Last Updated',        def: false },
];

// ── Helpers ────────────────────────────────────────────────────
const ini = (n: string) => n === 'Unassigned' ? '?' : n.split(' ').map(x => x[0]).join('');
function Avatar({ name, color, cls = 'm-avatar' }: { name: string; color: string; cls?: string }) {
  const bg = name === 'Unassigned' ? '#E5E7EB' : color + '22';
  const br = name === 'Unassigned' ? '#D1D5DB' : color + '55';
  const fc = name === 'Unassigned' ? '#9CA3AF' : color;
  return <div className={cls} style={{ background: bg, border: `1.5px solid ${br}`, color: fc }}>{ini(name)}</div>;
}

// ── Card component ─────────────────────────────────────────────
function Card({
  issue, diffs, jiraInstance, onEdit, onSync, syncedAt, syncing, epicTitle, onFetchEpic,
}: {
  issue: JiraIssue;
  diffs: Record<string, unknown>;
  jiraInstance: string;
  onEdit: (issue: JiraIssue) => void;
  onSync: (key: string) => void;
  syncedAt: string | null;
  syncing: boolean;
  epicTitle?: string | null;
  onFetchEpic?: (epicKey: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const tc = TC[issue.type] ?? TC.Story;
  const sc = SC[issue.status] ?? SC['To Do'];
  const hasDiff = Object.keys(diffs).length > 0;

  const issueUrl = `https://${jiraInstance.replace(/^https?:\/\//, '').replace(/\/$/, '')}/browse/${issue.key}`;

  useEffect(() => {
    if (expanded && issue.epicLink && onFetchEpic) {
      onFetchEpic(issue.epicLink);
    }
  }, [expanded, issue.epicLink, onFetchEpic]);

  return (
    <div
      className={`card jc${hasDiff ? ' diff' : ''}${expanded ? ' expanded' : ''}`}
      style={{ borderLeft: `3px solid ${hasDiff ? '#EAB308' : tc.color}` }}
      onClick={() => onEdit(issue)}
    >
      {/* ── Jira-style header row: type icon + key + sync ── */}
      <div className="jc-head">
        <div className="jc-type-row">
          {issue.typeIconUrl
            ? <img src={issue.typeIconUrl} width={14} height={14} alt={issue.type} />
            : <span style={{ fontSize: 11 }}>{tc.icon}</span>}
          <a href={issueUrl} target="_blank" rel="noreferrer" className="jc-key-lbl"
            onClick={e => e.stopPropagation()} style={{ cursor: 'pointer', color: '#2563EB', textDecoration: 'none', fontWeight: 500 }}>
            {issue.key}
          </a>
        </div>
        <div className="jc-acts">
          <button className="c-sync" disabled={syncing} title={syncing ? 'Syncing…' : 'Sync from Jira'}
            onClick={e => { e.stopPropagation(); onSync(issue.key); }}>
            <span className={syncing ? 'spin' : ''}>↻</span>
          </button>
          <a className="jc-ext" href={issueUrl} target="_blank" rel="noreferrer"
            onClick={e => e.stopPropagation()} title="Open in Jira">↗</a>
        </div>
      </div>

      {/* ── Title ── */}
      <div className="jc-title">{issue.title}</div>

      {/* ── Footer: priority + points + status + assignee avatar ── */}
      <div className="jc-footer">
        <div className="jc-meta-l">
          {issue.priorityIconUrl
            ? <img src={issue.priorityIconUrl} width={14} height={14} alt={issue.priority} title={issue.priority} />
            : <div className="m-pri" style={{ background: PC[issue.priority]?.color ?? '#D1D5DB' }} title={issue.priority} />}
          {issue.points !== null &&
            <span className="jc-pts">{issue.points}</span>}
          <span className="jc-status" style={{ color: sc.c, background: sc.bg, border: `1px solid ${sc.b}` }}>
            {issue.status}
          </span>
        </div>
        <Avatar name={issue.assignee} color={tc.color} />
      </div>

      {issue.sprint && <div className="jc-sprint" style={{ padding: '4px 10px', fontSize: 9 }}>{issue.sprint}</div>}
      {syncedAt && <span className="sync-ts">↻ {syncedAt}</span>}
      {hasDiff && <div className="diff-badge diff-pulse">UPDATED</div>}

      {/* ── Expand toggle ── */}
      <button className="exp-btn" onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}>
        <span className="exp-arrow">▼</span>
        <span className="exp-label">{expanded ? 'Collapse' : 'Details'}</span>
      </button>

      {expanded && (
        <div className="c-details">
          <div className="c-fields">
            {[
              { k: 'assignee',   lbl: 'ASSIGNEE',  el: <><Avatar name={issue.assignee} color={tc.color} cls="fa" /><span>{issue.assignee}</span></> },
              { k: 'reporter',   lbl: 'REPORTER',   el: <span>{issue.reporter ?? '—'}</span> },
              { k: 'priority',   lbl: 'PRIORITY',   el: <span style={{ color: PC[issue.priority]?.color }}>● {issue.priority}</span> },
              { k: 'points',     lbl: 'STORY PTS',  el: issue.points !== null ? <span className="fpts">{issue.points} pts</span> : <span style={{ color: '#D1D5DB' }}>—</span> },
              { k: 'status',     lbl: 'STATUS',     el: <span className="fsta" style={{ color: sc.c, background: sc.bg, border: `1px solid ${sc.b}` }}>{issue.status}</span> },
              { k: 'fixVersion', lbl: 'FIX VER.',   el: <span>{issue.fixVersion ?? '—'}</span> },
              { k: 'updated',    lbl: 'UPDATED',    el: <span>{issue.updated ?? '—'}</span> },
            ].map(f => (
              <div key={f.k} className={`fcell${diffs[f.k] ? ' hl' : ''}`}>
                <span className="flbl">{f.lbl}</span>
                <span className="fval">{f.el}</span>
              </div>
            ))}
          </div>
          {issue.sprint && <div className="detrow"><div className="detlbl">SPRINT</div><div className="detval">{issue.sprint}</div></div>}
          {issue.epicLink && (
            <div className="detrow">
              <div className="detlbl">EPIC</div>
              <div className="detval">
                <a href={`https://${jiraInstance.replace(/^https?:\/\//, '').replace(/\/$/, '')}/browse/${issue.epicLink}`}
                   target="_blank" rel="noreferrer"
                   style={{ color: '#7C3AED', textDecoration: 'none', cursor: 'pointer' }}>
                  ⚡ {issue.epicLink}{epicTitle ? ` · ${epicTitle}` : ''}
                </a>
              </div>
            </div>
          )}
          {issue.components?.length > 0 && (
            <div className="detpills">{issue.components.map(c => <span key={c} className="comp-pill">{c}</span>)}</div>
          )}
          {issue.labels?.length > 0 && (
            <div className="detpills">{issue.labels.map(l => <span key={l} className="lbl-pill">{l}</span>)}</div>
          )}
          <div className="edit-hint">✎ click to edit</div>
        </div>
      )}
    </div>
  );
}

// ── Drawer component ───────────────────────────────────────────
interface JiraUser { accountId: string; displayName: string; avatarUrls?: Record<string, string> }

function Drawer({
  issue, jiraInstance, visFields, onClose, onSave,
}: {
  issue: JiraIssue | null;
  jiraInstance: string;
  visFields: Set<string>;
  onClose: () => void;
  onSave: (key: string, changes: Record<string, unknown>) => Promise<void>;
}) {
  const [changes, setChanges] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<JiraUser[]>([]);
  const ptsRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!issue) return;
    fetch(`/api/jira-users?issueKey=${issue.key}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((data: JiraUser[]) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]));
  }, [issue?.key]);

  useEffect(() => { setChanges({}); setError(null); }, [issue?.key]);

  if (!issue) return null;
  const tc = TC[issue.type] ?? TC.Story;
  const cv = (f: keyof JiraIssue) => (changes[f] ?? issue[f]) as string | number | null;
  const set = (f: string, v: unknown) => { setChanges(p => ({ ...p, [f]: v })); setError(null); };

  const handleSave = async () => {
    if (Object.keys(changes).length === 0) { onClose(); return; }
    setSaving(true);
    try {
      await onSave(issue.key, changes);
      setChanges({});
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <>
      <div className="overlay open" onClick={onClose} />
      <div className="bsheet" style={{ display: 'block' }}>
        <div className="bhandle" />
        <div className="bheader">
          <div className="btitle">
            {issue.typeIconUrl
              ? <img src={issue.typeIconUrl} width={16} height={16} alt={issue.type} style={{ verticalAlign: 'middle' }} />
              : <span>{tc.icon}</span>}
            <span style={{ color: tc.color }}>{issue.type}</span>
            <a className="dklink" href={`https://${jiraInstance.replace(/^https?:\/\//, '').replace(/\/$/, '')}/browse/${issue.key}`} target="_blank" rel="noreferrer">{issue.key} ↗</a>
          </div>
          <button className="xbtn" onClick={onClose}>✕</button>
        </div>
        <div className="dbody">
          <div className="dfield">
            <div className="dlbl">TITLE / SUMMARY</div>
            <textarea className="dta" rows={2} value={cv('title') as string} onChange={e => set('title', e.target.value)} />
          </div>
          <div className="dfield">
            <div className="dlbl">DESCRIPTION</div>
            <textarea className="dta" rows={4} placeholder="Add a description…"
              value={(cv('description') as string) ?? ''} onChange={e => set('description', e.target.value)} />
          </div>
          {visFields.has('points') && (
            <div className="dfield">
              <div className="dlbl">STORY POINTS</div>
              <div className="pts-wrap">
                <input ref={ptsRef} className="pts-inp" type="number" min={0} step={1} placeholder="—"
                  value={cv('points') !== null ? String(cv('points')) : ''} onChange={e => set('points', e.target.value === '' ? null : parseInt(e.target.value))} />
                <div className="pts-hint">Any whole number<br />Leave blank = N/A</div>
                <button className="pts-clr" onClick={() => { set('points', null); if (ptsRef.current) ptsRef.current.value = ''; }}>✕ Clear</button>
              </div>
            </div>
          )}
          <div className="dgrid">
            {visFields.has('priority') && (
              <div className="dfield">
                <div className="dlbl">PRIORITY</div>
                <select className="dsel" value={cv('priority') as string} onChange={e => set('priority', e.target.value)}>
                  {['Critical', 'High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            )}
            {visFields.has('status') && (
              <div className="dfield">
                <div className="dlbl">STATUS</div>
                <select className="dsel" value={cv('status') as string} onChange={e => set('status', e.target.value)}>
                  {['To Do', 'In Progress', 'Done'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>
          {visFields.has('labels') && (
            <div className="dfield">
              <div className="dlbl">LABELS <span style={{ fontWeight: 400, opacity: .7 }}>(comma-separated)</span></div>
              <input className="dinp" placeholder="e.g. frontend, urgent"
                value={(cv('labels') !== null ? (Array.isArray(cv('labels')) ? (cv('labels') as string[]).join(', ') : String(cv('labels'))) : '')}
                onChange={e => set('labels', e.target.value)} />
            </div>
          )}
          {visFields.has('fixVersion') && (
            <div className="dfield">
              <div className="dlbl">FIX VERSION</div>
              <input className="dinp" placeholder="e.g. v2.1.0"
                value={(cv('fixVersion') as string) ?? ''} onChange={e => set('fixVersion', e.target.value)} />
            </div>
          )}
          {visFields.has('assignee') && (
            <div className="dfield">
              <div className="dlbl">ASSIGNEE</div>
              {users.length > 0 ? (
                <select className="dsel"
                  value={(changes.assigneeAccountId as string) ?? users.find(u => u.displayName === issue.assignee)?.accountId ?? ''}
                  onChange={e => {
                    const u = users.find(u => u.accountId === e.target.value);
                    if (u) { set('assigneeAccountId', u.accountId); set('assignee', u.displayName); }
                    else { set('assigneeAccountId', ''); set('assignee', 'Unassigned'); }
                  }}>
                  <option value="">— Unassigned —</option>
                  {users.map(u => <option key={u.accountId} value={u.accountId}>{u.displayName}</option>)}
                </select>
              ) : (
                <input className="dinp" value={cv('assignee') as string} readOnly
                  style={{ color: '#94A3B8', cursor: 'default' }} placeholder="Loading users…" />
              )}
            </div>
          )}
          {/* Read-only info fields */}
          {(visFields.has('reporter') || visFields.has('sprint') || visFields.has('epicLink') || visFields.has('components') || visFields.has('updated')) && (
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="dlbl" style={{ marginBottom: 0 }}>READ-ONLY INFO</div>
              <div className="dgrid" style={{ gap: 8 }}>
                {visFields.has('reporter') && (
                  <div className="dfield">
                    <div className="dlbl">REPORTER</div>
                    <div className="dinp" style={{ color: '#64748B', cursor: 'default', userSelect: 'text' }}>{issue.reporter || '—'}</div>
                  </div>
                )}
                {visFields.has('sprint') && (
                  <div className="dfield">
                    <div className="dlbl">SPRINT</div>
                    <div className="dinp" style={{ color: '#64748B', cursor: 'default', userSelect: 'text' }}>{issue.sprint || '—'}</div>
                  </div>
                )}
                {visFields.has('epicLink') && issue.epicLink && (
                  <div className="dfield">
                    <div className="dlbl">EPIC LINK</div>
                    <a href={`https://${jiraInstance.replace(/^https?:\/\//, '').replace(/\/$/, '')}/browse/${issue.epicLink}`}
                       target="_blank" rel="noreferrer"
                       className="dinp" style={{ color: '#7C3AED', cursor: 'pointer', textDecoration: 'none', display: 'block' }}>
                      {issue.epicLink}
                    </a>
                  </div>
                )}
                {visFields.has('updated') && (
                  <div className="dfield">
                    <div className="dlbl">LAST UPDATED</div>
                    <div className="dinp" style={{ color: '#64748B', cursor: 'default', userSelect: 'text', fontSize: 11 }}>{issue.updated || '—'}</div>
                  </div>
                )}
              </div>
              {visFields.has('components') && issue.components?.length > 0 && (
                <div className="dfield">
                  <div className="dlbl">COMPONENTS</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {issue.components.map(c => <span key={c} className="comp-pill">{c}</span>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {error && <div className="derr" style={{ margin: '0 20px 12px' }}>{error}</div>}
        <div className="dnote">⚡ Saves locally · syncs to Jira via proxy on confirm</div>
        <div className="dfooter">
          <button className="cbtn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="sbtn" onClick={handleSave} disabled={saving || Object.keys(changes).length === 0}>
            {saving ? <><span className="spin">↻</span> Syncing…</> : '✓  Save & Sync to Jira'}
          </button>
        </div>
      </div>
    </>
  );
}

// ── App ────────────────────────────────────────────────────────
const App: React.FC = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [jiraInstance, setJiraInstance] = useState('');
  const [instanceInput, setInstanceInput] = useState('');
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [imported, setImported] = useState<JiraIssue[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [diffs, setDiffs] = useState<Record<string, Record<string, unknown>>>({});
  const [syncedAt, setSyncedAt] = useState<Record<string, string>>({});
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('All');
  const [editingIssue, setEditingIssue] = useState<JiraIssue | null>(null);
  const [visFields, setVisFields] = useState<Set<string>>(new Set(FIELD_DEFS.filter(f => f.def).map(f => f.k)));
  const [cfgOpen, setCfgOpen] = useState(false);
  const [cardSize, setCardSize] = useState('M');
  const [mobileTab, setMobileTab] = useState<'panel' | 'canvas'>('panel');
  const [epicTitles, setEpicTitles] = useState<Record<string, string | null>>({});

  useEffect(() => {
    checkAuth();
    setupFigJamListeners();
  }, []);

  const checkAuth = async () => {
    try {
      const r = await fetch('/api/jira-me', { credentials: 'include' });
      if (r.ok) {
        const d = await r.json().catch(() => ({}));
        setAuthenticated(true);
        if (d.instance) setJiraInstance(d.instance);
      } else {
        const d = await r.json().catch(() => ({}));
        setAuthenticated(false);
        if (r.status !== 401) setError(`Auth failed (${r.status}): ${d.error || 'unknown'}`);
      }
    } catch { /* network error */ }
  };

  const fetchEpicTitle = async (epicKey: string) => {
    if (epicTitles[epicKey] !== undefined) return; // Already cached
    try {
      console.log(`Fetching epic title for: ${epicKey}`);
      const r = await fetch(`/api/jira-issue?issueKey=${encodeURIComponent(epicKey)}`, { credentials: 'include' });
      if (r.ok) {
        const data = await r.json();
        console.log(`Epic title response:`, data);
        setEpicTitles(p => ({ ...p, [epicKey]: data.title || null }));
      } else {
        console.error(`Epic title fetch failed: ${r.status} ${r.statusText}`);
        const errData = await r.json().catch(() => ({}));
        console.error('Error details:', errData);
      }
    } catch (e) {
      console.error(`Failed to fetch epic title for ${epicKey}:`, e);
    }
  };

  const normalizeInstance = (s: string) => s.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '').trim();
  const validateInstance = (s: string) => /^[a-z0-9-]+\.atlassian\.net$/.test(s);

  const handleConnect = () => {
    const clean = normalizeInstance(instanceInput);
    if (!validateInstance(clean)) { setError('Invalid format. Use: mycompany.atlassian.net'); return; }
    sessionStorage.setItem('jira_instance', clean);
    window.location.href = `/api/jira-auth?instance=${encodeURIComponent(clean)}`;
  };

  const handleJQLSearch = async () => {
    const el = document.querySelector('#jql') as HTMLTextAreaElement;
    if (!el?.value.trim()) { setError('Enter a JQL query'); return; }
    setLoading(true); setError(null);
    try {
      const r = await fetch('/api/jira-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jql: el.value }),
        credentials: 'include',
      });
      if (!r.ok) {
        if (r.status === 401) { setAuthenticated(false); setLoading(false); return; }
        const d = await r.json().catch(() => ({ error: r.statusText }));
        const detail = d.detail ? ` — ${JSON.stringify(d.detail)}` : '';
        throw new Error((d.error || r.statusText) + detail);
      }
      const raw = await r.json() as JiraAPIIssue[];
      setIssues(raw.map(mapJiraIssue));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally { setLoading(false); }
  };

  const handleImport = async (toImport: JiraIssue[]) => {
    if (toImport.length === 0) { setError('No issues selected to import'); return; }
    try {
      let yOffset = 0;
      const { x: bx, y: by } = getSelectedIssuePosition();
      for (const issue of toImport) { await addIssueToCanvas(issue, bx, by + yOffset); yOffset += 160; }
      setImported(prev => {
        const existing = new Set(prev.map(i => i.key));
        return [...prev, ...toImport.filter(i => !existing.has(i.key))];
      });
      setSelected(new Set());
      if (window.innerWidth <= 700) setMobileTab('canvas');
    } catch (e) {
      setError(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleSync = async (key: string) => {
    setSyncing(p => ({ ...p, [key]: true }));
    try {
      const fresh = await syncIssueFromJira(key);
      const current = imported.find(i => i.key === key);
      if (current) {
        const detected: Record<string, unknown> = {};
        (['title', 'status', 'assignee', 'points', 'priority'] as (keyof JiraIssue)[]).forEach(f => {
          if (current[f] !== fresh[f]) detected[f] = { old: current[f], new: fresh[f] };
        });
        setImported(p => p.map(i => i.key === key ? { ...fresh, lastSynced: new Date().toISOString() } : i));
        setDiffs(p => ({ ...p, [key]: detected }));
        setSyncedAt(p => ({ ...p, [key]: 'just now' }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally { setSyncing(p => ({ ...p, [key]: false })); }
  };

  const handleSaveEdit = async (key: string, changes: Record<string, unknown>) => {
    const updated = await updateIssueInJira(key, changes);
    setImported(p => p.map(i => i.key === key ? { ...updated, lastSynced: new Date().toISOString() } : i));
    setDiffs(p => ({ ...p, [key]: {} }));
  };

  const filteredIssues = filter === 'All' ? issues : issues.filter(i => i.type === filter);
  const selCount = Array.from(selected).filter(k => filteredIssues.some(i => i.key === k)).length;
  const allSel = filteredIssues.length > 0 && filteredIssues.every(i => selected.has(i.key));
  const partSel = selCount > 0 && !allSel;
  const groups = ['Epic', 'Feature', 'Story', 'Bug'].map(t => ({ type: t, items: imported.filter(i => i.type === t) })).filter(g => g.items.length > 0);
  const diffCount = Object.values(diffs).filter(d => Object.keys(d).length > 0).length;

  return (
    <div id="app" className={mobileTab === 'canvas' ? 'mc' : ''}>
      {/* ══ PANEL ══ */}
      <div id="panel">
        <div className="p-head">
          <div className="p-row">
            <img src="/icons/jira-figjam-icon.png" alt="Jira Multi-Import" style={{ width: 32, height: 32, borderRadius: 6 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>Jira Multi-Import</div>
              <div style={{ fontSize: 9, color: '#4B5563', fontFamily: "'IBM Plex Mono',monospace", marginTop: 1 }}>for FigJam</div>
            </div>
          </div>
          {authenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="conn"><div className="conn-dot" />{jiraInstance || 'Connected'}</div>
              <button title="Disconnect" onClick={async () => {
                await fetch('/api/jira-logout', { method: 'POST', credentials: 'include' });
                setAuthenticated(false); setIssues([]); setImported([]); setSelected(new Set()); setJiraInstance('');
              }} style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: 5, color: '#94A3B8', fontSize: 10, padding: '3px 7px', cursor: 'pointer', fontFamily: "'IBM Plex Mono',monospace" }}>
                ⏏ Logout
              </button>
            </div>
          ) : (
            <div className="conn conn-err"><div className="conn-dot" />Not connected</div>
          )}
        </div>

        {!authenticated ? (
          <>
            {error && <div className="err-bar">{error}</div>}
            <div className="sec" style={{ paddingTop: 16 }}>
              <div className="lbl">JIRA INSTANCE URL</div>
              <input type="text" placeholder="mycompany.atlassian.net" value={instanceInput}
                onChange={e => setInstanceInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleConnect()}
                style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 7, color: '#1E293B', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, padding: '9px 11px', outline: 'none' }}
              />
              <button id="exec-btn" style={{ marginTop: 10 }} onClick={handleConnect}>Connect Jira</button>
            </div>
          </>
        ) : (
          <>
            <div className="sec">
              <div className="lbl">JQL QUERY</div>
              <textarea id="jql" rows={3} defaultValue="created >= -30d order by created DESC" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                {[
                  { label: 'My open issues',   jql: 'assignee = currentUser() AND resolution = Unresolved ORDER BY updated DESC' },
                  { label: 'Active sprint',    jql: 'sprint in openSprints() ORDER BY priority DESC' },
                  { label: 'Recent bugs',      jql: 'issuetype = Bug AND created >= -7d ORDER BY created DESC' },
                  { label: 'Unassigned',       jql: 'assignee is EMPTY AND resolution = Unresolved ORDER BY priority DESC' },
                  { label: 'High priority',    jql: 'priority in (Critical, High) AND resolution = Unresolved ORDER BY priority DESC' },
                  { label: 'Done this week',   jql: 'status = Done AND updated >= -7d ORDER BY updated DESC' },
                ].map(p => (
                  <button key={p.label} className="jql-preset" onClick={() => {
                    const el = document.getElementById('jql') as HTMLTextAreaElement;
                    if (el) el.value = p.jql;
                  }}>{p.label}</button>
                ))}
              </div>
              <button id="exec-btn" disabled={loading} onClick={handleJQLSearch}>
                {loading ? <><span className="spin">⟳</span> Fetching…</> : '▶ Execute JQL'}
              </button>
            </div>

            {error && <div className="err-bar">{error}</div>}

            {issues.length > 0 && (
              <>
                <div className="sec" style={{ marginTop: 10 }}>
                  <div className="lbl">FILTER TYPE</div>
                  <div id="type-filter">
                    {['All', ...Array.from(new Set(issues.map(i => i.type)))].map(t => {
                      const tc = TC[t as keyof typeof TC];
                      const active = filter === t;
                      const iconUrl = t !== 'All' ? issues.find(i => i.type === t)?.typeIconUrl : undefined;
                      return (
                        <button key={t} className="tf-btn"
                          style={active ? { background: (tc?.color ?? '#2563EB') + '22', borderColor: tc?.color ?? '#2563EB', color: tc?.color ?? '#60A5FA' } : {}}
                          onClick={() => setFilter(t)}>
                          {iconUrl
                            ? <><img src={iconUrl} width={10} height={10} alt={t} style={{ verticalAlign: 'middle', marginRight: 3 }} />{t}</>
                            : tc ? <>{tc.icon} {t}</> : t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div id="sel-bar" style={{ display: 'flex' }}>
                  <div className="sel-l" onClick={() => {
                    const next = new Set(selected);
                    if (allSel) filteredIssues.forEach(i => next.delete(i.key));
                    else filteredIssues.forEach(i => next.add(i.key));
                    setSelected(next);
                  }}>
                    <div className={`gchk${allSel ? ' gchk-all' : partSel ? ' gchk-part' : ''}`}>{allSel ? '✓' : partSel ? '–' : ''}</div>
                    <span style={{ fontSize: 9, color: '#8B949E', fontFamily: "'IBM Plex Mono',monospace" }}>{selCount} of {filteredIssues.length} selected</span>
                  </div>
                  <button id="imp-all" onClick={() => handleImport(issues)}>⬆ Import All</button>
                </div>

                <div id="results-wrap" style={{ display: 'flex' }}>
                  <div id="rlist">
                    {filteredIssues.map(issue => {
                      const tc = TC[issue.type] ?? TC.Story;
                      const sel = selected.has(issue.key);
                      const issueUrl = `https://${jiraInstance.replace(/^https?:\/\//, '').replace(/\/$/, '')}/browse/${issue.key}`;
                      return (
                        <div key={issue.key} className={`irow${sel ? ' sel' : ''}`}
                          style={{ '--tc': tc.color, '--tcb': tc.color + '18', '--tcx': tc.color + '55' } as React.CSSProperties}
                          onClick={() => { const n = new Set(selected); sel ? n.delete(issue.key) : n.add(issue.key); setSelected(n); }}>
                          <div className={`ichk${sel ? ' on' : ''}`} style={{ '--tc': tc.color } as React.CSSProperties}>{sel ? '✓' : ''}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                              <span style={{ fontSize: 8, color: tc.color, fontFamily: "'IBM Plex Mono',monospace", display: 'flex', alignItems: 'center', gap: 3 }}>
                                {issue.typeIconUrl ? <img src={issue.typeIconUrl} width={10} height={10} alt={issue.type} /> : tc.icon} {issue.type}
                              </span>
                              <span style={{ fontSize: 8, color: '#374151', fontFamily: "'IBM Plex Mono',monospace" }}>{issue.key}</span>
                            </div>
                            <div style={{ fontSize: 10, color: '#C9D1D9', lineHeight: 1.4, fontWeight: 500 }}>{issue.title}</div>
                            {issue.sprint && <div className="jc-sprint" style={{ marginTop: 2 }}>{issue.sprint}</div>}
                            <div style={{ fontSize: 8, color: '#4B5563', marginTop: 3, fontFamily: "'IBM Plex Mono',monospace" }}>
                              {issue.assignee.split(' ')[0]} · {issue.points !== null ? issue.points + 'pts' : '—'} · {issue.priority}
                            </div>
                            <a className="irow-jira-link" href={issueUrl} target="_blank" rel="noreferrer"
                              onClick={e => { e.stopPropagation(); }}>Open in Jira ↗</a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button id="imp-sel" disabled={selected.size === 0}
                    onClick={() => handleImport(Array.from(selected).map(k => issues.find(i => i.key === k)).filter(Boolean) as JiraIssue[])}>
                    {selected.size > 0 ? `↗  Import ${selected.size} selected` : 'Select items to import'}
                  </button>
                </div>
              </>
            )}

            {issues.length === 0 && !loading && (
              <div id="idle">
                <div style={{ fontSize: 32, opacity: .15 }}>⬡</div>
                <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono',monospace", textAlign: 'center', lineHeight: 1.7, color: '#2D3148' }}>Run a JQL query<br />to get started</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ══ CANVAS ══ */}
      <div id="canvas-wrap">
        <div id="cbar">
          <div className="cbar-l">
            <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: "'IBM Plex Mono',monospace" }}>FigJam Canvas</span>
            {imported.length > 0 && <span className="bdg-g" style={{ display: 'inline' }}>{imported.length} cards placed</span>}
            {diffCount > 0 && <span className="bdg-y" style={{ display: 'inline' }}>⚡ {diffCount} updated</span>}
          </div>
          <div className="cbar-r">
            <span className="chint">{imported.length === 0 ? 'Execute JQL →' : '▼ expand · tap to edit · ↻ sync'}</span>
            {imported.length > 0 && (
              <>
                <div id="size-sel" style={{ display: 'flex' }}>
                  {['S', 'M', 'L'].map(sz => (
                    <button key={sz} className={`sz-btn${cardSize === sz ? ' on' : ''}`} onClick={() => setCardSize(sz)}>{sz}</button>
                  ))}
                </div>
                <button id="cfg-btn" style={{ display: 'inline' }} onClick={() => setCfgOpen(true)}>⚙ Fields</button>
              </>
            )}
          </div>
        </div>

        {imported.length === 0 ? (
          <div id="cempty">
            <div style={{ fontSize: 40, opacity: .15 }}>⬡</div>
            <div style={{ fontSize: 11, color: '#C4C9D4', fontFamily: "'IBM Plex Mono',monospace" }}>Canvas is empty</div>
          </div>
        ) : (
          <div id="ccontent" data-size={cardSize} style={{ display: 'block' }}>
            {groups.map(g => {
              const tc = TC[g.type];
              return (
                <div key={g.type} className="grp">
                  <div className="grp-head">
                    <div style={{ height: 1, width: 12, background: tc.color + '88' }} />
                    <div className="grp-title" style={{ color: tc.color }}>
                      {g.items[0]?.typeIconUrl
                        ? <img src={g.items[0].typeIconUrl} width={12} height={12} alt={g.type} style={{ verticalAlign: 'middle' }} />
                        : tc.icon}
                      {' '}{g.type.toUpperCase()}S
                    </div>
                    <div className="grp-count" style={{ background: tc.color + '18', border: `1px solid ${tc.color}44`, color: tc.color }}>{g.items.length}</div>
                    <div style={{ flex: 1, height: 1, background: tc.color + '22' }} />
                  </div>
                  <div className="cards-row">
                    {g.items.map(issue => (
                      <Card key={issue.key} issue={issue} diffs={diffs[issue.key] ?? {}}
                        jiraInstance={jiraInstance} onEdit={setEditingIssue}
                        onSync={handleSync} syncedAt={syncedAt[issue.key] ?? null}
                        syncing={!!syncing[issue.key]}
                        epicTitle={issue.epicLink ? epicTitles[issue.epicLink] : undefined}
                        onFetchEpic={fetchEpicTitle} />
                    ))}
                  </div>
                </div>
              );
            })}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 9, color: '#9CA3AF', fontFamily: "'IBM Plex Mono',monospace", flexWrap: 'wrap', marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, background: '#FEF08A', border: '1px solid #EAB308', borderRadius: 2 }} />
                Yellow = changed since last sync
              </div>
              <div>· ▼ expand card for details · tap card to edit</div>
            </div>
          </div>
        )}
      </div>

      {/* ══ MOBILE TABS ══ */}
      <div id="tabbar">
        <button className={`tabbtn${mobileTab === 'panel' ? ' on' : ''}`} onClick={() => setMobileTab('panel')}>
          <span style={{ fontSize: 18 }}>🔌</span><span>Plugin</span>
        </button>
        <button className={`tabbtn${mobileTab === 'canvas' ? ' on' : ''}`} onClick={() => setMobileTab('canvas')}>
          <span style={{ fontSize: 18 }}>🗂️</span><span>Canvas</span>
          {imported.length > 0 && <span id="tbadge" style={{ display: 'inline' }}>{imported.length}</span>}
        </button>
      </div>

      {/* ══ FIELD CONFIG ══ */}
      {cfgOpen && (
        <>
          <div className="overlay open" onClick={() => setCfgOpen(false)} />
          <div className="bsheet" style={{ display: 'block' }}>
            <div className="bhandle" />
            <div className="bheader">
              <div className="btitle">⚙️ Visible Card Fields</div>
              <button className="xbtn" onClick={() => setCfgOpen(false)}>✕</button>
            </div>
            <div style={{ padding: '4px 20px', fontSize: 9, color: '#4B5563', fontFamily: "'IBM Plex Mono',monospace", letterSpacing: '.1em' }}>SHOWN IN COMPACT + EXPANDED VIEW</div>
            <div style={{ padding: '8px 20px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {FIELD_DEFS.map(f => {
                const on = visFields.has(f.k);
                return (
                  <div key={f.k} className={`tog-row${on ? ' on' : ''}`} onClick={() => {
                    const n = new Set(visFields);
                    on ? n.delete(f.k) : n.add(f.k);
                    setVisFields(n);
                  }}>
                    <span className="tog-lbl">{f.label}</span>
                    <div className={`tog-track${on ? ' on' : ''}`}><div className="tog-thumb" /></div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: '12px 20px 20px' }}>
              <button className="sbtn" style={{ width: '100%' }} onClick={() => setCfgOpen(false)}>Apply to All Cards</button>
            </div>
          </div>
        </>
      )}

      {/* ══ EDIT DRAWER ══ */}
      <Drawer issue={editingIssue} jiraInstance={jiraInstance} visFields={visFields}
        onClose={() => setEditingIssue(null)} onSave={handleSaveEdit} />
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root') || document.body);
root.render(<App />);
