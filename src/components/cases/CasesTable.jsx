import { useMemo, useState } from 'react';
import { STATUS_LABELS } from '../../engine/formatUtils.js';
import StatusBadge from '../shared/StatusBadge.jsx';

const STATUS_ORDER = ['a-faire', 'en-cours', 'en-pause', 'bug', 'fait', 'clos']
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

function sortGroups(keys, groupBy) {
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

export default function CasesTable({ cases, selectedId, onSelect, groupBy = 'family' }) {
  const [sortKey, setSortKey] = useState('id');
  const [sortDir, setSortDir] = useState('asc');

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

  const groups = useMemo(() => {
    const map = new Map();
    for (const c of sorted) {
      const key = getGroupKey(c, groupBy);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    }
    const orderedKeys = sortGroups([...map.keys()], groupBy);
    return orderedKeys.map((key) => ({ key, cases: map.get(key) }));
  }, [sorted, groupBy]);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
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
          {groups.map(({ key, cases: groupCases }) => (
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
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupRows({ groupKey, groupBy, cases, selectedId, onSelect, hideFamily, hideStatus, hidePriority }) {
  const colSpan = 7 - (hideFamily ? 1 : 0) - (hideStatus ? 1 : 0) - (hidePriority ? 1 : 0);
  return (
    <>
      <tr className="bg-fv-bg-secondary/70">
        <td colSpan={colSpan} className="px-3 py-1.5">
          <div className="flex items-center gap-2">
            <GroupLabel groupBy={groupBy} value={groupKey} />
            <span className="text-xs text-fv-text-secondary/60">{cases.length}</span>
          </div>
        </td>
      </tr>
      {cases.map((c) => {
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
