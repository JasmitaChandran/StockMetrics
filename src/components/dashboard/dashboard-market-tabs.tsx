'use client';

import { PillToggle } from '@/components/common/pill-toggle';
import { useUiStore } from '@/stores/ui-store';

export function DashboardMarketTabs() {
  const market = useUiStore((s) => s.dashboardMarket);
  const setMarket = useUiStore((s) => s.setDashboardMarket);
  return (
    <PillToggle
      options={[
        { value: 'us', label: 'US Stocks' },
        { value: 'india', label: 'Indian Stocks' },
        { value: 'mf', label: 'Mutual Funds' },
      ]}
      value={market}
      onChange={setMarket}
      className="bg-card/80"
    />
  );
}
