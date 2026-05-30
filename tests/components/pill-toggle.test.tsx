import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PillToggle } from '@/components/common/pill-toggle';

describe('PillToggle', () => {
  it('renders all options and marks the active tab', () => {
    render(
      <PillToggle
        options={[
          { value: 'beginner', label: 'Beginner' },
          { value: 'pro', label: 'PRO' },
        ]}
        value="beginner"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Beginner' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'PRO' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange with the selected value when user clicks another tab', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <PillToggle
        options={[
          { value: 'beginner', label: 'Beginner' },
          { value: 'pro', label: 'PRO' },
        ]}
        value="beginner"
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('tab', { name: 'PRO' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('pro');
  });
});
