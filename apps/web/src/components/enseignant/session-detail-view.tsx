import { differenceInMinutes, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, MapPinIcon, UserSmallIcon } from '@planit/ui';
import type { SessionDto, SessionStatus } from '@planit/contracts';
import { categoryForType, paletteForSession } from '@/lib/module-palette';

export interface SessionDetailViewProps {
  readonly session: SessionDto;
}

const STATUS_META: Record<SessionStatus, { label: string; tone: string }> = {
  PROVISOIRE: { label: 'Provisoire', tone: 'border-accent bg-accent-100 text-accent-800' },
  VALIDE: { label: 'Validée', tone: 'border-info bg-info-100 text-info' },
  PUBLIE: { label: 'Publiée', tone: 'border-ok bg-ok-100 text-ok' },
};

const CATEGORY_LABEL: Record<ReturnType<typeof categoryForType>, string> = {
  cours: 'Cours',
  evaluation: 'Évaluation',
  evenement: 'Événement',
};

const TYPE_LABEL: Record<SessionDto['type'], string> = {
  CM: 'Cours magistral',
  TD: 'Travaux dirigés',
  TP: 'Travaux pratiques',
  EXAM: 'Examen',
  RATTRAP: 'Rattrapage',
  DEVOIR: 'Devoir surveillé',
  EVENT: 'Événement',
};

function formatDuration(start: Date, end: Date): string {
  const minutes = differenceInMinutes(end, start);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${String(rest).padStart(2, '0')}`;
}

interface InfoItemProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

function InfoItem({ label, value, icon }: InfoItemProps) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      {icon !== undefined ? (
        <div className="flex size-8 flex-shrink-0 items-center justify-center rounded-lg bg-bg text-text-muted">
          {icon}
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium text-text">{value}</p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="px-1 text-[10px] font-bold uppercase tracking-wider text-text-faint">
        {title}
      </h3>
      <div className="divide-y divide-border-soft overflow-hidden rounded-xl border border-border-soft bg-surface">
        {children}
      </div>
    </div>
  );
}

export function SessionDetailView({ session }: SessionDetailViewProps) {
  const palette = paletteForSession(session.module.id, session.type);
  const start = new Date(session.startAt);
  const end = new Date(session.endAt);
  const statusMeta = STATUS_META[session.status];
  const categoryLabel = CATEGORY_LABEL[categoryForType(session.type)];

  return (
    <article className="flex flex-col gap-4">
      <header
        className="relative overflow-hidden rounded-2xl border"
        style={{ background: palette.bg, borderColor: palette.border, color: palette.text }}
      >
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1.5"
          style={{ background: palette.bar }}
        />
        <div className="flex flex-col gap-2 px-6 py-5 pl-8">
          <p className="text-[10.5px] font-bold uppercase tracking-wider" style={{ opacity: 0.7 }}>
            {categoryLabel} · {TYPE_LABEL[session.type]}
          </p>
          <h2
            className="font-display text-xl font-semibold leading-tight sm:text-2xl"
            style={{ color: palette.text }}
          >
            {session.module.name}
          </h2>
          <p className="text-sm" style={{ color: palette.text, opacity: 0.75 }}>
            {session.module.code}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider ${statusMeta.tone}`}
            >
              {statusMeta.label}
            </span>
          </div>
        </div>
      </header>

      <Section title="Programmation">
        <InfoItem
          label="Date"
          value={format(start, 'EEEE d MMMM yyyy', { locale: fr })}
          icon={<CalendarIcon size={15} color="currentColor" />}
        />
        <InfoItem
          label="Horaire"
          value={`${format(start, 'HH:mm', { locale: fr })} – ${format(end, 'HH:mm', { locale: fr })} · ${formatDuration(start, end)}`}
        />
      </Section>

      <Section title="Lieu">
        <InfoItem
          label="Salle"
          value={session.salle.name}
          icon={<MapPinIcon size={15} color="currentColor" />}
        />
      </Section>

      <Section title="Audience">
        <InfoItem
          label="Classe"
          value={`${session.classe.code} — ${session.classe.name}`}
          icon={<UserSmallIcon size={15} color="currentColor" />}
        />
      </Section>
    </article>
  );
}
