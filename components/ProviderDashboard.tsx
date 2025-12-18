
import React, { useState, useEffect } from 'react';
import { Tractor, Plus, TrendingUp, Settings, MapPin, CheckCircle, XCircle, X, Loader2, Sparkles } from 'lucide-react';
import { suggestEquipmentMaintenance, generateEquipmentImage } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { Equipment, Language, User } from '../types';
import { TRANSLATIONS } from '../constants';

interface DashboardProps {
    language: Language;
    currentUser: User;
}

const ProviderDashboard: React.FC<DashboardProps> = ({ language, currentUser }) => {
  const t = TRANSLATIONS[language];
  const [tips, setTips] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [myFleet, setMyFleet] = useState<Equipment[]>([]);
  
  // Expanded Form State
  const [equipForm, setEquipForm] = useState({ 
      name: '', type: 'Tractor', rent: '', manufacturer: '', model: '', year: '' 
  });

  useEffect(() => {
    let isMounted = true;
    const fetchFleet = async () => {
        try {
            const allEquip = await storageService.getEquipment(currentUser.lat, currentUser.lng, 1000);
            if (isMounted) setMyFleet(allEquip.filter(e => e.providerId === currentUser.id));
        } catch (e) {
            console.error("Fetch fleet error", e);
        }
    };

    fetchFleet();

    const intervalId = setInterval(fetchFleet, 5000);

    return () => {
        isMounted = false;
        clearInterval(intervalId);
    };
  }, [currentUser]);

  const activeRentals = myFleet.filter(item => !item.available).length;

  const handleGetMaintenanceTips = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTips("...");
    const result = await suggestEquipmentMaintenance(name);
    setTips(result);
  };

  const handleAddEquipment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!equipForm.name || !equipForm.rent) return;

      setIsGenerating(true);
      
      try {
          // Generate a real AI image based on input
          const aiImage = await generateEquipmentImage(equipForm.type, `${equipForm.manufacturer} ${equipForm.model} ${equipForm.name}`);

          const newItem: Equipment = {
              id: '', // Backend ID
              providerId: currentUser.id,
              name: equipForm.name,
              type: equipForm.type,
              rentPerDay: parseInt(equipForm.rent),
              available: true,
              image: aiImage, 
              location: currentUser.location,
              lat: currentUser.lat,
              lng: currentUser.lng,
              distance: 0,
              rating: 0,
              manufacturer: equipForm.manufacturer,
              model: equipForm.model,
              year: equipForm.year
          };

          await storageService.addEquipment(newItem);
          
          // Immediate refresh
          const allEquip = await storageService.getEquipment(currentUser.lat, currentUser.lng, 1000);
          setMyFleet(allEquip.filter(e => e.providerId === currentUser.id));
          
          setIsAdding(false);
          setEquipForm({ name: '', type: 'Tractor', rent: '', manufacturer: '', model: '', year: '' });
      } catch (error) {
          console.error("Failed to add equipment", error);
          alert("Error adding equipment. Please try again.");
      } finally {
          setIsGenerating(false);
      }
  };

  return (
    <div className="pb-24">
      {/* Provider Header Stats */}
      <div className="bg-blue-600 px-4 pt-6 pb-8 rounded-b-[2rem] shadow-xl shadow-blue-200/50 mb-6">
        <div className="flex justify-between items-center text-white mb-6">
             <h2 className="text-xl font-bold flex items-center">
                <Tractor className="mr-2 h-6 w-6" /> {t.myFleet}
             </h2>
             <button 
                onClick={() => setIsAdding(true)}
                className="bg-white/20 p-2 rounded-full hover:bg-white/30 backdrop-blur-md transition-colors"
             >
                <Plus className="h-5 w-5 text-white" />
             </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
                <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">{t.totalItems}</p>
                <h3 className="text-2xl font-extrabold text-white flex items-baseline">
                    {myFleet.length}
                    <TrendingUp className="h-4 w-4 ml-2 text-green-300" />
                </h3>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
                <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">{t.activeRentals}</p>
                <h3 className="text-2xl font-extrabold text-white">{activeRentals} <span className="text-sm font-normal text-blue-200">/ {myFleet.length}</span></h3>
            </div>
        </div>
      </div>

      {/* Equipment List */}
      <div className="px-4">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 text-lg">{t.manageEquip}</h3>
        </div>

        <div className="space-y-4">
            {myFleet.length === 0 ? (
                <div className="text-center py-10 bg-white/60 rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500 font-medium">{t.noResults}</p>
                </div>
            ) : (
                myFleet.map(item => (
                    <div key={item.id} className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-white/50 relative overflow-hidden transition-all hover:shadow-md">
                        <div className="flex space-x-4">
                            <img 
                                src={item.image} 
                                alt={item.name} 
                                className="w-24 h-24 rounded-xl object-cover bg-gray-100 shadow-inner border border-gray-100"
                            />
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-gray-900 truncate">{item.name}</h4>
                                <p className="text-xs text-gray-500 mb-1">{item.manufacturer} {item.model}</p>
                                <div className="flex items-center text-xs text-gray-400 mb-3">
                                    <MapPin className="h-3 w-3 mr-1" /> {item.location}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-blue-600">₹{item.rentPerDay}<span className="text-gray-400 font-normal text-xs">{t.perDay}</span></span>
                                    <span className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${item.available ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                        {item.available ? <CheckCircle className="h-3 w-3 mr-1"/> : <XCircle className="h-3 w-3 mr-1"/>}
                                        {item.available ? t.available : t.rented}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                            <button 
                                onClick={(e) => handleGetMaintenanceTips(item.type, e)}
                                className="text-xs font-bold text-gray-500 flex items-center hover:text-blue-600 transition-colors"
                            >
                                <Settings className="h-3.5 w-3.5 mr-1" /> {t.aiMaintenance}
                            </button>
                            <button className="text-xs font-bold text-blue-600 hover:underline">
                                {t.editDetails}
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>

      {/* Add Equipment Modal */}
      {isAdding && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
             <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                 <div className="flex justify-between items-center mb-6">
                     <h3 className="text-xl font-bold text-gray-800">{t.addNewEquip}</h3>
                     <button onClick={() => setIsAdding(false)} className="p-2 bg-gray-100 rounded-full"><X className="h-5 w-5 text-gray-500"/></button>
                 </div>
                 <form onSubmit={handleAddEquipment} className="space-y-4">
                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.equipName}</label>
                         <input required type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-600" placeholder="e.g. Big Red" 
                             value={equipForm.name} onChange={e => setEquipForm({...equipForm, name: e.target.value})}
                         />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.type}</label>
                             <select className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-600"
                                value={equipForm.type} onChange={e => setEquipForm({...equipForm, type: e.target.value})}
                             >
                                 <option>Tractor</option>
                                 <option>Harvester</option>
                                 <option>Seeder</option>
                                 <option>Sprayer</option>
                                 <option>Drone</option>
                             </select>
                         </div>
                         <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.perDay} (₹)</label>
                             <input required type="number" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-600" 
                                 value={equipForm.rent} onChange={e => setEquipForm({...equipForm, rent: e.target.value})}
                             />
                         </div>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.manufacturer}</label>
                             <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-600" placeholder="e.g. Mahindra"
                                 value={equipForm.manufacturer} onChange={e => setEquipForm({...equipForm, manufacturer: e.target.value})}
                             />
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.model}</label>
                             <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-600" placeholder="e.g. 575 DI"
                                 value={equipForm.model} onChange={e => setEquipForm({...equipForm, model: e.target.value})}
                             />
                        </div>
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.year}</label>
                         <input type="number" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-600" placeholder="e.g. 2020"
                             value={equipForm.year} onChange={e => setEquipForm({...equipForm, year: e.target.value})}
                         />
                     </div>

                     <button 
                        type="submit" 
                        disabled={isGenerating}
                        className={`w-full text-white py-4 rounded-xl font-bold shadow-lg mt-4 flex items-center justify-center transition-all ${isGenerating ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 shadow-blue-200 hover:bg-blue-700 active:scale-95'}`}
                     >
                         {isGenerating ? (
                             <>
                                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                {t.generatingImage}
                             </>
                         ) : (
                             <>
                                <Sparkles className="h-5 w-5 mr-2" />
                                {t.addAndGenerate}
                             </>
                         )}
                     </button>
                 </form>
             </div>
          </div>
      )}

      {/* AI Tips Modal */}
      {tips && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[70] p-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl transform transition-all scale-100 border border-white/20">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <Settings className="mr-2 h-5 w-5 text-blue-600" /> {t.maintenanceTips}
                </h4>
                
                <div className="bg-blue-50 p-4 rounded-2xl text-sm text-gray-700 leading-relaxed mb-6 border border-blue-100">
                    {tips === "..." ? (
                        <div className="flex items-center justify-center py-4 space-x-2">
                             <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                             <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-100"></div>
                             <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-200"></div>
                        </div>
                    ) : (
                       tips
                    )}
                </div>
                
                <button 
                    onClick={() => setTips(null)}
                    className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform"
                >
                    {t.gotIt}
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default ProviderDashboard;
