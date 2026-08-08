import { cn } from "@/lib/cn";

/**
 * The Cutwright mark: one film frame, sliced on the diagonal, the two halves
 * pulled a little apart. The cut *is* the logo — no camera, no play triangle,
 * no clapperboard. Reads correctly down to 16px because the silhouette is a
 * single rounded square broken by one high-contrast line.
 */
export function LogoMark({
  size = 32,
  className,
  /** Set false on dense UI chrome, where the offset reads as misalignment. */
  split = true,
}: {
  size?: number;
  className?: string;
  split?: boolean;
}) {
  const d = split ? 1.7 : 0;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role="img"
      aria-label="Cutwright"
    >
      <defs>
        <linearGradient id="cw-blade" x1="8" y1="4" x2="40" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF9557" />
          <stop offset="1" stopColor="#F2620F" />
        </linearGradient>
        <linearGradient id="cw-shadow" x1="8" y1="20" x2="40" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D94E14" />
          <stop offset="1" stopColor="#7A2A06" />
        </linearGradient>
        {/* The slice runs from lower-left to upper-right, ~22 degrees. */}
        <clipPath id="cw-upper">
          <path d="M-8 -8H56V6L-8 32Z" />
        </clipPath>
        <clipPath id="cw-lower">
          <path d="M-8 32L56 6V56H-8Z" />
        </clipPath>
      </defs>

      <g clipPath="url(#cw-upper)" transform={`translate(${d} ${-d})`}>
        <rect x="3" y="3" width="42" height="42" rx="12" fill="url(#cw-blade)" />
        {/* Sprocket perforations, punched out of the frame edge. */}
        <rect x="8.5" y="9" width="4" height="5.5" rx="1.6" fill="#08090B" opacity="0.55" />
        <rect x="35.5" y="9" width="4" height="5.5" rx="1.6" fill="#08090B" opacity="0.55" />
      </g>

      <g clipPath="url(#cw-lower)" transform={`translate(${-d} ${d})`}>
        <rect x="3" y="3" width="42" height="42" rx="12" fill="url(#cw-shadow)" />
        <rect x="8.5" y="33.5" width="4" height="5.5" rx="1.6" fill="#08090B" opacity="0.5" />
        <rect x="35.5" y="33.5" width="4" height="5.5" rx="1.6" fill="#08090B" opacity="0.5" />
        {/* A bright edge along the cut, so the slice reads as freshly made. */}
        <path
          d="M-8 32L56 6"
          stroke="#FFD9BC"
          strokeWidth="1.1"
          opacity="0.5"
          clipPath="url(#cw-lower)"
        />
      </g>
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold tracking-tight", className)}>
      Cut<span className="text-ink-300">wright</span>
    </span>
  );
}

export function Logo({
  size = 30,
  className,
  showWord = true,
}: {
  size?: number;
  className?: string;
  showWord?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {showWord && <Wordmark className="text-[1.05rem]" />}
    </span>
  );
}
