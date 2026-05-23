import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { now as nowDakar } from '@planit/utils/date';

export interface GreetingProps {
  readonly fullName: string;
  readonly now?: Date;
}

export function Greeting({ fullName, now = nowDakar() }: GreetingProps) {
  const dateLabel = format(now, 'EEEE d MMMM yyyy', { locale: fr });

  return (
    <section aria-labelledby="greeting-name" className="flex flex-col gap-1">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted">
        {dateLabel}
      </p>
      <h1
        id="greeting-name"
        className="font-display text-2xl font-semibold tracking-tight text-text sm:text-[26px]"
      >
        Bonjour, {fullName} <span aria-hidden>👋</span>
      </h1>
    </section>
  );
}
