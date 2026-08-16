export const API_BASE = 'https://feelingyachty.com';

export const CITIES = [
  {
    slug: 'miami',
    label: 'Miami',
    fleet: 'miami-yacht-rental',
    phone: '+19542463636',
    whatsapp: '19542463636',
  },
  {
    slug: 'panama',
    label: 'Panama',
    fleet: 'panama-yacht-rentals',
    phone: '+5072021729',
    whatsapp: '5072021729',
  },
] as const;

export type City = (typeof CITIES)[number];
