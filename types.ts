
export interface Product {
  id: string;
  stationId: string;
  name: string;
  price: number;
  unit: string;
  description: string;
  image: string; // Base64 or URL
  video?: string; // Base64 or URL
  stock: number;
  category: string;
  isAvailable: boolean; // New: Shelf status
  // New Fields for Consignment
  commissionRate?: number; // Percentage (0-100)
  isConsigned?: boolean;
  originalStationId?: string; // ID of the source station if consigned
  prepTime?: number; // New: Preparation time in minutes (default 2)
}

export interface CartItem extends Product {
  quantity: number;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

export enum OrderStatus {
  PENDING = 'PENDING',       // Waiting for manager to accept/pack
  PACKED = 'PACKED',         // Packed, waiting for courier
  SHIPPING = 'SHIPPING',     // Courier picked up
  DELIVERED = 'DELIVERED',   // Delivered
}

export interface Order {
  id: string;
  stationId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  deliveryTime: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  createdAt: number;
}

export interface Location {
  lat: number;
  lng: number;
}

export interface Station {
  id: string;
  ownerName: string;
  stationName: string;
  avatar: string;
  address?: string;      // New: Shop Address
  paymentQrCode?: string; // New: Payment QR Code Base64
  partners?: string[];    // New: List of partner station IDs
  phone?: string;         // New: Owner Phone
  location?: Location;    // New: Geo Location
  wechatOpenId?: string;  // New: WeChat Binding ID
  categories?: string[];  // New: Custom Categories
}

export type SalesStat = {
  name: string;
  value: number;
};

export interface ProductSalesRank {
  productId: string;
  name: string;
  totalSold: number;
  revenue: number;
}

export interface CustomerAddress {
  id: string;
  address: string;
  isDefault: boolean;
  contactName: string; // New
  phone: string;       // New
}

export interface PurchasedItem {
  id: string;
  productId: string;
  name: string;
  image: string;
  category: string;
  quantity: number;
  purchaseDate: number;
  expiryDate: number; // Estimated expiry
  customerPhone: string;
  isDeleted: boolean; // Soft delete for "Basket", keep for "History"
  isLocked?: boolean; // New: Inventory Lock
  threshold?: number; // New: Low stock threshold
}

export interface Recipe {
  id: string;
  name: string;
  image: string;
  description: string;
  ingredients: { name: string; amount: string }[];
  steps: string[];
  tags: string[]; // e.g., "家常菜", "快手菜"
}