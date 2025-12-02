import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { ShoppingBag, Plus, Minus, Clock, MapPin, CheckCircle, X, Store, ChevronLeft, Trash2, User, LogOut, CheckCircle as CheckCircleIcon, LinkIcon, RefreshCw } from '../components/ui/Icons';
import { store } from '../services/store';
import { Station, Product, CartItem, Order, OrderStatus, CustomerAddress } from '../types';

export const CustomerShop: React.FC = () => {
  const { stationId } = useParams<{ stationId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isPreview = searchParams.get('preview') === 'true';

  const [station, setStation] = useState<Station | undefined>(undefined);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [address, setAddress] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);

  // Address Management State
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  
  // New Address Form
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddrText, setNewAddrText] = useState('');
  const [newAddrName, setNewAddrName] = useState('');
  const [newAddrPhone, setNewAddrPhone] = useState('13800001234'); // Simulated Login Phone

  useEffect(() => {
    if (stationId) {
      setStation(store.getStation(stationId));
      setProducts(store.getProducts(stationId));
    }
  }, [stationId]);

  useEffect(() => {
    // Load customer addresses
    const addresses = store.getCustomerAddresses();
    setSavedAddresses(addresses);
  }, [showSettings, showCheckout]); // Reload when settings or checkout opens

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

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { ...product, quantity: 1 }];
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

  if (!station) return <div className="p-4">Loading Station...</div>;

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">下单成功!</h2>
          <p className="text-gray-500 mb-6">站长已收到您的订单，将按时为您送货。</p>
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
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 shadow-sm">
         <div className="relative h-36 bg-green-600 overflow-hidden">
            <div className="absolute inset-0 bg-black/20"></div>
            
            {/* Top Right Controls */}
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
         
         {/* Shop Info Bar */}
         {station.address && (
           <div className="bg-green-50 px-4 py-2 flex items-center gap-2 text-green-800 text-xs border-b border-green-100">
             <MapPin size={12} className="shrink-0"/>
             <span className="truncate">{station.address}</span>
           </div>
         )}
      </div>

      {/* Products */}
      <div className="p-4 grid gap-4">
         <h2 className="font-bold text-gray-700 text-lg flex items-center gap-2">
            <ShoppingBag size={20} className="text-primary"/> 今日菜品
         </h2>
         {products.length === 0 && <p className="text-gray-400 text-center py-8">站长还在补货中...</p>}
         {products.map(p => {
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
                          <span className="text-red-500 font-bold text-lg">¥{p.price}<span className="text-xs text-gray-400">/{p.unit}</span></span>
                          
                          {inCart ? (
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
                                  className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center active:scale-90 shadow-md"
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
                          )}
                      </div>
                  </div>
              </div>
            );
         })}
      </div>

      {/* Cart Summary (Sticky Bottom) */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-20">
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

      {/* Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black/60 z-30 flex flex-col justify-end backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom-10 duration-300">
             <div className="flex justify-between items-center mb-6 pb-4 border-b">
               <h2 className="font-bold text-xl flex items-center gap-2">
                 <ShoppingBag size={20}/> 购物车 
                 <span className="text-sm font-normal text-gray-500">({cartItemCount}件)</span>
               </h2>
               <div className="flex items-center gap-4">
                 <button onClick={clearCart} className="text-gray-400 hover:text-red-500 text-sm flex items-center gap-1">
                    <Trash2 size={14}/> 清空
                 </button>
                 <button onClick={() => setShowCart(false)} className="p-1 bg-gray-100 rounded-full"><X size={20} className="text-gray-500"/></button>
               </div>
             </div>
             
             <div className="space-y-6 mb-8">
               {cart.map(item => (
                 <div key={item.id} className="flex justify-between items-center">
                   <div className="flex-1">
                     <h4 className="font-bold text-gray-800">{item.name}</h4>
                     <p className="text-gray-500 text-sm">单价: ¥{item.price}/{item.unit}</p>
                   </div>
                   <div className="flex items-center gap-4">
                      <span className="font-bold min-w-[3rem] text-right">¥{(item.price * item.quantity).toFixed(2)}</span>
                      <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                         <button 
                           onClick={() => updateQuantity(item.id, -1)}
                           className="w-7 h-7 rounded-md bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 active:scale-95"
                         >
                           <Minus size={14} />
                         </button>
                         <span className="font-bold w-4 text-center text-sm">{item.quantity}</span>
                         <button 
                           onClick={() => updateQuantity(item.id, 1)}
                           className="w-7 h-7 rounded-md bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 active:scale-95"
                         >
                           <Plus size={14} />
                         </button>
                      </div>
                   </div>
                 </div>
               ))}
             </div>

             <div className="flex justify-between items-center mb-6 bg-yellow-50 p-4 rounded-xl">
               <span className="text-gray-700 font-bold">合计金额</span>
               <span className="font-bold text-2xl text-red-600">¥{cartTotal.toFixed(2)}</span>
             </div>

             <button 
               onClick={() => { setShowCart(false); setShowCheckout(true); }}
               className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg text-lg"
             >
               立即下单
             </button>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-white z-40 p-6 overflow-y-auto animate-in fade-in duration-200">
           <div className="flex items-center justify-between mb-6">
             <button onClick={() => setShowCheckout(false)} className="flex items-center gap-1 text-gray-500">
               <ChevronLeft size={20}/> 返回
             </button>
             <h2 className="text-xl font-bold">填写订单</h2>
             <div className="w-10"></div>
           </div>
           
           <form onSubmit={handleCheckout} className="space-y-6">
              <div className="space-y-4">
                 <div className="bg-white border rounded-xl p-3">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                    <MapPin size={16} className="text-primary"/> 送货地址
                  </label>
                  <input 
                    required
                    type="text" 
                    placeholder="例如：3号楼 201室" 
                    className="w-full p-2 bg-gray-50 rounded-lg mb-2 focus:ring-1 focus:ring-primary outline-none text-sm"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                  />
                  <div className="flex gap-2">
                     <input 
                       required
                       type="text" 
                       placeholder="联系人" 
                       className="w-1/3 p-2 bg-gray-50 rounded-lg text-sm"
                       value={customerName}
                       onChange={e => setCustomerName(e.target.value)}
                     />
                     <input 
                       required
                       type="text" 
                       placeholder="电话" 
                       className="flex-1 p-2 bg-gray-50 rounded-lg text-sm"
                       value={customerPhone}
                       onChange={e => setCustomerPhone(e.target.value)}
                     />
                  </div>
                  {savedAddresses.length > 0 && (
                     <div className="mt-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {savedAddresses.map(addr => (
                           <button 
                             key={addr.id}
                             type="button"
                             onClick={() => applyAddress(addr)}
                             className="text-xs bg-gray-100 px-3 py-1.5 rounded-full whitespace-nowrap hover:bg-gray-200 border border-gray-200"
                           >
                             {addr.contactName} - {addr.address}
                           </button>
                        ))}
                     </div>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                    <Clock size={16} className="text-primary"/> 期望送货时间
                  </label>
                  <input 
                    required
                    type="datetime-local" 
                    className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-primary outline-none"
                    value={deliveryTime}
                    onChange={e => setDeliveryTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                 {cart.map(item => (
                   <div key={item.id} className="flex justify-between text-sm text-gray-600">
                     <span>{item.name} x {item.quantity}</span>
                     <span>¥{(item.price * item.quantity).toFixed(2)}</span>
                   </div>
                 ))}
                 <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-lg mt-2">
                   <span>实付</span>
                   <span className="text-red-500">¥{cartTotal.toFixed(2)}</span>
                 </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-secondary text-white py-4 rounded-xl font-bold shadow-lg mt-8"
              >
                确认支付
              </button>
           </form>
        </div>
      )}

      {/* User Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <User size={24} className="text-primary"/> 个人中心
              </h2>
              <button onClick={() => setShowSettings(false)} className="p-1 rounded-full bg-gray-100">
                <X size={20} className="text-gray-500"/>
              </button>
            </div>
            
            <div className="mb-4">
               <Link 
                 to="/" 
                 className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white p-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg active:scale-95 transition-transform"
               >
                 <Store size={20} /> 我要当站长
               </Link>
            </div>

            <div className="mb-6">
              <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                <MapPin size={16}/> 地址管理
              </h3>
              
              <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                {savedAddresses.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-2">暂无常用地址</p>
                )}
                {savedAddresses.map(addr => (
                  <div key={addr.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="flex-1 mr-2 overflow-hidden">
                      <div className="text-xs text-gray-500 mb-0.5">{addr.contactName} {addr.phone}</div>
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{addr.address}</span>
                        {addr.isDefault && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">默认</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!addr.isDefault && (
                        <button 
                          onClick={() => handleSetDefaultAddress(addr.id)}
                          className="text-xs text-blue-500 underline"
                        >
                          设为默认
                        </button>
                      )}
                      <button onClick={() => handleDeleteAddress(addr.id)} className="text-gray-400 hover:text-red-500">
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {isAddingAddress ? (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
                  <input 
                    type="text" 
                    placeholder="地址 (如：幸福小区1-101)"
                    autoFocus
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                    value={newAddrText}
                    onChange={e => setNewAddrText(e.target.value)}
                  />
                  <div className="flex gap-2">
                     <input 
                        type="text" 
                        placeholder="联系人"
                        className="w-1/3 border rounded-lg px-3 py-2 text-sm outline-none"
                        value={newAddrName}
                        onChange={e => setNewAddrName(e.target.value)}
                     />
                     <input 
                        type="text" 
                        placeholder="电话"
                        className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none"
                        value={newAddrPhone}
                        onChange={e => setNewAddrPhone(e.target.value)}
                     />
                  </div>
                  <div className="flex gap-2 mt-2">
                     <button 
                        onClick={() => setIsAddingAddress(false)}
                        className="flex-1 bg-gray-200 text-gray-600 py-1.5 rounded-lg text-sm"
                     >
                        取消
                     </button>
                     <button 
                        onClick={handleAddAddress}
                        className="flex-1 bg-primary text-white py-1.5 rounded-lg text-sm"
                     >
                        保存
                     </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAddingAddress(true)}
                  className="w-full border-2 border-dashed border-gray-200 rounded-lg py-2 text-gray-400 text-sm flex items-center justify-center gap-1 hover:border-primary hover:text-primary transition-colors"
                >
                  <Plus size={16}/> 添加新地址
                </button>
              )}
            </div>

            <button 
              onClick={handleLogout}
              className="w-full bg-red-50 text-red-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
            >
              <LogOut size={18}/> 退出首页
            </button>
          </div>
        </div>
      )}
    </div>
  );
};