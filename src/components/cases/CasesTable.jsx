import { useMemo, useState } from 'react';
import { STATUS_LABELS } from '../../engine/formatUtils.js';
import { plansApi } from '../../api/resources.js';
import { useStore } from '../../store/useStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import StatusBadge from '../shared/StatusBadge.jsx';

const STATUS_ORDER = ['a-faire', 'en-cours', 'en-pause', 'bug', 'evolution', 'fait', 'clos']
  .reduce((acc, key, i) => { acc[key] = i; return acc; }, {});

const SORT_ACCESSORS = {
  id: (c) => c.id || '',
  title: (c) => (c.title || '').toLowerCase(),
  family: (c) => c.family || '',
  latest_status: (c) => STATUS_ORDER[c.latest_status || 'a-faire'] ?? 99,
  run_count: (c) => c.run_count || 0,
  bug_count: (c) => c.bug_count || 0,
  priority: (c) => c.priority || 'P9',
};

function getGroupKey(c, groupBy) {
  if (groupBy === 'family')   return c.family || '—';
  if (groupBy === 'status')   return c.latest_status || 'a-faire';
  if (groupBy === 'priority') return c.priority || '—';
  return '';
}

function sortGroups(keys, groupBy, positionByKey) {
  if (groupBy === 'family' && positionByKey.size > 0) {
    // Tri par position enregistrée (nulls en dernier), puis alpha
    return [...keys].sort((a, b) => {
      const pa = positionByKey.get(a) ?? Infinity;
      const pb = positionByKey.get(b) ?? Infinity;
      if (pa !== pb) return pa - pb;
      return a.localeCompare(b);
    });
  }
  if (groupBy === 'status') {
    return [...keys].sort((a, b) => {
      const oa = STATUS_ORDER[a] ?? 99;
      const ob = STATUS_ORDER[b] ?? 99;
      return oa - ob;
    });
  }
  if (groupBy === 'priority') {
    return [...keys].sort((a, b) => {
      if (a === '—') return 1;
      if (b === '—') return -1;
      return a.localeCompare(b);
    });
  }
  return [...keys].sort((a, b) => a.localeCompare(b));
}

export default function CasesTable({ cases, selectedId, onSelect, groupBy = 'family', onRefresh }) {
  const [sortKey, setSortKey] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const [collapsed, setCollapsed] = useState(new Set()); // groupKeys effondrés
  const user = useAuthStore((s) => s.user);
  const showToast = useStore((s) => s.showToast);

  const planId = cases[0]?.plan_id ?? null;
  const canEditFamily = Boolean(user?.can_import);

  const sorted = useMemo(() => {
    const fn = SORT_ACCESSORS[sortKey] || SORT_ACCESSORS.id;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...cases].sort((a, b) => {
      const va = fn(a);
      const vb = fn(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return (a.id || '').localeCompare(b.id || '');
    });
  }, [cases, sortKey, sortDir]);

  // Extraire les positions par family depuis les cas (premier cas du groupe)
  const positionByKey = useMemo(() => {
    const map = new Map();
    if (groupBy !== 'family') return map;
    for (const c of sorted) {
      const key = c.family || '—';
      if (!map.has(key) && c.family_position != null) {
        map.set(key, c.family_position);
      }
    }
    return map;
  }, [sorted, groupBy]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const c of sorted) {
      const key = getGroupKey(c, groupBy);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    }
    const orderedKeys = sortGroups([...map.keys()], groupBy, positionByKey);
    return orderedKeys.map((key) => ({ key, cases: map.get(key) }));
  }, [sorted, groupBy, positionByKey]);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function toggleCollapse(key) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSaveLabel(family, label) {
    if (!planId) return;
    try {
      await plansApi.patchFamily(planId, family, label);
      if (onRefresh) onRefresh();
    } catch (e) {
      showToast('error', `Impossible de sauvegarder le libellé : ${e.message || e}`);
    }
  }

  async function handleMoveFamily(idx, delta) {
    const newGroups = [...groups];
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= newGroups.length) return;
    // Swap
    [newGroups[idx], newGroups[targetIdx]] = [newGroups[targetIdx], newGroups[idx]];
    const newOrder = newGroups.map((g) => g.key);
    // Optimistic: reorder local positionByKey is handled via onRefresh
    try {
      await plansApi.reorderFamilies(planId, newOrder);
      if (onRefresh) onRefresh();
    } catch (e) {
      showToast('error', `Réordonnancement impossible : ${e.message || e}`);
    }
  }

  const thProps = (key) => ({
    sortKey: key,
    currentSort: sortKey,
    dir: sortDir,
    onSort: handleSort,
  });

  const hideFamily   = groupBy === 'family';
  const hideStatus   = groupBy === 'status';
  const hidePriority = groupBy === 'priority';

  return (
    <div className="overflow-x-auto rounded-md border border-fv-border bg-white">
      <table className="min-w-full divide-y divide-fv-border text-sm">
        <thead className="bg-fv-bg-secondary text-xs uppercase tracking-wide text-fv-text-secondary">
          <tr>
            <Th {...thProps('id')}>ID</Th>
            <Th {...thProps('title')}>Titre</Th>
            {!hideFamily   && <Th {...thProps('family')}>Famille</Th>}
            {!hideStatus   && <Th {...thProps('latest_status')} align="right">Statut</Th>}
            <Th {...thProps('run_count')} align="right">Runs</Th>
            <Th {...thProps('bug_count')} align="right">Bugs</Th>
            {!hidePriority && <Th {...thProps('priority')} align="right">Priorité</Th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-fv-border">
          {groups.map(({ key, cases: groupCases }, idx) => (
            <GroupRows
              key={key}
              groupKey={key}
              groupBy={groupBy}
              cases={groupCases}
              selectedId={selectedId}
              onSelect={onSelect}
              hideFamily={hideFamily}
              hideStatus={hideStatus}
              hidePriority={hidePriority}
              canEditFamily={canEditFamily}
              onSaveLabel={handleSaveLabel}
              isCollapsed={collapsed.has(key)}
              onToggleCollapse={() => toggleCollapse(key)}
              groupIndex={idx}
              groupCount={groups.length}
              onMove={(delta) => handleMoveFamily(idx, delta)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupRows({
  groupKey, groupBy, cases, selectedId, onSelect,
  hideFamily, hideStatus, hidePriority,
  canEditFamily, onSaveLabel,
  isCollapsed, onToggleCollapse,
  groupIndex, groupCount, onMove,
}) {
  const colSpan = 7 - (hideFamily ? 1 : 0) - (hideStatus ? 1 : 0) - (hidePriority ? 1 : 0);
  const [editing, setEditing] = useState(false);
  const currentLabel = cases[0]?.family_label ?? '';
  const [draft, setDraft] = useState(currentLabel);

  function startEdit(e) {
    if (!canEditFamily || groupBy !== 'family') return;
    e.stopPropagation();
    setDraft(currentLabel);
    setEditing(true);
  }

  async function commitEdit() {
    setEditing(false);
    if (draft.trim() === currentLabel) return;
    await onSaveLabel(groupKey, draft.trim());
  }

  const isFamilyGroup = groupBy === 'family';

  return (
    <>
      <tr
        className={isFamilyGroup ? 'bg-orange-50' : 'bg-fv-bg-secondary/70'}
      >
        <td colSpan={colSpan} className="px-3 py-1.5">
          <div className="flex items-center gap-2">
            {/* Bouton collapse */}
            <button
              type="button"
              onClick={onToggleCollapse}
              className="shrink-0 text-fv-text-secondary/60 transition hover:text-fv-text-secondary"
              title={isCollapsed ? 'Déplier' : 'Replier'}
              aria-label={isCollapsed ? 'Déplier le groupe' : 'Replier le groupe'}
            >
              <span className={`inline-block transition-transform text-[10px] ${isCollapsed ? '-rotate-90' : ''}`}>
                ▼
              </span>
            </button>

            <GroupLabel groupBy={groupBy} value={groupKey} />

            {/* Libellé de famille éditable */}
            {isFamilyGroup && editing ? (
              <input
                autoFocus
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                  if (e.key === 'Escape') { setEditing(false); }
                }}
                placeholder="Libellé de la famille…"
                className="min-w-0 flex-1 rounded border border-fv-orange bg-white px-2 py-0.5 text-xs text-fv-text focus:outline-none"
                style={{ maxWidth: '28rem' }}
              />
            ) : isFamilyGroup ? (
              <button
                type="button"
                onClick={startEdit}
                title={canEditFamily ? 'Cliquer pour éditer le libellé' : undefined}
                className={[
                  'text-xs text-fv-text-secondary/80',
                  canEditFamily ? 'cursor-text hover:text-fv-orange' : 'cursor-default',
                ].join(' ')}
              >
                {currentLabel ? `— ${currentLabel}` : (canEditFamily ? '+ libellé' : '')}
              </button>
            ) : null}

            <span className="text-xs text-fv-text-secondary/60">{cases.length}</span>

            {/* Boutons ↑↓ réordonnancement (famille uniquement, can_import) */}
            {isFamilyGroup && canEditFamily && (
              <div className="ml-auto flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onMove(-1); }}
                  disabled={groupIndex === 0}
                  title="Monter la famille"
                  aria-label="Monter la famille"
                  className="rounded p-1 text-fv-text-secondary/60 hover:bg-orange-100 hover:text-fv-orange disabled:opacity-25"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onMove(+1); }}
                  disabled={groupIndex === groupCount - 1}
                  title="Descendre la famille"
                  aria-label="Descendre la famille"
                  className="rounded p-1 text-fv-text-secondary/60 hover:bg-orange-100 hover:text-fv-orange disabled:opacity-25"
                >
                  ▼
                </button>
              </div>
            )}
          </div>
        </td>
      </tr>

      {!isCollapsed && cases.map((c) => {
        const active = c.id === selectedId;
        return (
          <tr
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={[
              'cursor-pointer transition',
              active ? 'bg-fv-blue-light' : 'hover:bg-fv-bg-secondary',
              c.removed_from_md ? 'text-fv-text-secondary' : '',
            ].join(' ')}
          >
            <Td className="font-mono text-xs">
              <div className="flex items-center gap-1.5">
                <span>{c.id}</span>
                {c.source === 'manual' ? (
                  <span
                    title="Cas manuel"
                    className="rounded bg-fv-orange-light px-1 py-0.5 text-[10px] font-semibold text-fv-orange-dark"
                  >
                    M
                  </span>
                ) : null}
                {c.removed_from_md ? (
                  <span
                    title="Retiré du markdown"
                    className="rounded bg-gray-100 px-1 py-0.5 text-[10px] font-semibold text-fv-text-secondary"
                  >
                    ✕
                  </span>
                ) : null}
              </div>
            </Td>
            <Td className="max-w-md">
              <div className="line-clamp-2 font-medium text-fv-text">{c.title}</div>
            </Td>
            {!hideFamily && <Td>{c.family || '—'}</Td>}
            {!hideStatus && (
              <Td align="right">
                <StatusBadge status={c.latest_status} size="sm" />
              </Td>
            )}
            <Td align="right" className="tabular-nums">{c.run_count || 0}</Td>
            <Td
              align="right"
              className={`tabular-nums ${c.bug_count ? 'font-semibold text-fv-red' : ''}`}
            >
              {c.bug_count || 0}
            </Td>
            {!hidePriority && (
              <Td align="right" className="tabular-nums">{c.priority || '—'}</Td>
            )}
          </tr>
        );
      })}
    </>
  );
}

function GroupLabel({ groupBy, value }) {
  if (groupBy === 'status') {
    return (
      <span className="flex items-center gap-1.5">
        <StatusBadge status={value} size="sm" />
      </span>
    );
  }
  return (
    <span className="text-xs font-semibold uppercase tracking-wide text-fv-text-secondary">
      {value}
    </span>
  );
}

function Th({ children, sortKey, currentSort, dir, onSort, align = 'left' }) {
  const textAlign = align === 'right' ? 'text-right' : 'text-left';
  const justify = align === 'right' ? 'justify-end' : 'justify-start';
  const active = currentSort === sortKey;
  const arrow = active ? (dir === 'asc' ? '▲' : '▼') : '↕';
  const ariaSort = active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none';
  return (
    <th scope="col" aria-sort={ariaSort} className={`${textAlign} px-3 py-2 font-semibold`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={[
          'flex w-full items-center gap-1 uppercase tracking-wide transition-colors',
          justify,
          active ? 'text-fv-orange' : 'hover:text-fv-text',
        ].join(' ')}
        title={active
          ? `Trié par ${children} (${dir === 'asc' ? 'croissant' : 'décroissant'})`
          : `Trier par ${children}`}
      >
        <span>{children}</span>
        <span aria-hidden="true" className={`text-[10px] ${active ? '' : 'opacity-30'}`}>
          {arrow}
        </span>
      </button>
    </th>
  );
}

function Td({ children, align = 'left', className = '' }) {
  const a = align === 'right' ? 'text-right' : 'text-left';
  return <td className={`${a} px-3 py-2 ${className}`}>{children}</td>;
}
