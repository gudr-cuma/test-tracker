import { useCallback, useEffect, useState } from 'react';
import { commentsApi } from '../../api/resources.js';
import ErrorBanner from '../shared/ErrorBanner.jsx';
import Spinner from '../shared/Spinner.jsx';
import CommentForm from './CommentForm.jsx';
import CommentList from './CommentList.jsx';

/**
 * Polymorphic comment thread (case or run). Self-contained: fetches on mount,
 * optimistically appends on create, notifies parent via onCountChange so
 * UI counters stay fresh.
 *
 * Props:
 *  - targetType : 'case' | 'run'
 *  - targetId   : id of the target row
 *  - compact    : smaller spacing (used inside run rows)
 *  - title      : optional heading
 *  - onCountChange(count) : called after initial load and after each create
 */
export default function CommentsPanel({
  targetType,
  targetId,
  compact = false,
  title = null,
  onCountChange,
}) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await commentsApi.list(targetType, targetId);
      const list = res.comments || [];
      setComments(list);
      onCountChange?.(list.length);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [targetType, targetId, onCountChange]);

  useEffect(() => {
    reload();
  }, [reload]);

  function handleCreated(comment) {
    setComments((prev) => {
      const next = [...prev, comment];
      onCountChange?.(next.length);
      return next;
    });
  }

  return (
    <section className={compact ? 'mt-2' : 'mt-6'}>
      {title ? (
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-fv-text-secondary">
          {title}
          {!loading ? (
            <span className="ml-1.5 rounded-full bg-fv-bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-fv-text">
              {comments.length}
            </span>
          ) : null}
        </h3>
      ) : null}

      {error ? (
        <div className="mb-2">
          <ErrorBanner message={error} onRetry={reload} />
        </div>
      ) : null}

      {loading && comments.length === 0 ? (
        <div className="flex justify-center py-4">
          <Spinner size={16} />
        </div>
      ) : (
        <CommentList comments={comments} compact={compact} />
      )}

      <div className={compact ? 'mt-2' : 'mt-3'}>
        <CommentForm
          targetType={targetType}
          targetId={targetId}
          onCreated={handleCreated}
          rows={compact ? 2 : 3}
          placeholder={
            compact
              ? 'Ajouter un commentaire sur ce run…'
              : 'Ajouter un commentaire sur ce cas…'
          }
        />
      </div>
    </section>
  );
}
