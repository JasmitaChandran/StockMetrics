'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils/cn';

export function VirtualizedTable<T extends { id: string }>({
  rows,
  height = 320,
  estimateRowHeight = 44,
  header,
  renderRow,
  onVisibleRowsChange,
  headerClassName,
  contentClassName,
  scrollClassName,
  className,
}: {
  rows: T[];
  height?: number;
  estimateRowHeight?: number;
  header?: React.ReactNode;
  renderRow: (row: T) => React.ReactNode;
  onVisibleRowsChange?: (rows: T[]) => void;
  headerClassName?: string;
  contentClassName?: string;
  scrollClassName?: string;
  className?: string;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateRowHeight,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const topPaddingHeight = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const bottomPaddingHeight = virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0;
  const renderedRows = useMemo(() => virtualRows.map((vr) => rows[vr.index]).filter(Boolean), [rows, virtualRows]);

  useEffect(() => {
    onVisibleRowsChange?.(renderedRows);
  }, [onVisibleRowsChange, renderedRows]);

  return (
    <div className={cn('overflow-hidden rounded-xl border border-border', className)}>
      {header ? <div className={cn('border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium', headerClassName)}>{header}</div> : null}
      <div ref={parentRef} style={{ height }} className={cn('overflow-auto', scrollClassName)}>
        <div className={contentClassName}>
          {topPaddingHeight > 0 ? <div style={{ height: topPaddingHeight }} /> : null}
          {renderedRows.map((row) => (
            <div key={row.id}>{renderRow(row)}</div>
          ))}
          {bottomPaddingHeight > 0 ? <div style={{ height: bottomPaddingHeight }} /> : null}
        </div>
      </div>
    </div>
  );
}
