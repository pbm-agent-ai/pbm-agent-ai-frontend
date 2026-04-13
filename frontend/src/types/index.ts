export interface User {
  id: number;
  email: string;
  name: string;
}

export interface Condition {
  id: number;
  platform: string;
  keyword: string;
  maxPrice: number;
  mode: 'ALERT_ONLY' | 'AUTO_PAYMENT';
  isActive: boolean;
}

export interface Payment {
  id: number;
  productName: string;
  platform: string;
  amount: number;
  txHash: string;
  createdAt: string;
}

export interface PriceHistory {
  productId: number;
  price: number;
  collectedAt: string;
}

export interface Notification {
  id: number;
  message: string;
  isRead: boolean;
  createdAt: string;
}
