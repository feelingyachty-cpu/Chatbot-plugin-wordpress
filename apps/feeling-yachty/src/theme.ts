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
  tint: string;
  tintStrong: string;
  onDark: string;
  mutedOnDark: string;
  onDarkLink: string;
  overlay: string;
  overlayStrong: string;
  success: string;
  info: string;
};

export const RADII = {
  sm: 12,
  lg: 18,
  pill: 999,
  sheet: 24,
} as const;

export const THEME_PRESETS: Record<Exclude<ThemeId, 'custom'>, Colors> = {
  yachty: {
    navy: '#1B1033',
    navyDeep: '#120A22',
    ink: '#241640',
    pink: '#B503B8',
    pinkHot: '#D004D4',
    sunset: '#FF8A3D',
    cream: '#F6CFF6',
    muted: '#5A5175',
    paper: '#F5F6F9',
    line: '#DDDCE6',
    white: '#FFFFFF',
    card: '#FFFFFF',
    mutedOnDark: '#B9AFD0',
    onDark: '#E9E1F5',
    tint: '#FBE6FB',
    tintStrong: '#F0AEF0',
    onDarkLink: '#F07CF0',
    success: '#0E8A45',
    info: '#006BA1',
    overlay: 'rgba(18,10,34,0.58)',
    overlayStrong: 'rgba(18,10,34,0.74)',
  },
  midnight: {
    navy: '#161616',
    navyDeep: '#080808',
    ink: '#1A1A1A',
    pink: '#B08900',
    pinkHot: '#D4AF37',
    sunset: '#C9A227',
    cream: '#F6E7B2',
    muted: '#6B6B6B',
    paper: '#F5F3EC',
    line: '#E4DFD0',
    white: '#FFFFFF',
    card: '#FFFFFF',
    mutedOnDark: '#A8A8A8',
    onDark: 'rgba(255,255,255,0.84)',
    tint: '#FBF3D9',
    tintStrong: '#E8D28A',
    onDarkLink: '#F0D78C',
    success: '#12A150',
    info: '#3D5A73',
    overlay: 'rgba(8,8,8,0.55)',
    overlayStrong: 'rgba(8,8,8,0.72)',
  },
  ocean: {
    navy: '#0B3D4A',
    navyDeep: '#06262F',
    ink: '#0B3D4A',
    pink: '#0E8C82',
    pinkHot: '#1FB5A8',
    sunset: '#FF7A59',
    cream: '#E8FFF8',
    muted: '#5A7C84',
    paper: '#EEF8F8',
    line: '#C9E4E2',
    white: '#FFFFFF',
    card: '#FFFFFF',
    mutedOnDark: '#95B7BD',
    onDark: 'rgba(255,255,255,0.84)',
    tint: '#DDF6F2',
    tintStrong: '#9BD9D1',
    onDarkLink: '#7EE6DB',
    success: '#12A150',
    info: '#0E6E8C',
    overlay: 'rgba(6,38,47,0.55)',
    overlayStrong: 'rgba(6,38,47,0.72)',
  },
  sunset: {
    navy: '#2A1038',
    navyDeep: '#14061D',
    ink: '#2A1038',
    pink: '#E15120',
    pinkHot: '#FF6B35',
    sunset: '#FFB347',
    cream: '#FFE8D6',
    muted: '#7C6482',
    paper: '#FFF6EF',
    line: '#F0D8C8',
    white: '#FFFFFF',
    card: '#FFFFFF',
    mutedOnDark: '#BFA8C6',
    onDark: 'rgba(255,255,255,0.84)',
    tint: '#FFE7DC',
    tintStrong: '#FFBF9E',
    onDarkLink: '#FFB08C',
    success: '#12A150',
    info: '#7A4AA8',
    overlay: 'rgba(20,6,29,0.55)',
    overlayStrong: 'rgba(20,6,29,0.72)',
  },
  ivory: {
    navy: '#3D2B2E',
    navyDeep: '#24181A',
    ink: '#3D2B2E',
    pink: '#C43B6E',
    pinkHot: '#E56B96',
    sunset: '#E8A0B8',
    cream: '#FFF7F0',
    muted: '#8A6870',
    paper: '#FFFAF6',
    line: '#F0DDD4',
    white: '#FFFFFF',
    card: '#FFFFFF',
    mutedOnDark: '#C4A8AE',
    onDark: 'rgba(255,255,255,0.84)',
    tint: '#FDEBF1',
    tintStrong: '#F0B9CC',
    onDarkLink: '#F5AFC6',
    success: '#12A150',
    info: '#8A5A6E',
    overlay: 'rgba(36,24,26,0.55)',
    overlayStrong: 'rgba(36,24,26,0.72)',
  },
};

export const THEME_LABELS: { id: ThemeId; label: string; hint: string }[] = [
  { id: 'yachty', label: 'Yachty', hint: 'Website colors' },
  { id: 'midnight', label: 'Midnight', hint: 'Black + gold' },
  { id: 'ocean', label: 'Ocean', hint: 'Teal + coral' },
  { id: 'sunset', label: 'Sunset', hint: 'Purple + orange' },
  { id: 'ivory', label: 'Ivory', hint: 'Rose + cream' },
  { id: 'custom', label: 'Custom', hint: 'Your colors' },
];

export const ACCENT_SWATCHES = [
  '#B503B8',
  '#D004D4',
  '#006BA1',
  '#B08900',
  '#0E8C82',
  '#E15120',
  '#7C3AED',
  '#16A34A',
];

export const HEADER_SWATCHES = [
  '#120A22',
  '#1B1033',
  '#080808',
  '#06262F',
  '#14061D',
  '#24181A',
  '#0B1220',
  '#3F1D2E',
];

const HEX = /^#[0-9a-fA-F]{6}$/;

function parseHex(hex: string) {
  if (!HEX.test(hex)) {
    return null;
  }
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function toHex({ r, g, b }: { r: number; g: number; b: number }) {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${clamp(r)}${clamp(g)}${clamp(b)}`;
}

function blendTowardWhite(hex: string, amount: number) {
  const rgb = parseHex(hex);
  if (!rgb) {
    return hex;
  }
  return toHex({
    r: rgb.r + (255 - rgb.r) * amount,
    g: rgb.g + (255 - rgb.g) * amount,
    b: rgb.b + (255 - rgb.b) * amount,
  });
}

function rgbaFromHex(hex: string, alpha: number) {
  const rgb = parseHex(hex);
  if (!rgb) {
    return `rgba(15,23,42,${alpha})`;
  }
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

export function colorsFromSettings(themeId: ThemeId, customAccent?: string, customHeader?: string): Colors {
  if (themeId === 'custom') {
    const accent = customAccent && HEX.test(customAccent) ? customAccent : THEME_PRESETS.yachty.pink;
    const header = customHeader && HEX.test(customHeader) ? customHeader : THEME_PRESETS.yachty.navyDeep;
    return {
      ...THEME_PRESETS.yachty,
      pink: accent,
      pinkHot: blendTowardWhite(accent, 0.18),
      navy: blendTowardWhite(header, 0.06),
      navyDeep: header,
      cream: blendTowardWhite(accent, 0.82),
      tint: blendTowardWhite(accent, 0.9),
      tintStrong: blendTowardWhite(accent, 0.55),
      onDarkLink: blendTowardWhite(accent, 0.6),
      overlay: rgbaFromHex(header, 0.55),
      overlayStrong: rgbaFromHex(header, 0.72),
    };
  }
  return THEME_PRESETS[themeId] || THEME_PRESETS.yachty;
}

/** @deprecated Use ThemeProvider. Kept so older imports still type-check during the split. */
export const colors = THEME_PRESETS.yachty;
