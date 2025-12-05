
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Package, Plus, TrendingUp, Truck, Share2, Store, Clock, Eye, Camera, Settings, QrCode, MapPin, CheckCircle, LogOut, Users, RefreshCw, X, User, Map, Navigation, Search, Archive, Layers, AlertTriangle, ClipboardList, Star, Timer, Flame, History, Phone, ChevronRight, BarChart3, Wand2, ArrowUp, ArrowDown, ImageIcon, Edit } from '../components/ui/Icons';
import { store, DEFAULT_CATEGORIES } from '../services/store';
import { generateProductDescription, identifyProductFromImage } from '../services/geminiService';
import { Station, Product, Order, OrderStatus, ProductSalesRank } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const ManagerDashboard: React.FC = () => {
  const { stationId } = useParams<{ stationId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'orders' | 'supply' | 'products' | 'partners' | 'stats' | 'settings'>('orders');
  const [station, setStation] = useState<Station | undefined>(undefined);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [metrics, setMetrics] = useState({ totalSales: 0, reputation: '5.0', activity: '0' });

  // Order Filter State
  const [orderFilter, setOrderFilter] = useState<'ALL_ACTIVE' | OrderStatus | 'HISTORY'>('ALL_ACTIVE');
  // Picking List State
  const [pickingOrder, setPickingOrder] = useState<Order | null>(null);

  // Supply Tab State
  const [supplyTasks, setSupplyTasks] = useState<any[]>([]);

  // Product Filter State
  const [productSearch, setProductSearch] = useState('');

  // New Product State
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ category: '蔬菜', commissionRate: 0, stock: 99, prepTime: 2 });
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [yesterdayPrice, setYesterdayPrice] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Product State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});

  // Custom Category State
  const [stationCategories, setStationCategories] = useState<string[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Partner State
  const [partners, setPartners] = useState<Station[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<Station | null>(null);
  const [partnerProducts, setPartnerProducts] = useState<Product[]>([]);
  const partnerQrRef = useRef<HTMLInputElement>(null);
  
  // Settings State
  const [shopAddress, setShopAddress] = useState('');
  const [qrCodeImage, setQrCodeImage] = useState('');
  const [headerImage, setHeaderImage] = useState('');
  const [locationStatus, setLocationStatus] = useState<{lat: number, lng: number} | null>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    if (stationId) {
      const s = store.getStation(stationId);
      setStation(s);
      if (s) {
        setShopAddress(s.address || '');
        setQrCodeImage(s.paymentQrCode || '');
        setHeaderImage(s.headerImage || '');
        if (s.location) {
          setLocationStatus(s.location);
        }
        setStationCategories(s.categories || DEFAULT_CATEGORIES);
      }
      refreshData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationId, activeTab]);

  const refreshData = () => {
    if (!stationId) return;
    setOrders(store.getOrders(stationId));
    setProducts(store.getProducts(stationId));
    setStats(store.getStats(stationId));
    setMetrics(store.getStationMetrics(stationId));
    setSupplyTasks(store.getConsignmentTasks(stationId));
    
    // Load partners and sort by consignment count
    const rawPartners = store.getPartners(stationId);
    const sortedPartners = rawPartners.map(p => ({
      ...p,
      consignmentCount: store.getConsignmentCount(stationId, p.id)
    })).sort((a, b) => b.consignmentCount - a.consignmentCount);
    
    setPartners(sortedPartners);
  };

  // Helper to compress image
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; // Resize to max 800px width
          const scaleSize = MAX_WIDTH / img.width;
          const width = img.width > MAX_WIDTH ? MAX_WIDTH : img.width;
          const height = img.width > MAX_WIDTH ? img.height * scaleSize : img.height;
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          // Compress to JPEG 0.5 quality
          resolve(canvas.toDataURL('image/jpeg', 0.5));
        };
      };
    });
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationId || !newProduct.name || !newProduct.price) return;

    const product: Product = {
      id: Date.now().toString(),
      stationId,
      name: newProduct.name,
      price: Number(newProduct.price),
      unit: newProduct.unit || '斤',
      description: newProduct.description || '新鲜好菜',
      image: newProduct.image || `https://picsum.photos/seed/${Date.now()}/300/300`,
      category: newProduct.category || '蔬菜',
      stock: newProduct.stock || 50,
      video: newProduct.video,
      commissionRate: newProduct.commissionRate || 0,
      isConsigned: false,
      isAvailable: true,
      prepTime: newProduct.prepTime || 2
    };

    store.addProduct(product);
    setIsAddingProduct(false);
    setNewProduct({ category: '蔬菜', commissionRate: 0, stock: 99, prepTime: 2 });
    setYesterdayPrice(null);
    refreshData();
  };

  const handleEditProductSave = (e: React.FormEvent) => {
     e.preventDefault();
     if (editingProduct && editForm) {
        store.updateProduct(editingProduct.id, editForm);
        setEditingProduct(null);
        setEditForm({});
        refreshData();
     }
  };

  const handleAddCategory = () => {
    if(!newCategoryName.trim() || !stationId) return;
    store.addStationCategory(stationId, newCategoryName.trim());
    setStationCategories(prev => [...prev, newCategoryName.trim()]);
    if (editingProduct) {
       setEditForm({...editForm, category: newCategoryName.trim()});
    } else {
       setNewProduct({...newProduct, category: newCategoryName.trim()});
    }
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const handleUpdateProduct = (id: string, updates: Partial<Product>) => {
    store.updateProduct(id, updates);
    refreshData();
  };

  const handleAIGen = async (target: 'new' | 'edit') => {
    const currentName = target === 'new' ? newProduct.name : editForm.name;
    if (!currentName) return;
    
    setIsGeneratingAI(true);
    const desc = await generateProductDescription(currentName);
    
    if (target === 'new') {
       setNewProduct(prev => ({ ...prev, description: desc }));
    } else {
       setEditForm(prev => ({ ...prev, description: desc }));
    }
    setIsGeneratingAI(false);
  };

  // Generate Image using a proxy service (simulated AI)
  const handleGenerateImage = (target: 'new' | 'edit') => {
      const currentName = target === 'new' ? newProduct.name : editForm.name;
      if (!currentName) {
         alert("请先输入菜品名称");
         return;
      }
      
      // Use pollinations.ai for demo generative images based on text
      const encodedName = encodeURIComponent(currentName + " fresh vegetable food close up high quality");
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedName}?width=400&height=400&nologo=true&seed=${Math.floor(Math.random()*1000)}`;
      
      if (target === 'new') {
         setNewProduct(prev => ({ ...prev, image: imageUrl }));
      } else {
         setEditForm(prev => ({ ...prev, image: imageUrl }));
      }
  };

  const handleCameraScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const compressedBase64 = await compressImage(file);
      const base64Data = compressedBase64.split(',')[1]; // Remove prefix
      
      // Set image preview immediately
      setNewProduct(prev => ({ ...prev, image: compressedBase64 }));

      // Call Gemini Vision
      const result = await identifyProductFromImage(base64Data);
      
      if (result) {
        setNewProduct(prev => ({
          ...prev,
          name: result.name,
          description: result.description,
          price: result.price,
          category: result.category,
          unit: '斤' // Default
        }));
        setYesterdayPrice(result.yesterdayPrice);
      } else {
        // Fallback if AI fails but we have image
        console.warn("AI Identify returned null");
      }
    } catch (err) {
      console.error("Scan error", err);
      alert("处理图片时出错，请重试");
    } finally {
      setIsScanning(false);
    }
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
       try {
         const compressed = await compressImage(file);
         setQrCodeImage(compressed);
       } catch (err) {
         console.error(err);
         alert("图片处理失败");
       }
    }
  };

  const handleHeaderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        try {
          const compressed = await compressImage(file);
          setHeaderImage(compressed);
        } catch (err) {
          console.error(err);
          alert("图片处理失败");
        }
    }
  };

  const handleGenerateHeaderImage = () => {
     if (!station) return;
     const encodedName = encodeURIComponent(station.stationName + " fresh vegetable market banner background aesthetic high quality");
     const imageUrl = `https://image.pollinations.ai/prompt/${encodedName}?width=800&height=400&nologo=true&seed=${Math.floor(Math.random()*1000)}`;
     setHeaderImage(imageUrl);
  };

  // Partner Logic
  const handlePartnerQrScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !stationId) return;

    try {
      const compressed = await compressImage(file);
      // Logic to find partner by QR image string
      const result = store.addPartnerByQr(stationId, compressed);
      if (result.success) {
        alert(result.message);
        refreshData();
      } else {
        alert(result.message);
      }
    } catch (err) {
      console.error("Partner scan error", err);
      alert("扫描失败");
    }
  };

  const openPartnerDetails = (partner: Station) => {
    setSelectedPartner(partner);
    // Get products for this partner
    // Filter out products that are CONSIGEND (so we only resell their original products)
    const prods = store.getProducts(partner.id).filter(p => !p.isConsigned);
    setPartnerProducts(prods);
  };

  const handleConsign = (product: Product) => {
    if (!stationId) return;
    store.consignProduct(stationId, product);
    alert(`已上架代销：${product.name}`);
    refreshData(); // Refresh current station products
    // Optionally refresh consignment count immediately
  };

  const isConsignedByMe = (originalProductId: string) => {
    // Check if current station has a product with originalStationId == partner.id and same name/props
    // Simplified check:
    return products.some(p => p.originalStationId === selectedPartner?.id && p.name === partnerProducts.find(pp => pp.id === originalProductId)?.name);
  };

  const saveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (stationId) {
      store.updateStation(stationId, {
        address: shopAddress,
        paymentQrCode: qrCodeImage,
        headerImage: headerImage,
        location: locationStatus || undefined
      });
      setStation(store.getStation(stationId)); // Update local state
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleGetLocation = () => {
     if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition((position) => {
           const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
           setLocationStatus(loc);
           alert("已获取当前位置！请点击保存设置。");
        }, (error) => {
           console.error(error);
           alert("获取位置失败，请检查定位权限。");
        });
     } else {
        alert("您的浏览器不支持地理定位。");
     }
  };

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if(window.confirm("确定要退出管理端返回首页吗？")) {
      navigate('/');
    }
  };

  const triggerCamera = () => {
    fileInputRef.current?.click();
  };

  const handleUpdateStatus = (orderId: string, currentStatus: OrderStatus) => {
    let nextStatus = currentStatus;
    if (currentStatus === OrderStatus.PENDING) nextStatus = OrderStatus.PACKED;
    else if (currentStatus === OrderStatus.PACKED) {
      // Simulate courier flow
      nextStatus = OrderStatus.SHIPPING;
      store.updateOrderStatus(orderId, nextStatus);
      refreshData();
      
      // Simulate delivery after 5 seconds
      setTimeout(() => {
        store.updateOrderStatus(orderId, OrderStatus.DELIVERED);
        refreshData();
      }, 5000);
      return;
    }
    
    store.updateOrderStatus(orderId, nextStatus);
    refreshData();
  };

  const shareLink = () => {
    const url = `${window.location.origin}/#/shop/${stationId}`;
    navigator.clipboard.writeText(url);
    alert('推广链接已复制！请发送到微信群。');
  };

  // Filter Orders
  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'ALL_ACTIVE') {
      return o.status !== OrderStatus.DELIVERED;
    } else if (orderFilter === 'HISTORY') {
      return o.status === OrderStatus.DELIVERED;
    } else {
      return o.status === orderFilter;
    }
  });

  const getOrderCounts = () => {
    const active = orders.filter(o => o.status !== OrderStatus.DELIVERED).length;
    const pending = orders.filter(o => o.status === OrderStatus.PENDING).length;
    const packed = orders.filter(o => o.status === OrderStatus.PACKED).length;
    const shipping = orders.filter(o => o.status === OrderStatus.SHIPPING).length;
    const history = orders.filter(o => o.status === OrderStatus.DELIVERED).length;
    return { active, pending, packed, shipping, history };
  };

  const orderCounts = getOrderCounts();

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  const formatTimeLeft = (dueTime: number) => {
    const diff = dueTime - Date.now();
    const minutes = Math.floor(diff / 1000 / 60);
    if (minutes < 0) return { text: `超时 ${Math.abs(minutes)}分`, isUrgent: true };
    return { text: `剩 ${minutes}分`, isUrgent: minutes < 5 };
  };

  const getStationName = (id: string | undefined) => {
    if (!id) return '未知站点';
    return store.getStation(id)?.stationName || '未知站点';
  };

  // Price Trend Calculation
  const getPriceTrend = (currentPrice: number | undefined, originalPrice: number) => {
    if (currentPrice === undefined || currentPrice === originalPrice) return null;
    const diff = currentPrice - originalPrice;
    return {
      direction: diff > 0 ? 'up' : 'down',
      amount: Math.abs(diff).toFixed(2)
    };
  };

  if (!station) return <div>Loading...</div>;

  return (
    <div className="pb-20 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="flex justify-between items-center p-4 pb-2">
          <div className="flex items-center gap-3">
             <img src={station.avatar} className="w-10 h-10 rounded-full" alt="avatar" />
             <div>
               <h1 className="font-bold text-lg">{station.stationName}</h1>
               <p className="text-xs text-gray-500">站长: {station.ownerName}</p>
             </div>
          </div>
          <div className="flex gap-2">
            <button 
               onClick={() => setActiveTab('stats')}
               className={`p-2 rounded-full transition-colors ${activeTab === 'stats' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
               title="经营统计"
            >
               <BarChart3 size={20}/>
            </button>
            <button 
               onClick={() => setActiveTab('settings')}
               className={`p-2 rounded-full transition-colors ${activeTab === 'settings' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
               title="商铺设置"
            >
               <Settings size={20}/>
            </button>
            <Link 
              to={`/shop/${stationId}?preview=true`} 
              className="bg-blue-50 text-blue-600 p-2 rounded-full flex items-center justify-center active:bg-blue-100 transition-colors"
              title="预览客户视角"
            >
              <Eye size={20} />
            </Link>
            <button onClick={shareLink} className="bg-green-100 text-green-700 p-2 rounded-full active:bg-green-200 transition-colors">
              <Share2 size={20} />
            </button>
          </div>
        </div>

        {/* Station Metrics */}
        <div className="grid grid-cols-3 gap-2 px-4 pb-4">
           <div className="bg-orange-50 rounded-lg p-2 text-center border border-orange-100">
              <div className="text-xs text-orange-400 mb-1 flex items-center justify-center gap-1"><TrendingUp size={10}/> 销量</div>
              <div className="font-bold text-orange-700">¥{Number(metrics.totalSales).toFixed(0)}</div>
           </div>
           <div className="bg-yellow-50 rounded-lg p-2 text-center border border-yellow-100">
              <div className="text-xs text-yellow-500 mb-1 flex items-center justify-center gap-1"><Star size={10}/> 口碑</div>
              <div className="font-bold text-yellow-700">{metrics.reputation}</div>
           </div>
           <div className="bg-red-50 rounded-lg p-2 text-center border border-red-100">
              <div className="text-xs text-red-400 mb-1 flex items-center justify-center gap-1"><Flame size={10}/> 活跃度</div>
              <div className="font-bold text-red-700">{metrics.activity}</div>
           </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('orders')} 
            className={`flex-1 min-w-[60px] py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'orders' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}
          >
            订单 {orderCounts.active > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full ml-1">{orderCounts.active}</span>}
          </button>
          <button 
            onClick={() => setActiveTab('supply')} 
            className={`flex-1 min-w-[60px] py-3 text-sm font-medium whitespace-nowrap flex items-center justify-center gap-1 ${activeTab === 'supply' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}
          >
            备货 {supplyTasks.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1 rounded-full">{supplyTasks.length}</span>}
          </button>
          <button 
            onClick={() => setActiveTab('products')} 
            className={`flex-1 min-w-[60px] py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'products' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}
          >
            菜品
          </button>
          <button 
            onClick={() => setActiveTab('partners')} 
            className={`flex-1 min-w-[60px] py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'partners' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}
          >
            友商
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Order Filters */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <button 
                onClick={() => setOrderFilter('ALL_ACTIVE')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border flex items-center gap-1
                  ${orderFilter === 'ALL_ACTIVE' ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-600'}`}
              >
                全部进行中 {orderCounts.active > 0 && <span className={`${orderFilter === 'ALL_ACTIVE' ? 'bg-white/30' : 'bg-gray-100 text-gray-600'} px-1.5 rounded-full text-[10px]`}>{orderCounts.active}</span>}
              </button>
              <button 
                onClick={() => setOrderFilter(OrderStatus.PENDING)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border flex items-center gap-1
                  ${orderFilter === OrderStatus.PENDING ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-600'}`}
              >
                待处理 {orderCounts.pending > 0 && <span className="bg-gray-100 text-gray-600 px-1.5 rounded-full text-[10px]">{orderCounts.pending}</span>}
              </button>
              <button 
                onClick={() => setOrderFilter(OrderStatus.PACKED)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border flex items-center gap-1
                  ${orderFilter === OrderStatus.PACKED ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-600'}`}
              >
                待揽收 {orderCounts.packed > 0 && <span className="bg-gray-100 text-gray-600 px-1.5 rounded-full text-[10px]">{orderCounts.packed}</span>}
              </button>
              <button 
                onClick={() => setOrderFilter(OrderStatus.SHIPPING)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border flex items-center gap-1
                  ${orderFilter === OrderStatus.SHIPPING ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-600'}`}
              >
                配送中 {orderCounts.shipping > 0 && <span className="bg-gray-100 text-gray-600 px-1.5 rounded-full text-[10px]">{orderCounts.shipping}</span>}
              </button>
              <button 
                onClick={() => setOrderFilter('HISTORY')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border flex items-center gap-1 ml-auto
                  ${orderFilter === 'HISTORY' ? 'bg-gray-600 text-white border-gray-600' : 'bg-gray-100 border-gray-200 text-gray-500'}`}
              >
                <History size={12}/> 历史订单
              </button>
            </div>

            {filteredOrders.length === 0 && (
              <div className="text-center text-gray-400 py-10">
                {orderFilter === 'HISTORY' ? '暂无历史订单' : '当前没有此类订单'}
              </div>
            )}
            
            {filteredOrders.map(order => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="font-bold text-lg">#{order.id.slice(-4)}</span>
                    <span className="ml-2 text-sm text-gray-500">{order.customerName}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-bold
                    ${order.status === OrderStatus.DELIVERED ? 'bg-green-100 text-green-600' : 
                      order.status === OrderStatus.SHIPPING ? 'bg-blue-100 text-blue-600' :
                      order.status === OrderStatus.PACKED ? 'bg-yellow-100 text-yellow-600' :
                      'bg-red-100 text-red-600'}`}
                  >
                    {order.status === OrderStatus.PENDING && '待处理'}
                    {order.status === OrderStatus.PACKED && '待揽收'}
                    {order.status === OrderStatus.SHIPPING && '配送中'}
                    {order.status === OrderStatus.DELIVERED && '已送达'}
                  </span>
                </div>
                
                <div className="bg-gray-50 p-2 rounded-lg mb-3 text-sm text-gray-600 space-y-1">
                  <p className="flex items-center gap-1"><Clock size={14}/> 配送: {new Date(order.deliveryTime).toLocaleString()}</p>
                  <p className="flex items-center gap-1"><Store size={14}/> 地址: {order.address}</p>
                  <div className="flex items-center gap-1">
                     <a href={`tel:${order.customerPhone}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 hover:text-primary hover:underline decoration-dotted text-blue-600 font-medium">
                        <Phone size={14}/> 电话: {order.customerPhone} (点击拨打)
                     </a>
                  </div>
                </div>

                <div 
                  className="space-y-1 mb-3 cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors group relative"
                  onClick={() => setPickingOrder(order)}
                >
                   <div className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 group-hover:text-primary">
                      <ChevronRight size={16} />
                   </div>
                  {order.items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.name} x {item.quantity}</span>
                      <span className="text-gray-500">¥{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="text-xs text-center text-gray-400 mt-1">点击查看配货来源详情</div>
                </div>

                <div className="flex justify-between items-center border-t pt-3">
                  <span className="font-bold text-lg">¥{order.total.toFixed(2)}</span>
                  
                  {order.status === OrderStatus.PENDING && (
                    <button 
                      onClick={() => handleUpdateStatus(order.id, OrderStatus.PENDING)}
                      className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md active:scale-95"
                    >
                      打印标签并打包
                    </button>
                  )}
                  {order.status === OrderStatus.PACKED && (
                    <button 
                      onClick={() => handleUpdateStatus(order.id, OrderStatus.PACKED)}
                      className="bg-secondary text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md active:scale-95 flex items-center gap-1"
                    >
                      <Truck size={16}/> 呼叫快递取货
                    </button>
                  )}
                   {order.status === OrderStatus.SHIPPING && (
                    <span className="text-gray-400 text-sm italic">等待快递送达...</span>
                  )}
                  {order.status === OrderStatus.DELIVERED && (
                    <span className="text-green-600 text-sm font-bold flex items-center gap-1">
                      <CheckCircle size={16}/> 订单完成
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Picking List Modal */}
        {pickingOrder && (
           <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                 <div className="bg-primary text-white p-4 flex justify-between items-center">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                       <ClipboardList size={20}/> 配货清单
                    </h2>
                    <button onClick={() => setPickingOrder(null)} className="bg-white/20 p-1.5 rounded-full hover:bg-white/30">
                       <X size={20}/>
                    </button>
                 </div>
                 
                 <div className="p-4 overflow-y-auto bg-gray-50 flex-1 space-y-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                       <div className="flex justify-between border-b pb-2 mb-2">
                          <span className="text-gray-500 text-sm">订单号</span>
                          <span className="font-bold">#{pickingOrder.id.slice(-4)}</span>
                       </div>
                       
                       {(() => {
                          const ownItems = pickingOrder.items.filter(i => !i.isConsigned);
                          const consignedItems = pickingOrder.items.filter(i => i.isConsigned);
                          
                          // Group Consigned Items by Original Station
                          const partnerGroups: Record<string, typeof pickingOrder.items> = {};
                          consignedItems.forEach(i => {
                             const origin = i.originalStationId || 'unknown';
                             if (!partnerGroups[origin]) partnerGroups[origin] = [];
                             partnerGroups[origin].push(i);
                          });

                          return (
                             <div className="space-y-4">
                                {/* Self Owned Section */}
                                <div>
                                   <h3 className="text-sm font-bold text-primary mb-2 flex items-center gap-1 bg-green-50 p-1.5 rounded-lg">
                                      <Store size={14}/> 本站自营商品
                                   </h3>
                                   {ownItems.length === 0 ? (
                                      <p className="text-gray-400 text-xs pl-2">无</p>
                                   ) : (
                                      <ul className="space-y-2 pl-2">
                                         {ownItems.map((item, idx) => (
                                            <li key={idx} className="flex justify-between items-center text-sm border-b border-gray-50 pb-1 last:border-0">
                                               <span className="font-medium text-gray-800">{item.name}</span>
                                               <span className="font-bold text-lg text-primary">x {item.quantity}<span className="text-xs font-normal text-gray-500">{item.unit}</span></span>
                                            </li>
                                         ))}
                                      </ul>
                                   )}
                                </div>

                                {/* Partners Section */}
                                {Object.keys(partnerGroups).length > 0 && (
                                   <div>
                                      <div className="text-sm font-bold text-orange-600 mb-2 flex items-center gap-1 bg-orange-50 p-1.5 rounded-lg border border-orange-100">
                                         <RefreshCw size={14}/> 合作友商代销
                                      </div>
                                      
                                      <div className="space-y-3 pl-2">
                                         {Object.entries(partnerGroups).map(([originId, items]) => (
                                            <div key={originId} className="bg-white border border-dashed border-gray-300 rounded-lg p-3">
                                               <div className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                                                  <Store size={12}/> 取货自: {getStationName(originId)}
                                               </div>
                                               <ul className="space-y-2">
                                                  {items.map((item, idx) => (
                                                     <li key={idx} className="flex justify-between items-center text-sm">
                                                        <span>{item.name}</span>
                                                        <span className="font-bold text-orange-600">x {item.quantity}<span className="text-xs font-normal text-gray-400">{item.unit}</span></span>
                                                     </li>
                                                  ))}
                                               </ul>
                                            </div>
                                         ))}
                                      </div>
                                   </div>
                                )}
                             </div>
                          );
                       })()}
                    </div>
                 </div>
                 <div className="p-4 bg-white border-t">
                    <button 
                       onClick={() => setPickingOrder(null)}
                       className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl active:scale-95 transition-transform"
                    >
                       关闭
                    </button>
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'supply' && (
           <div className="space-y-4">
              <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100 text-sm text-yellow-800 flex items-start gap-2">
                 <ClipboardList size={18} className="shrink-0 mt-0.5"/>
                 <p>当友商代销您的菜品并产生订单时，请在此查看备货清单。请按时备货，以便友商统一配送。</p>
              </div>

              {supplyTasks.length === 0 && <div className="text-center text-gray-400 py-10">当前没有需要备货的代销订单</div>}
              
              {supplyTasks.map((task, idx) => {
                 const { text, isUrgent } = formatTimeLeft(task.dueTime);
                 return (
                   <div key={`${task.orderId}_${idx}`} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 relative overflow-hidden">
                      {isUrgent && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500"></div>}
                      
                      <div className="flex justify-between items-start mb-2 pl-2">
                         <div>
                            <span className="text-xs text-gray-500 block mb-1">订单号: #{task.orderId.slice(-6)}</span>
                            <h3 className="font-bold text-lg flex items-center gap-2">
                               {task.name} <span className="text-primary">x{task.quantity}{task.unit}</span>
                            </h3>
                         </div>
                         <div className={`text-xs px-2 py-1 rounded font-bold flex items-center gap-1 ${isUrgent ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                            <Timer size={12}/> {text}
                         </div>
                      </div>

                      <div className="bg-gray-50 p-2 rounded-lg text-sm text-gray-600 space-y-1 pl-2">
                         <p className="flex items-center gap-1"><Store size={14}/> 代销友商: <span className="font-bold">{task.sellingStationName}</span></p>
                         <p className="flex items-center gap-1"><Clock size={14}/> 下单时间: {new Date(task.orderTime).toLocaleTimeString()}</p>
                      </div>

                      <div className="mt-3 flex justify-end pl-2">
                         <button className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-100">
                            备货完成
                         </button>
                      </div>
                   </div>
                 );
              })}
           </div>
        )}

        {activeTab === 'products' && (
          <div>
            {!isAddingProduct ? (
              <>
                <div className="flex gap-2 mb-4">
                   <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="搜索商品..." 
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                      />
                   </div>
                   <button 
                     onClick={() => setIsAddingProduct(true)}
                     className="bg-primary text-white px-4 rounded-xl flex items-center justify-center gap-1 shadow-md whitespace-nowrap text-sm font-bold"
                   >
                     <Plus size={18} /> 上架
                   </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {filteredProducts.map(p => {
                    let originalAvatar = '';
                    if (p.isConsigned && p.originalStationId) {
                      const origStation = store.getStation(p.originalStationId);
                      originalAvatar = origStation?.avatar || '';
                    }

                    // Low Stock Warning
                    const isLowStock = p.stock < 5 && p.isAvailable;

                    return (
                      <div 
                        key={p.id} 
                        className={`bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 relative ${!p.isAvailable ? 'opacity-70 grayscale' : ''} cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all`}
                        onClick={() => {
                           setEditingProduct(p);
                           setEditForm({...p});
                        }}
                      >
                        {p.isConsigned && (
                          <div className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full z-10 shadow-sm flex items-center gap-1">
                             <RefreshCw size={10} /> 代销
                          </div>
                        )}
                        {!p.isAvailable && (
                           <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                              <span className="bg-black/60 text-white px-3 py-1 rounded font-bold backdrop-blur-sm shadow-xl border border-white/20">已下架</span>
                           </div>
                        )}
                        <div className="h-32 bg-gray-200 relative group">
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                          {originalAvatar && (
                             <img src={originalAvatar} className="w-8 h-8 rounded-full border-2 border-white absolute bottom-2 left-2" alt="Original Station"/>
                          )}
                          <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               handleUpdateProduct(p.id, { isAvailable: !p.isAvailable });
                             }}
                             className={`absolute top-2 left-2 p-1.5 rounded-full backdrop-blur-md transition-all shadow-md z-30 
                                ${p.isAvailable ? 'bg-white/80 text-gray-700 hover:bg-white hover:text-red-500' : 'bg-primary text-white'}`}
                             title={p.isAvailable ? "点击下架" : "点击上架"}
                          >
                             <Archive size={16} />
                          </button>
                        </div>
                        <div className="p-3">
                          <h3 className="font-bold">{p.name}</h3>
                          <div className="flex justify-between items-baseline">
                             <p className="text-red-500 font-bold">¥{p.price}/{p.unit}</p>
                             {p.commissionRate ? (
                               <span className="text-[10px] text-green-600 bg-green-50 px-1 rounded">返佣{p.commissionRate}%</span>
                             ) : null}
                          </div>
                          
                          <div className="mt-2 pt-2 border-t border-gray-50 flex justify-between items-center">
                             <div className={`text-xs flex items-center gap-1 ${isLowStock ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                                {isLowStock && <AlertTriangle size={12}/>}
                                库存: {p.stock}
                             </div>
                             <div className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                {p.category}
                             </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg">上架新菜品</h3>
                  <button 
                    type="button"
                    onClick={triggerCamera}
                    disabled={isScanning}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-md active:scale-95 transition-all"
                  >
                    <Camera size={16} />
                    {isScanning ? '识别中...' : 'AI 拍照上架'}
                  </button>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleCameraScan} 
                  />
                </div>

                <div className="mb-4 bg-orange-50 p-3 rounded-lg text-xs text-orange-700 flex items-start gap-2 border border-orange-100">
                   <Store size={14} className="mt-0.5 shrink-0"/>
                   <div>
                     <span className="font-bold block">所属商铺信息:</span>
                     {station.address ? (
                        <span>{station.address}</span>
                     ) : (
                        <span className="text-red-500">未设置地址，请在“设置”中完善</span>
                     )}
                   </div>
                </div>

                <form onSubmit={handleAddProduct} className="space-y-4">
                  {newProduct.image && newProduct.image.startsWith('data:') && (
                     <div className="w-full h-40 rounded-lg overflow-hidden mb-2 bg-gray-100 border relative">
                       <img src={newProduct.image} alt="Preview" className="w-full h-full object-cover" />
                     </div>
                  )}

                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="菜名" 
                      className="flex-1 border p-2 rounded-lg"
                      value={newProduct.name || ''}
                      onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => handleGenerateImage('new')}
                      className="bg-purple-100 text-purple-600 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 active:bg-purple-200"
                      title="AI 生成图片"
                    >
                       <Wand2 size={16}/> 生成图片
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleAIGen('new')}
                      disabled={isGeneratingAI || !newProduct.name}
                      className="bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap"
                    >
                      {isGeneratingAI ? '生成中...' : '优化文案'}
                    </button>
                  </div>
                  
                  <textarea 
                    placeholder="描述 (AI 可自动生成)" 
                    className="w-full border p-2 rounded-lg text-sm h-20"
                    value={newProduct.description || ''}
                    onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                  />

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <span className="absolute left-2 top-2 text-gray-500">¥</span>
                        <input 
                          type="number" 
                          placeholder="今日价格" 
                          className="border p-2 pl-6 rounded-lg w-full"
                          value={newProduct.price || ''}
                          onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
                          required
                          step="0.01"
                        />
                      </div>
                      <input 
                        type="text" 
                        placeholder="单位 (斤/个)" 
                        className="border p-2 rounded-lg"
                        value={newProduct.unit || '斤'}
                        onChange={e => setNewProduct({...newProduct, unit: e.target.value})}
                      />
                    </div>
                    {yesterdayPrice !== null && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 ml-1">
                        <TrendingUp size={12} className="text-gray-400"/>
                        昨日参考价: ¥{yesterdayPrice.toFixed(2)} 
                        {newProduct.price && (
                           <span className={newProduct.price > yesterdayPrice ? 'text-red-500' : 'text-green-500'}>
                             ({newProduct.price > yesterdayPrice ? '+' : ''}{(newProduct.price - yesterdayPrice).toFixed(2)})
                           </span>
                        )}
                      </p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                     <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">商品分类</label>
                        {!isAddingCategory ? (
                          <div className="flex gap-1">
                             <select 
                                className="w-full border p-2 rounded-lg text-sm bg-white"
                                value={newProduct.category || ''}
                                onChange={e => {
                                  if(e.target.value === 'add_new') {
                                    setIsAddingCategory(true);
                                  } else {
                                    setNewProduct({...newProduct, category: e.target.value});
                                  }
                                }}
                             >
                                {stationCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                <option value="add_new">+ 添加新分类</option>
                             </select>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                             <input 
                               type="text"
                               className="w-full border p-2 rounded-lg text-sm"
                               placeholder="输入分类名"
                               value={newCategoryName}
                               onChange={e => setNewCategoryName(e.target.value)}
                               autoFocus
                             />
                             <button type="button" onClick={handleAddCategory} className="bg-primary text-white px-2 rounded-lg text-xs">确定</button>
                             <button type="button" onClick={() => setIsAddingCategory(false)} className="bg-gray-200 text-gray-600 px-2 rounded-lg text-xs">取消</button>
                          </div>
                        )}
                     </div>
                     <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">库存数量</label>
                        <input 
                           type="number"
                           className="w-full border p-2 rounded-lg"
                           value={newProduct.stock || ''}
                           onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value)})}
                        />
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">备货时间 (分钟)</label>
                        <input 
                           type="number"
                           className="w-full border p-2 rounded-lg"
                           value={newProduct.prepTime || 2}
                           onChange={e => setNewProduct({...newProduct, prepTime: parseInt(e.target.value)})}
                        />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">代销佣金 (%)</label>
                        <input 
                           type="number"
                           className="w-full border p-2 rounded-lg"
                           value={newProduct.commissionRate || ''}
                           onChange={e => setNewProduct({...newProduct, commissionRate: parseFloat(e.target.value)})}
                           placeholder="0"
                        />
                     </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button 
                      type="submit" 
                      className="flex-1 bg-primary text-white py-3 rounded-xl font-bold active:scale-95 transition-transform shadow-md"
                    >
                      确认上架
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setIsAddingProduct(false)}
                      className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold active:scale-95 transition-transform"
                    >
                      取消
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            {/* Edit Product Modal */}
            {editingProduct && (
               <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[80vh]">
                     <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                           <Edit className="text-primary"/> 编辑菜品
                        </h2>
                        <button onClick={() => setEditingProduct(null)} className="bg-gray-100 p-2 rounded-full">
                           <X size={20}/>
                        </button>
                     </div>
                     
                     <form onSubmit={handleEditProductSave} className="space-y-4">
                        {editForm.image && (
                           <div className="w-full h-32 rounded-lg overflow-hidden relative group">
                              <img src={editForm.image} className="w-full h-full object-cover"/>
                              <button 
                                type="button" 
                                onClick={() => handleGenerateImage('edit')}
                                className="absolute bottom-2 right-2 bg-white/80 text-primary px-2 py-1 rounded text-xs font-bold flex items-center gap-1 shadow-sm"
                              >
                                 <RefreshCw size={12}/> 重新生成图片
                              </button>
                           </div>
                        )}
                        
                        <div className="flex gap-2">
                           <input 
                              type="text" 
                              className="flex-1 border p-2 rounded-lg font-bold"
                              value={editForm.name || ''}
                              onChange={e => setEditForm({...editForm, name: e.target.value})}
                           />
                           <button 
                              type="button" 
                              onClick={() => handleAIGen('edit')}
                              className="bg-blue-50 text-blue-600 px-3 rounded-lg text-xs font-bold"
                           >
                              AI 文案
                           </button>
                        </div>
                        
                        <textarea 
                           className="w-full border p-2 rounded-lg text-sm h-20"
                           value={editForm.description || ''}
                           onChange={e => setEditForm({...editForm, description: e.target.value})}
                        />
                        
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                           <label className="text-xs font-bold text-gray-500 mb-1 block">价格 & 库存</label>
                           <div className="flex gap-3 items-center">
                              <div className="relative flex-1">
                                 <span className="absolute left-2 top-2 text-gray-500">¥</span>
                                 <input 
                                    type="number" 
                                    className="w-full border p-2 pl-6 rounded-lg"
                                    value={editForm.price || ''}
                                    onChange={e => setEditForm({...editForm, price: parseFloat(e.target.value)})}
                                    step="0.01"
                                 />
                                 {/* Price Trend Indicator */}
                                 {(() => {
                                    const trend = getPriceTrend(editForm.price, editingProduct.price);
                                    if(trend) {
                                       return (
                                          <div className={`absolute -top-3 right-0 text-[10px] px-1.5 rounded-full flex items-center gap-0.5 border font-bold shadow-sm ${trend.direction === 'up' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-green-50 text-green-500 border-green-100'}`}>
                                             {trend.direction === 'up' ? <ArrowUp size={10}/> : <ArrowDown size={10}/>}
                                             {trend.amount}
                                          </div>
                                       );
                                    }
                                    return null;
                                 })()}
                              </div>
                              <input 
                                 type="text" 
                                 className="w-20 border p-2 rounded-lg text-center"
                                 value={editForm.unit || ''}
                                 onChange={e => setEditForm({...editForm, unit: e.target.value})}
                              />
                           </div>
                           <div className="mt-2 flex gap-3">
                              <div className="flex-1">
                                 <label className="text-[10px] text-gray-400">库存</label>
                                 <input 
                                    type="number"
                                    className="w-full border p-2 rounded-lg text-sm"
                                    value={editForm.stock || ''}
                                    onChange={e => setEditForm({...editForm, stock: parseInt(e.target.value)})}
                                 />
                              </div>
                              <div className="flex-1">
                                 <label className="text-[10px] text-gray-400">分类</label>
                                 <select 
                                    className="w-full border p-2 rounded-lg text-sm bg-white"
                                    value={editForm.category || ''}
                                    onChange={e => {
                                      if(e.target.value === 'add_new') {
                                        setIsAddingCategory(true);
                                      } else {
                                        setEditForm({...editForm, category: e.target.value});
                                      }
                                    }}
                                 >
                                    {stationCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                    <option value="add_new">+ 新建</option>
                                 </select>
                              </div>
                           </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                           <button type="submit" className="flex-1 bg-primary text-white py-3 rounded-xl font-bold">保存修改</button>
                           <button type="button" onClick={() => setEditingProduct(null)} className="bg-gray-100 text-gray-600 px-4 rounded-xl font-bold">取消</button>
                        </div>
                     </form>
                  </div>
               </div>
            )}
          </div>
        )}

        {activeTab === 'partners' && (
          <div>
             <div className="mb-4 bg-blue-50 p-4 rounded-xl text-blue-800 text-sm flex items-start gap-3">
               <div className="bg-white p-2 rounded-lg shadow-sm">
                  <QrCode size={40} className="text-blue-500"/>
               </div>
               <div>
                 <h3 className="font-bold text-lg mb-1">添加友商</h3>
                 <p className="mb-2 text-xs opacity-80">扫描友商的收款码，即可添加对方为合作伙伴，互相代销菜品。</p>
                 <button 
                   onClick={() => partnerQrRef.current?.click()}
                   className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-md active:scale-95"
                 >
                   扫描二维码
                 </button>
                 <input 
                   type="file" 
                   ref={partnerQrRef} 
                   className="hidden" 
                   accept="image/*"
                   onChange={handlePartnerQrScan}
                 />
               </div>
             </div>

             <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                <Users className="text-primary"/> 我的友商 ({partners.length})
             </h3>
             
             <div className="space-y-3">
               {partners.length === 0 && (
                 <p className="text-center text-gray-400 py-10">暂无合作伙伴</p>
               )}
               {partners.map(p => {
                  const consignmentCount = (p as any).consignmentCount || 0;
                  return (
                    <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <img src={p.avatar} className="w-12 h-12 rounded-full border border-gray-100" alt={p.stationName}/>
                          <div>
                             <h4 className="font-bold">{p.stationName}</h4>
                             <p className="text-xs text-gray-500">站长: {p.ownerName}</p>
                             {consignmentCount > 0 && (
                                <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 rounded font-bold mt-1 inline-block">
                                   代销中 {consignmentCount} 款
                                </span>
                             )}
                          </div>
                       </div>
                       <button 
                         onClick={() => openPartnerDetails(p)}
                         className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-200"
                       >
                         查看货源
                       </button>
                    </div>
                  );
               })}
             </div>

             {/* Partner Details Modal */}
             {selectedPartner && (
               <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                 <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl h-[80vh] flex flex-col">
                    <div className="bg-gray-50 p-4 flex justify-between items-center border-b">
                       <div>
                          <h3 className="font-bold text-lg">{selectedPartner.stationName}</h3>
                          <p className="text-xs text-gray-500">货源列表 (点击上架代销)</p>
                       </div>
                       <button onClick={() => setSelectedPartner(null)} className="bg-gray-200 p-1.5 rounded-full">
                          <X size={20}/>
                       </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                       {partnerProducts.length === 0 && <p className="text-center text-gray-400 py-10">对方暂无商品</p>}
                       {partnerProducts.map(pp => {
                          const isConsigned = isConsignedByMe(pp.id);
                          return (
                             <div key={pp.id} className="bg-white border border-gray-100 p-3 rounded-xl flex gap-3 items-center">
                                <img src={pp.image} className="w-16 h-16 rounded-lg object-cover bg-gray-100" alt={pp.name}/>
                                <div className="flex-1">
                                   <h4 className="font-bold">{pp.name}</h4>
                                   <div className="flex justify-between items-end mt-1">
                                      <span className="text-red-500 font-bold">¥{pp.price}/{pp.unit}</span>
                                      {pp.commissionRate ? (
                                         <span className="text-xs text-green-600 bg-green-50 px-1 rounded">佣金 {pp.commissionRate}%</span>
                                      ) : null}
                                   </div>
                                </div>
                                <button 
                                  disabled={isConsigned}
                                  onClick={() => handleConsign(pp)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm ${isConsigned ? 'bg-gray-100 text-gray-400' : 'bg-orange-500 text-white active:scale-95'}`}
                                >
                                   {isConsigned ? '已代销' : '上架'}
                                </button>
                             </div>
                          );
                       })}
                    </div>
                 </div>
               </div>
             )}
          </div>
        )}

        {activeTab === 'stats' && stats && (
           <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-gray-500 text-xs mb-1">今日销售额</div>
                    <div className="text-2xl font-bold text-primary">¥{stats.todaySales.toFixed(2)}</div>
                 </div>
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-gray-500 text-xs mb-1">今日订单量</div>
                    <div className="text-2xl font-bold text-gray-800">{stats.totalOrders}</div>
                 </div>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                 <h3 className="font-bold mb-4 flex items-center gap-2 text-sm">
                    <BarChart3 size={16} className="text-blue-500"/> 近7日销售趋势
                 </h3>
                 <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={stats.weeklyData}>
                          <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false}/>
                          <Tooltip 
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                            itemStyle={{fontSize: '12px', fontWeight: 'bold', color: '#16a34a'}}
                          />
                          <Bar dataKey="value" fill="#16a34a" radius={[4, 4, 0, 0]}>
                            {stats.weeklyData.map((entry: any, index: number) => (
                               <Cell key={`cell-${index}`} fill={index === 6 ? '#ea580c' : '#16a34a'} />
                            ))}
                          </Bar>
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                 <h3 className="font-bold mb-4 flex items-center gap-2 text-sm">
                    <TrendingUp size={16} className="text-red-500"/> 热销排行
                 </h3>
                 <div className="space-y-3">
                    {stats.topProducts.map((p: ProductSalesRank, idx: number) => (
                       <div key={p.productId} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                             <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold 
                                ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-100 text-gray-700' : idx === 2 ? 'bg-orange-50 text-orange-700' : 'text-gray-400'}`}>
                                {idx + 1}
                             </div>
                             <span className="text-sm font-medium">{p.name}</span>
                          </div>
                          <div className="text-right">
                             <div className="text-sm font-bold">¥{p.revenue.toFixed(0)}</div>
                             <div className="text-[10px] text-gray-400">售出 {p.totalSold}</div>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'settings' && (
           <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                 <h3 className="font-bold text-lg mb-2">店铺信息设置</h3>
                 
                 <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">店铺地址</label>
                    <div className="flex gap-2">
                       <input 
                          type="text"
                          className="flex-1 border p-2 rounded-lg text-sm bg-gray-50"
                          value={shopAddress}
                          onChange={e => setShopAddress(e.target.value)}
                          placeholder="输入详细地址便于客户导航"
                       />
                       <button 
                         onClick={handleGetLocation}
                         className="bg-blue-50 text-blue-600 px-3 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1"
                       >
                         <MapPin size={14}/> 定位
                       </button>
                    </div>
                    {locationStatus && <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1"><CheckCircle size={10}/> 已获取地理位置</p>}
                 </div>
                 
                 {/* Header Image Setting */}
                 <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">店铺招牌背景</label>
                    <div 
                       onClick={() => headerInputRef.current?.click()}
                       className="border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50 hover:border-primary transition-colors h-32 relative overflow-hidden mb-2"
                    >
                       {headerImage ? (
                          <img src={headerImage} className="w-full h-full object-cover" alt="Header"/>
                       ) : (
                          <>
                             <ImageIcon size={24} className="mb-2"/>
                             <span className="text-xs">点击上传背景图</span>
                          </>
                       )}
                       <input 
                         type="file" 
                         ref={headerInputRef} 
                         accept="image/*" 
                         className="hidden" 
                         onChange={handleHeaderUpload}
                       />
                    </div>
                    <button 
                        type="button" 
                        onClick={handleGenerateHeaderImage}
                        className="w-full bg-purple-50 text-purple-600 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-purple-100 transition-colors"
                    >
                        <Wand2 size={14}/> AI 一键生成招牌
                    </button>
                 </div>

                 <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">收款码 (微信/支付宝)</label>
                    <div 
                       onClick={() => qrInputRef.current?.click()}
                       className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50 hover:border-primary transition-colors h-32 relative overflow-hidden"
                    >
                       {qrCodeImage ? (
                          <img src={qrCodeImage} className="w-full h-full object-contain" alt="QR"/>
                       ) : (
                          <>
                             <QrCode size={24} className="mb-2"/>
                             <span className="text-xs">点击上传收款码图片</span>
                          </>
                       )}
                       <input 
                         type="file" 
                         ref={qrInputRef} 
                         accept="image/*" 
                         className="hidden" 
                         onChange={handleQrUpload}
                       />
                    </div>
                 </div>

                 <button 
                    onClick={saveSettings}
                    className={`w-full py-3 rounded-xl font-bold transition-all ${saveStatus === 'saved' ? 'bg-green-500 text-white' : 'bg-primary text-white active:scale-95'}`}
                 >
                    {saveStatus === 'saved' ? '保存成功' : '保存设置'}
                 </button>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm">
                 <button 
                    onClick={handleLogout}
                    type="button"
                    className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-500 transition-colors"
                 >
                    <LogOut size={18}/> 退出登录
                 </button>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};
