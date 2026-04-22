import { useState } from 'react';
import { commentsApi } from '../../api/resources.js';
import Button from '../shared/Button.jsx';
import ErrorBanner from '../shared/ErrorBanner.jsx';
import Spinner from '../shared/Spinner.jsx';

/**
 * Submits a comment. On success, calls `onCreated(comment)`.
 * Ctrl/Cmd+Enter submits.
 */
export default function CommentForm({
  targetType,
  targetId,
  onCreated,
  placeholder = 'Ajouter un commentaire…',
  rows = 2,
}) {
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const trimmed = body.trim();
  const canSubmit = trimmed.length > 0 && !saving;

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const res = await commentsApi.create(targetType, targetId, trimmed);
      setBody('');
      onCreated?.(res.comment);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {error ? <ErrorBanner message={error} /> : null}
      <textarea
        rows={rows}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSubmit(e);
        }}
        placeholder={placeholder}
        disabled={saving}
        className="w-full resize-y rounded-md border border-fv-border bg-white px-3 py-2 text-sm text-fv-text placeholder:text-fv-text-secondary focus:border-fv-orange focus:outline-none focus:ring-1 focus:ring-fv-orange disabled:opacity-60"
      />
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-fv-text-secondary">
          Ctrl+Entrée pour publier
        </span>
        <Button variant="primary" size="sm" type="submit" disabled={!canSubmit}>
          {saving ? <Spinner size={12} /> : null}
          Commenter
        </Button>
      </div>
    </form>
  );
}
