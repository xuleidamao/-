
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { ShoppingBag, Plus, Minus, Clock, MapPin, CheckCircle, X, Store, ChevronLeft, Trash2, User, LogOut, CheckCircle as CheckCircleIcon, LinkIcon, RefreshCw, Search, Layers, LayoutGrid, Refrigerator, History, AlertTriangle, Calendar, Trash, BookOpen, Heart, ChefHat, ListPlus, Sparkles, ClipboardList, Lock, Unlock, Bell, BellRing, Edit } from '../components/ui/Icons';
import { store, DEFAULT_CATEGORIES } from '../services/store';
import { generateRecipe } from '../services/geminiService';
import { Station, Product, CartItem, Order, OrderStatus, CustomerAddress, PurchasedItem, Recipe, ShoppingListItem } from '../types';

export const CustomerShop: React.FC = () => {
  const { stationId } = useParams<{ stationId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isPreview = searchParams.get('preview') === 'true';

  // Navigation State (Shop vs Basket vs Recipes)
  const [activeTab, setActiveTab] = useState<'shop' | 'basket' | 'recipes'>('shop');

  const [station, setStation] = useState<Station | undefined>(undefined);
  const [products, setProducts] = useState<Product[]>([]);
  const [stationCategories, setStationCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Shopping List State
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [newListItem, setNewListItem] = useState({ name: '', quantity: 1, unit: '斤' });
  
  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');

  // Checkout State
  const [address, setAddress] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);

  // Address Management State
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [currentUserPhone, setCurrentUserPhone] = useState<string>('');
  
  // New Address Form
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddrText, setNewAddrText] = useState('');
  const [newAddrName, setNewAddrName] = useState('');
  const [newAddrPhone, setNewAddrPhone] = useState('13800001234'); // Simulated Login Phone

  // Basket State
  const [purchasedItems, setPurchasedItems] = useState<PurchasedItem[]>([]);
  const [basketSort, setBasketSort] = useState<'purchaseDate' | 'expiryDate'>('purchaseDate');
  const [basketFilterCat, setBasketFilterCat] = useState<string>('全部');
  const [showExpiredOnly, setShowExpiredOnly] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingThresholdId, setEditingThresholdId] = useState<string | null>(null);

  // Recipe State
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [favoriteRecipeIds, setFavoriteRecipeIds] = useState<string[]>([]);
  const [recipeFilter, setRecipeFilter] = useState<'recommend' | 'favorite'>('recommend');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [cloudLoading, setCloudLoading] = useState(false);

  useEffect(() => {
    if (stationId) {
      const s = store.getStation(stationId);
      setStation(s);
      if (s) setStationCategories(s.categories || DEFAULT_CATEGORIES);
      setProducts(store.getProducts(stationId));
    }
  }, [stationId]);

  useEffect(() => {
    // Load customer addresses and identify user
    const addresses = store.getCustomerAddresses();
    setSavedAddresses(addresses);
    
    // Attempt to identify user by default address phone
    const defaultAddr = addresses.find(a => a.isDefault);
    if (defaultAddr) {
      setCurrentUserPhone(defaultAddr.phone);
    } else if (addresses.length > 0) {
      setCurrentUserPhone(addresses[0].phone);
    }
  }, [showSettings, showCheckout]);

  // Load purchased items & favorites whenever phone changes or tab switches
  useEffect(() => {
    if (currentUserPhone) {
      setPurchasedItems(store.getPurchasedItems(currentUserPhone));
      setFavoriteRecipeIds(store.getFavoriteRecipeIds(currentUserPhone));
      setShoppingList(store.getShoppingList(currentUserPhone));
    }
    setRecipes(store.getRecipes());
  }, [currentUserPhone, activeTab, orderPlaced]);

  // Auto-fill default address when opening checkout
  useEffect(() => {
    if (showCheckout) {
      const defaultAddr = store.getCustomerAddresses().find(a => a.isDefault);
      if (defaultAddr) {
        setAddress(defaultAddr.address);
        setCustomerName(defaultAddr.contactName || '');
        setCustomerPhone(defaultAddr.phone || '');
      }
    }
  }, [showCheckout]);

  const addToCart = (product: Product, quantityOverride?: number) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + (quantityOverride || 1) } : p);
      }
      return [...prev, { ...product, quantity: quantityOverride || 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === productId) {
          return { ...item, quantity: item.quantity + delta };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const clearCart = () => {
    if (window.confirm("确定要清空购物车吗？")) {
      setCart([]);
    }
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationId) return;

    if (!customerName || !customerPhone) {
      alert("请填写联系人和电话");
      return;
    }

    const newOrder: Order = {
      id: Date.now().toString(),
      stationId,
      customerName,
      customerPhone,
      address,
      deliveryTime,
      items: cart,
      total: cartTotal,
      status: OrderStatus.PENDING,
      createdAt: Date.now()
    };

    store.createOrder(newOrder);
    setOrderPlaced(true);
    setCart([]);
    setShowCheckout(false);
    setShowCart(false);
    setCurrentUserPhone(customerPhone); // Update current user context
  };

  // Address Handlers
  const handleAddAddress = () => {
    if (!newAddrText.trim() || !newAddrName.trim() || !newAddrPhone.trim()) {
      alert("请完善地址、联系人和电话");
      return;
    }
    store.addCustomerAddress(newAddrText, newAddrName, newAddrPhone);
    setSavedAddresses(store.getCustomerAddresses());
    setNewAddrText('');
    setNewAddrName('');
    setIsAddingAddress(false);
  };

  const handleDeleteAddress = (id: string) => {
    store.deleteCustomerAddress(id);
    setSavedAddresses(store.getCustomerAddresses());
  };

  const handleSetDefaultAddress = (id: string) => {
    store.setCustomerDefaultAddress(id);
    setSavedAddresses(store.getCustomerAddresses());
  };

  const handleLogout = () => {
    if(window.confirm("确定要退出返回首页吗？")) {
      navigate('/');
    }
  };

  const applyAddress = (addr: CustomerAddress) => {
    setAddress(addr.address);
    setCustomerName(addr.contactName || '');
    setCustomerPhone(addr.phone || '');
  };

  const handleDeletePurchasedItem = (item: PurchasedItem, e: React.MouseEvent) => {
     e.stopPropagation();
     // If locked, only clear quantity to 0 (Pre-order behavior).
     // If unlocked, fully delete item.
     if (item.isLocked) {
        if(window.confirm("该商品已锁定（预购清单）。\n确定要将数量清零吗？\n(清零后仍保留在列表中以便补货)")) {
           store.updatePurchasedItem(item.id, { quantity: 0 });
           setPurchasedItems(store.getPurchasedItems(currentUserPhone));
        }
     } else {
        if(window.confirm("确定要移除该商品吗？")) {
           store.deletePurchasedItem(item.id);
           setPurchasedItems(store.getPurchasedItems(currentUserPhone));
        }
     }
  };

  // Lock and Threshold Logic
  const handleToggleLock = (item: PurchasedItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const newLockStatus = !item.isLocked;
    store.updatePurchasedItem(item.id, { isLocked: newLockStatus });
    setPurchasedItems(store.getPurchasedItems(currentUserPhone));
  };

  const handleUpdateThreshold = (item: PurchasedItem, newThreshold: number) => {
    store.updatePurchasedItem(item.id, { threshold: newThreshold });
    setPurchasedItems(store.getPurchasedItems(currentUserPhone));
    setEditingThresholdId(null);
  };

  const handleBatchReplenish = () => {
    if (!currentUserPhone) return;
    const addedCount = store.restockLockedItemsToShoppingList(currentUserPhone);
    if (addedCount > 0) {
      alert(`已将 ${addedCount} 款库存低于预购值的菜品加入购买清单！`);
      setShoppingList(store.getShoppingList(currentUserPhone)); // Refresh list
    } else {
      alert("暂时没有低于预购值的锁定菜品。");
    }
  };

  // Shopping List Handlers
  const handleAddShoppingListItem = () => {
    if (!newListItem.name.trim()) return;
    if (!currentUserPhone) {
      alert("请先设置个人信息以便保存清单");
      setShowSettings(true);
      return;
    }
    const newList = [...shoppingList, { 
      id: Date.now().toString(), 
      name: newListItem.name, 
      quantity: newListItem.quantity, 
      unit: newListItem.unit 
    }];
    setShoppingList(newList);
    store.saveShoppingList(currentUserPhone, newList);
    setNewListItem({ name: '', quantity: 1, unit: '斤' });
  };

  const removeShoppingListItem = (id: string) => {
    if (!currentUserPhone) return;
    const newList = shoppingList.filter(item => item.id !== id);
    setShoppingList(newList);
    store.saveShoppingList(currentUserPhone, newList);
  };

  const handleOneClickPurchase = () => {
    if (!stationId) return;
    
    let matchedCount = 0;
    const remainingList: ShoppingListItem[] = [];
    
    shoppingList.forEach(item => {
      // Fuzzy match product
      const product = store.findProductByIngredient(stationId, item.name);
      if (product) {
        addToCart(product, item.quantity);
        matchedCount++;
      } else {
        remainingList.push(item);
      }
    });

    if (matchedCount > 0) {
      setShoppingList(remainingList);
      if (currentUserPhone) {
        store.saveShoppingList(currentUserPhone, remainingList);
      }
      alert(`已成功匹配 ${matchedCount} 项商品并加入购物车！`);
      setShowCart(true);
      setShowShoppingList(false);
    } else {
      alert("暂未匹配到相关商品，清单已保留。");
    }
  };

  // Filter Logic
  // Shop Categories
  const categories = ['全部', ...stationCategories];
  
  // Dynamic Basket Categories (Based on actual items)
  const basketCategories = useMemo(() => {
      const currentItems = showHistory ? purchasedItems : purchasedItems.filter(i => !i.isDeleted);
      const uniqueCats = new Set<string>();
      currentItems.forEach(i => {
         if (i.category && i.category !== '全部') uniqueCats.add(i.category);
         else if (!i.category) uniqueCats.add('其它');
      });
      return ['全部', ...Array.from(uniqueCats).sort()];
  }, [purchasedItems, showHistory]);
  
  const filteredProducts = products.filter(p => {
     if (p.isAvailable === false) return false;
     const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
     const matchesCategory = selectedCategory === '全部' || p.category === selectedCategory;
     return matchesSearch && matchesCategory;
  });

  // Basket Logic
  const getExpiryStatus = (expiryDate: number) => {
     const now = Date.now();
     const daysLeft = (expiryDate - now) / (1000 * 60 * 60 * 24);
     if (daysLeft < 0) return 'expired';
     if (daysLeft < 2) return 'warning';
     return 'fresh';
  };

  const filteredBasketItems = purchasedItems.filter(item => {
      if (!showHistory && item.isDeleted) return false;
      const status = item.quantity === 0 ? 'empty' : getExpiryStatus(item.expiryDate);
      if (showExpiredOnly && status !== 'expired') return false;
      if (basketFilterCat !== '全部' && item.category !== basketFilterCat) return false;
      return true;
  }).sort((a, b) => {
      if (basketSort === 'expiryDate') {
          return a.expiryDate - b.expiryDate; 
      } else {
          return b.purchaseDate - a.purchaseDate; 
      }
  });

  // Recipe Logic
  const toggleRecipeFavorite = (recipe: Recipe, e: React.MouseEvent) => {
     e.stopPropagation();
     if (!currentUserPhone) {
        alert("请先完善收货信息以保存收藏");
        return;
     }
     store.toggleFavoriteRecipe(currentUserPhone, recipe.id);
     setFavoriteRecipeIds(store.getFavoriteRecipeIds(currentUserPhone));
  };

  const handleCloudSearch = async () => {
    if (!recipeSearch.trim()) return;
    setCloudLoading(true);
    const aiRecipes = await generateRecipe(recipeSearch);
    if (aiRecipes) {
       // Convert AI result to Recipe type
       const newRecipes: Recipe[] = aiRecipes.map((r, i) => ({
          id: `ai_${Date.now()}_${i}`,
          name: r.name,
          description: r.description,
          image: 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?q=80&w=300', // Generic food placeholder
          ingredients: r.ingredients,
          steps: r.steps,
          tags: ['AI推荐']
       }));
       // Prepend to list
       setRecipes(prev => [...newRecipes, ...prev]);
       alert("云端搜索完成！");
    } else {
       alert("搜索失败，请重试");
    }
    setCloudLoading(false);
  };

  const filteredRecipes = recipes.filter(r => {
      // 1. Text Search
      if (recipeSearch && !r.name.includes(recipeSearch) && !r.tags.some(t => t.includes(recipeSearch))) {
          return false;
      }
      // 2. Tab Filter
      if (recipeFilter === 'favorite') {
         return favoriteRecipeIds.includes(r.id);
      }
      return true;
  }).map(recipe => {
      // Calculate relevance score based on basket items
      // Check how many ingredients we HAVE in purchasedItems
      let matchCount = 0;
      const ownedIngredients: string[] = [];
      const missingIngredients: {name: string, amount: string}[] = [];

      recipe.ingredients.forEach(ing => {
         // Fuzzy match: check if any basket item name includes ingredient name
         // Let's use current basket items (!isDeleted)
         const hasItem = purchasedItems.some(pi => 
            !pi.isDeleted && pi.quantity > 0 && (pi.name.includes(ing.name) || ing.name.includes(pi.name))
         );
         if (hasItem) {
            matchCount++;
            ownedIngredients.push(ing.name);
         } else {
            missingIngredients.push(ing);
         }
      });
      return { ...recipe, matchCount, ownedIngredients, missingIngredients };
  }).sort((a, b) => {
      // If filtering by favorites, default sort.
      // If recommending, sort by matchCount descending.
      if (recipeFilter === 'recommend') {
         return b.matchCount - a.matchCount;
      }
      return 0;
  });

  const addMissingToCart = (ingredients: {name: string, amount: string}[]) => {
     if (!stationId) return;
     let addedCount = 0;
     ingredients.forEach(ing => {
        const product = store.findProductByIngredient(stationId, ing.name);
        if (product) {
           addToCart(product);
           addedCount++;
        }
     });
     
     if (addedCount > 0) {
        alert(`已成功将 ${addedCount} 种缺失食材加入购物车！`);
        setShowCart(true);
        setSelectedRecipe(null); // Close modal
     } else {
        alert("未在小站找到匹配的商品，请尝试搜索其他替代品。");
     }
  };


  if (!station) return <div className="p-4">Loading Station...</div>;

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">下单成功!</h2>
          <p className="text-gray-500 mb-6">已自动为您加入“我的菜筐”</p>
          <button 
            onClick={() => setOrderPlaced(false)}
            className="w-full bg-primary text-white py-3 rounded-xl font-bold"
          >
            继续逛逛
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      
      {/* Dynamic Content Based on Tab */}
      {activeTab === 'shop' && (
        <>
            {/* ... Shop Header & Content ... */}
            <div className="bg-white sticky top-0 z-10 shadow-sm">
                <div className="relative h-36 bg-green-600 overflow-hidden">
                    <div className="absolute inset-0 bg-black/20"></div>
                    <div className="absolute top-4 right-4 z-30 flex gap-2">
                    {isPreview && (
                        <button 
                        onClick={() => navigate(`/manager/${stationId}`)}
                        className="bg-black/50 hover:bg-black/70 text-white px-3 py-1.5 rounded-full backdrop-blur-sm text-xs font-bold flex items-center gap-1 border border-white/30 shadow-lg transition-all"
                        >
                        <ChevronLeft size={14} /> 退出预览
                        </button>
                    )}
                    <button 
                        onClick={() => setShowSettings(true)}
                        className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full backdrop-blur-sm border border-white/30 transition-all"
                    >
                        <User size={18} />
                    </button>
                    </div>

                    <div className="absolute bottom-4 left-4 flex items-center gap-3 text-white z-20">
                        <img src={station.avatar} className="w-14 h-14 rounded-full border-2 border-white" alt="Station" />
                        <div>
                            <h1 className="font-bold text-xl leading-tight">{station.stationName}</h1>
                            <div className="flex items-center gap-2 text-sm opacity-90 mt-1">
                                <span className="bg-green-700 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                                <Store size={10}/> 
                                {station.ownerName}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                
                {station.address && (
                <div className="bg-green-50 px-4 py-2 flex items-center gap-2 text-green-800 text-xs border-b border-green-100">
                    <MapPin size={12} className="shrink-0"/>
                    <span className="truncate">{station.address}</span>
                </div>
                )}

                <div className="px-4 py-3 space-y-3 border-b border-gray-100 bg-white">
                    <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                    <input 
                        type="text" 
                        placeholder="搜索想吃的菜..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    </div>
                    <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors
                                ${selectedCategory === cat 
                                ? 'bg-primary text-white shadow-md' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            {cat}
                        </button>
                    ))}
                    </div>
                </div>
            </div>

            <div className="p-4 grid gap-4">
                <div className="flex justify-between items-center text-gray-500 text-xs px-1">
                    <span className="font-bold text-gray-700 flex items-center gap-1">
                    <LayoutGrid size={14} className="text-primary"/> 
                    {selectedCategory === '全部' ? '今日推荐' : selectedCategory}
                    </span>
                    <span>共 {filteredProducts.length} 款菜品</span>
                </div>

                {products.length === 0 && <p className="text-gray-400 text-center py-8">站长还在补货中...</p>}
                {products.length > 0 && filteredProducts.length === 0 && (
                    <p className="text-gray-400 text-center py-8">没有找到相关菜品</p>
                )}

                {filteredProducts.map(p => {
                    const inCart = cart.find(item => item.id === p.id);

                    return (
                    <div key={p.id} className="bg-white p-3 rounded-xl shadow-sm flex gap-3 border border-gray-100">
                        <div className="relative w-24 h-24 shrink-0">
                            <img src={p.image} className="w-full h-full rounded-lg object-cover bg-gray-100" alt={p.name} />
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-lg">{p.name}</h3>
                                <p className="text-xs text-gray-500 line-clamp-2">{p.description}</p>
                            </div>
                            <div className="flex justify-between items-end">
                                <div>
                                    <span className="text-red-500 font-bold text-lg">¥{p.price}<span className="text-xs text-gray-400">/{p.unit}</span></span>
                                    {p.stock < 10 && (
                                        <p className="text-[10px] text-red-500 mt-0.5">仅剩 {p.stock} 份</p>
                                    )}
                                </div>
                                
                                {p.stock <= 0 ? (
                                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded font-bold">已售罄</span>
                                ) : (
                                    inCart ? (
                                        <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => updateQuantity(p.id, -1)}
                                            className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 active:scale-90 bg-white"
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <span className="font-bold w-4 text-center">{inCart.quantity}</span>
                                        <button 
                                            onClick={() => updateQuantity(p.id, 1)}
                                            disabled={inCart.quantity >= p.stock}
                                            className={`w-7 h-7 rounded-full text-white flex items-center justify-center active:scale-90 shadow-md ${inCart.quantity >= p.stock ? 'bg-gray-300' : 'bg-primary'}`}
                                        >
                                            <Plus size={14} />
                                        </button>
                                        </div>
                                    ) : (
                                    <button 
                                        onClick={() => addToCart(p)}
                                        className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                                    >
                                        <Plus size={18} />
                                    </button>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                    );
                })}
            </div>

            {/* Shopping List Button */}
            <button 
               onClick={() => setShowShoppingList(true)}
               className="fixed bottom-36 right-4 w-12 h-12 bg-white text-primary rounded-full shadow-xl flex items-center justify-center border border-gray-100 z-30"
            >
               <ClipboardList size={24}/>
               {shoppingList.length > 0 && (
                 <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold border-2 border-white">
                    {shoppingList.length}
                 </span>
               )}
            </button>

            {/* Cart Summary */}
            {cart.length > 0 && (
                <div className="fixed bottom-20 left-4 right-4 z-20">
                <button 
                    onClick={() => setShowCart(true)}
                    className="w-full bg-gray-900 text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center"
                >
                    <div className="flex items-center gap-3">
                    <div className="relative">
                        <ShoppingBag className="w-6 h-6 text-green-400" />
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                        {cartItemCount}
                        </span>
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="font-bold text-lg leading-none">¥{cartTotal.toFixed(2)}</span>
                        <span className="text-xs text-gray-400">免运费</span>
                    </div>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-green-400">
                    去结算 <ChevronLeft size={16} className="rotate-180"/>
                    </div>
                </button>
                </div>
            )}
        </>
      )}

      {/* Shopping List Modal */}
      {showShoppingList && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl animate-in zoom-in-95">
               <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                     <ClipboardList className="text-primary"/> 购买清单
                  </h2>
                  <button onClick={() => setShowShoppingList(false)} className="bg-gray-100 p-1 rounded-full">
                     <X size={20} className="text-gray-500"/>
                  </button>
               </div>
               
               <div className="mb-4 bg-orange-50 p-3 rounded-xl text-xs text-orange-700">
                  <p>列出想买的菜，一键自动匹配小站库存。</p>
               </div>

               <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                  {shoppingList.length === 0 && <p className="text-gray-400 text-center py-4 text-sm">清单是空的</p>}
                  {shoppingList.map(item => (
                     <div key={item.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                        <div className="font-bold text-gray-700">{item.name}</div>
                        <div className="flex items-center gap-3 text-sm">
                           <span>{item.quantity}{item.unit}</span>
                           <button onClick={() => removeShoppingListItem(item.id)} className="text-gray-400 hover:text-red-500">
                              <X size={16}/>
                           </button>
                        </div>
                     </div>
                  ))}
               </div>

               <div className="flex gap-2 mb-6">
                  <input 
                    type="text" 
                    placeholder="名称 (如: 西红柿)"
                    className="flex-1 border p-2 rounded-lg text-sm outline-none focus:border-primary"
                    value={newListItem.name}
                    onChange={e => setNewListItem({...newListItem, name: e.target.value})}
                  />
                  <input 
                    type="number" 
                    placeholder="1"
                    className="w-12 border p-2 rounded-lg text-sm text-center outline-none focus:border-primary"
                    value={newListItem.quantity}
                    onChange={e => setNewListItem({...newListItem, quantity: Number(e.target.value)})}
                  />
                  <input 
                    type="text" 
                    placeholder="单位"
                    className="w-12 border p-2 rounded-lg text-sm text-center outline-none focus:border-primary"
                    value={newListItem.unit}
                    onChange={e => setNewListItem({...newListItem, unit: e.target.value})}
                  />
                  <button onClick={handleAddShoppingListItem} className="bg-primary text-white p-2 rounded-lg">
                     <Plus size={20}/>
                  </button>
               </div>

               <button 
                  onClick={handleOneClickPurchase}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-xl font-bold shadow-md active:scale-95 flex items-center justify-center gap-2"
               >
                  <ListPlus size={20}/> 一键采购匹配
               </button>
            </div>
         </div>
      )}

      {activeTab === 'basket' && (
        <div className="p-4 pt-6">
            <div className="flex justify-between items-center mb-6">
               <h1 className="text-2xl font-bold flex items-center gap-2">
                 <Refrigerator className="text-primary" size={28}/> 我的菜筐
               </h1>
               <div className="flex items-center gap-2">
                 <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className={`text-xs px-3 py-1.5 rounded-full border flex items-center gap-1 transition-colors
                       ${showHistory ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-500'}`}
                 >
                    <History size={14}/> {showHistory ? '历史记录' : '当前存货'}
                 </button>
               </div>
            </div>

            <div className="space-y-3 mb-6">
               <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                   {basketCategories.map(c => (
                       <button
                          key={c}
                          onClick={() => setBasketFilterCat(c)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap border
                             ${basketFilterCat === c ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-600'}`}
                       >
                          {c}
                       </button>
                   ))}
               </div>
               <div className="flex justify-between items-center">
                   <div className="flex bg-gray-100 p-1 rounded-lg">
                      <button 
                        onClick={() => setBasketSort('purchaseDate')}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${basketSort === 'purchaseDate' ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}
                      >
                         按购买时间
                      </button>
                      <button 
                        onClick={() => setBasketSort('expiryDate')}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${basketSort === 'expiryDate' ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}
                      >
                         按到期时间
                      </button>
                   </div>
                   
                   <label className="flex items-center gap-2 text-xs text-gray-600">
                      <input 
                        type="checkbox" 
                        checked={showExpiredOnly}
                        onChange={e => setShowExpiredOnly(e.target.checked)}
                        className="rounded text-red-500 focus:ring-red-500"
                      />
                      只看过期
                   </label>
               </div>
            </div>

            {/* Replenish Button */}
            <div className="mb-4">
              <button 
                 onClick={handleBatchReplenish}
                 className="w-full bg-blue-50 text-blue-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 border border-blue-100 active:bg-blue-100 transition-colors shadow-sm"
              >
                 <RefreshCw size={18} /> 一键补货（低于预购值）
              </button>
            </div>
            
            {!currentUserPhone && (
               <div className="bg-orange-50 p-4 rounded-xl text-orange-600 text-sm mb-4">
                  请先在个人中心完善收货信息，以同步您的菜筐数据。
               </div>
            )}

            {filteredBasketItems.length === 0 && (
               <div className="text-center py-10 text-gray-400">
                  <Refrigerator size={48} className="mx-auto mb-2 opacity-20"/>
                  <p>菜筐空空如也</p>
               </div>
            )}

            <div className="space-y-3">
               {filteredBasketItems.map(item => {
                  const status = item.quantity === 0 ? 'empty' : getExpiryStatus(item.expiryDate);
                  const isDeleted = item.isDeleted;
                  const threshold = item.threshold || 5;
                  const isLowStock = !isDeleted && item.quantity < threshold;
                  const isLocked = item.isLocked || false;

                  return (
                     <div key={item.id} className={`bg-white p-3 rounded-xl shadow-sm border flex gap-3 relative overflow-visible ${isDeleted ? 'opacity-50 grayscale' : ''}`}>
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl
                           ${status === 'expired' ? 'bg-red-500' : status === 'warning' ? 'bg-yellow-400' : status === 'empty' ? 'bg-gray-300' : 'bg-green-500'}`}
                        ></div>
                        
                        <div className="relative w-20 h-20 shrink-0">
                          <img src={item.image} className="w-full h-full rounded-lg object-cover bg-gray-100 ml-2" alt={item.name}/>
                          {isLowStock && isLocked && (
                             <div className="absolute -top-1 -right-1 bg-red-500 text-white p-0.5 rounded-full border-2 border-white shadow-md z-10">
                                <BellRing size={12} className="fill-current"/>
                             </div>
                          )}
                        </div>

                        <div className="flex-1 flex flex-col justify-between py-1 relative">
                           <div className="flex justify-between items-start">
                              <h3 className="font-bold text-gray-800">{item.name}</h3>
                              <div className="flex gap-1">
                                {status === 'expired' && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">已过期</span>}
                                {status === 'warning' && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-bold">临期</span>}
                                {item.quantity === 0 && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold">已耗尽</span>}
                              </div>
                           </div>
                           <div className="text-xs text-gray-500 space-y-1">
                              <p className="flex items-center gap-1">
                                 <Calendar size={12}/> 购买: {new Date(item.purchaseDate).toLocaleDateString()}
                              </p>
                              {item.quantity > 0 && (
                                <p className={`flex items-center gap-1 font-medium ${status === 'expired' ? 'text-red-500' : status === 'warning' ? 'text-yellow-600' : 'text-green-600'}`}>
                                   <AlertTriangle size={12}/> 到期: {new Date(item.expiryDate).toLocaleDateString()}
                                </p>
                              )}
                              
                              <div className="flex items-center gap-2 mt-1">
                                 <p className={`font-bold ${isLowStock && isLocked ? 'text-red-500' : 'text-gray-700'}`}>
                                   {item.quantity === 0 ? "已用完" : `数量: ${item.quantity}`}
                                 </p>
                                 {isLocked && (
                                    <div className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                       <span className="text-[10px] text-gray-400">预购值:</span>
                                       {editingThresholdId === item.id ? (
                                         <input 
                                           autoFocus
                                           type="number" 
                                           className="w-8 h-4 text-center border rounded text-[10px] outline-none focus:ring-1 focus:ring-blue-500"
                                           defaultValue={threshold}
                                           onClick={(e) => e.stopPropagation()}
                                           onBlur={(e) => handleUpdateThreshold(item, parseInt(e.target.value) || 0)}
                                           onKeyDown={(e) => {
                                             if (e.key === 'Enter') handleUpdateThreshold(item, parseInt((e.target as HTMLInputElement).value) || 0);
                                           }}
                                         />
                                       ) : (
                                         <span 
                                           className="font-medium text-[10px] text-blue-600 cursor-pointer border-b border-dashed border-blue-300"
                                           onClick={(e) => { e.stopPropagation(); setEditingThresholdId(item.id); }}
                                         >
                                            {threshold}
                                         </span>
                                       )}
                                    </div>
                                 )}
                              </div>
                           </div>
                        </div>

                        {!isDeleted && (
                           <div className="flex flex-col justify-between items-end pl-2">
                              <button 
                                onClick={(e) => handleToggleLock(item, e)}
                                className={`p-1.5 rounded-lg transition-colors ${isLocked ? 'text-blue-500 bg-blue-50' : 'text-gray-300 hover:bg-gray-50'}`}
                                title={isLocked ? "点击解锁 (非锁定状态下可删除)" : "点击锁定 (锁定后删除只清空数量)"}
                              >
                                 {isLocked ? <Lock size={16}/> : <Unlock size={16}/>}
                              </button>
                              
                              <button 
                                onClick={(e) => handleDeletePurchasedItem(item, e)} 
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                 <Trash size={16}/>
                              </button>
                           </div>
                        )}
                     </div>
                  );
               })}
            </div>
        </div>
      )}

      {/* ... Recipes Tab & Bottom Nav ... */}
      {activeTab === 'recipes' && (
        <div className="p-4 pt-6">
           <div className="flex justify-between items-center mb-6">
               <h1 className="text-2xl font-bold flex items-center gap-2">
                 <ChefHat className="text-primary" size={28}/> 厨神菜谱
               </h1>
               <div className="flex bg-gray-100 p-1 rounded-full">
                  <button 
                     onClick={() => setRecipeFilter('recommend')}
                     className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${recipeFilter === 'recommend' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
                  >
                     智能推荐
                  </button>
                  <button 
                     onClick={() => setRecipeFilter('favorite')}
                     className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${recipeFilter === 'favorite' ? 'bg-white shadow text-red-500' : 'text-gray-500'}`}
                  >
                     我的收藏
                  </button>
               </div>
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                <input 
                    type="text" 
                    placeholder="输入食材或菜名搜索 (支持云端搜索)..." 
                    className="w-full pl-10 pr-24 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={recipeSearch}
                    onChange={e => setRecipeSearch(e.target.value)}
                />
                <button 
                   onClick={handleCloudSearch}
                   disabled={cloudLoading}
                   className="absolute right-2 top-1.5 bottom-1.5 px-3 bg-primary text-white rounded-lg text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform"
                >
                   {cloudLoading ? <RefreshCw className="animate-spin" size={14}/> : <Sparkles size={14}/>}
                   云搜索
                </button>
            </div>
            
            {recipeFilter === 'recommend' && !recipeSearch && (
               <div className="mb-4 bg-green-50 p-3 rounded-xl border border-green-100 flex items-start gap-3">
                  <Sparkles className="text-green-600 shrink-0 mt-0.5" size={16}/>
                  <div className="text-xs text-green-800">
                     <p className="font-bold mb-0.5">为您推荐</p>
                     <p>根据您“菜筐”中的食材，为您匹配了以下菜谱。</p>
                  </div>
               </div>
            )}

            <div className="space-y-4">
               {filteredRecipes.length === 0 && (
                  <div className="text-center py-10 text-gray-400">
                     <BookOpen size={48} className="mx-auto mb-2 opacity-20"/>
                     <p>暂无相关菜谱</p>
                     {recipeSearch && !cloudLoading && (
                        <button onClick={handleCloudSearch} className="mt-4 text-primary font-bold text-sm">
                           点击尝试云端搜索 "{recipeSearch}"
                        </button>
                     )}
                  </div>
               )}
               
               {filteredRecipes.map((recipe: any) => (
                  <div 
                     key={recipe.id}
                     onClick={() => setSelectedRecipe(recipe)}
                     className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden active:scale-[0.98] transition-transform cursor-pointer"
                  >
                     <div className="h-40 relative">
                        <img src={recipe.image} className="w-full h-full object-cover" alt={recipe.name} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        <div className="absolute bottom-3 left-3 text-white">
                           <h3 className="font-bold text-lg">{recipe.name}</h3>
                           <div className="flex gap-2 mt-1">
                              {recipe.tags.map((tag: string) => (
                                 <span key={tag} className="text-[10px] bg-white/20 backdrop-blur-md px-2 py-0.5 rounded">
                                    {tag}
                                 </span>
                              ))}
                           </div>
                        </div>
                        <button 
                           onClick={(e) => toggleRecipeFavorite(recipe, e)}
                           className="absolute top-3 right-3 p-2 rounded-full bg-white/20 backdrop-blur-md active:scale-90"
                        >
                           <Heart size={20} className={favoriteRecipeIds.includes(recipe.id) ? "fill-red-500 text-red-500" : "text-white"}/>
                        </button>
                     </div>
                     <div className="p-3">
                        <p className="text-sm text-gray-500 line-clamp-2 mb-3">{recipe.description}</p>
                        <div className="flex items-center justify-between text-xs">
                           <div className="flex -space-x-2">
                              {/* Show matched ingredient icons/badges */}
                              <span className="pl-2 text-gray-400">
                                 已有 {recipe.ownedIngredients.length} / {recipe.ingredients.length} 种食材
                              </span>
                           </div>
                           <span className="text-primary font-bold flex items-center gap-1">
                              查看详情 <ChevronLeft className="rotate-180" size={12}/>
                           </span>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
        </div>
      )}


      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 z-40 pb-safe">
         <button 
            onClick={() => setActiveTab('shop')}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 ${activeTab === 'shop' ? 'text-primary' : 'text-gray-400'}`}
         >
            <Store size={24} className={activeTab === 'shop' ? 'fill-current' : ''}/>
            <span className="text-[10px] font-bold">去买菜</span>
         </button>
         <button 
            onClick={() => setActiveTab('basket')}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 ${activeTab === 'basket' ? 'text-primary' : 'text-gray-400'}`}
         >
            <Refrigerator size={24} className={activeTab === 'basket' ? 'fill-current' : ''}/>
            <span className="text-[10px] font-bold">我的菜筐</span>
         </button>
         <button 
            onClick={() => setActiveTab('recipes')}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 ${activeTab === 'recipes' ? 'text-primary' : 'text-gray-400'}`}
         >
            <BookOpen size={24} className={activeTab === 'recipes' ? 'fill-current' : ''}/>
            <span className="text-[10px] font-bold">菜谱</span>
         </button>
      </div>

      {/* ================= MODALS ================= */}

      {/* 1. Recipe Detail Modal */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="relative h-48">
                 <img src={selectedRecipe.image} className="w-full h-full object-cover" alt={selectedRecipe.name}/>
                 <button onClick={() => setSelectedRecipe(null)} className="absolute top-4 right-4 bg-black/40 text-white p-2 rounded-full">
                    <X size={20}/>
                 </button>
                 <div className="absolute bottom-4 left-4 text-white">
                    <h2 className="text-2xl font-bold">{selectedRecipe.name}</h2>
                    <div className="flex gap-2 mt-1">
                      {selectedRecipe.tags.map(t => <span key={t} className="text-[10px] bg-white/20 px-2 rounded backdrop-blur-md">{t}</span>)}
                    </div>
                 </div>
              </div>
              <div className="p-6">
                 <p className="text-gray-600 mb-6">{selectedRecipe.description}</p>
                 
                 <div className="mb-6">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                       <ShoppingBag className="text-primary" size={20}/> 所需食材
                    </h3>
                    <div className="space-y-2 bg-gray-50 p-4 rounded-xl">
                       {selectedRecipe.ingredients.map((ing, idx) => {
                          // Check matching status from processed data
                          const isOwned = (selectedRecipe as any).ownedIngredients?.includes(ing.name);
                          return (
                             <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                                <span className={isOwned ? 'text-green-700 font-medium' : 'text-gray-800'}>
                                   {ing.name}
                                </span>
                                <div className="flex items-center gap-2">
                                   <span className="text-gray-500">{ing.amount}</span>
                                   {isOwned ? (
                                      <CheckCircleIcon size={14} className="text-green-500"/>
                                   ) : (
                                      <span className="text-[10px] bg-red-100 text-red-500 px-1 rounded">缺</span>
                                   )}
                                </div>
                             </div>
                          );
                       })}
                    </div>
                    {(selectedRecipe as any).missingIngredients?.length > 0 && (
                       <button 
                          onClick={() => addMissingToCart((selectedRecipe as any).missingIngredients)}
                          className="w-full mt-3 bg-primary/10 text-primary py-2 rounded-lg font-bold text-sm hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
                       >
                          <ListPlus size={16}/> 一键添加缺失食材
                       </button>
                    )}
                 </div>

                 <div>
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                       <Clock className="text-primary" size={20}/> 制作步骤
                    </h3>
                    <div className="space-y-4">
                       {selectedRecipe.steps.map((step, idx) => (
                          <div key={idx} className="flex gap-3">
                             <span className="shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                                {idx + 1}
                             </span>
                             <p className="text-gray-700 text-sm leading-relaxed">{step}</p>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* 2. Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center backdrop-blur-sm animate-in fade-in">
           <div className="bg-white w-full max-w-lg rounded-t-2xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">购物车 ({cartItemCount})</h2>
                  <div className="flex items-center gap-4">
                     <button onClick={clearCart} className="text-gray-400 text-sm flex items-center gap-1 hover:text-red-500">
                        <Trash2 size={16}/> 清空
                     </button>
                     <button onClick={() => setShowCart(false)} className="bg-gray-100 p-2 rounded-full">
                        <X size={20}/>
                     </button>
                  </div>
               </div>

               <div className="max-h-[50vh] overflow-y-auto space-y-4 mb-6">
                  {cart.length === 0 && <p className="text-center text-gray-400 py-8">购物车是空的</p>}
                  {cart.map(item => (
                     <div key={item.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <img src={item.image} className="w-16 h-16 rounded-lg object-cover bg-gray-100" alt={item.name}/>
                           <div>
                              <h3 className="font-bold">{item.name}</h3>
                              <span className="text-red-500 font-bold">¥{item.price}</span>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 rounded-full border flex items-center justify-center text-gray-600"><Minus size={16}/></button>
                           <span className="font-bold w-4 text-center">{item.quantity}</span>
                           <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center"><Plus size={16}/></button>
                        </div>
                     </div>
                  ))}
               </div>

               <div className="border-t pt-4">
                  <div className="flex justify-between items-end mb-4">
                     <span className="text-gray-500 text-sm">合计</span>
                     <span className="text-3xl font-bold text-gray-900">¥{cartTotal.toFixed(2)}</span>
                  </div>
                  <button 
                     onClick={() => { setShowCheckout(true); setShowCart(false); }}
                     disabled={cart.length === 0}
                     className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 disabled:bg-gray-300 disabled:shadow-none"
                  >
                     去结算
                  </button>
               </div>
           </div>
        </div>
      )}

      {/* 3. Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center backdrop-blur-sm animate-in fade-in">
           <div className="bg-white w-full max-w-lg rounded-t-2xl p-6 shadow-2xl h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">确认订单</h2>
                  <button onClick={() => setShowCheckout(false)} className="bg-gray-100 p-2 rounded-full">
                     <X size={20}/>
                  </button>
               </div>
               
               <form onSubmit={handleCheckout} className="space-y-6">
                  {/* Address Section */}
                  <div className="space-y-3">
                     <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <MapPin size={16}/> 收货地址
                     </label>
                     {savedAddresses.length > 0 ? (
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                           {savedAddresses.map(addr => (
                              <div 
                                 key={addr.id}
                                 onClick={() => applyAddress(addr)}
                                 className={`shrink-0 w-60 p-3 rounded-xl border-2 cursor-pointer transition-all ${address === addr.address ? 'border-primary bg-green-50' : 'border-gray-100 bg-white'}`}
                              >
                                 <div className="flex justify-between mb-1">
                                    <span className="font-bold">{addr.contactName}</span>
                                    <span className="text-gray-500 text-xs">{addr.phone}</span>
                                 </div>
                                 <p className="text-xs text-gray-600 truncate">{addr.address}</p>
                              </div>
                           ))}
                           <button 
                              type="button"
                              onClick={() => { setShowSettings(true); setShowCheckout(false); }}
                              className="shrink-0 w-12 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl text-gray-400"
                           >
                              <Plus size={20}/>
                           </button>
                        </div>
                     ) : (
                        <button 
                           type="button"
                           onClick={() => { setShowSettings(true); setShowCheckout(false); }}
                           className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold flex items-center justify-center gap-2 hover:bg-gray-50"
                        >
                           <Plus size={18}/> 添加收货地址
                        </button>
                     )}
                     
                     <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                        <input 
                           type="text" 
                           placeholder="详细地址 (门牌号)" 
                           required
                           className="w-full bg-transparent border-b border-gray-200 focus:border-primary outline-none py-2"
                           value={address}
                           onChange={e => setAddress(e.target.value)}
                        />
                        <div className="flex gap-4">
                           <input 
                              type="text" 
                              placeholder="联系人" 
                              required
                              className="w-1/3 bg-transparent border-b border-gray-200 focus:border-primary outline-none py-2"
                              value={customerName}
                              onChange={e => setCustomerName(e.target.value)}
                           />
                           <input 
                              type="tel" 
                              placeholder="手机号" 
                              required
                              className="flex-1 bg-transparent border-b border-gray-200 focus:border-primary outline-none py-2"
                              value={customerPhone}
                              onChange={e => setCustomerPhone(e.target.value)}
                           />
                        </div>
                     </div>
                  </div>

                  {/* Delivery Time */}
                  <div>
                     <label className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-2">
                        <Clock size={16}/> 期望送达时间
                     </label>
                     <input 
                        type="datetime-local" 
                        required
                        className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary"
                        value={deliveryTime}
                        onChange={e => setDeliveryTime(e.target.value)}
                     />
                  </div>

                  {/* Payment Method - Simplified */}
                  <div>
                     <label className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-2">
                        <RefreshCw size={16}/> 支付方式
                     </label>
                     <div className="flex gap-3">
                        <div className="flex-1 p-3 border-2 border-primary bg-green-50 rounded-xl flex items-center justify-center gap-2 text-primary font-bold">
                           <span className="text-lg">💰</span> 货到付款 / 线下结算
                        </div>
                     </div>
                     <p className="text-xs text-gray-400 mt-2 text-center">
                        订单确认后，站长会按时送货上门，请准备好微信/支付宝扫码。
                     </p>
                  </div>

                  <button 
                     type="submit"
                     className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95"
                  >
                     确认下单 • ¥{cartTotal.toFixed(2)}
                  </button>
               </form>
           </div>
        </div>
      )}

      {/* 4. Settings Modal */}
      {showSettings && (
         <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                     <User className="text-primary"/> 个人中心
                  </h2>
                  <button onClick={() => setShowSettings(false)} className="bg-gray-100 p-1 rounded-full">
                     <X size={20} className="text-gray-500"/>
                  </button>
               </div>
               
               {currentUserPhone && (
                  <div className="bg-green-50 p-4 rounded-xl mb-6 flex items-center gap-3">
                     <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center text-green-700 font-bold text-xl">
                        {currentUserPhone.slice(-4)}
                     </div>
                     <div>
                        <h3 className="font-bold text-green-900">欢迎回来</h3>
                        <p className="text-xs text-green-700">当前账号: {currentUserPhone}</p>
                     </div>
                  </div>
               )}

               <div className="mb-6">
                  <h3 className="font-bold text-gray-700 mb-3 text-sm">地址管理</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
                     {savedAddresses.map(addr => (
                        <div key={addr.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                           <div className="flex-1 mr-2">
                              <div className="flex items-center gap-2 mb-1">
                                 <span className="font-bold text-sm">{addr.contactName}</span>
                                 <span className="text-gray-500 text-xs">{addr.phone}</span>
                                 {addr.isDefault && <span className="text-[10px] bg-primary text-white px-1 rounded">默认</span>}
                              </div>
                              <p className="text-xs text-gray-500 truncate">{addr.address}</p>
                           </div>
                           <div className="flex gap-2 text-gray-400">
                              {!addr.isDefault && (
                                 <button onClick={() => handleSetDefaultAddress(addr.id)} className="hover:text-primary" title="设为默认"><CheckCircleIcon size={16}/></button>
                              )}
                              <button onClick={() => handleDeleteAddress(addr.id)} className="hover:text-red-500"><Trash2 size={16}/></button>
                           </div>
                        </div>
                     ))}
                  </div>

                  {!isAddingAddress ? (
                     <button onClick={() => setIsAddingAddress(true)} className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors">
                        + 新增收货地址
                     </button>
                  ) : (
                     <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 animate-in fade-in">
                        <input 
                           type="text" 
                           placeholder="姓名" 
                           className="w-full mb-2 p-2 rounded border border-gray-200 text-sm"
                           value={newAddrName} 
                           onChange={e => setNewAddrName(e.target.value)}
                        />
                        <input 
                           type="tel" 
                           placeholder="电话" 
                           className="w-full mb-2 p-2 rounded border border-gray-200 text-sm"
                           value={newAddrPhone} 
                           onChange={e => setNewAddrPhone(e.target.value)}
                        />
                        <input 
                           type="text" 
                           placeholder="详细地址" 
                           className="w-full mb-2 p-2 rounded border border-gray-200 text-sm"
                           value={newAddrText} 
                           onChange={e => setNewAddrText(e.target.value)}
                        />
                        <div className="flex gap-2">
                           <button onClick={handleAddAddress} className="flex-1 bg-primary text-white py-1.5 rounded text-xs font-bold">保存</button>
                           <button onClick={() => setIsAddingAddress(false)} className="flex-1 bg-gray-200 text-gray-600 py-1.5 rounded text-xs">取消</button>
                        </div>
                     </div>
                  )}
               </div>

               <div className="space-y-3">
                  <Link to="/" className="block w-full bg-orange-50 text-orange-600 py-3 rounded-xl font-bold text-center border border-orange-100 flex items-center justify-center gap-2">
                     <Store size={18}/> 我要当站长
                  </Link>
                  <button 
                     onClick={handleLogout}
                     className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                     <LogOut size={18}/> 退出登录
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
