import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, ShoppingBag, QrCode, Upload, CheckCircle, ChevronLeft, User, LogIn, Map, Navigation, MapPin, MessageCircle } from '../components/ui/Icons';
import { store } from '../services/store';
import { Station } from '../types';

// Background Slideshow Component
const BackgroundSlideshow = () => {
  const images = [
    'https://file.moyublog.com/d/file/2019-03-02/2012025652680563.jpg',
    'https://img.zcool.cn/community/01d4df572863926ac7251343734e56.jpg@1280w_1l_2o_100sh.jpg',
    'https://img.zcool.cn/community/0178875955be32a8012193a3889047.jpg@1280w_1l_2o_100sh.jpg'
  ];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
       {images.map((src, i) => (
         <div 
           key={i}
           className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${i === index ? 'opacity-100' : 'opacity-0'}`}
           style={{ backgroundImage: `url(${src})` }}
         />
       ))}
       {/* Enhanced gradient overlay for better text readability */}
       <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70 backdrop-blur-[2px]"></div>
    </div>
  );
};

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'menu' | 'login' | 'register' | 'nearby'>('menu');

  // Register State
  const [stationName, setStationName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [qrCodeImage, setQrCodeImage] = useState('');
  const qrInputRef = useRef<HTMLInputElement>(null);

  // Login State
  const [loginPhone, setLoginPhone] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [isLoginCodeSent, setIsLoginCodeSent] = useState(false);
  
  // WeChat Login State
  const [isWeChatBinding, setIsWeChatBinding] = useState(false);
  const [mockWeChatOpenId, setMockWeChatOpenId] = useState('');

  // Nearby State
  const [nearbyStations, setNearbyStations] = useState<(Station & { distance: number, productCount: number })[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Load nearby stations when entering nearby mode
  useEffect(() => {
    if (viewMode === 'nearby') {
      // Simulate getting location
      const mockLoc = store.getMockCenter();
      setUserLocation(mockLoc);
      setNearbyStations(store.getNearbyStations(mockLoc.lat, mockLoc.lng));
    }
  }, [viewMode]);

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
          resolve(canvas.toDataURL('image/jpeg', 0.5));
        };
      };
    });
  };

  const handleSendCode = () => {
    if (!phone || phone.length !== 11) {
      alert("请输入有效的11位手机号");
      return;
    }
    setIsCodeSent(true);
    alert("验证码已发送 (演示码: 1234)");
  };

  const handleSendLoginCode = () => {
    if (!loginPhone || loginPhone.length !== 11) {
       alert("请输入有效的11位手机号");
       return;
    }
    setIsLoginCodeSent(true);
    alert("验证码已发送 (演示码: 1234)");
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

  const handleCreateStation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationName || !ownerName || !phone || !verificationCode || !qrCodeImage) {
      alert("请填写所有完整信息并上传收款码");
      return;
    }
    if (verificationCode !== '1234') {
      alert("验证码错误 (演示码: 1234)");
      return;
    }

    const newStation = store.createStation(stationName, ownerName, phone, qrCodeImage);
    navigate(`/manager/${newStation.id}`);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPhone) return;
    
    // Check code
    if (loginCode !== '1234') {
       alert("验证码错误 (演示码: 1234)");
       return;
    }

    const station = store.findStationByPhone(loginPhone);
    if (station) {
      navigate(`/manager/${station.id}`);
    } else {
      alert("未找到该手机号对应的小站，请先开通。");
    }
  };

  const handleWeChatLogin = () => {
     // 1. Simulate getting WeChat Auth (OpenID)
     const mockOpenId = "wx_openid_" + Math.random().toString(36).substring(7);
     // For demo consistency, let's use a fixed one for a "demo user" if needed, 
     // but random is better to show the binding flow.
     // Let's assume if it's the very first time, we won't find it.
     
     const station = store.findStationByWeChat(mockOpenId);
     
     if (station) {
        alert(`欢迎回来，${station.ownerName}！`);
        navigate(`/manager/${station.id}`);
     } else {
        // 2. Not found, prompt binding
        setMockWeChatOpenId(mockOpenId);
        setIsWeChatBinding(true);
     }
  };

  const handleBindAndLogin = (e: React.FormEvent) => {
     e.preventDefault();
     if (!loginPhone) return;
     if (loginCode !== '1234') {
        alert("验证码错误 (演示码: 1234)");
        return;
     }
     
     const result = store.bindWeChatToStation(loginPhone, mockWeChatOpenId);
     if (result.success && result.stationId) {
        alert("绑定成功！");
        navigate(`/manager/${result.stationId}`);
     } else {
        alert(result.message);
     }
  };

  const handleEnterShop = () => {
    const s = store.createStation("演示生鲜站", "演示站长", "13800000000", "");
    navigate(`/shop/${s.id}`);
  };

  // Mock Map Component
  const MockMap = () => {
    if (!userLocation || nearbyStations.length === 0) return null;

    // Determine scale for map
    // Find max delta from center to plot points roughly
    const scale = 5000; // Arbitrary scale factor for pixel projection
    
    return (
      <div className="w-full h-64 bg-slate-100 rounded-xl mb-4 relative overflow-hidden border border-gray-200 shadow-inner">
         {/* Map Grid/Background */}
         <div className="absolute inset-0 opacity-10" style={{
           backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
           backgroundSize: '20px 20px'
         }}></div>

         {/* User Marker (Center) */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20">
            <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md animate-pulse"></div>
            <span className="text-[10px] bg-white/80 px-1 rounded mt-1 font-bold">我</span>
         </div>

         {/* Station Markers */}
         {nearbyStations.slice(0, 10).map((s) => {
            if (!s.location) return null;
            const dy = (s.location.lat - userLocation.lat) * scale;
            const dx = (s.location.lng - userLocation.lng) * scale;
            
            // Limit within container view for demo safety (simple clamping or hiding)
            // Here we assume stations are close enough for the mock view
            const top = `calc(50% - ${dy}px)`;
            const left = `calc(50% + ${dx}px)`;

            return (
              <div 
                key={s.id}
                onClick={() => navigate(`/shop/${s.id}`)}
                className="absolute flex flex-col items-center cursor-pointer transition-transform hover:scale-110 group z-10"
                style={{ top, left }}
              >
                 <MapPin className="text-red-500 w-6 h-6 drop-shadow-md" fill="currentColor"/>
                 <div className="bg-white/90 text-[10px] px-1.5 py-0.5 rounded shadow-sm border border-gray-100 whitespace-nowrap group-hover:bg-primary group-hover:text-white transition-colors">
                    {s.productCount}款菜
                 </div>
              </div>
            );
         })}
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-6 text-white overflow-hidden bg-gray-900 w-full">
      <BackgroundSlideshow />
      
      <div className="relative z-10 w-full max-w-md flex flex-col items-center h-full max-h-screen">
        {/* Title Section */}
        <div className={`text-center transition-all duration-500 shrink-0 ${viewMode === 'menu' ? 'mb-12 mt-10' : 'mb-4 mt-6 scale-90'}`}>
          <div className="inline-flex items-center justify-center bg-white/20 p-4 rounded-full backdrop-blur-sm mb-4 shadow-xl border border-white/10">
             <span className="text-5xl">🥗</span>
          </div>
          <h1 className="text-5xl font-bold mb-2 drop-shadow-md tracking-tight">菜场小站</h1>
          <p className="opacity-90 text-lg font-light tracking-widest border-t border-white/30 pt-2 inline-block px-4">
            社区生鲜 · 邻里共享
          </p>
        </div>

        {/* Menu View */}
        {viewMode === 'menu' && (
          <div className="w-full space-y-4 animate-in slide-in-from-bottom-8 duration-500 pb-10 overflow-y-auto no-scrollbar px-1">
             <button 
               onClick={() => setViewMode('login')}
               className="w-full bg-white text-green-800 p-5 rounded-2xl shadow-xl hover:scale-105 transition-transform flex items-center justify-between group"
             >
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-3 rounded-xl">
                    <LogIn className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-lg">我是站长</h3>
                    <p className="text-xs text-gray-500">已有小站，点击登录管理</p>
                  </div>
                </div>
                <div className="text-gray-300 group-hover:text-green-600 transition-colors">
                   <ChevronLeft className="rotate-180 w-6 h-6" />
                </div>
             </button>

             <button 
               onClick={() => setViewMode('register')}
               className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-5 rounded-2xl shadow-xl hover:scale-105 transition-transform flex items-center justify-between group"
             >
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-xl">
                    <Store className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-lg">我要当站长</h3>
                    <p className="text-xs text-white/80">实名认证，0成本开店</p>
                  </div>
                </div>
                <div className="text-white/50 group-hover:text-white transition-colors">
                   <ChevronLeft className="rotate-180 w-6 h-6" />
                </div>
             </button>

             <button 
               onClick={() => setViewMode('nearby')}
               className="w-full bg-blue-600/90 backdrop-blur-md border border-white/10 text-white p-5 rounded-2xl hover:bg-blue-600 transition-all flex items-center justify-between group"
             >
                <div className="flex items-center gap-4">
                  <div className="bg-white/10 p-3 rounded-xl">
                    <Map className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-lg">附近的小站</h3>
                    <p className="text-xs text-blue-200">查看地图，发现身边美食</p>
                  </div>
                </div>
                <div className="text-white/50 group-hover:text-white transition-colors">
                   <ChevronLeft className="rotate-180 w-6 h-6" />
                </div>
             </button>

             <button 
               onClick={handleEnterShop}
               className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-white p-5 rounded-2xl hover:bg-white/20 transition-all flex items-center justify-between group"
             >
                <div className="flex items-center gap-4">
                  <div className="bg-white/10 p-3 rounded-xl">
                    <ShoppingBag className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-lg">我是顾客</h3>
                    <p className="text-xs text-gray-200">去逛逛 (功能演示)</p>
                  </div>
                </div>
                <div className="text-white/50 group-hover:text-white transition-colors">
                   <ChevronLeft className="rotate-180 w-6 h-6" />
                </div>
             </button>
          </div>
        )}

        {/* Login View */}
        {viewMode === 'login' && (
          <div className="w-full bg-white rounded-2xl p-6 shadow-xl text-gray-800 animate-in zoom-in-95 duration-300">
             <div className="flex items-center justify-between mb-6">
                <button 
                  onClick={() => {
                    setViewMode('menu'); 
                    setIsWeChatBinding(false); 
                    setLoginPhone(''); 
                    setLoginCode('');
                    setIsLoginCodeSent(false);
                  }} 
                  className="text-gray-400 hover:text-green-600"
                >
                  <ChevronLeft size={24} />
                </button>
                <h2 className="text-xl font-bold text-green-800">
                  {isWeChatBinding ? '绑定小站账号' : '站长登录'}
                </h2>
                <div className="w-6"></div>
             </div>

             <form onSubmit={isWeChatBinding ? handleBindAndLogin : handleLogin} className="space-y-6">
               {isWeChatBinding && (
                  <div className="bg-orange-50 p-3 rounded-lg text-sm text-orange-600 flex items-center gap-2 mb-2">
                     <MessageCircle size={16} /> 
                     <span>微信号未绑定，请验证手机号进行关联</span>
                  </div>
               )}

               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">手机号</label>
                  <input 
                    type="tel" 
                    required
                    maxLength={11}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50 text-lg"
                    placeholder="输入注册时的手机号"
                    value={loginPhone}
                    onChange={e => setLoginPhone(e.target.value)}
                  />
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">验证码</label>
                 <div className="flex gap-2">
                    <input 
                      type="text" 
                      required
                      maxLength={4}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50 text-lg"
                      placeholder="验证码"
                      value={loginCode}
                      onChange={e => setLoginCode(e.target.value)}
                    />
                    <button 
                      type="button"
                      onClick={handleSendLoginCode}
                      disabled={isLoginCodeSent}
                      className={`whitespace-nowrap px-4 rounded-xl text-sm font-bold border ${isLoginCodeSent ? 'bg-gray-100 text-gray-400' : 'bg-green-50 text-green-600 border-green-200'}`}
                    >
                      {isLoginCodeSent ? '已发送' : '发送验证码'}
                    </button>
                 </div>
               </div>
               
               <button 
                 type="submit"
                 className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95"
               >
                 {isWeChatBinding ? '绑定并登录' : '进入管理后台'}
               </button>

               {!isWeChatBinding && (
                 <div className="pt-4 border-t border-gray-100">
                    <button 
                       type="button"
                       onClick={handleWeChatLogin}
                       className="w-full bg-green-50 text-green-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-green-100 transition-colors"
                    >
                       <MessageCircle size={20} className="fill-current"/> 微信一键登录
                    </button>
                 </div>
               )}
             </form>
          </div>
        )}

        {/* Register View */}
        {viewMode === 'register' && (
          <div className="w-full bg-white rounded-2xl p-6 shadow-xl text-gray-800 animate-in zoom-in-95 duration-300 max-h-[70vh] overflow-y-auto">
             <div className="flex items-center justify-between mb-6">
                <button onClick={() => setViewMode('menu')} className="text-gray-400 hover:text-green-600">
                  <ChevronLeft size={24} />
                </button>
                <h2 className="text-xl font-bold text-green-800">申请开店</h2>
                <div className="w-6"></div>
             </div>
             
             <form onSubmit={handleCreateStation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">小站名称</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  placeholder="例如：幸福小区生鲜站"
                  value={stationName}
                  onChange={e => setStationName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">实名认证 (姓名)</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  placeholder="您的真实姓名"
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                  <input 
                    type="tel" 
                    required
                    maxLength={11}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="11位手机号"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <button 
                    type="button"
                    onClick={handleSendCode}
                    disabled={isCodeSent}
                    className={`w-full py-2 rounded-lg text-sm font-bold border ${isCodeSent ? 'bg-gray-100 text-gray-400' : 'bg-green-50 text-green-600 border-green-200'}`}
                  >
                    {isCodeSent ? '已发送' : '获取验证码'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">验证码</label>
                <input 
                  type="text" 
                  required
                  maxLength={4}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="输入验证码"
                  value={verificationCode}
                  onChange={e => setVerificationCode(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <QrCode size={16}/> 上传收款码 (用于结算)
                </label>
                <div 
                  onClick={() => qrInputRef.current?.click()}
                  className="w-full h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-green-500 hover:bg-gray-50 transition-colors relative overflow-hidden"
                >
                    {qrCodeImage ? (
                      <>
                        <img src={qrCodeImage} className="w-full h-full object-cover opacity-50" />
                        <div className="absolute inset-0 flex items-center justify-center text-green-700 font-bold bg-white/60">
                            <CheckCircle size={20} className="mr-1"/> 已上传
                        </div>
                      </>
                    ) : (
                      <div className="text-gray-400 flex flex-col items-center">
                        <Upload size={24} />
                        <span className="text-xs mt-1">点击上传微信/支付宝收款码</span>
                      </div>
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
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-95 mt-2"
              >
                立即开通小站
              </button>
            </form>
          </div>
        )}

        {/* Nearby View */}
        {viewMode === 'nearby' && (
           <div className="w-full h-full bg-white rounded-2xl flex flex-col shadow-xl animate-in zoom-in-95 duration-300 overflow-hidden">
              {/* Header */}
              <div className="p-4 bg-blue-600 text-white flex justify-between items-center shadow-md z-10">
                 <button onClick={() => setViewMode('menu')} className="hover:bg-blue-500 p-1 rounded-full">
                    <ChevronLeft size={24}/>
                 </button>
                 <h2 className="font-bold text-lg flex items-center gap-2">
                    <Map size={20}/> 附近的小站
                 </h2>
                 <div className="w-8"></div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                 {/* Map Section */}
                 <div className="mb-4">
                    <h3 className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                      <Navigation size={12}/> 当前位置周边
                    </h3>
                    <MockMap />
                 </div>

                 {/* List Section */}
                 <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-500 mb-2">距离最近 ({nearbyStations.length})</h3>
                    {nearbyStations.length === 0 && (
                      <div className="text-center text-gray-400 py-8">
                        附近暂无小站，快去创建一个吧！
                      </div>
                    )}
                    {nearbyStations.map(station => (
                       <div 
                         key={station.id}
                         onClick={() => navigate(`/shop/${station.id}`)}
                         className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3 active:scale-[0.98] transition-transform cursor-pointer"
                       >
                          <img src={station.avatar} className="w-12 h-12 rounded-full border border-gray-100" alt="avatar"/>
                          <div className="flex-1">
                             <div className="flex justify-between items-start">
                                <h4 className="font-bold text-gray-800">{station.stationName}</h4>
                                <span className="text-xs font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                                  {station.distance < 1 
                                    ? `${(station.distance * 1000).toFixed(0)}m` 
                                    : `${station.distance.toFixed(1)}km`
                                  }
                                </span>
                             </div>
                             <p className="text-xs text-gray-500 mb-1">站长: {station.ownerName}</p>
                             <div className="flex items-center gap-2">
                                <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                   <ShoppingBag size={10}/> {station.productCount}种菜品
                                </span>
                             </div>
                          </div>
                          <div className="text-gray-300">
                             <ChevronLeft className="rotate-180 w-5 h-5"/>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        )}
      </div>

      <div className="absolute bottom-4 text-white/50 text-xs text-center z-10 pointer-events-none">
         &copy; 2024 菜场小站 Veggie Station
      </div>
    </div>
  );
};