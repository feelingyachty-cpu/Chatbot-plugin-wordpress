import { startingListed } from './api';
import { browseYachts, promoYachts } from './promo';
import type { Yacht } from './types';

export type SizeBand = 'all' | 'u40' | '40s' | '50s' | '60s' | '70p';
export type StyleFilter = 'all' | 'value' | 'captain' | 'saved';
export type SortKey = 'featured' | 'price_asc' | 'price_desc' | 'size_asc' | 'size_desc';

export const SIZE_CHIPS: { id: SizeBand; label: string }[] = [
  { id: 'all', label: 'All sizes' },
  { id: 'u40', label: 'Under 40ft' },
  { id: '40s', label: '40–49ft' },
  { id: '50s', label: '50–59ft' },
  { id: '60s', label: '60–69ft' },
  { id: '70p', label: '70ft+' },
];

export const STYLE_CHIPS: { id: StyleFilter; label: string }[] = [
  { id: 'all', label: 'All styles' },
  { id: 'value', label: 'Under $1,400' },
  { id: 'captain', label: 'Captain included' },
  { id: 'saved', label: 'Saved' },
];

export const SORT_CHIPS: { id: SortKey; label: string }[] = [
  { id: 'price_asc', label: 'Price ↑' },
  { id: 'price_desc', label: 'Price ↓' },
  { id: 'size_asc', label: 'Size ↑' },
  { id: 'size_desc', label: 'Size ↓' },
  { id: 'featured', label: 'Featured' },
];

function inSize(yacht: Yacht, band: SizeBand): boolean {
  const ft = Number(yacht.size_ft || 0);
  if (band === 'all') return true;
  if (!ft) return false;
  if (band === 'u40') return ft < 40;
  if (band === '40s') return ft >= 40 && ft < 50;
  if (band === '50s') return ft >= 50 && ft < 60;
  if (band === '60s') return ft >= 60 && ft < 70;
  return ft >= 70;
}

function hasCaptain(yacht: Yacht): boolean {
  return Boolean(yacht.captain_included);
}

export function filterAndSort(
  yachts: Yacht[],
  opts: {
    query: string;
    size: SizeBand;
    style: StyleFilter;
    sort: SortKey;
    savedIds: number[];
    pinkOnly?: boolean;
  }
): Yacht[] {
  const pool = opts.pinkOnly ? promoYachts(yachts) : browseYachts(yachts);
  const q = opts.query.trim().toLowerCase();
  let list = pool.filter((y) => {
    if (!inSize(y, opts.size)) return false;
    if (opts.style === 'saved' && !opts.savedIds.includes(y.id)) return false;
    if (opts.style === 'value') {
      const start = startingListed(y);
      if (!start || start.amount >= 1400) return false;
    }
    if (opts.style === 'captain' && !hasCaptain(y)) return false;
    if (q && !`${y.title} ${y.size_ft || ''} ${y.capacity_max || ''}`.toLowerCase().includes(q)) {
      return false;
    }
    return true;
  });

  if (opts.style === 'saved') {
    const extra = yachts.filter((y) => opts.savedIds.includes(y.id) && !list.some((x) => x.id === y.id));
    list = [...list, ...extra].filter((y) => {
      if (!inSize(y, opts.size)) return false;
      if (q && !`${y.title} ${y.size_ft || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  const priced = (y: Yacht) => startingListed(y)?.amount ?? Number.POSITIVE_INFINITY;
  if (opts.sort === 'price_asc') list = [...list].sort((a, b) => priced(a) - priced(b));
  if (opts.sort === 'price_desc') list = [...list].sort((a, b) => priced(b) - priced(a));
  if (opts.sort === 'size_asc') list = [...list].sort((a, b) => (a.size_ft || 0) - (b.size_ft || 0));
  if (opts.sort === 'size_desc') list = [...list].sort((a, b) => (b.size_ft || 0) - (a.size_ft || 0));
  return list;
}

export function featuredYachts(yachts: Yacht[], limit = 8): Yacht[] {
  return [...yachts]
    .filter((y) => y.image_url)
    .sort((a, b) => (b.size_ft || 0) - (a.size_ft || 0))
    .slice(0, limit);
}

export function yachtsByIds(yachts: Yacht[], ids: number[]): Yacht[] {
  const map = new Map(yachts.map((y) => [y.id, y]));
  return ids.map((id) => map.get(id)).filter((y): y is Yacht => !!y);
}
