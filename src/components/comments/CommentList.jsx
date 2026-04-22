import { formatDateTime } from '../../engine/formatUtils.js';
import renderCommentBody from './renderCommentBody.jsx';

export default function CommentList({ comments, compact = false }) {
  if (!comments.length) {
    return (
      <p className="px-1 text-xs italic text-fv-text-secondary">
        Aucun commentaire pour l&rsquo;instant.
      </p>
    );
  }
  return (
    <ul className={compact ? 'space-y-1.5' : 'space-y-3'}>
      {comments.map((c) => (
        <li
          key={c.id}
          className={[
            'rounded-md border border-fv-border bg-white',
            compact ? 'px-3 py-2' : 'px-4 py-3',
          ].join(' ')}
        >
          <header className="mb-1 flex items-baseline justify-between gap-3 text-xs text-fv-text-secondary">
            <span className="font-medium text-fv-text">
              {c.author_name || 'Anonyme'}
            </span>
            <time dateTime={c.created_at} className="tabular-nums">
              {formatDateTime(c.created_at)}
            </time>
          </header>
          <div className="whitespace-pre-wrap break-words text-sm text-fv-text">
            {renderCommentBody(c.body)}
          </div>
        </li>
      ))}
    </ul>
  );
}
