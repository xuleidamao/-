import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Package, Plus, TrendingUp, Truck, Share2, Store, Clock, Eye, Camera, Settings, QrCode, MapPin, CheckCircle, LogOut, Users, RefreshCw, X, User, Map, Navigation } from '../components/ui/Icons';
import { store } from '../services/store';
import { generateProductDescription, identifyProductFromImage } from '../services/geminiService';
import { Station, Product, Order, OrderStatus, ProductSalesRank } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const ManagerDashboard: React.FC = () => {
  const { stationId } = useParams<{ stationId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'partners' | 'stats' | 'settings'>('orders');
  const [station, setStation] = useState<Station | undefined>(undefined);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<any>(null);

  // New Product State
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ category: '蔬菜', commissionRate: 0 });
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [yesterdayPrice, setYesterdayPrice] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Partner State
  const [partners, setPartners] = useState<Station[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<Station | null>(null);
  const [partnerProducts, setPartnerProducts] = useState<Product[]>([]);
  const partnerQrRef = useRef<HTMLInputElement>(null);

  // Settings State
  const [shopAddress, setShopAddress] = useState('');
  const [qrCodeImage, setQrCodeImage] = useState('');
  const [locationStatus, setLocationStatus] = useState<{lat: number, lng: number} | null>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    if (stationId) {
      const s = store.getStation(stationId);
      setStation(s);
      if (s) {
        setShopAddress(s.address || '');
        setQrCodeImage(s.paymentQrCode || '');
        if (s.location) {
          setLocationStatus(s.location);
        }
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
      stock: 100,
      video: newProduct.video,
      commissionRate: newProduct.commissionRate || 0,
      isConsigned: false
    };

    store.addProduct(product);
    setIsAddingProduct(false);
    setNewProduct({ category: '蔬菜', commissionRate: 0 });
    setYesterdayPrice(null);
    refreshData();
  };

  const handleAIGen = async () => {
    if (!newProduct.name) return;
    setIsGeneratingAI(true);
    const desc = await generateProductDescription(newProduct.name);
    setNewProduct(prev => ({ ...prev, description: desc }));
    setIsGeneratingAI(false);
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

  const handleQrCodeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setQrCodeImage(compressed);
      } catch (err) {
        console.error("QR upload error", err);
      }
    }
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

  const handleLogout = () => {
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

  if (!station) return <div>Loading...</div>;

  return (
    <div className="pb-20 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="flex justify-between items-center p-4">
          <div className="flex items-center gap-3">
             <img src={station.avatar} className="w-10 h-10 rounded-full" alt="avatar" />
             <div>
               <h1 className="font-bold text-lg">{station.stationName}</h1>
               <p className="text-xs text-gray-500">站长: {station.ownerName}</p>
             </div>
          </div>
          <div className="flex gap-2">
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
        
        {/* Tabs */}
        <div className="flex border-b overflow-x-auto">
          <button 
            onClick={() => setActiveTab('orders')} 
            className={`flex-1 min-w-[60px] py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'orders' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}
          >
            订单
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
          <button 
            onClick={() => setActiveTab('stats')} 
            className={`flex-1 min-w-[60px] py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'stats' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}
          >
            统计
          </button>
          <button 
            onClick={() => setActiveTab('settings')} 
            className={`flex-1 min-w-[60px] py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'settings' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}
          >
            设置
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {orders.length === 0 && <div className="text-center text-gray-400 py-10">暂无订单</div>}
            {orders.map(order => (
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
                  <p className="flex items-center gap-1"><User size={14}/> 电话: {order.customerPhone}</p>
                </div>

                <div className="space-y-1 mb-3">
                  {order.items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.name} x {item.quantity}</span>
                      <span className="text-gray-500">¥{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
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
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'products' && (
          <div>
            {!isAddingProduct ? (
              <>
                <button 
                  onClick={() => setIsAddingProduct(true)}
                  className="w-full bg-primary text-white py-3 rounded-xl mb-4 flex items-center justify-center gap-2 shadow-md"
                >
                  <Plus size={20} /> 发布今日新菜
                </button>
                <div className="grid grid-cols-2 gap-4">
                  {products.map(p => {
                    // Find original station avatar if consigned
                    let originalAvatar = '';
                    if (p.isConsigned && p.originalStationId) {
                      const origStation = store.getStation(p.originalStationId);
                      originalAvatar = origStation?.avatar || '';
                    }

                    return (
                      <div key={p.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 relative">
                        {p.isConsigned && (
                          <div className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full z-10 shadow-sm flex items-center gap-1">
                             <RefreshCw size={10} /> 代销
                          </div>
                        )}
                        <div className="h-32 bg-gray-200 relative">
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                          {originalAvatar && (
                             <img src={originalAvatar} className="w-8 h-8 rounded-full border-2 border-white absolute bottom-2 left-2" alt="Original Station"/>
                          )}
                        </div>
                        <div className="p-3">
                          <h3 className="font-bold">{p.name}</h3>
                          <div className="flex justify-between items-baseline">
                             <p className="text-red-500 font-bold">¥{p.price}/{p.unit}</p>
                             {p.commissionRate ? (
                               <span className="text-[10px] text-green-600 bg-green-50 px-1 rounded">返佣{p.commissionRate}%</span>
                             ) : null}
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-1">{p.description}</p>
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
                  {/* Image Preview */}
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
                      onClick={handleAIGen}
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
                  
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">渠道返佣比例 (%)</label>
                    <input 
                       type="number"
                       placeholder="如: 5"
                       className="w-full border p-2 rounded-lg"
                       value={newProduct.commissionRate || ''}
                       onChange={e => setNewProduct({...newProduct, commissionRate: parseFloat(e.target.value)})}
                       min="0"
                       max="100"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">设置后，友商代销此菜品可获得相应佣金。</p>
                  </div>

                  {!newProduct.image?.startsWith('data:') && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-400 text-sm" onClick={triggerCamera}>
                      <p>点击上方 "AI 拍照" 或此处上传图片</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button 
                      type="button" 
                      onClick={() => { setIsAddingProduct(false); setYesterdayPrice(null); }} 
                      className="flex-1 bg-gray-100 py-3 rounded-lg text-gray-600"
                    >
                      取消
                    </button>
                    <button type="submit" className="flex-1 bg-primary text-white py-3 rounded-lg shadow-md">立即上架</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {activeTab === 'partners' && (
          <div className="space-y-4">
             <div 
               onClick={() => partnerQrRef.current?.click()}
               className="bg-white border-2 border-dashed border-primary/50 text-primary rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer active:bg-blue-50 transition-colors"
             >
                <QrCode size={24} className="mb-2"/>
                <span className="font-bold">扫码添加友商</span>
                <span className="text-xs opacity-70">拍照友商收银码进行识别</span>
                <input 
                  type="file" 
                  ref={partnerQrRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handlePartnerQrScan}
                />
             </div>

             {partners.length === 0 && (
                <div className="text-center text-gray-400 py-6">
                   暂无友商，快去添加伙伴吧！
                </div>
             )}

             <div className="space-y-3">
               {partners.map((partner: any) => {
                  // Simulate logic for "New Products" - simple random or check actual count
                  // Here we just check if consignmentCount < 5 for demo purpose to show bubble
                  const hasNew = true; 

                  return (
                    <div 
                      key={partner.id} 
                      onClick={() => openPartnerDetails(partner)}
                      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 relative cursor-pointer active:scale-[0.98] transition-transform"
                    >
                       <img src={partner.avatar} className="w-12 h-12 rounded-full border border-gray-100" alt="avatar"/>
                       <div className="flex-1">
                          <h3 className="font-bold text-gray-800">{partner.stationName}</h3>
                          <p className="text-xs text-gray-500">站长: {partner.ownerName}</p>
                          <div className="mt-1 flex gap-2">
                             <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                                已代销 {partner.consignmentCount} 款
                             </span>
                          </div>
                       </div>
                       
                       {hasNew && (
                         <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow animate-pulse">
                            上新
                         </div>
                       )}
                       <div className="text-gray-300">
                          <Eye size={20}/>
                       </div>
                    </div>
                  );
               })}
             </div>
          </div>
        )}

        {/* Partner Details Modal */}
        {selectedPartner && (
           <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
                 <div className="p-4 border-b flex justify-between items-center">
                    <div className="flex items-center gap-2">
                       <img src={selectedPartner.avatar} className="w-8 h-8 rounded-full" alt="avatar"/>
                       <h2 className="font-bold">{selectedPartner.stationName} 的菜品</h2>
                    </div>
                    <button onClick={() => setSelectedPartner(null)} className="bg-gray-100 p-1.5 rounded-full">
                       <X size={20} className="text-gray-500"/>
                    </button>
                 </div>
                 
                 <div className="p-4 overflow-y-auto space-y-4 flex-1 bg-gray-50">
                    {partnerProducts.length === 0 && <div className="text-center text-gray-400">该友商暂无自营菜品</div>}
                    {partnerProducts.map(prod => {
                       const isConsigned = isConsignedByMe(prod.id);
                       return (
                         <div key={prod.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex gap-3">
                            <img src={prod.image} className="w-20 h-20 rounded-lg object-cover bg-gray-100" alt={prod.name}/>
                            <div className="flex-1 flex flex-col justify-between">
                               <div>
                                  <h3 className="font-bold">{prod.name}</h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-red-500 font-bold">¥{prod.price}</span>
                                    {prod.commissionRate ? (
                                       <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded">
                                          返佣 {prod.commissionRate}%
                                       </span>
                                    ) : (
                                       <span className="text-[10px] bg-gray-100 text-gray-500 px-1 rounded">无返佣</span>
                                    )}
                                  </div>
                               </div>
                               {isConsigned ? (
                                  <button disabled className="bg-gray-100 text-gray-400 py-1.5 rounded-lg text-xs font-bold w-full cursor-not-allowed">
                                     已代销
                                  </button>
                               ) : (
                                  <button 
                                    onClick={() => handleConsign(prod)}
                                    className="bg-primary text-white py-1.5 rounded-lg text-xs font-bold w-full shadow-md active:scale-95"
                                  >
                                     一键代销
                                  </button>
                               )}
                            </div>
                         </div>
                       );
                    })}
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'stats' && stats && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-orange-400 to-red-500 rounded-xl p-6 text-white shadow-lg">
              <p className="text-orange-100 text-sm mb-1">今日销售额</p>
              <h2 className="text-4xl font-bold">¥{stats.todaySales.toFixed(2)}</h2>
              <div className="mt-4 flex gap-4 text-sm opacity-90">
                <span>总订单: {stats.totalOrders}</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 h-64">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-700">
                <TrendingUp size={18}/> 本周趋势
              </h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.weeklyData}>
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none'}} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {stats.weeklyData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={index === 6 ? '#16a34a' : '#d1d5db'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Product Ranking */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
               <h3 className="font-bold p-4 bg-gray-50 border-b flex items-center gap-2">
                  <Package size={18} className="text-primary"/> 热销菜品排行
               </h3>
               {stats.topProducts && stats.topProducts.length > 0 ? (
                 <div className="divide-y">
                   {stats.topProducts.map((item: ProductSalesRank, idx: number) => (
                     <div key={item.productId} className="flex items-center p-3">
                       <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mr-3 
                         ${idx === 0 ? 'bg-yellow-400 text-white' : idx === 1 ? 'bg-gray-300 text-white' : idx === 2 ? 'bg-orange-300 text-white' : 'text-gray-500'}`}>
                         {idx + 1}
                       </span>
                       <div className="flex-1">
                         <div className="font-bold">{item.name}</div>
                         <div className="text-xs text-gray-400">已售 {item.totalSold} 份</div>
                       </div>
                       <div className="font-bold text-gray-700">¥{item.revenue.toFixed(2)}</div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="p-6 text-center text-gray-400 text-sm">暂无销售数据</div>
               )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
           <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <h2 className="font-bold text-xl mb-6 flex items-center gap-2">
                 <Store size={24} className="text-primary"/> 商铺信息管理
              </h2>
              <form onSubmit={saveSettings} className="space-y-6">
                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                       <MapPin size={16}/> 门牌地址
                    </label>
                    <input 
                       type="text"
                       required
                       placeholder="例如: 幸福小区 3号楼 101底商"
                       className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                       value={shopAddress}
                       onChange={e => setShopAddress(e.target.value)}
                    />
                    <p className="text-xs text-gray-400 mt-1">此地址将显示给您的客户。</p>
                 </div>
                 
                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                       <Navigation size={16}/> 地理定位
                    </label>
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div className="flex justify-between items-center mb-2">
                           <span className="text-sm text-gray-600">
                             {locationStatus 
                               ? `已定位: ${locationStatus.lat.toFixed(4)}, ${locationStatus.lng.toFixed(4)}` 
                               : '暂未设置定位'}
                           </span>
                           <button 
                             type="button"
                             onClick={handleGetLocation}
                             className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg active:scale-95"
                           >
                             获取当前位置
                           </button>
                        </div>
                        <p className="text-xs text-blue-400">设置位置后，附近的人将能在地图上发现您的小站。</p>
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                       <QrCode size={16}/> 微信收银码
                    </label>
                    <div className="flex items-start gap-4">
                       <div 
                         onClick={() => qrInputRef.current?.click()}
                         className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-primary hover:text-primary transition-colors bg-gray-50 overflow-hidden"
                       >
                          {qrCodeImage ? (
                             <img src={qrCodeImage} alt="QR" className="w-full h-full object-cover"/>
                          ) : (
                             <>
                               <Plus size={24}/>
                               <span className="text-xs mt-1">上传</span>
                             </>
                          )}
                       </div>
                       <input 
                          type="file" 
                          ref={qrInputRef} 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleQrCodeUpload}
                       />
                       <div className="flex-1 text-sm text-gray-500">
                          <p>请上传您的微信个人收银码图片。</p>
                          <p className="text-xs mt-1 text-gray-400">客户下单时若选择线下支付，以及友商添加您为伙伴时使用。</p>
                       </div>
                    </div>
                 </div>

                 <div className="pt-4 border-t space-y-3">
                    <button 
                       type="submit"
                       className={`w-full py-3 rounded-xl font-bold text-white shadow-md transition-all flex items-center justify-center gap-2
                         ${saveStatus === 'saved' ? 'bg-green-500' : 'bg-primary'}`}
                    >
                       {saveStatus === 'saved' ? (
                          <><CheckCircle size={20}/> 已保存</>
                       ) : (
                          '保存设置'
                       )}
                    </button>
                    
                    <button 
                       type="button"
                       onClick={handleLogout}
                       className="w-full py-3 rounded-xl font-bold text-red-500 bg-red-50 border border-red-100 shadow-sm flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                    >
                       <LogOut size={20} /> 退出登录
                    </button>
                 </div>
              </form>
           </div>
        )}
      </div>
    </div>
  );
};