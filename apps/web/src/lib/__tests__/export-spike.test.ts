import { describe, expect, it } from 'vitest';
import { toBlob, toPng, toSvg } from 'html-to-image';
import { jsPDF } from 'jspdf';

// ─────────────────────────────────────────────────────────────────────
// Spike export (LOT 0.8 — V3-D11). Valide que la pile client-side
// `html-to-image` + `jspdf` est exploitable AVANT le LOT 7 (exports
// planning + maquette en image/PDF). Décision : GO (cf.
// docs/runbooks/export-spike.md).
//
// jsPDF tourne headless (génère un vrai PDF en Node/jsdom) → testable ici.
// html-to-image dépend du `<canvas>` réel du navigateur (jsdom n'implémente
// pas le rendu canvas) → on valide l'import + la signature ; le rendu visuel
// est couvert par le smoke navigateur du LOT 7 (X.4).
// ─────────────────────────────────────────────────────────────────────

describe('spike export — jspdf (PDF headless)', () => {
  it('génère un PDF A4 paysage non vide avec en-tête %PDF', () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    doc.setFontSize(18);
    doc.text('PLANIT — export spike', 40, 60);

    const buffer = doc.output('arraybuffer');
    expect(buffer.byteLength).toBeGreaterThan(0);

    // Signature PDF : les 5 premiers octets doivent être « %PDF- ».
    const header = String.fromCharCode(...new Uint8Array(buffer).slice(0, 5));
    expect(header).toBe('%PDF-');
  });

  it('expose addImage (intégration future des captures html-to-image)', () => {
    const doc = new jsPDF();
    expect(typeof doc.addImage).toBe('function');
    expect(typeof doc.addPage).toBe('function');
  });
});

describe('spike export — html-to-image (API surface)', () => {
  it('expose les fonctions de capture utilisées au LOT 7', () => {
    // toPng → export image PNG ; toBlob → téléchargement ; toSvg → fallback.
    expect(typeof toPng).toBe('function');
    expect(typeof toBlob).toBe('function');
    expect(typeof toSvg).toBe('function');
  });
});
