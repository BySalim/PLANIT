'use client';

import { addMonths, endOfMonth, format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@planit/ui';
import { now as nowDakar } from '@planit/utils/date';
import { cn } from '@/lib/utils';

export interface CalendarPickerProps {
  readonly open: boolean;
  readonly selectedDate: Date;
  readonly today?: Date;
  readonly onSelect: (date: Date) => void;
  readonly onClose: () => void;
}

const DAY_INITIALS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

interface DayCell {
  readonly date: Date;
  readonly inMonth: boolean;
}

function buildCells(viewYear: number, viewMonth: number): readonly DayCell[] {
  const firstDay = new Date(viewYear, viewMonth, 1);
  const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const daysInMonth = endOfMonth(firstDay).getDate();
  const cells: DayCell[] = [];

  for (let i = 0; i < startDow; i++) {
    cells.push({
      date: new Date(viewYear, viewMonth, 1 - startDow + i),
      inMonth: false,
    });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ date: new Date(viewYear, viewMonth, i), inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    if (!last) break;
    const next = new Date(last.date);
    next.setDate(last.date.getDate() + 1);
    cells.push({ date: next, inMonth: false });
  }
  return cells;
}

export function CalendarPicker({
  open,
  selectedDate,
  today = nowDakar(),
  onSelect,
  onClose,
}: CalendarPickerProps) {
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());

  useEffect(() => {
    if (open) {
      setViewMonth(selectedDate.getMonth());
      setViewYear(selectedDate.getFullYear());
    }
  }, [open, selectedDate]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const cells = buildCells(viewYear, viewMonth);
  const monthLabel = format(new Date(viewYear, viewMonth, 1), 'MMMM yyyy', { locale: fr });

  const navMonth = (delta: number) => {
    const d = addMonths(new Date(viewYear, viewMonth, 1), delta);
    setViewMonth(d.getMonth());
    setViewYear(d.getFullYear());
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sélectionner une date"
      className="absolute inset-0 z-30 flex items-start justify-center bg-text/[0.18] px-3 pt-2 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 border-b border-border-soft p-3">
          <button
            type="button"
            onClick={() => navMonth(-1)}
            className="flex size-8 items-center justify-center rounded-lg border border-border transition-colors hover:border-primary hover:text-primary"
            aria-label="Mois précédent"
          >
            <ChevronLeftIcon size={14} color="currentColor" />
          </button>
          <span className="flex-1 text-center font-display text-[13.5px] font-semibold capitalize text-text">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={() => onSelect(today)}
            className="rounded-md border border-accent bg-accent-100 px-2.5 py-1 text-[10.5px] font-bold uppercase text-accent transition-colors hover:bg-accent hover:text-white"
          >
            Auj.
          </button>
          <button
            type="button"
            onClick={() => navMonth(1)}
            className="flex size-8 items-center justify-center rounded-lg border border-border transition-colors hover:border-primary hover:text-primary"
            aria-label="Mois suivant"
          >
            <ChevronRightIcon size={14} color="currentColor" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 px-2.5 pb-1 pt-2">
          {DAY_INITIALS.map((d, i) => (
            <div key={i} className="text-center text-[10px] font-semibold text-text-muted">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 px-2.5 pb-3">
          {cells.map(({ date, inMonth }, i) => {
            const isToday = isSameDay(date, today);
            const isSel = isSameDay(date, selectedDate);
            return (
              <button
                key={i}
                type="button"
                onClick={() => inMonth && onSelect(date)}
                disabled={!inMonth}
                className={cn(
                  'flex h-8 items-center justify-center font-display text-[12.5px] tabular-nums',
                  isSel
                    ? isToday
                      ? 'rounded-full bg-accent font-bold text-white'
                      : 'rounded-full bg-primary font-bold text-white'
                    : isToday
                      ? 'rounded-full border-[1.5px] border-accent font-bold text-accent'
                      : inMonth
                        ? 'text-text hover:bg-bg'
                        : 'text-border-soft',
                )}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full border-t border-border-soft py-3 text-[13px] font-semibold text-text hover:bg-bg"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
