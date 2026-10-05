/**
 * Build-time helpers for the Work section media (case studies, project cards, lightbox).
 * Image URLs are generated here with `getImage()` so the lightbox can lazy-load
 * a large optimized screenshot only when it is opened.
 */
import { getImage } from 'astro:assets';
import type { Project } from '@/content/projects';

export interface LightboxImage {
  src: string;
  srcset: string;
  width: number;
  height: number;
}

/** Large widths for desktop captures; phone captures are shown at their native size (≤ 900px). */
const DESKTOP_WIDTHS = [1280, 2048];
const PHONE_MAX = 900;

export async function getLightboxImage(project: Project): Promise<LightboxImage> {
  const { image, device } = project;
  const cap = device === 'phone' ? PHONE_MAX : DESKTOP_WIDTHS[DESKTOP_WIDTHS.length - 1];
  const largest = Math.min(image.width, cap);
  const widths = device === 'phone' ? [largest] : [...new Set(DESKTOP_WIDTHS.map((w) => Math.min(w, largest)))];

  const result = await getImage({ src: image, width: largest, widths, format: 'webp' });

  return {
    src: result.src,
    srcset: result.srcSet.attribute,
    width: largest,
    height: Math.round((image.height * largest) / image.width),
  };
}

/** Data attributes consumed by `src/scripts/lightbox.ts`. */
export function lightboxAttrs(project: Project, img: LightboxImage, alt: string): Record<string, string> {
  return {
    'data-lightbox': project.id,
    'data-lb-src': img.src,
    'data-lb-srcset': img.srcset,
    'data-lb-w': String(img.width),
    'data-lb-h': String(img.height),
    'data-lb-alt': alt,
    'data-lb-name': project.name,
    'data-lb-url': project.url,
    'data-lb-label': project.linkLabel,
    'data-lb-device': project.device,
  };
}

/** Fills the `{name}` placeholder of a localized template. */
export function fillName(template: string, name: string): string {
  return template.replace('{name}', name);
}
