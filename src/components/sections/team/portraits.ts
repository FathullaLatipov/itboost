/**
 * Per-portrait art direction for the 4/5 team crops (presentation only — no content).
 * `focus` is both the object-position and the zoom origin; `zoom` > 1 tightens loose framings
 * (e.g. full-body shots) or pushes distracting edges out of frame. Unlisted names use defaults.
 */
export interface PortraitArt {
  focus?: string;
  zoom?: number;
}

export const portraitArt: Record<string, PortraitArt> = {
  Fathulla: { focus: '72% 30%', zoom: 1.14 },
  Jamil: { focus: '68% 28%', zoom: 1.26 },
  Sabina: { focus: '50% 38%', zoom: 1.32 },
};

export function portraitStyle(name: string): string | undefined {
  const art = portraitArt[name];
  if (!art) return undefined;
  const parts: string[] = [];
  if (art.focus) parts.push(`--focus:${art.focus}`);
  if (art.zoom) parts.push(`--zoom:${art.zoom}`);
  return parts.join(';');
}
