import { useWindowDimensions } from 'react-native';

export type LayoutMetrics = {
  width: number;
  height: number;
  isTablet: boolean;
  isWide: boolean;
  isLandscape: boolean;
  columns: number;
  maxWidth: number;
  gutter: number;
  sideInset: number;
  cardWidth: number;
  reelWidth: number;
  topInset: number;
  bottomInset: number;
  modalTopInset: number;
  modalBottomInset: number;
  fontScale: number;
};

export function scaled(size: number, layout: Pick<LayoutMetrics, 'fontScale'>): number {
  return Math.round(size * layout.fontScale);
}

export function useLayout(): LayoutMetrics {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 600;
  const isWide = width >= 900;
  const columns = isWide ? 3 : isTablet ? 2 : 1;
  const gutter = isTablet ? 24 : 16;
  const maxWidth = isWide ? 980 : isTablet ? 760 : width;
  const contentWidth = Math.min(width, maxWidth);
  const sideInset = Math.max(0, (width - contentWidth) / 2);
  const cardWidth = Math.floor((contentWidth - gutter * 2 - (columns - 1) * 14) / columns);

  return {
    width,
    height,
    isTablet,
    isWide,
    isLandscape,
    columns,
    maxWidth,
    gutter,
    sideInset,
    cardWidth,
    reelWidth: columns > 1 ? cardWidth : Math.min(contentWidth - gutter * 2 - 24, 420),
    topInset: 0,
    bottomInset: 0,
    modalTopInset: 44,
    modalBottomInset: 34,
    fontScale: isWide ? 1.15 : isTablet ? 1.08 : 1,
  };
}
