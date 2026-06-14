import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DaySelect } from './day-select';

describe('DaySelect', () => {
  const weekStart = new Date('2026-05-25T00:00:00.000Z'); // un lundi

  it('rend 7 jours et reflète le jour actif', () => {
    render(<DaySelect weekStart={weekStart} activeDay={2} onChange={() => {}} />);
    const select = screen.getByLabelText('Jour affiché') as HTMLSelectElement;
    expect(select.options).toHaveLength(7);
    expect(select.value).toBe('2');
  });

  it('émet le nouvel index au changement', () => {
    const onChange = vi.fn();
    render(<DaySelect weekStart={weekStart} activeDay={0} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Jour affiché'), { target: { value: '4' } });
    expect(onChange).toHaveBeenCalledWith(4);
  });
});
