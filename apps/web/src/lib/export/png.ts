import { toPng } from 'html-to-image';

// Export image — capture du nœud DOM (la seule sortie qui reste une image).
// ⚠️ `toPng` requiert un vrai navigateur (canvas API) — mocké en jsdom.

const PNG_OPTIONS = {
  cacheBust: true,
  pixelRatio: 2,
  backgroundColor: '#FAFAF9',
} as const;

export async function exportNodeToPng(node: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await toPng(node, PNG_OPTIONS);
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
