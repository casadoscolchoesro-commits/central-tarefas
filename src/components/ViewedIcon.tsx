export function ViewedIcon({ viewed, className = "h-4 w-4" }: { viewed: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M2 12.5l4 4 6-8.5"
        stroke="currentColor"
        strokeOpacity={viewed ? 1 : 0.35}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 12.5l4 4 9-11.5"
        stroke="currentColor"
        strokeOpacity={viewed ? 1 : 0.35}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
