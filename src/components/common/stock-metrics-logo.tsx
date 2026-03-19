import { cn } from '@/lib/utils/cn';
import { useId } from 'react';

export function StockMetricsLogo({ className }: { className?: string }) {
  const id = useId();
  const ringId = `sm-ring-${id}`;
  const arrowId = `sm-arrow-${id}`;
  const barsId = `sm-bars-${id}`;

  return (
    <svg
      viewBox="0 0 96 96"
      aria-hidden="true"
      className={cn(
        '[--sm-ring-a:#4a8cd6] [--sm-ring-b:#58b9df] [--sm-ring-c:#74e4e2] [--sm-arrow-a:#4f93da] [--sm-arrow-b:#5dbde0] [--sm-arrow-c:#7ae6e3] [--sm-bars-a:#4b86cf] [--sm-bars-b:#5bb5df] [--sm-node-a:#4a8fd7] [--sm-node-b:#53a3db] [--sm-node-c:#58b3dd] [--sm-node-d:#63c8e0] [--sm-node-e:#79e8e4] [--sm-dot-a:#4d92d8] [--sm-dot-b:#57a8dc] [--sm-dot-c:#5ab4dd] [--sm-dot-d:#65cde1] [--sm-dot-e:#79eae5] dark:[--sm-ring-a:#2a4f80] dark:[--sm-ring-b:#2d6f98] dark:[--sm-ring-c:#3097a4] dark:[--sm-arrow-a:#325a88] dark:[--sm-arrow-b:#32779d] dark:[--sm-arrow-c:#38a3a9] dark:[--sm-bars-a:#2a4e7f] dark:[--sm-bars-b:#2f789f] dark:[--sm-node-a:#2f5b89] dark:[--sm-node-b:#2d6892] dark:[--sm-node-c:#2e7599] dark:[--sm-node-d:#3290a7] dark:[--sm-node-e:#36a8ae] dark:[--sm-dot-a:#355f8e] dark:[--sm-dot-b:#32709a] dark:[--sm-dot-c:#327d9f] dark:[--sm-dot-d:#3595a9] dark:[--sm-dot-e:#3eb0b4]',
        className,
      )}
    >
      <defs>
        <linearGradient id={ringId} x1="10" y1="84" x2="86" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--sm-ring-a)" />
          <stop offset="0.52" stopColor="var(--sm-ring-b)" />
          <stop offset="1" stopColor="var(--sm-ring-c)" />
        </linearGradient>
        <linearGradient id={arrowId} x1="16" y1="72" x2="84" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--sm-arrow-a)" />
          <stop offset="0.5" stopColor="var(--sm-arrow-b)" />
          <stop offset="1" stopColor="var(--sm-arrow-c)" />
        </linearGradient>
        <linearGradient id={barsId} x1="22" y1="76" x2="70" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--sm-bars-a)" />
          <stop offset="1" stopColor="var(--sm-bars-b)" />
        </linearGradient>
      </defs>

      <path d="M12 48a36 36 0 0 1 70-17" fill="none" stroke={`url(#${ringId})`} strokeWidth="5" strokeLinecap="round" />
      <path d="M84 50a36 36 0 0 1-68 21" fill="none" stroke={`url(#${ringId})`} strokeWidth="5" strokeLinecap="round" />

      <path
        d="M24 44 34 34 46 38 56 30 67 36"
        fill="none"
        stroke={`url(#${ringId})`}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
      <circle cx="24" cy="44" r="2.8" fill="var(--sm-dot-a)" />
      <circle cx="34" cy="34" r="2.8" fill="var(--sm-dot-b)" />
      <circle cx="46" cy="38" r="2.8" fill="var(--sm-dot-c)" />
      <circle cx="56" cy="30" r="2.8" fill="var(--sm-dot-d)" />
      <circle cx="67" cy="36" r="2.8" fill="var(--sm-dot-e)" />

      <rect x="24" y="58" width="10" height="16" rx="1.5" fill={`url(#${barsId})`} />
      <rect x="40" y="52" width="10" height="22" rx="1.5" fill={`url(#${barsId})`} />
      <rect x="56" y="44" width="10" height="30" rx="1.5" fill={`url(#${barsId})`} />

      <path d="M16 68 32 54 44 58 62 40 78 28" fill="none" stroke={`url(#${arrowId})`} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="68" r="3.1" fill="var(--sm-node-a)" />
      <circle cx="32" cy="54" r="3.1" fill="var(--sm-node-b)" />
      <circle cx="44" cy="58" r="3.1" fill="var(--sm-node-c)" />
      <circle cx="62" cy="40" r="3.1" fill="var(--sm-node-d)" />
      <path d="M76 23 86 21 82 31Z" fill={`url(#${arrowId})`} />
    </svg>
  );
}
