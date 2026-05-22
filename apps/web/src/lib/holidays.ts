import { addDays, format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * V1 hardcoded holiday list (Sénégal + jours fériés français retenus par l'ISM).
 * Sources: référence visuelle PLANIT-IA (rp/data.js closedDays).
 * À remplacer par un service backend en Vague 02 (TD-016).
 */
interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}

const HOLIDAYS: Holiday[] = [
  { date: '2026-01-01', name: "Jour de l'an" },
  { date: '2026-04-04', name: 'Fête de l’Indépendance' },
  { date: '2026-04-06', name: 'Lundi de Pâques' },
  { date: '2026-05-01', name: 'Fête du travail' },
  { date: '2026-05-08', name: 'Victoire 1945' },
  { date: '2026-05-14', name: 'Ascension' },
  { date: '2026-05-25', name: 'Lundi de Pentecôte' },
  { date: '2026-08-15', name: 'Assomption' },
  { date: '2026-11-01', name: 'Toussaint' },
  { date: '2026-12-25', name: 'Noël' },
];

export interface WeekHoliday {
  date: Date;
  name: string;
  dayLabel: string;
}

export function getWeekHolidays(weekStart: Date): WeekHoliday[] {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const holidays: WeekHoliday[] = [];
  for (const day of days) {
    const match = HOLIDAYS.find((h) => isSameDay(new Date(h.date), day));
    if (match) {
      holidays.push({
        date: day,
        name: match.name,
        dayLabel: format(day, 'EEEE', { locale: fr }),
      });
    }
  }
  return holidays;
}
