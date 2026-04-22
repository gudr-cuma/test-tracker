const VARIANTS = {
  primary:
    'bg-fv-orange text-white hover:bg-fv-orange-dark focus-visible:ring-fv-orange',
  secondary:
    'bg-white text-fv-text border border-fv-border hover:bg-fv-bg-secondary focus-visible:ring-fv-blue',
  ghost:
    'text-fv-text hover:bg-fv-bg-secondary focus-visible:ring-fv-blue',
  danger:
    'bg-fv-red text-white hover:brightness-90 focus-visible:ring-fv-red',
};

const SIZES = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
};

export default function Button({
  variant = 'secondary',
  size = 'md',
  type = 'button',
  className = '',
  disabled,
  children,
  ...rest
}) {
  const cls = [
    'inline-flex items-center justify-center gap-1.5 rounded-md font-medium',
    'transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
    'disabled:cursor-not-allowed disabled:opacity-60',
    VARIANTS[variant] || VARIANTS.secondary,
    SIZES[size] || SIZES.md,
    className,
  ].join(' ');
  return (
    <button type={type} className={cls} disabled={disabled} {...rest}>
      {children}
    </button>
  );
}
