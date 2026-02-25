import { cn } from '@/lib/utils/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton-shimmer animate-shimmer rounded-md', className)} />;
}
