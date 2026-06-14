import ExcelJS from 'exceljs';
import type { MaquetteModuleDto } from '@planit/contracts';
import { semestreAbsolu } from '@planit/utils';
import type { MaquetteExportData } from './index';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function argb(hex: string): string {
  return `FF${(hex || '#64748B').replace('#', '').padStart(6, '0').slice(0, 6).toUpperCase()}`;
}
function vhe(m: MaquetteModuleDto): number {
  return m.vhe ?? m.heuresCM + m.heuresTD + m.heuresTP;
}
function vht(m: MaquetteModuleDto): number {
  return m.vht ?? vhe(m) + m.heuresTPE;
}

export async function buildMaquetteXlsx(data: MaquetteExportData): Promise<Blob> {
  const { maquette, version } = data;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PLANIT';
  const ws = wb.addWorksheet(`Maquette ${maquette.niveau}`, {
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  ws.mergeCells('A1:J1');
  ws.getCell('A1').value = maquette.nom;
  ws.getCell('A1').font = { bold: true, size: 15, color: { argb: 'FF6B2D0E' } };
  ws.mergeCells('A2:J2');
  ws.getCell('A2').value = [
    maquette.niveau,
    maquette.filiere ? `${maquette.filiere.sigle} · ${maquette.filiere.libelle}` : null,
    data.anneeLibelle ?? null,
  ]
    .filter(Boolean)
    .join('   ·   ');
  ws.getCell('A2').font = { color: { argb: 'FF57534E' }, size: 10 };

  const header = ['Sem.', 'UE', 'Code', 'Module', 'CM', 'TD', 'TP', 'VHE', 'TPE', 'VHT'];
  const headerRow = ws.getRow(4);
  headerRow.values = header;
  headerRow.font = { bold: true, color: { argb: 'FF44403C' }, size: 10 };
  headerRow.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3F0' } };
    c.border = { bottom: { style: 'thin', color: { argb: 'FFE7E5E4' } } };
  });

  ws.columns = [
    { width: 7 },
    { width: 10 },
    { width: 12 },
    { width: 38 },
    { width: 7 },
    { width: 7 },
    { width: 7 },
    { width: 8 },
    { width: 7 },
    { width: 8 },
  ];

  const modules = [...(version.modules ?? [])].sort((a, b) => {
    if (a.semestre !== b.semestre) return a.semestre - b.semestre;
    return (a.module?.ue?.code ?? '').localeCompare(b.module?.ue?.code ?? '');
  });

  const tot = { cm: 0, td: 0, tp: 0, tpe: 0, vhe: 0, vht: 0 };
  for (const m of modules) {
    tot.cm += m.heuresCM;
    tot.td += m.heuresTD;
    tot.tp += m.heuresTP;
    tot.tpe += m.heuresTPE;
    tot.vhe += vhe(m);
    tot.vht += vht(m);
    const row = ws.addRow([
      `S${semestreAbsolu(maquette.niveau, m.semestre as 1 | 2)}`,
      m.module?.ue?.code ?? '',
      m.module?.code ?? '',
      m.module?.libelle ?? m.moduleId,
      m.heuresCM,
      m.heuresTD,
      m.heuresTP,
      vhe(m),
      m.heuresTPE,
      vht(m),
    ]);
    // Cellule Code remplie de la couleur réelle du module (texte blanc).
    const codeCell = row.getCell(3);
    codeCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: argb(m.module?.color ?? '#64748B') },
    };
    codeCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row.getCell(8).font = { bold: true, color: { argb: 'FF92400E' } };
    row.getCell(10).font = { bold: true, color: { argb: 'FF92400E' } };
  }

  const totalRow = ws.addRow([
    '',
    '',
    '',
    'Total',
    tot.cm,
    tot.td,
    tot.tp,
    tot.vhe,
    tot.tpe,
    tot.vht,
  ]);
  totalRow.font = { bold: true };
  totalRow.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A0F05' } };
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  });

  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: 10 } };

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: XLSX_MIME });
}
