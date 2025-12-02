import { Station, Product, Order, OrderStatus, ProductSalesRank, CustomerAddress, Location } from '../types';

// Keys
const STATIONS_KEY = 'veggie_stations';
const PRODUCTS_KEY = 'veggie_products';
const ORDERS_KEY = 'veggie_orders';
const ADDRESSES_KEY = 'veggie_customer_addresses';

// Helpers
const get = <T>(key: string): T[] => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error(`Error getting key ${key}`, e);
    return [];
  }
};

const set = (key: string, data: any[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e: any) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      alert("存储空间不足！无法保存更多数据。请尝试删除一些旧订单或商品，或者使用更小的图片。");
      console.error("LocalStorage quota exceeded");
    } else {
      console.error("LocalStorage error", e);
    }
  }
};

// Mock Center (Beijing for demo purposes, or arbitrary 0,0)
const MOCK_CENTER_LAT = 39.9042;
const MOCK_CENTER_LNG = 116.4074;

export const store = {
  // Station Logic
  createStation: (name: string, owner: string, phone: string, paymentQrCode: string): Station => {
    const stations = get<Station>(STATIONS_KEY);
    
    // Generate random location offset within ~2km
    // 0.01 deg is approx 1.1km
    const latOffset = (Math.random() - 0.5) * 0.04; 
    const lngOffset = (Math.random() - 0.5) * 0.04;

    const newStation: Station = {
      id: Date.now().toString(),
      stationName: name,
      ownerName: owner,
      phone: phone,
      avatar: `https://picsum.photos/seed/${Date.now()}/200/200`,
      address: '',
      paymentQrCode: paymentQrCode,
      partners: [],
      location: {
        lat: MOCK_CENTER_LAT + latOffset,
        lng: MOCK_CENTER_LNG + lngOffset
      }
    };
    stations.push(newStation);
    set(STATIONS_KEY, stations);
    return newStation;
  },

  getStation: (id: string): Station | undefined => {
    return get<Station>(STATIONS_KEY).find(s => s.id === id);
  },

  findStationByPhone: (phone: string): Station | undefined => {
    return get<Station>(STATIONS_KEY).find(s => s.phone === phone);
  },

  findStationByWeChat: (openId: string): Station | undefined => {
    return get<Station>(STATIONS_KEY).find(s => s.wechatOpenId === openId);
  },

  bindWeChatToStation: (phone: string, openId: string): { success: boolean, message: string, stationId?: string } => {
    const stations = get<Station>(STATIONS_KEY);
    const index = stations.findIndex(s => s.phone === phone);
    
    if (index === -1) {
      return { success: false, message: '未找到该手机号对应的小站，请先注册。' };
    }

    // Check if this WeChat ID is already bound to ANOTHER station
    const existingBind = stations.find(s => s.wechatOpenId === openId && s.id !== stations[index].id);
    if (existingBind) {
      return { success: false, message: '该微信号已绑定其他小站。' };
    }

    stations[index].wechatOpenId = openId;
    set(STATIONS_KEY, stations);
    return { success: true, message: '绑定成功', stationId: stations[index].id };
  },

  updateStation: (id: string, updates: Partial<Station>) => {
    const stations = get<Station>(STATIONS_KEY);
    const index = stations.findIndex(s => s.id === id);
    if (index !== -1) {
      stations[index] = { ...stations[index], ...updates };
      set(STATIONS_KEY, stations);
    }
  },

  // Geo Logic
  getNearbyStations: (userLat: number, userLng: number): (Station & { distance: number, productCount: number })[] => {
    const stations = get<Station>(STATIONS_KEY);
    const products = get<Product>(PRODUCTS_KEY);

    return stations.map(station => {
      // If station has no location (legacy data), assign a random one for demo
      const sLat = station.location?.lat || (MOCK_CENTER_LAT + (Math.random() - 0.5) * 0.04);
      const sLng = station.location?.lng || (MOCK_CENTER_LNG + (Math.random() - 0.5) * 0.04);

      // Haversine formula for distance in km
      const R = 6371; 
      const dLat = (sLat - userLat) * Math.PI / 180;
      const dLng = (sLng - userLng) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(userLat * Math.PI / 180) * Math.cos(sLat * Math.PI / 180) * 
        Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
      const distance = R * c;

      const productCount = products.filter(p => p.stationId === station.id).length;

      return {
        ...station,
        location: { lat: sLat, lng: sLng }, // Ensure location exists
        distance,
        productCount
      };
    }).sort((a, b) => a.distance - b.distance);
  },
  
  // Expose mock center for the UI to use as default user location
  getMockCenter: () => ({ lat: MOCK_CENTER_LAT, lng: MOCK_CENTER_LNG }),

  // Partner Logic
  addPartnerByQr: (currentStationId: string, qrCodeData: string): { success: boolean, message: string } => {
    const stations = get<Station>(STATIONS_KEY);
    const currentStation = stations.find(s => s.id === currentStationId);
    
    if (!currentStation) return { success: false, message: '当前站点不存在' };

    // Find station with matching QR code
    // Note: In a real app, this would be a secure lookup. Here we compare Base64 strings.
    const partner = stations.find(s => s.paymentQrCode === qrCodeData && s.id !== currentStationId);

    if (!partner) {
      return { success: false, message: '未找到匹配的友商二维码，请确保对方已设置收银码。' };
    }

    if (currentStation.partners?.includes(partner.id)) {
      return { success: false, message: '该友商已在您的列表中。' };
    }

    currentStation.partners = [...(currentStation.partners || []), partner.id];
    set(STATIONS_KEY, stations);
    return { success: true, message: `成功添加友商：${partner.stationName}` };
  },

  getPartners: (stationId: string): Station[] => {
    const station = get<Station>(STATIONS_KEY).find(s => s.id === stationId);
    if (!station || !station.partners) return [];
    const allStations = get<Station>(STATIONS_KEY);
    return allStations.filter(s => station.partners!.includes(s.id));
  },

  // Product Logic
  addProduct: (product: Product) => {
    const products = get<Product>(PRODUCTS_KEY);
    products.push(product);
    set(PRODUCTS_KEY, products);
  },

  getProducts: (stationId: string): Product[] => {
    return get<Product>(PRODUCTS_KEY).filter(p => p.stationId === stationId);
  },

  // Consignment Logic
  consignProduct: (currentStationId: string, product: Product) => {
    const products = get<Product>(PRODUCTS_KEY);
    
    // Check if already consigned
    const alreadyConsigned = products.some(p => 
      p.stationId === currentStationId && 
      p.originalStationId === product.stationId &&
      p.name === product.name // Simple check, ideally check against original ID if we stored it
    );

    if (alreadyConsigned) return;

    const newProduct: Product = {
      ...product,
      id: Date.now().toString(), // New ID for the consigned instance
      stationId: currentStationId,
      originalStationId: product.stationId,
      isConsigned: true,
      // Keep price, image, description, commissionRate from original
    };

    products.push(newProduct);
    set(PRODUCTS_KEY, products);
  },

  getConsignmentCount: (currentStationId: string, partnerStationId: string): number => {
    const products = get<Product>(PRODUCTS_KEY);
    return products.filter(p => 
      p.stationId === currentStationId && 
      p.originalStationId === partnerStationId
    ).length;
  },

  // Order Logic
  createOrder: (order: Order) => {
    const orders = get<Order>(ORDERS_KEY);
    orders.push(order);
    set(ORDERS_KEY, orders);
  },

  getOrders: (stationId: string): Order[] => {
    return get<Order>(ORDERS_KEY)
      .filter(o => o.stationId === stationId)
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  updateOrderStatus: (orderId: string, status: OrderStatus) => {
    const orders = get<Order>(ORDERS_KEY);
    const index = orders.findIndex(o => o.id === orderId);
    if (index !== -1) {
      orders[index].status = status;
      set(ORDERS_KEY, orders);
    }
  },

  // Stats
  getStats: (stationId: string) => {
    const orders = get<Order>(ORDERS_KEY).filter(o => o.stationId === stationId);
    const now = new Date();
    
    // Simple mock logic for Today, Week, Month calculation
    const isSameDay = (d1: Date, d2: Date) => 
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();

    const todayOrders = orders.filter(o => isSameDay(new Date(o.createdAt), now));
    const todaySales = todayOrders.reduce((acc, curr) => acc + curr.total, 0);

    // Mocking historical data for the chart based on random seeds + actual data
    const weeklyData = [
      { name: 'Mon', value: 120 },
      { name: 'Tue', value: 200 },
      { name: 'Wed', value: 150 },
      { name: 'Thu', value: 80 },
      { name: 'Fri', value: 250 },
      { name: 'Sat', value: 300 },
      { name: 'Sun', value: todaySales || 100 }, 
    ];

    // Product Ranking Logic
    const productMap = new Map<string, ProductSalesRank>();
    
    orders.forEach(order => {
      order.items.forEach(item => {
        const existing = productMap.get(item.id) || {
          productId: item.id,
          name: item.name,
          totalSold: 0,
          revenue: 0
        };
        existing.totalSold += item.quantity;
        existing.revenue += item.price * item.quantity;
        productMap.set(item.id, existing);
      });
    });

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.totalSold - a.totalSold); // Sort by quantity sold DESC

    return {
      todaySales,
      totalOrders: orders.length,
      weeklyData,
      topProducts
    };
  },

  // Customer Address Logic
  getCustomerAddresses: (): CustomerAddress[] => {
    return get<CustomerAddress>(ADDRESSES_KEY);
  },

  addCustomerAddress: (addressText: string, contactName: string, phone: string) => {
    const addresses = get<CustomerAddress>(ADDRESSES_KEY);
    // If it's the first address, make it default automatically
    const isFirst = addresses.length === 0;
    const newAddress: CustomerAddress = {
      id: Date.now().toString(),
      address: addressText,
      contactName,
      phone,
      isDefault: isFirst
    };
    addresses.push(newAddress);
    set(ADDRESSES_KEY, addresses);
    return newAddress;
  },

  deleteCustomerAddress: (id: string) => {
    let addresses = get<CustomerAddress>(ADDRESSES_KEY);
    addresses = addresses.filter(a => a.id !== id);
    // If we deleted the default, make the first one default
    if (addresses.length > 0 && !addresses.some(a => a.isDefault)) {
      addresses[0].isDefault = true;
    }
    set(ADDRESSES_KEY, addresses);
  },

  setCustomerDefaultAddress: (id: string) => {
    const addresses = get<CustomerAddress>(ADDRESSES_KEY);
    addresses.forEach(a => {
      a.isDefault = a.id === id;
    });
    set(ADDRESSES_KEY, addresses);
  }
};