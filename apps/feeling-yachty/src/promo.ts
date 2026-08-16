import type { Yacht } from './types';

/**
 * Promo boats are the pink fleet. They only appear on the Promos tab,
 * matching the special pink section on feelingyachty.com.
 */
export function isPromoYacht(yacht: Yacht): boolean {
  if (yacht.is_pink) {
    return true;
  }
  const badges = yacht.badges || [];
  return badges.some((b) => {
    const text = String(b.text || '').toLowerCase();
    return (
      text.includes('pink') ||
      text.includes('free hour') ||
      text.includes('value pick') ||
      text.includes('new yacht')
    );
  });
}

export function browseYachts(yachts: Yacht[]): Yacht[] {
  return yachts.filter((y) => !isPromoYacht(y));
}

export function promoYachts(yachts: Yacht[]): Yacht[] {
  return yachts.filter(isPromoYacht);
}
