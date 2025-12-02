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
  // New Fields for Consignment
  commissionRate?: number; // Percentage (0-100)
  isConsigned?: boolean;
  originalStationId?: string; // ID of the source station if consigned
}

export interface CartItem extends Product {
  quantity: number;
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