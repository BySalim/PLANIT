import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportNodeToImage } from '../export';

// ─────────────────────────────────────────────────────────────────────
// Tests unitaires helper export — LOT 7 X.4
//
// Périmètre jsdom (unit) :
//   - exportNodeToImage : mock toPng → vérifie le téléchargement PNG
//
// Périmètre non couvert ici (browser/headless) :
//   - exportNodeToPdf : jsPDF.save() utilise Blob/URL.createObjectURL
//     indisponibles en jsdom. La génération jsPDF headless est validée
//     dans export-spike.test.ts (output arraybuffer %PDF- ✓).
//     La fidélité visuelle = smoke navigateur (X.4 spec).
// ─────────────────────────────────────────────────────────────────────

const MOCK_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// ── Mock html-to-image (pas de canvas réel en jsdom) ─────────────────
vi.mock('html-to-image', () => ({ toPng: vi.fn() }));

// ── Mock Image (jsdom ne charge pas les images) ──────────────────────
class MockImage {
  naturalWidth = 800;
  naturalHeight = 600;
  onload: (() => void) | null = null;
  private _src = '';
  get src() {
    return this._src;
  }
  set src(v: string) {
    this._src = v;
    // Simule le chargement asynchrone (microtask pour ne pas bloquer)
    Promise.resolve().then(() => this.onload?.());
  }
}

// ── Mock DOM APIs ────────────────────────────────────────────────────
let clickedUrl = '';
let clickedFilename = '';

function setupDomMocks() {
  // mock Image constructor
  vi.stubGlobal('Image', MockImage);

  // jsPDF.save() utilise URL.createObjectURL (absent en jsdom)
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  });

  // mock createElement('a').click pour capturer le téléchargement
  const origCreate = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'a') {
      const a = origCreate('a') as HTMLAnchorElement;
      vi.spyOn(a, 'click').mockImplementation(() => {
        clickedUrl = a.href;
        clickedFilename = a.download;
      });
      return a;
    }
    return origCreate(tag);
  });
}

describe('exportNodeToImage', () => {
  beforeEach(async () => {
    clickedUrl = '';
    clickedFilename = '';
    setupDomMocks();
    // Patch toPng après que vi.mock l'a initialisé
    const mod = await import('html-to-image');
    vi.mocked(mod.toPng).mockResolvedValue(MOCK_PNG);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('déclenche un téléchargement PNG avec le bon nom de fichier', async () => {
    const node = document.createElement('div');
    await exportNodeToImage(node, 'planning-test');
    expect(clickedFilename).toBe('planning-test.png');
    expect(clickedUrl).toContain('data:image/png');
  });
});

// Note : exportNodeToPdf n'est pas testé en jsdom (jsPDF.save nécessite
// Blob + URL.createObjectURL). Couverture = export-spike.test.ts (jsPDF
// headless) + smoke navigateur (rendu visuel + téléchargement réel).
