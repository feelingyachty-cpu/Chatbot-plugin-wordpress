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
};

export type CatalogYacht = Yacht;
