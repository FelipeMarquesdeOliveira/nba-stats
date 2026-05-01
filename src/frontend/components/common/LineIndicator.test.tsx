import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LineIndicator } from './LineIndicator';

describe('LineIndicator Component', () => {
  it('should render green indicator when points remaining <= 3', () => {
    render(<LineIndicator pointsRemaining={0} />);

    const indicator = screen.getByText('✓');
    expect(indicator).toBeInTheDocument();
    expect(indicator.className).toContain('line-green');
  });

  it('should render green indicator for negative points (over the line)', () => {
    render(<LineIndicator pointsRemaining={-2} />);

    const indicator = screen.getByText('✓');
    expect(indicator).toBeInTheDocument();
    expect(indicator.className).toContain('line-green');
  });

  it('should render +N for positive points remaining <= 3', () => {
    render(<LineIndicator pointsRemaining={2} />);

    const indicator = screen.getByText('+2');
    expect(indicator).toBeInTheDocument();
    expect(indicator.className).toContain('line-green');
  });

  it('should render yellow indicator for 4 points remaining', () => {
    render(<LineIndicator pointsRemaining={4} />);

    const indicator = screen.getByText('+4');
    expect(indicator).toBeInTheDocument();
    expect(indicator.className).toContain('line-yellow');
  });

  it('should render yellow indicator for 5 points remaining', () => {
    render(<LineIndicator pointsRemaining={5} />);

    const indicator = screen.getByText('+5');
    expect(indicator).toBeInTheDocument();
    expect(indicator.className).toContain('line-yellow');
  });

  it('should render red indicator for 6 or more points remaining', () => {
    render(<LineIndicator pointsRemaining={6} />);

    const indicator = screen.getByText('+6');
    expect(indicator).toBeInTheDocument();
    expect(indicator.className).toContain('line-red');
  });

  it('should render red indicator for large point deficits', () => {
    render(<LineIndicator pointsRemaining={15} />);

    const indicator = screen.getByText('+15');
    expect(indicator).toBeInTheDocument();
    expect(indicator.className).toContain('line-red');
  });

  it('should display checkmark for exactly 0 points remaining', () => {
    render(<LineIndicator pointsRemaining={0} />);

    const indicator = screen.getByText('✓');
    expect(indicator).toBeInTheDocument();
    expect(indicator.className).toContain('line-green');
  });

  it('should display +3 for exactly 3 points remaining', () => {
    render(<LineIndicator pointsRemaining={3} />);

    const indicator = screen.getByText('+3');
    expect(indicator).toBeInTheDocument();
    expect(indicator.className).toContain('line-green');
  });

  it('should display +4 for exactly 4 points remaining', () => {
    render(<LineIndicator pointsRemaining={4} />);

    const indicator = screen.getByText('+4');
    expect(indicator).toBeInTheDocument();
    expect(indicator.className).toContain('line-yellow');
  });
});