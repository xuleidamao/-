
import { Station, Product, Order, OrderStatus, ProductSalesRank, CustomerAddress, Location, PurchasedItem, CartItem, Recipe, ShoppingListItem } from '../types';

// Keys
const STATIONS_KEY = 'veggie_stations';
const PRODUCTS_KEY = 'veggie_products';
const ORDERS_KEY = 'veggie_orders';
const ADDRESSES_KEY = 'veggie_customer_addresses';
const PURCHASED_ITEMS_KEY = 'veggie_purchased_items';
const FAVORITE_RECIPES_KEY = 'veggie_fav_recipes';
const SHOPPING_LIST_KEY = 'veggie_shopping_list';
const FAVORITE_STATIONS_KEY = 'veggie_fav_stations';

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

// Default Categories
export const DEFAULT_CATEGORIES = ['蔬菜', '水果', '粮油', '肉蛋', '调料', '其它'];

// Shelf Life Map (Days)
const SHELF_LIFE_DAYS: Record<string, number> = {
  '蔬菜': 5,
  '水果': 7,
  '肉蛋': 10,
  '粮油': 180,
  '调料': 365,
  '其它': 14
};

// Mock Recipes
const MOCK_RECIPES: Recipe[] = [
  {
    id: 'r1',
    name: '西红柿炒鸡蛋',
    description: '国民第一家常菜，酸甜可口，下饭神器。',
    image: 'https://images.unsplash.com/photo-1599351478170-c7373f7c9e0d?q=80&w=300',
    ingredients: [{name: '西红柿', amount: '2个'}, {name: '鸡蛋', amount: '3个'}, {name: '葱', amount: '少许'}],
    steps: ['西红柿切块，鸡蛋打散。', '热锅凉油炒熟鸡蛋盛出。', '锅中倒油炒西红柿出汁。', '加入鸡蛋翻炒均匀，撒葱花出锅。'],
    tags: ['家常菜', '快手']
  },
  {
    id: 'r2',
    name: '青椒土豆丝',
    description: '清脆爽口，酸辣开胃，最简单的美味。',
    image: 'https://images.unsplash.com/photo-1615485925694-a031e78b4bee?q=80&w=300',
    ingredients: [{name: '土豆', amount: '1个'}, {name: '青椒', amount: '1个'}, {name: '干辣椒', amount: '3个'}],
    steps: ['土豆切丝泡水去淀粉。', '青椒切丝。', '油热爆香干辣椒。', '大火快炒土豆丝，加醋，最后放青椒断生。'],
    tags: ['家常菜', '素食']
  },
  {
    id: 'r3',
    name: '红烧肉',
    description: '肥而不腻，入口即化，浓油赤酱。',
    image: 'https://images.unsplash.com/photo-1546272989-40c92939c6c5?q=80&w=300',
    ingredients: [{name: '五花肉', amount: '500g'}, {name: '冰糖', amount: '适量'}, {name: '姜', amount: '3片'}, {name: '葱', amount: '2根'}],
    steps: ['五花肉切块焯水。', '炒糖色，放入肉块翻炒上色。', '加入葱姜、调料和热水炖煮40分钟。', '大火收汁即可。'],
    tags: ['硬菜', '肉类']
  },
  {
    id: 'r4',
    name: '蒜蓉西兰花',
    description: '健康低脂，清淡营养。',
    image: 'https://images.unsplash.com/photo-1588691880348-7ef06941893f?q=80&w=300',
    ingredients: [{name: '西兰花', amount: '1颗'}, {name: '蒜', amount: '5瓣'}],
    steps: ['西兰花洗净切小朵，焯水备用。', '蒜切末。', '热油爆香蒜末。', '倒入西兰花快速翻炒，加盐调味。'],
    tags: ['减脂', '快手']
  },
  {
    id: 'r5',
    name: '水果沙拉',
    description: '缤纷果宴，补充维生素。',
    image: 'https://images.unsplash.com/photo-1565814636199-6a3f22c34d3b?q=80&w=300',
    ingredients: [{name: '苹果', amount: '1个'}, {name: '香蕉', amount: '1根'}, {name: '草莓', amount: '5个'}, {name: '酸奶', amount: '1盒'}],
    steps: ['所有水果洗净切块。', '放入大碗中。', '淋上酸奶拌匀即可。'],
    tags: ['甜品', '简单']
  }
];

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
      },
      categories: DEFAULT_CATEGORIES
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

  addStationCategory: (stationId: string, newCategory: string) => {
    const stations = get<Station>(STATIONS_KEY);
    const index = stations.findIndex(s => s.id === stationId);
    if (index !== -1) {
      const currentCats = stations[index].categories || DEFAULT_CATEGORIES;
      if (!currentCats.includes(newCategory)) {
        stations[index].categories = [...currentCats, newCategory];
        set(STATIONS_KEY, stations);
      }
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

      const productCount = products.filter(p => p.stationId === station.id && p.isAvailable !== false).length;

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

  // Favorite Stations Logic
  toggleFavoriteStation: (userPhone: string, stationId: string) => {
    let favs = get<{phone: string, stationId: string}>(FAVORITE_STATIONS_KEY);
    const index = favs.findIndex(f => f.phone === userPhone && f.stationId === stationId);
    if (index !== -1) {
      favs.splice(index, 1);
    } else {
      favs.push({ phone: userPhone, stationId });
    }
    set(FAVORITE_STATIONS_KEY, favs);
  },

  isStationFavorite: (userPhone: string, stationId: string): boolean => {
    const favs = get<{phone: string, stationId: string}>(FAVORITE_STATIONS_KEY);
    return favs.some(f => f.phone === userPhone && f.stationId === stationId);
  },

  getFavoriteStationsWithStats: (userPhone: string, userLat: number, userLng: number) => {
    const favs = get<{phone: string, stationId: string}>(FAVORITE_STATIONS_KEY).filter(f => f.phone === userPhone);
    const allStations = get<Station>(STATIONS_KEY);
    const products = get<Product>(PRODUCTS_KEY);
    const orders = get<Order>(ORDERS_KEY).filter(o => o.customerPhone === userPhone);

    return favs.map(f => {
      const station = allStations.find(s => s.id === f.stationId);
      if (!station) return null;

      // Distance Calc
      const sLat = station.location?.lat || MOCK_CENTER_LAT;
      const sLng = station.location?.lng || MOCK_CENTER_LNG;
      const R = 6371; 
      const dLat = (sLat - userLat) * Math.PI / 180;
      const dLng = (sLng - userLng) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(userLat * Math.PI / 180) * Math.cos(sLat * Math.PI / 180) * 
        Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
      const distance = R * c;

      // Stats
      const stationProducts = products.filter(p => p.stationId === station.id && p.isAvailable !== false);
      const stationOrders = orders.filter(o => o.stationId === station.id);

      return {
        ...station,
        distance,
        productCount: stationProducts.length,
        orderCount: stationOrders.length
      };
    }).filter((s): s is (Station & { distance: number, productCount: number, orderCount: number }) => s !== null);
  },

  // Partner Logic
  addPartnerByQr: (currentStationId: string, qrCodeData: string): { success: boolean, message: string } => {
    const stations = get<Station>(STATIONS_KEY);
    const currentStation = stations.find(s => s.id === currentStationId);
    
    if (!currentStation) return { success: false, message: '当前站点不存在' };

    // Find station with matching QR code
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
    product.isAvailable = product.isAvailable !== undefined ? product.isAvailable : true;
    products.push(product);
    set(PRODUCTS_KEY, products);
  },

  updateProduct: (productId: string, updates: Partial<Product>) => {
    const products = get<Product>(PRODUCTS_KEY);
    const index = products.findIndex(p => p.id === productId);
    if (index !== -1) {
      products[index] = { ...products[index], ...updates };
      set(PRODUCTS_KEY, products);
    }
  },

  getProducts: (stationId: string): Product[] => {
    return get<Product>(PRODUCTS_KEY)
      .filter(p => p.stationId === stationId)
      .sort((a, b) => b.id.localeCompare(a.id));
  },

  findProductByIngredient: (stationId: string, ingredientName: string): Product | undefined => {
    const products = get<Product>(PRODUCTS_KEY).filter(p => p.stationId === stationId && p.isAvailable !== false);
    // Simple fuzzy match: check if product name contains ingredient or vice versa
    return products.find(p => p.name.includes(ingredientName) || ingredientName.includes(p.name));
  },

  // Consignment Logic
  consignProduct: (currentStationId: string, product: Product) => {
    const products = get<Product>(PRODUCTS_KEY);
    
    const alreadyConsigned = products.some(p => 
      p.stationId === currentStationId && 
      p.originalStationId === product.stationId &&
      p.name === product.name 
    );

    if (alreadyConsigned) return;

    const newProduct: Product = {
      ...product,
      id: Date.now().toString(),
      stationId: currentStationId,
      originalStationId: product.stationId,
      isConsigned: true,
      isAvailable: true
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

    // Side Effect: Add to Purchased Items (Basket)
    const purchasedItems = get<PurchasedItem>(PURCHASED_ITEMS_KEY);
    const now = Date.now();
    
    order.items.forEach(item => {
       const shelfLife = SHELF_LIFE_DAYS[item.category] || 7;
       const expiryDate = now + (shelfLife * 24 * 60 * 60 * 1000);
       
       // Deduplication: Find ALL existing indices for this product (by ID and Phone)
       // This ensures we merge into one record per product type
       const existingIndices = purchasedItems
         .map((p, index) => (p.productId === item.id && p.customerPhone === order.customerPhone) ? index : -1)
         .filter(i => i !== -1);

       if (existingIndices.length > 0) {
          // Update the first found record
          const targetIndex = existingIndices[0];
          const existing = purchasedItems[targetIndex];
          
          if (existing.isDeleted) {
            existing.quantity = item.quantity; // Reset if it was 'deleted'
          } else {
            existing.quantity += item.quantity;
          }
          
          existing.name = item.name;
          existing.image = item.image;
          existing.purchaseDate = now;
          existing.expiryDate = expiryDate;
          existing.isDeleted = false; // Resurrect
          
          purchasedItems[targetIndex] = existing;

          // Merge: Remove any extra duplicate records if they exist (cleanup legacy dupes)
          // Iterate backwards to safely remove
          for (let i = existingIndices.length - 1; i > 0; i--) {
             purchasedItems.splice(existingIndices[i], 1);
          }
       } else {
          // Create New
          purchasedItems.push({
            id: `pi_${now}_${Math.random().toString(36).substr(2, 9)}`,
            productId: item.id,
            name: item.name,
            image: item.image,
            category: item.category,
            quantity: item.quantity,
            purchaseDate: now,
            expiryDate: expiryDate,
            customerPhone: order.customerPhone,
            isDeleted: false,
            isLocked: false,
            threshold: 5 // Default Pre-order Value (预购值)
          });
       }
    });
    set(PURCHASED_ITEMS_KEY, purchasedItems);
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

  // Purchased Items (My Basket) Logic
  getPurchasedItems: (customerPhone: string): PurchasedItem[] => {
    return get<PurchasedItem>(PURCHASED_ITEMS_KEY)
      .filter(item => item.customerPhone === customerPhone);
  },

  deletePurchasedItem: (itemId: string) => {
    const items = get<PurchasedItem>(PURCHASED_ITEMS_KEY);
    const index = items.findIndex(i => i.id === itemId);
    if (index !== -1) {
      items[index].isDeleted = true; // Soft delete
      set(PURCHASED_ITEMS_KEY, items);
    }
  },

  updatePurchasedItem: (itemId: string, updates: Partial<PurchasedItem>) => {
    const items = get<PurchasedItem>(PURCHASED_ITEMS_KEY);
    const index = items.findIndex(i => i.id === itemId);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      set(PURCHASED_ITEMS_KEY, items);
    }
  },

  restockLockedItemsToShoppingList: (userPhone: string): number => {
    const items = get<PurchasedItem>(PURCHASED_ITEMS_KEY).filter(i => i.customerPhone === userPhone);
    const data = get<{phone: string, list: ShoppingListItem[]}>(SHOPPING_LIST_KEY);
    let listIndex = data.findIndex(d => d.phone === userPhone);
    let currentList = listIndex !== -1 ? data[listIndex].list : [];

    let count = 0;
    items.forEach(item => {
      // Check if item is locked AND not deleted AND below pre-order value
      if (item.isLocked && !item.isDeleted && item.quantity < (item.threshold || 5)) {
        // Check if already in shopping list
        const exists = currentList.find(li => li.name === item.name);
        if (!exists) {
          currentList.push({
            id: Date.now().toString() + count,
            name: item.name,
            quantity: (item.threshold || 5) - item.quantity, // Suggest amount to refill to Pre-order Value
            unit: '份' // Default unit
          });
          count++;
        }
      }
    });

    if (count > 0) {
      if (listIndex !== -1) {
        data[listIndex].list = currentList;
      } else {
        data.push({ phone: userPhone, list: currentList });
      }
      set(SHOPPING_LIST_KEY, data);
    }

    return count;
  },

  // Recipe Logic
  getRecipes: (): Recipe[] => {
    return MOCK_RECIPES;
  },

  getFavoriteRecipeIds: (userPhone: string): string[] => {
    const favs = get<{phone: string, recipeId: string}>(FAVORITE_RECIPES_KEY);
    return favs.filter(f => f.phone === userPhone).map(f => f.recipeId);
  },

  toggleFavoriteRecipe: (userPhone: string, recipeId: string) => {
    let favs = get<{phone: string, recipeId: string}>(FAVORITE_RECIPES_KEY);
    const existingIndex = favs.findIndex(f => f.phone === userPhone && f.recipeId === recipeId);
    
    if (existingIndex !== -1) {
      favs.splice(existingIndex, 1); // Remove
    } else {
      favs.push({ phone: userPhone, recipeId }); // Add
    }
    set(FAVORITE_RECIPES_KEY, favs);
  },

  // Shopping List Logic
  getShoppingList: (userPhone: string): ShoppingListItem[] => {
    const data = get<{phone: string, list: ShoppingListItem[]}>(SHOPPING_LIST_KEY);
    const entry = data.find(d => d.phone === userPhone);
    return entry ? entry.list : [];
  },

  saveShoppingList: (userPhone: string, list: ShoppingListItem[]) => {
    const data = get<{phone: string, list: ShoppingListItem[]}>(SHOPPING_LIST_KEY);
    const index = data.findIndex(d => d.phone === userPhone);
    if (index !== -1) {
      data[index].list = list;
    } else {
      data.push({ phone: userPhone, list });
    }
    set(SHOPPING_LIST_KEY, data);
  },

  // Stats
  getStats: (stationId: string) => {
    const orders = get<Order>(ORDERS_KEY).filter(o => o.stationId === stationId);
    const now = new Date();
    
    const isSameDay = (d1: Date, d2: Date) => 
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();

    const todayOrders = orders.filter(o => isSameDay(new Date(o.createdAt), now));
    const todaySales = todayOrders.reduce((acc, curr) => acc + curr.total, 0);

    const weeklyData = [
      { name: 'Mon', value: 120 },
      { name: 'Tue', value: 200 },
      { name: 'Wed', value: 150 },
      { name: 'Thu', value: 80 },
      { name: 'Fri', value: 250 },
      { name: 'Sat', value: 300 },
      { name: 'Sun', value: todaySales || 100 }, 
    ];

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
      .sort((a, b) => b.totalSold - a.totalSold);

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
