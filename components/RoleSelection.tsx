
import React, { useState } from 'react';
import { UserRole, Language, User } from '../types';
import { TRANSLATIONS } from '../constants';
import { storageService } from '../services/storageService';
import { Sprout, HardHat, Tractor, MapPin, Loader2, ArrowRight, X, ChevronRight, Check } from 'lucide-react';

interface RoleSelectionProps {
  language: Language;
  onSelectRole: (user: User) => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ language, onSelectRole }) => {
  const t = TRANSLATIONS[language];
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  
  // 'login' or 'signup'
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [loginStep, setLoginStep] = useState<'details' | 'otp'>('details');
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<{
    name: string,
    phone: string,
    location: string,
    otp: string,
    coords: {lat: number, lng: number} | null
  }>({
    name: '',
    phone: '',
    location: '',
    otp: '',
    coords: null
  });

  const handleRoleClick = (role: UserRole) => {
    setSelectedRole(role);
    setLoginStep('details');
    setAuthMode('login'); // Default to login
    setFormData({ name: '', phone: '', location: '', otp: '', coords: null });
    setShowLogin(true);
  };

  const handleDetectLocation = () => {
    if ('geolocation' in navigator) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Store Coords
          const coords = { lat: latitude, lng: longitude };

          try {
             // Real reverse geocoding
             const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
             const data = await response.json();
             let locName = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
             
             if (data && data.address) {
                locName = data.address.village || data.address.town || data.address.city || data.address.suburb || locName;
             }
             
             setFormData(prev => ({ 
                ...prev, 
                location: locName,
                coords: coords
             }));
          } catch (e) {
             setFormData(prev => ({ 
                ...prev, 
                location: `Lat: ${latitude.toFixed(2)}, Long: ${longitude.toFixed(2)}`,
                coords: coords
             }));
          }
          setLoading(false);
        },
        (error) => {
          alert('Unable to retrieve location. Please type manually.');
          setLoading(false);
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  const geocodeManualLocation = async (loc: string) => {
      try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(loc)}`);
          const data = await response.json();
          if (data && data.length > 0) {
              return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
          }
      } catch (e) {
          console.error("Geocoding failed", e);
      }
      return null;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone) {
        alert("Please enter phone number");
        return;
    }
    if (authMode === 'signup' && (!formData.name || !formData.location)) {
       alert("Please fill all fields for signup");
       return;
    }

    setLoading(true);

    // If signing up with manual location and no coords yet, try to geocode
    if (authMode === 'signup' && formData.location && !formData.coords) {
         const coords = await geocodeManualLocation(formData.location);
         if (coords) {
             setFormData(prev => ({ ...prev, coords }));
         }
    }

    // Simulate API call
    setTimeout(() => {
        setLoading(false);
        setLoginStep('otp');
        
        // UX: Auto-fill OTP for demo purposes to avoid confusion
        setTimeout(() => {
            setFormData(prev => ({ ...prev, otp: '1234' }));
        }, 800);
    }, 1200);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.otp.length !== 4) {
        alert("Please enter a valid 4-digit OTP");
        return;
    }
    setLoading(true);
    
    // Simulate Network Delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (authMode === 'login') {
        // --- LOGIN FLOW ---
        try {
            const existingUser = await storageService.getUserByPhone(formData.phone);
            
            if (existingUser) {
                // Success - Log user in with existing data
                onSelectRole(existingUser);
            } else {
                // User not found
                alert("Account not found. Please Sign Up.");
                setAuthMode('signup');
                setLoginStep('details');
                setLoading(false);
                // Pre-fill phone if needed, already in state
            }
        } catch (error) {
            console.error("Login Check Failed", error);
            setLoading(false);
        }

    } else {
        // --- SIGNUP FLOW ---
        if (selectedRole) {
            // Default to central India if no coords found (fallback), but try to use detected first
            const finalCoords = formData.coords || { lat: 20.5937, lng: 78.9629 }; 
            
            const newUser: User = {
                id: crypto.randomUUID(),
                name: formData.name || 'Agri User',
                phone: formData.phone,
                role: selectedRole,
                location: formData.location || 'Unknown',
                lat: finalCoords.lat,
                lng: finalCoords.lng
            };

            // Save to BACKEND (or Local Storage if offline)
            try {
                const savedUser = await storageService.saveUser(newUser);
                // Ensure we pass the SAVED user which might have updated IDs or merged data
                onSelectRole(savedUser);
            } catch (err) {
                console.error("Signup failed", err);
                alert("Signup Error");
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    }
  };

  const toggleAuthMode = () => {
    setAuthMode(prev => prev === 'login' ? 'signup' : 'login');
    setLoginStep('details');
  }

  const RoleCard = ({ role, icon: Icon, title, desc, color }: { role: UserRole, icon: any, title: string, desc: string, color: string }) => (
    <button
      onClick={() => handleRoleClick(role)}
      className="w-full bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-white/50 flex items-center space-x-4 hover:bg-white active:scale-[0.98] transition-all"
    >
      <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
        <Icon className={`h-8 w-8 ${color.replace('bg-', 'text-')}`} />
      </div>
      <div className="flex-1 text-left">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500 font-medium leading-tight">{desc}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-gray-300" />
    </button>
  );

  return (
    <div className="px-4 py-8 max-w-lg mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight drop-shadow-sm">
          AgriConnect
        </h1>
        <p className="text-gray-600 font-medium">{t.selectRole}</p>
      </div>

      <div className="space-y-4">
        <RoleCard 
          role={UserRole.FARMER}
          icon={Sprout}
          title={t.farmer}
          desc={t.farmerDesc}
          color="bg-agri-green"
        />
        <RoleCard 
          role={UserRole.WORKER}
          icon={HardHat}
          title={t.worker}
          desc={t.workerDesc}
          color="bg-amber-500"
        />
        <RoleCard 
          role={UserRole.PROVIDER}
          icon={Tractor}
          title={t.provider}
          desc={t.providerDesc}
          color="bg-blue-600"
        />
      </div>

      {/* Login/Signup Modal */}
      {showLogin && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl transform transition-all animate-in slide-in-from-bottom duration-300">
                {/* Modal Header */}
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 backdrop-blur-sm">
                    <div>
                        <h3 className="font-bold text-xl text-gray-800">
                            {authMode === 'login' ? t.welcomeBack : t.createAccount}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium">
                           {authMode === 'login' ? t.loginContinue : t.registeringAs} 
                           <span className="text-agri-green font-bold uppercase">{selectedRole}</span>
                        </p>
                    </div>
                    <button onClick={() => setShowLogin(false)} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition">
                        <X className="h-4 w-4 text-gray-600" />
                    </button>
                </div>
                
                <div className="p-6 bg-white">
                    {loginStep === 'details' ? (
                        <form onSubmit={handleSendOtp} className="space-y-4">
                            {authMode === 'signup' && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.fullName}</label>
                                    <input 
                                        required
                                        type="text" 
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-agri-green outline-none font-medium"
                                        placeholder={t.fullName}
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                    />
                                </div>
                            )}
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.phoneNum}</label>
                                <div className="flex">
                                    <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-200 bg-gray-100 text-gray-500 font-bold text-sm">
                                        +91
                                    </span>
                                    <input 
                                        required
                                        type="tel" 
                                        maxLength={10}
                                        className="flex-1 w-full bg-gray-50 border border-gray-200 rounded-r-xl p-3 focus:ring-2 focus:ring-agri-green outline-none font-medium"
                                        placeholder={t.phoneNum}
                                        value={formData.phone}
                                        onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g,'')})}
                                    />
                                </div>
                            </div>

                            {authMode === 'signup' && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300 delay-100">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.location}</label>
                                    <div className="relative">
                                        <input 
                                            required
                                            type="text" 
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pr-10 focus:ring-2 focus:ring-agri-green outline-none font-medium"
                                            placeholder={t.cityVillage}
                                            value={formData.location}
                                            onChange={e => setFormData({...formData, location: e.target.value})}
                                        />
                                        <button 
                                            type="button"
                                            onClick={handleDetectLocation}
                                            className="absolute right-2 top-2 p-1.5 text-agri-green hover:bg-green-50 rounded-lg flex items-center justify-center"
                                            title={t.location}
                                        >
                                            {formData.coords ? <Check className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button 
                                type="submit"
                                disabled={loading}
                                className="w-full bg-agri-green text-white py-4 rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-agri-dark transition-all flex justify-center items-center mt-6 active:scale-95"
                            >
                                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <> {t.getOtp} <ArrowRight className="ml-2 h-4 w-4" /></>}
                            </button>
                            
                            <div className="pt-4 text-center">
                                <button 
                                    type="button"
                                    onClick={toggleAuthMode}
                                    className="text-sm font-bold text-gray-500 hover:text-agri-green transition-colors flex items-center justify-center w-full"
                                >
                                    {authMode === 'login' ? (
                                        <>{t.newUser} <span className="text-agri-green ml-1">{t.signUpHere}</span></>
                                    ) : (
                                        <>{t.alreadyAccount} <span className="text-agri-green ml-1">{t.login}</span></>
                                    )}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-6 text-center animate-in fade-in zoom-in duration-300">
                            <div>
                                <p className="text-sm text-gray-500 mb-6">
                                    Code sent to <span className="font-bold text-gray-900">+91 {formData.phone}</span>
                                </p>
                                
                                <div className="relative mb-2">
                                    <div className="flex justify-center space-x-3">
                                      {[0,1,2,3].map((_, i) => (
                                        <div key={i} className="w-14 h-16 border-2 border-gray-200 rounded-xl flex items-center justify-center text-3xl font-bold text-gray-800 bg-gray-50 focus-within:border-agri-green focus-within:ring-2 focus-within:ring-green-100 transition-all">
                                          {formData.otp[i] || ""}
                                        </div>
                                      ))}
                                    </div>
                                    <input 
                                        type="text" 
                                        maxLength={4}
                                        autoFocus
                                        className="opacity-0 absolute inset-0 h-full w-full cursor-pointer z-10"
                                        value={formData.otp}
                                        onChange={e => setFormData({...formData, otp: e.target.value.replace(/\D/g,'')})}
                                    />
                                </div>
                            </div>
                            
                            <button 
                                type="submit"
                                disabled={loading}
                                className="w-full bg-agri-green text-white py-4 rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-agri-dark transition-all flex justify-center items-center active:scale-95"
                            >
                                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : t.verifyContinue}
                            </button>
                            
                            <button 
                                type="button" 
                                onClick={() => setLoginStep('details')}
                                className="text-xs font-bold text-gray-400 hover:text-gray-600"
                            >
                                {t.changePhone}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default RoleSelection;
