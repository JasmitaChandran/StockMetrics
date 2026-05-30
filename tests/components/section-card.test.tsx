import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SectionCard } from '@/components/common/section-card';

describe('SectionCard', () => {
  it('renders title, subtitle, action, and child content', () => {
    render(
      <SectionCard
        title="Portfolio"
        subtitle="Track your holdings"
        action={<button type="button">Refresh</button>}
      >
        <div>Content body</div>
      </SectionCard>,
    );

    expect(screen.getByRole('heading', { name: 'Portfolio' })).toBeInTheDocument();
    expect(screen.getByText('Track your holdings')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(screen.getByText('Content body')).toBeInTheDocument();
  });

  it('applies perf containment class by default and removes it when disabled', () => {
    const { container, rerender } = render(
      <SectionCard title="Default Card">
        <div>Body</div>
      </SectionCard>,
    );

    const section = container.querySelector('section');
    expect(section).toHaveClass('perf-section');

    rerender(
      <SectionCard title="Custom Card" disablePerfContainment className="custom-card">
        <div>Body</div>
      </SectionCard>,
    );

    expect(section).not.toHaveClass('perf-section');
    expect(section).toHaveClass('custom-card');
  });
});
