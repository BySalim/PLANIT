import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { MaquetteModuleDto } from '@planit/contracts';
import { semestreAbsolu } from '@planit/utils';
import type { MaquetteExportData } from './index';

// Maquette en PDF designé par le programme (texte vectoriel, tables, couleurs
// réelles des modules) via jsPDF + autotable. Aucune capture d'écran.

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const h = (hex || '#64748B').replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function vhe(m: MaquetteModuleDto): number {
  return m.vhe ?? m.heuresCM + m.heuresTD + m.heuresTP;
}
function vht(m: MaquetteModuleDto): number {
  return m.vht ?? vhe(m) + m.heuresTPE;
}

const INK: RGB = [28, 25, 23];
const SUB: RGB = [87, 83, 78];
const PRIMARY: RGB = [107, 45, 14];
const BAND: RGB = [245, 243, 240];
const AMBER: RGB = [146, 64, 14];
const DARK: RGB = [42, 15, 5];

export async function buildMaquettePdf(data: MaquetteExportData): Promise<Blob> {
  const { maquette, version } = data;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const margin = 36;
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text(maquette.nom, margin, margin + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...SUB);
  const meta = [
    maquette.niveau,
    maquette.filiere ? `${maquette.filiere.sigle} · ${maquette.filiere.libelle}` : null,
    data.anneeLibelle ?? null,
  ]
    .filter((x): x is string => x !== null)
    .join('    ·    ');
  doc.text(meta, margin, margin + 22);

  let cursorY = margin + 36;
  const modules = version.modules ?? [];

  for (const rang of [1, 2] as const) {
    const mods = [...modules]
      .filter((m) => m.semestre === rang)
      .sort((a, b) => (a.module?.ue?.code ?? '').localeCompare(b.module?.ue?.code ?? ''));
    if (mods.length === 0) continue;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(...PRIMARY);
    doc.text(`Semestre ${semestreAbsolu(maquette.niveau, rang)}`, margin, cursorY);
    cursorY += 6;

    const colors = mods.map((m) => hexToRgb(m.module?.color ?? '#64748B'));
    const body = mods.map((m) => [
      m.module?.ue?.code ?? '',
      m.module?.code ?? '',
      m.module?.libelle ?? m.moduleId,
      m.heuresCM || '·',
      m.heuresTD || '·',
      m.heuresTP || '·',
      vhe(m),
      m.heuresTPE || '·',
      vht(m),
    ]);
    const tot = mods.reduce(
      (a, m) => ({
        cm: a.cm + m.heuresCM,
        td: a.td + m.heuresTD,
        tp: a.tp + m.heuresTP,
        tpe: a.tpe + m.heuresTPE,
        vhe: a.vhe + vhe(m),
        vht: a.vht + vht(m),
      }),
      { cm: 0, td: 0, tp: 0, tpe: 0, vhe: 0, vht: 0 },
    );

    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      head: [['UE', 'Code', 'Module', 'CM', 'TD', 'TP', 'VHE', 'TPE', 'VHT']],
      body,
      foot: [['', '', 'Total', tot.cm, tot.td, tot.tp, tot.vhe, tot.tpe, tot.vht]],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3, lineColor: [231, 229, 228], textColor: INK },
      headStyles: { fillColor: BAND, textColor: SUB, fontStyle: 'bold', fontSize: 7.5 },
      footStyles: { fillColor: DARK, textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 38 },
        1: { cellWidth: 48, fontStyle: 'bold' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' },
        5: { cellWidth: 30, halign: 'right' },
        6: { cellWidth: 34, halign: 'right' },
        7: { cellWidth: 30, halign: 'right' },
        8: { cellWidth: 34, halign: 'right' },
      },
      didParseCell: (hook) => {
        if (hook.section === 'body') {
          const c = colors[hook.row.index];
          if (hook.column.index === 1 && c) {
            hook.cell.styles.fillColor = c;
            hook.cell.styles.textColor = [255, 255, 255];
          }
          if (hook.column.index === 6 || hook.column.index === 8) {
            hook.cell.styles.textColor = AMBER;
            hook.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });
    const lastY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    cursorY = lastY + 22;
  }

  // Pied de page sur chaque page.
  const pages = doc.getNumberOfPages();
  const pageH = doc.internal.pageSize.getHeight();
  const generated = new Date().toLocaleDateString('fr-FR');
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(168, 162, 158);
    doc.text(`PLANIT · Maquette ${maquette.nom}`, margin, pageH - 18);
    doc.text(`Généré le ${generated}`, pageW - margin, pageH - 18, { align: 'right' });
  }

  return doc.output('blob');
}
