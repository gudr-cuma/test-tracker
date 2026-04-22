/**
 * Minimal "markdown-ish" renderer:
 *   - preserves whitespace and line breaks (via CSS whitespace-pre-wrap)
 *   - auto-linkifies http/https URLs
 *
 * Anything more (bold, italic, lists) is deferred — add react-markdown
 * later if needed.
 */
const URL_RE = /(https?:\/\/[^\s<>"']+)/g;

export default function renderCommentBody(text) {
  if (!text) return null;
  const parts = [];
  let lastIndex = 0;
  for (const match of text.matchAll(URL_RE)) {
    const { index } = match;
    if (index > lastIndex) parts.push(text.slice(lastIndex, index));
    const url = match[0];
    parts.push(
      <a
        key={`${index}-${url}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-fv-orange underline hover:text-fv-orange-dark"
      >
        {url}
      </a>,
    );
    lastIndex = index + url.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}
