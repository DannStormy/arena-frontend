// BRAND_NAME is the single source of truth — change here to rename everywhere.
export const BRAND_NAME = 'Arena';

interface LogoProps {
  variant?: 'full' | 'mark';
  className?: string;
}

// Placeholder mark — swap the SVG path when the final mark direction is confirmed.
function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {/* Shield shape — geometric, arena-themed, readable at any size */}
      <path
        d="M12 2L3 6v6c0 5.25 3.75 9.65 9 11.15C17.25 21.65 21 17.25 21 12V6L12 2z"
        fill="#E8893B"
      />
      <path
        d="M9 12l2 2 4-4"
        stroke="#0A0A0F"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ variant = 'full', className }: LogoProps) {
  if (variant === 'mark') {
    return (
      <span className={className} aria-label={BRAND_NAME}>
        <Mark />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ''}`} aria-label={BRAND_NAME}>
      <Mark size={22} />
      <span className="font-display font-bold leading-none tracking-tight" style={{ color: '#E8893B' }}>
        {BRAND_NAME}
      </span>
    </span>
  );
}
