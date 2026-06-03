import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

// ─────────────────────────────────────────────────────────────────────
// Utilitaires export image + PDF (LOT 7 X.1 — V3-D11)
//
// Librairies validées par le spike LOT 0.8 :
//   - html-to-image (toPng) — capture DOM → data-URL PNG côté client
//   - jspdf — génère un PDF A4 paysage (planning) ou portrait (maquette)
//
// ⚠️ `toPng` requiert un vrai navigateur (canvas API). Ne pas appeler
// côté serveur ou dans jsdom sans mock. Les tests (X.4) mocquent le
// canvas et testent la logique séparément.
// ─────────────────────────────────────────────────────────────────────

export interface PdfMeta {
  /** Nom du fichier sans extension (ex. "planning-semaine-24"). */
  filename: string;
  /** Titre affiché en en-tête du PDF (optionnel). */
  title?: string | undefined;
  /** Orientation du PDF (défaut : paysage pour le planning). */
  orientation?: 'landscape' | 'portrait' | undefined;
}

// ── Options communes toPng ─────────────────────────────────────────────
const PNG_OPTIONS = {
  cacheBust: true,
  pixelRatio: 2, // rendu haute résolution
  backgroundColor: '#FAFAF9', // --color-bg (évite fond transparent)
} as const;

// ── Export image PNG ───────────────────────────────────────────────────
/**
 * Capture le nœud DOM `node` en PNG et déclenche le téléchargement.
 * @param node   Élément DOM à capturer (doit être visible et peint).
 * @param filename Nom du fichier sans extension.
 */
export async function exportNodeToImage(node: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await toPng(node, PNG_OPTIONS);
  triggerDownload(dataUrl, `${filename}.png`);
}

// ── Export PDF ─────────────────────────────────────────────────────────
/**
 * Capture le nœud DOM en PNG puis l'insère dans un PDF A4.
 * L'image est mise à l'échelle pour tenir dans la zone utile
 * (marges 20pt sur chaque bord ; espace titre réservé si fourni).
 */
export async function exportNodeToPdf(node: HTMLElement, meta: PdfMeta): Promise<void> {
  const { filename, title, orientation = 'landscape' } = meta;

  // 1. Capture PNG
  const dataUrl = await toPng(node, PNG_OPTIONS);

  // 2. Dimensions de l'image capturée
  const { w: imgW, h: imgH } = await getImageDimensions(dataUrl);

  // 3. PDF A4
  const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const MARGIN = 20;
  const TITLE_H = 28;

  // En-tête titre
  let yOffset = MARGIN;
  if (title !== undefined && title !== '') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(107, 45, 14); // --color-primary
    doc.text(title, MARGIN, MARGIN + 12);
    // Ligne de séparation fine
    doc.setDrawColor(232, 196, 176); // --color-primary-200
    doc.setLineWidth(0.5);
    doc.line(MARGIN, MARGIN + TITLE_H - 4, pageW - MARGIN, MARGIN + TITLE_H - 4);
    yOffset = MARGIN + TITLE_H;
  }

  // Zone image disponible
  const availW = pageW - 2 * MARGIN;
  const availH = pageH - yOffset - MARGIN;

  // Mise à l'échelle proportionnelle
  const aspectRatio = imgW / imgH;
  let drawW = availW;
  let drawH = drawW / aspectRatio;
  if (drawH > availH) {
    drawH = availH;
    drawW = drawH * aspectRatio;
  }

  doc.addImage(dataUrl, 'PNG', MARGIN, yOffset, drawW, drawH);
  doc.save(`${filename}.pdf`);
}

// ── Helpers privés ────────────────────────────────────────────────────

function triggerDownload(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

function getImageDimensions(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}
