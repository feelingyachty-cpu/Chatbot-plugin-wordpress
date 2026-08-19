export type PricingRow = {
  type?: string;
  duration?: string;
  price?: number;
  free?: boolean;
};

export type Yacht = {
  id: number;
  title: string;
  size_ft?: number;
  capacity_max?: number;
  special_desc?: string;
  image_url?: string;
  product_id?: number;
  product_url?: string;
  button_url?: string;
  is_pink?: boolean;
  is_free_hour?: boolean;
  pricing?: PricingRow[];
  starting?: { amount: number; duration: string } | null;
  marina?: { title?: string; address?: string; note?: string } | null;
  badges?: { style?: string; text?: string }[];
  rating?: string | number;
  reviews?: { name?: string; rating?: number; date?: string; text?: string }[];
  captain_included?: boolean;
  crew_rate?: number | null;
  fuel_rate?: number | null;
};

export type CatalogYacht = Yacht;

export type ThemeId = 'yachty' | 'midnight' | 'ocean' | 'sunset' | 'ivory' | 'custom';

export type AppSettings = {
  defaultCity: 'miami' | 'panama';
  prefillTalk: boolean;
  preferredContact: 'call' | 'whatsapp' | 'sms';
  compactCards: boolean;
  showPrices: boolean;
  language: 'en' | 'es';
  themeId: ThemeId;
  customAccent: string;
  customHeader: string;
};

export type Billing = {
  first_name?: string;
  last_name?: string;
  company?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  phone?: string;
};

export type AppUser = {
  id: number;
  woo_id?: number;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  phone?: string;
  region?: string;
  photo_url?: string;
  notes?: string;
  occasion?: string;
  typical_guests?: number;
  billing?: Billing;
  settings?: Partial<AppSettings>;
  account_url?: string;
};

export type BookingLine = {
  name?: string;
  yacht_id?: number;
  date?: string;
  time?: string;
  duration?: string;
  guests?: number;
  marina?: string;
  total?: number;
  deposit?: number;
  balance?: number;
};

export type Booking = {
  order_id: number;
  order_no?: string;
  status?: string;
  total?: number;
  currency?: string;
  date_created?: string;
  lines?: BookingLine[];
};

export const DEFAULT_SETTINGS: AppSettings = {
  defaultCity: 'miami',
  prefillTalk: true,
  preferredContact: 'whatsapp',
  compactCards: false,
  showPrices: true,
  language: 'en',
  themeId: 'yachty',
  customAccent: '#e11d74',
  customHeader: '#081018',
};
