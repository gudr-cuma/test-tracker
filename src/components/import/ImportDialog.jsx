import { useEffect, useMemo, useState } from 'react';
import { importApi } from '../../api/resources.js';
import { parseXlsx } from '../../lib/parseXlsx.js';
import { useStore } from '../../store/useStore.js';
import Button from '../shared/Button.jsx';
import ErrorBanner from '../shared/ErrorBanner.jsx';
import Modal from '../shared/Modal.jsx';
import Spinner from '../shared/Spinner.jsx';
import DiffView from './DiffView.jsx';
import Dropzone from './Dropzone.jsx';

/**
 * Import flow:
 *
 *   pick  ──(file read)──▶  dry-running (loading)  ──▶  preview
 *                              │                           │
 *                              └──(error)──▶ pick          │
 *                                                          ▼
 *                                           apply (loading) ──▶ done
 *                                                          │
 *                                                          └─(error)─▶ preview
 *
 * Supports both .md (markdown) and .xlsx (Excel) files.
 * Excel files are parsed client-side before being sent to the server.
 */
export default function ImportDialog({ planIdContext = null }) {
  const closeDialog = useStore((s) => s.closeDialog);
  const refreshPlans = useStore((s) => s.refreshPlans);
  const setCurrentPlan = useStore((s) => s.setCurrentPlan);
  const showToast = useStore((s) => s.showToast);

  const [phase, setPhase] = useState('pick'); // pick | dry-running | preview | applying
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null); // { md?, buffer?, filename, type }
  const [parsedCases, setParsedCases] = useState(null); // { title, cases } for xlsx path
  const [preview, setPreview] = useState(null); // { mode, plan?, parsed, diff }
  const [acceptedAdded, setAcceptedAdded] = useState(new Set());
  const [acceptedChanged, setAcceptedChanged] = useState(new Set());
  const [acceptedRemoved, setAcceptedRemoved] = useState(new Set());

  // Kick off dry-run as soon as we have a file.
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    (async () => {
      setPhase('dry-running');
      setError(null);

      let payload;
      if (file.type === 'xlsx') {
        let parsed;
        try {
          const titleFromFile = file.filename.replace(/\.xlsx$/i, '');
          parsed = parseXlsx(file.buffer, titleFromFile);
        } catch (e) {
          if (!cancelled) {
            setError(String(e.message || e));
            setPhase('pick');
            setFile(null);
          }
          return;
        }
        setParsedCases(parsed);
        payload = { cases: parsed.cases, title: parsed.title, planId: planIdContext ?? undefined };
      } else {
        setParsedCases(null);
        payload = { md: file.md, filename: file.filename, planId: planIdContext ?? undefined };
      }

      try {
        const res = await importApi.dryRun(payload);
        if (cancelled) return;
        setPreview(res);
        setAcceptedAdded(new Set(res.diff.added.map((c) => c.id)));
        setAcceptedChanged(new Set(res.diff.changed.map((c) => c.id)));
        setAcceptedRemoved(new Set(res.diff.removed.map((c) => c.id)));
        setPhase('preview');
      } catch (e) {
        if (cancelled) return;
        setError(String(e.message || e));
        setPhase('pick');
        setFile(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, planIdContext]);

  function resetToPick() {
    setFile(null);
    setParsedCases(null);
    setPreview(null);
    setError(null);
    setAcceptedAdded(new Set());
    setAcceptedChanged(new Set());
    setAcceptedRemoved(new Set());
    setPhase('pick');
  }

  function toggleAccepted(section, id) {
    const mut = (set, setter) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setter(next);
    };
    if (section === 'added') mut(acceptedAdded, setAcceptedAdded);
    else if (section === 'changed') mut(acceptedChanged, setAcceptedChanged);
    else if (section === 'removed') mut(acceptedRemoved, setAcceptedRemoved);
  }

  function toggleAllAccepted(section, checked) {
    if (!preview) return;
    const sourceMap = {
      added: preview.diff.added,
      changed: preview.diff.changed,
      removed: preview.diff.removed,
    };
    const setterMap = {
      added: setAcceptedAdded,
      changed: setAcceptedChanged,
      removed: setAcceptedRemoved,
    };
    setterMap[section](
      checked ? new Set(sourceMap[section].map((it) => it.id)) : new Set(),
    );
  }

  const totalAccepted = useMemo(
    () => acceptedAdded.size + acceptedChanged.size + acceptedRemoved.size,
    [acceptedAdded, acceptedChanged, acceptedRemoved],
  );

  async function handleApply() {
    if (!file || !preview) return;
    setPhase('applying');
    setError(null);
    try {
      let payload;
      if (file.type === 'xlsx' && parsedCases) {
        payload = {
          cases: parsedCases.cases,
          title: parsedCases.title,
          filename: file.filename,
          planId: planIdContext ?? undefined,
        };
      } else {
        payload = {
          md: file.md,
          filename: file.filename,
          planId: planIdContext ?? undefined,
        };
      }
      const res = await importApi.apply({
        ...payload,
        accepted: {
          addedIds: [...acceptedAdded],
          changedIds: [...acceptedChanged],
          removedIds: [...acceptedRemoved],
        },
      });
      await refreshPlans();
      const isNew = preview.mode === 'new-plan';
      const a = res.applied || {};
      const parts = [];
      if (a.added) parts.push(`${a.added} ajout${a.added > 1 ? 's' : ''}`);
      if (a.changed) parts.push(`${a.changed} modif${a.changed > 1 ? 's' : ''}`);
      if (a.removed) parts.push(`${a.removed} retrait${a.removed > 1 ? 's' : ''}`);
      const summary = parts.length ? parts.join(', ') : 'aucun changement appliqué';
      showToast(
        'success',
        isNew ? `Cahier importé — ${summary}.` : `Cahier mis à jour — ${summary}.`,
      );
      setCurrentPlan(res.planId);
      closeDialog();
    } catch (e) {
      setError(String(e.message || e));
      setPhase('preview');
    }
  }

  // ── Render per phase ─────────────────────────────────────────────
  const isLoading = phase === 'dry-running' || phase === 'applying';

  const title = planIdContext
    ? 'Ré-importer le cahier'
    : 'Importer un cahier';

  const footer = (
    <>
      {phase === 'preview' ? (
        <>
          <Button variant="ghost" onClick={resetToPick} disabled={isLoading}>
            Changer de fichier
          </Button>
          <Button
            variant="primary"
            onClick={handleApply}
            disabled={isLoading || totalAccepted === 0}
          >
            Appliquer ({totalAccepted})
          </Button>
        </>
      ) : (
        <Button variant="ghost" onClick={closeDialog} disabled={isLoading}>
          Fermer
        </Button>
      )}
    </>
  );

  return (
    <Modal
      title={title}
      onClose={closeDialog}
      size="xl"
      dismissible={!isLoading}
      footer={footer}
    >
      {error ? (
        <div className="mb-3">
          <ErrorBanner message={error} />
        </div>
      ) : null}

      {phase === 'pick' ? (
        <Dropzone
          onFile={setFile}
          onError={(msg) => setError(msg)}
        />
      ) : null}

      {phase === 'dry-running' ? (
        <div className="flex flex-col items-center justify-center py-10">
          <Spinner size={28} />
          <p className="mt-3 text-sm text-fv-text-secondary">
            Analyse du fichier…
          </p>
        </div>
      ) : null}

      {phase === 'preview' && preview ? (
        <div className="space-y-3">
          <FileSummary file={file} preview={preview} />
          <DiffView
            mode={preview.mode}
            diff={preview.diff}
            acceptedAdded={acceptedAdded}
            acceptedChanged={acceptedChanged}
            acceptedRemoved={acceptedRemoved}
            onToggle={toggleAccepted}
            onToggleAll={toggleAllAccepted}
          />
        </div>
      ) : null}

      {phase === 'applying' ? (
        <div className="flex flex-col items-center justify-center py-10">
          <Spinner size={28} />
          <p className="mt-3 text-sm text-fv-text-secondary">
            Application des changements…
          </p>
        </div>
      ) : null}
    </Modal>
  );
}

function FileSummary({ file, preview }) {
  const existingTitle = preview.plan?.title;
  const isXlsx = file.type === 'xlsx';
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-fv-border bg-fv-bg-secondary px-3 py-2 text-xs text-fv-text-secondary">
      <span>
        {isXlsx ? '📊' : '📎'}{' '}
        <span className="font-medium text-fv-text">{file.filename}</span>
      </span>
      <span>
        Titre&nbsp;:{' '}
        <span className="font-medium text-fv-text">{preview.parsed.title}</span>
        {isXlsx ? <span className="ml-1 text-fv-text-secondary">(depuis nom du fichier)</span> : null}
      </span>
      <span>
        Cas parsés&nbsp;:{' '}
        <span className="font-medium text-fv-text">
          {preview.parsed.cases_count}
        </span>
      </span>
      {existingTitle ? (
        <span>
          Cahier existant&nbsp;:{' '}
          <span className="font-medium text-fv-text">{existingTitle}</span>
        </span>
      ) : null}
    </div>
  );
}
