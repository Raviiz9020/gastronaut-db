import type { MenuItem as MenuItemType } from '@/types';

export type TableOrderItem = MenuItemType & {
  quantity: number;
  finalPrice: number;
  cartItemId?: string;
  customizationDetails?: Record<string, string | string[]>;
  selectedOptionsText?: string;
};

export type TableOrderThumbnail = {
  id: string;
  name: string;
  image: string;
};
