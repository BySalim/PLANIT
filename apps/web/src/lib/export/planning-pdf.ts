import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SessionV2Dto } from '@planit/contracts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { PlanningExportData } from './index';

// Planning hebdomadaire en PDF designé (table colorée par séance) via jsPDF.

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const h = (hex || '#64748B').replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function colorFor(s: SessionV2Dto): string {
  if (s.type === 'EVALUATION') return '#DC2626';
  if (s.type === 'EVENEMENT') return '#7C3AED';
  return s.module?.color ?? '#64748B';
}
function typeLabel(s: SessionV2Dto): string {
  return s.type === 'EVALUATION' ? 'Éval' : s.type === 'EVENEMENT' ? 'Event' : 'Cours';
}

const INK: RGB = [28, 25, 23];
const SUB: RGB = [87, 83, 78];
const PRIMARY: RGB = [107, 45, 14];
const BAND: RGB = [245, 243, 240];

export async function buildPlanningPdf(data: PlanningExportData): Promise<Blob> {
  const { sessions, weekStart, classeLabel } = data;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const margin = 36;
  const pageW = doc.internal.pageSize.getWidth();
  const weekLabel = format(weekStart, "'Semaine du' d MMMM yyyy", { locale: fr });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text('Planning hebdomadaire', margin, margin + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...SUB);
  const meta = [weekLabel, classeLabel ?? null]
    .filter((x): x is string => x !== null)
    .join('    ·    ');
  doc.text(meta, margin, margin + 22);

  const sorted = [...sessions].sort((a, b) => a.startAt.localeCompare(b.startAt));
  const colors = sorted.map((s) => hexToRgb(colorFor(s)));
  const body = sorted.map((s) => {
    const person = s.type === 'EVENEMENT' ? s.intervenantNom : s.enseignant?.nomComplet;
    return [
      format(new Date(s.startAt), 'EEE d', { locale: fr }),
      `${format(new Date(s.startAt), 'HH:mm')}–${format(new Date(s.endAt), 'HH:mm')}`,
      typeLabel(s),
      s.libelle || s.module?.name || 'Séance',
      s.classes.map((c) => c.code).join(', '),
      s.salle?.name ?? '',
      person ?? '',
    ];
  });

  autoTable(doc, {
    startY: margin + 34,
    margin: { left: margin, right: margin },
    head: [['Jour', 'Horaire', 'Type', 'Intitulé', 'Classe(s)', 'Salle', 'Enseignant']],
    body: body.length > 0 ? body : [['', '', '', 'Aucune séance cette semaine', '', '', '']],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3.5, lineColor: [231, 229, 228], textColor: INK },
    headStyles: { fillColor: BAND, textColor: SUB, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 52, textColor: SUB },
      1: { cellWidth: 56, fontStyle: 'bold' },
      2: { cellWidth: 38, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 64 },
      5: { cellWidth: 64 },
      6: { cellWidth: 84 },
    },
    didParseCell: (hook) => {
      const c = colors[hook.row.index];
      if (hook.section === 'body' && hook.column.index === 2 && c) {
        hook.cell.styles.fillColor = c;
        hook.cell.styles.textColor = [255, 255, 255];
      }
    },
  });

  const pages = doc.getNumberOfPages();
  const pageH = doc.internal.pageSize.getHeight();
  const generated = new Date().toLocaleDateString('fr-FR');
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(168, 162, 158);
    doc.text(`PLANIT · ${weekLabel}`, margin, pageH - 18);
    doc.text(`Généré le ${generated}`, pageW - margin, pageH - 18, { align: 'right' });
  }

  return doc.output('blob');
}
