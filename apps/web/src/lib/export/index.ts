import type { MaquetteDto, MaquetteVersionDto, SessionV2Dto } from '@planit/contracts';

// ─────────────────────────────────────────────────────────────────────
// Export piloté par la DONNÉE (remplace l'ancienne capture html-to-image).
//
//   pdf  → document designé par le programme (@react-pdf/renderer)
//   xlsx → classeur stylé (exceljs)
//   png  → image (html-to-image) — capture du nœud, conservée à la demande
//
// Les libs lourdes (react-pdf, exceljs) sont chargées en `import()` dynamique
// → code-split, hors bundle initial.
// ─────────────────────────────────────────────────────────────────────

export type ExportFormat = 'pdf' | 'xlsx' | 'png';

export interface MaquetteExportData {
  readonly maquette: MaquetteDto;
  readonly version: MaquetteVersionDto;
  readonly anneeLibelle?: string | undefined;
}

export interface PlanningExportData {
  readonly sessions: readonly SessionV2Dto[];
  readonly weekStart: Date;
  readonly classeLabel?: string | undefined;
}

function slug(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Export d'une maquette. `node` requis uniquement pour le format `png`. */
export async function exportMaquette(
  format: ExportFormat,
  data: MaquetteExportData,
  node?: HTMLElement | null,
): Promise<void> {
  const base = `maquette-${slug(data.maquette.nom)}`;
  if (format === 'png') {
    if (node) {
      const { exportNodeToPng } = await import('./png');
      await exportNodeToPng(node, `${base}.png`);
    }
    return;
  }
  if (format === 'pdf') {
    const { buildMaquettePdf } = await import('./maquette-pdf');
    triggerDownload(await buildMaquettePdf(data), `${base}.pdf`);
    return;
  }
  const { buildMaquetteXlsx } = await import('./maquette-xlsx');
  triggerDownload(await buildMaquetteXlsx(data), `${base}.xlsx`);
}

/** Export d'un planning hebdomadaire. `node` requis uniquement pour `png`. */
export async function exportPlanning(
  format: ExportFormat,
  data: PlanningExportData,
  node?: HTMLElement | null,
): Promise<void> {
  const iso = data.weekStart.toISOString().slice(0, 10);
  const base = `planning-${iso}`;
  if (format === 'png') {
    if (node) {
      const { exportNodeToPng } = await import('./png');
      await exportNodeToPng(node, `${base}.png`);
    }
    return;
  }
  if (format === 'pdf') {
    const { buildPlanningPdf } = await import('./planning-pdf');
    triggerDownload(await buildPlanningPdf(data), `${base}.pdf`);
    return;
  }
  const { buildPlanningXlsx } = await import('./planning-xlsx');
  triggerDownload(await buildPlanningXlsx(data), `${base}.xlsx`);
}
