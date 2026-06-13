import ExcelJS from 'exceljs';
import type { SessionV2Dto } from '@planit/contracts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { PlanningExportData } from './index';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function argb(hex: string): string {
  return `FF${(hex || '#64748B').replace('#', '').padStart(6, '0').slice(0, 6).toUpperCase()}`;
}

function colorFor(s: SessionV2Dto): string {
  if (s.type === 'EVALUATION') return '#DC2626';
  if (s.type === 'EVENEMENT') return '#7C3AED';
  return s.module?.color ?? '#64748B';
}
function typeLabel(s: SessionV2Dto): string {
  return s.type === 'EVALUATION' ? 'Évaluation' : s.type === 'EVENEMENT' ? 'Événement' : 'Cours';
}

export async function buildPlanningXlsx(data: PlanningExportData): Promise<Blob> {
  const { sessions, weekStart, classeLabel } = data;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PLANIT';
  const ws = wb.addWorksheet('Planning', { views: [{ state: 'frozen', ySplit: 4 }] });

  ws.mergeCells('A1:H1');
  ws.getCell('A1').value = 'Planning hebdomadaire';
  ws.getCell('A1').font = { bold: true, size: 15, color: { argb: 'FF6B2D0E' } };
  ws.mergeCells('A2:H2');
  ws.getCell('A2').value = [
    format(weekStart, "'Semaine du' d MMMM yyyy", { locale: fr }),
    classeLabel ?? null,
  ]
    .filter(Boolean)
    .join('   ·   ');
  ws.getCell('A2').font = { color: { argb: 'FF57534E' }, size: 10 };

  const header = ['Jour', 'Début', 'Fin', 'Type', 'Intitulé', 'Classe(s)', 'Salle', 'Enseignant'];
  const headerRow = ws.getRow(4);
  headerRow.values = header;
  headerRow.font = { bold: true, color: { argb: 'FF44403C' }, size: 10 };
  headerRow.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3F0' } };
    c.border = { bottom: { style: 'thin', color: { argb: 'FFE7E5E4' } } };
  });

  ws.columns = [
    { width: 18 },
    { width: 8 },
    { width: 8 },
    { width: 13 },
    { width: 34 },
    { width: 16 },
    { width: 16 },
    { width: 22 },
  ];

  const sorted = [...sessions].sort((a, b) => a.startAt.localeCompare(b.startAt));
  for (const s of sorted) {
    const person = s.type === 'EVENEMENT' ? s.intervenantNom : s.enseignant?.nomComplet;
    const row = ws.addRow([
      format(new Date(s.startAt), 'EEEE d', { locale: fr }),
      format(new Date(s.startAt), 'HH:mm'),
      format(new Date(s.endAt), 'HH:mm'),
      typeLabel(s),
      s.libelle || s.module?.name || 'Séance',
      s.classes.map((c) => c.code).join(', '),
      s.salle?.name ?? '',
      person ?? '',
    ]);
    const typeCell = row.getCell(4);
    typeCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: argb(colorFor(s)) },
    };
    typeCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  }

  if (sorted.length === 0) {
    ws.addRow(['Aucune séance cette semaine']);
  }

  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: 8 } };

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: XLSX_MIME });
}
