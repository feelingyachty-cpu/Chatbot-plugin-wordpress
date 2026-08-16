export type ThemeId = 'yachty' | 'midnight' | 'ocean' | 'sunset' | 'ivory' | 'custom';

export type Colors = {
  navy: string;
  navyDeep: string;
  ink: string;
  pink: string;
  pinkHot: string;
  sunset: string;
  cream: string;
  muted: string;
  paper: string;
  line: string;
  white: string;
  card: string;
};

export const THEME_PRESETS: Record<Exclude<ThemeId, 'custom'>, Colors> = {
  yachty: {
    navy: '#12263a',
    navyDeep: '#081018',
    ink: '#12263a',
    pink: '#e11d74',
    pinkHot: '#E45C9C',
    sunset: '#ff8a3d',
    cream: '#FDF2D0',
    muted: '#8aa0b5',
    paper: '#f4f7fb',
    line: '#d7e3ee',
    white: '#ffffff',
    card: '#ffffff',
  },
  midnight: {
    navy: '#111111',
    navyDeep: '#050505',
    ink: '#1a1a1a',
    pink: '#d4af37',
    pinkHot: '#f0d78c',
    sunset: '#c9a227',
    cream: '#f6e7b2',
    muted: '#9a9a9a',
    paper: '#f3f1ea',
    line: '#e4dfd0',
    white: '#ffffff',
    card: '#ffffff',
  },
  ocean: {
    navy: '#0b3d4a',
    navyDeep: '#06262f',
    ink: '#0b3d4a',
    pink: '#1fb5a8',
    pinkHot: '#3ad1c4',
    sunset: '#ff7a59',
    cream: '#e8fff8',
    muted: '#7aa0a8',
    paper: '#eef8f8',
    line: '#c9e4e2',
    white: '#ffffff',
    card: '#ffffff',
  },
  sunset: {
    navy: '#2a1038',
    navyDeep: '#14061d',
    ink: '#2a1038',
    pink: '#ff6b35',
    pinkHot: '#ff8a5b',
    sunset: '#ffb347',
    cream: '#ffe8d6',
    muted: '#b39bb8',
    paper: '#fff6ef',
    line: '#f0d8c8',
    white: '#ffffff',
    card: '#ffffff',
  },
  ivory: {
    navy: '#3d2b2e',
    navyDeep: '#24181a',
    ink: '#3d2b2e',
    pink: '#c43b6e',
    pinkHot: '#e56b96',
    sunset: '#e8a0b8',
    cream: '#fff7f0',
    muted: '#b08a92',
    paper: '#fffaf6',
    line: '#f0ddd4',
    white: '#ffffff',
    card: '#ffffff',
  },
};

export const THEME_LABELS: { id: ThemeId; label: string; hint: string }[] = [
  { id: 'yachty', label: 'Yachty', hint: 'Navy + pink' },
  { id: 'midnight', label: 'Midnight', hint: 'Black + gold' },
  { id: 'ocean', label: 'Ocean', hint: 'Teal + coral' },
  { id: 'sunset', label: 'Sunset', hint: 'Purple + orange' },
  { id: 'ivory', label: 'Ivory', hint: 'Rose + cream' },
  { id: 'custom', label: 'Custom', hint: 'Your colors' },
];

export const ACCENT_SWATCHES = [
  '#e11d74',
  '#d4af37',
  '#1fb5a8',
  '#ff6b35',
  '#2563eb',
  '#7c3aed',
  '#16a34a',
  '#0ea5e9',
];

export const HEADER_SWATCHES = [
  '#081018',
  '#050505',
  '#06262f',
  '#14061d',
  '#24181a',
  '#12263a',
  '#1e1b4b',
  '#3f1d2e',
];

export function colorsFromSettings(themeId: ThemeId, customAccent?: string, customHeader?: string): Colors {
  if (themeId === 'custom') {
    const accent = customAccent && /^#[0-9a-fA-F]{6}$/.test(customAccent) ? customAccent : '#e11d74';
    const header = customHeader && /^#[0-9a-fA-F]{6}$/.test(customHeader) ? customHeader : '#081018';
    return {
      ...THEME_PRESETS.yachty,
      pink: accent,
      pinkHot: accent,
      navy: header,
      navyDeep: header,
      ink: header,
    };
  }
  return THEME_PRESETS[themeId] || THEME_PRESETS.yachty;
}

/** @deprecated Use ThemeProvider. Kept so older imports still type-check during the split. */
export const colors = THEME_PRESETS.yachty;
