export default function Spinner({ size = 16, label = 'Chargement…' }) {
  const s = `${size}px`;
  return (
    <span
      role="status"
      aria-label={label}
      className="inline-block animate-spin rounded-full border-2 border-fv-border border-t-fv-orange align-middle"
      style={{ width: s, height: s }}
    />
  );
}
