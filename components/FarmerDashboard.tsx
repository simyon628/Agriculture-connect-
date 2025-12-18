
import React, { useState, useEffect, useMemo } from 'react';
import { Phone, Star, MapPin, Filter, Tractor, Users, Plus, X, Briefcase, ChevronRight, Edit3, Map } from 'lucide-react';
import { TRANSLATIONS } from '../constants';
import { storageService } from '../services/storageService';
import { Language, User, Job } from '../types';

interface DashboardProps {
  language: Language;
  currentUser: User;
}

const FarmerDashboard: React.FC<DashboardProps> = ({ language, currentUser }) => {
  const t = TRANSLATIONS[language]; 
  const [activeTab, setActiveTab] = useState<'workers' | 'equipment' | 'my_jobs'>('workers');
  const [sortBy, setSortBy] = useState<'nearest' | 'rating'>('nearest');
  const [radius, setRadius] = useState<number>(50); // Increased default radius
  const [isPostingJob, setIsPostingJob] = useState(false);
  const [jobForm, setJobForm] = useState({ workType: '', wage: '', description: '' });

  // Real Data State
  const [realWorkers, setRealWorkers] = useState<any[]>([]);
  const [realEquipment, setRealEquipment] = useState<any[]>([]);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Load Data on Mount or when radius changes
  useEffect(() => {
    let isMounted = true;

    const fetchData = async (isInitial = false) => {
      if (isInitial) setLoadingData(true);
      
      try {
        // Fetch Real Workers
        const workers = await storageService.getWorkers(currentUser.lat, currentUser.lng, radius);
        if (isMounted) setRealWorkers(workers);

        // Fetch Real Equipment
        const equipment = await storageService.getEquipment(currentUser.lat, currentUser.lng, radius);
        if (isMounted) setRealEquipment(equipment);
        
        // Fetch My Jobs
        const jobs = await storageService.getMyJobs(currentUser.id);
        if (isMounted) setMyJobs(jobs);
      } catch (e) {
        console.error("Error fetching dashboard data", e);
      } finally {
        if (isInitial && isMounted) setLoadingData(false);
      }
    };

    // Initial Fetch
    fetchData(true);

    // Poll every 3 seconds for faster updates in demo
    const intervalId = setInterval(() => {
        fetchData(false);
    }, 3000);

    return () => {
        isMounted = false;
        clearInterval(intervalId);
    };
  }, [currentUser, radius]); 

  const handleCall = (name: string) => {
      alert(`Calling ${name}...`);
  }

  const handleOpenMap = (lat: number, lng: number) => {
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
  };

  const handlePostJob = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!jobForm.workType || !jobForm.wage) return;

      const newJob: Job = {
          id: '', // Backend handles ID
          farmerId: currentUser.id,
          farmerName: currentUser.name,
          workType: jobForm.workType,
          wage: parseInt(jobForm.wage),
          description: jobForm.description,
          date: new Date().toLocaleDateString(),
          location: currentUser.location,
          distance: 0,
          lat: currentUser.lat,
          lng: currentUser.lng,
          rating: 0,
          status: 'OPEN'
      };

      await storageService.postJob(newJob);
      setIsPostingJob(false);
      setJobForm({ workType: '', wage: '', description: '' });
      setActiveTab('my_jobs'); // Switch to My Jobs tab
      
      // Immediate refresh
      const jobs = await storageService.getMyJobs(currentUser.id);
      setMyJobs(jobs);
      alert("Job Posted Successfully!");
  };

  const handleJobStatusUpdate = async (jobId: string, status: string) => {
      await storageService.updateJobStatus(jobId, status);
      const jobs = await storageService.getMyJobs(currentUser.id);
      setMyJobs(jobs);
  };

  // Sort Logic (Filtering is done by API now, but we sort locally for UX)
  const displayedList = useMemo(() => {
      let list = activeTab === 'workers' ? realWorkers : realEquipment;
      return [...list].sort((a, b) => {
        if (sortBy === 'nearest') return a.distance - b.distance;
        if (sortBy === 'rating') return b.rating - a.rating;
        return 0;
      });
  }, [activeTab, realWorkers, realEquipment, sortBy]);

  return (
    <div className="pb-24">
      {/* Category Tabs */}
      <div className="bg-white/90 backdrop-blur-sm p-2 sticky top-16 z-40 shadow-sm flex space-x-1 border-b border-gray-100 overflow-x-auto no-scrollbar">
        <button 
            onClick={() => setActiveTab('workers')}
            className={`flex-1 py-3 px-2 rounded-xl font-bold text-xs flex items-center justify-center whitespace-nowrap transition-all duration-200 ${activeTab === 'workers' ? 'bg-agri-dark text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
            <Users className="h-4 w-4 mr-1.5" /> {t.workers}
        </button>
        <button 
            onClick={() => setActiveTab('equipment')}
            className={`flex-1 py-3 px-2 rounded-xl font-bold text-xs flex items-center justify-center whitespace-nowrap transition-all duration-200 ${activeTab === 'equipment' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
            <Tractor className="h-4 w-4 mr-1.5" /> {t.equipment}
        </button>
        <button 
            onClick={() => setActiveTab('my_jobs')}
            className={`flex-1 py-3 px-2 rounded-xl font-bold text-xs flex items-center justify-center whitespace-nowrap transition-all duration-200 ${activeTab === 'my_jobs' ? 'bg-agri-accent text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
            <Briefcase className="h-4 w-4 mr-1.5" /> {t.myJobs}
        </button>
      </div>

      {/* Action Bar */}
      <div className="px-4 py-3">
        <button 
            onClick={() => setIsPostingJob(true)}
            className="w-full bg-agri-green text-white py-3 rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-agri-dark transition-all flex justify-center items-center active:scale-95"
        >
            <Plus className="h-5 w-5 mr-2" /> {t.postJob}
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      {activeTab === 'my_jobs' ? (
          <div className="px-4 space-y-4">
              <h3 className="font-bold text-gray-700 mt-2">{t.manageJobs}</h3>
              {myJobs.length === 0 ? (
                  <div className="text-center py-10 bg-white/50 rounded-2xl border border-dashed border-gray-300">
                      <p className="text-gray-500">{t.noJobs}</p>
                  </div>
              ) : (
                  myJobs.map(job => (
                      <div key={job.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                          <div className="flex justify-between items-start">
                              <div>
                                  <h4 className="font-bold text-lg">{job.workType}</h4>
                                  <p className="text-sm text-gray-500">₹{job.wage}{t.perDay} • {job.date}</p>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                  job.status === 'OPEN' ? 'bg-green-100 text-green-700' :
                                  job.status === 'FILLED' ? 'bg-blue-100 text-blue-700' :
                                  job.status === 'COMPLETED' ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'
                              }`}>
                                  {job.status}
                              </span>
                          </div>
                          <div className="mt-4 flex space-x-2 overflow-x-auto">
                              {['OPEN', 'FILLED', 'COMPLETED', 'CANCELLED'].map(s => (
                                  <button 
                                      key={s} 
                                      onClick={() => handleJobStatusUpdate(job.id, s)}
                                      disabled={job.status === s}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                          job.status === s ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                      }`}
                                  >
                                      {s}
                                  </button>
                              ))}
                          </div>
                      </div>
                  ))
              )}
          </div>
      ) : (
        <>
            {/* Sort & Filter Section (Only for Discovery tabs) */}
            <div className="bg-white/80 backdrop-blur-sm px-4 py-4 mb-2 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="font-bold text-gray-800 text-lg">{t.nearbyUsers}</h2>
                    <div className="flex items-center space-x-1">
                        <span className="text-xs font-bold text-gray-400 uppercase">{t.sort}:</span>
                    </div>
                </div>
                
                {/* Radio Sort */}
                <div className="flex space-x-4 mb-4">
                    <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${sortBy === 'nearest' ? 'border-agri-green' : 'border-gray-300'}`}>
                            {sortBy === 'nearest' && <div className="w-2 h-2 bg-agri-green rounded-full"></div>}
                        </div>
                        <input type="radio" name="sort" className="hidden" checked={sortBy === 'nearest'} onChange={() => setSortBy('nearest')} />
                        <span className={`text-sm font-medium ${sortBy === 'nearest' ? 'text-gray-900' : 'text-gray-500'}`}>{t.nearest}</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${sortBy === 'rating' ? 'border-agri-green' : 'border-gray-300'}`}>
                            {sortBy === 'rating' && <div className="w-2 h-2 bg-agri-green rounded-full"></div>}
                        </div>
                        <input type="radio" name="sort" className="hidden" checked={sortBy === 'rating'} onChange={() => setSortBy('rating')} />
                        <span className={`text-sm font-medium ${sortBy === 'rating' ? 'text-gray-900' : 'text-gray-500'}`}>{t.rating}</span>
                    </label>
                </div>

                {/* Radius Filter Pills */}
                <div className="flex space-x-2 overflow-x-auto no-scrollbar pb-1">
                    {[5, 10, 25, 50, 100].map(r => (
                        <button 
                            key={r}
                            onClick={() => setRadius(r)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${radius === r ? 'bg-agri-green text-white border-agri-green shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                        >
                            &lt; {r} {t.km}
                        </button>
                    ))}
                </div>
            </div>

            {/* Scrollable List */}
            <div className="px-4 space-y-4 mt-4">
                {loadingData ? (
                    <div className="text-center py-10">...</div>
                ) : displayedList.length === 0 ? (
                    <div className="text-center py-10 bg-white/50 backdrop-blur-sm rounded-2xl mx-4 border border-white/50">
                        <div className="bg-white h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <Filter className="h-8 w-8 text-gray-300" />
                        </div>
                        <p className="text-gray-500 font-medium">{t.noResults}</p>
                    </div>
                ) : (
                    displayedList.map((item: any) => (
                        <div key={item.id} className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-white/50 flex items-start space-x-4 active:scale-[0.98] transition-transform">
                            {/* Image / Avatar */}
                            <div className="relative flex-shrink-0">
                                <img 
                                    src={item.image || "https://via.placeholder.com/100"} 
                                    alt={item.name} 
                                    className={`object-cover shadow-sm bg-gray-100 ${activeTab === 'workers' ? 'w-16 h-16 rounded-full' : 'w-24 h-24 rounded-xl'}`} 
                                />
                                <div className="absolute -bottom-1 -right-1 bg-white px-1.5 py-0.5 rounded-lg shadow border border-gray-100 flex items-center">
                                    <Star className="h-3 w-3 text-yellow-400 fill-current mr-0.5" />
                                    <span className="text-xs font-bold text-gray-800">{item.rating}</span>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-gray-900 truncate pr-2 text-lg">{item.name}</h3>
                                        <p className="text-gray-500 text-sm truncate flex items-center">
                                            {activeTab === 'workers' ? item.skills[0] : item.type}
                                            <span className="mx-1">•</span>
                                            <span className="text-agri-green font-medium">{item.distance} {t.km}</span>
                                        </p>
                                    </div>
                                </div>

                                {activeTab === 'workers' ? (
                                    <div className="mt-3 flex items-center space-x-2">
                                        <span className={`text-xs px-2 py-1 rounded font-bold ${item.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {item.available ? t.available.toUpperCase() : t.busy.toUpperCase()}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="mt-2">
                                        <span className="text-lg font-bold text-gray-900">₹{item.rentPerDay}<span className="text-xs text-gray-400 font-normal">{t.perDay}</span></span>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col justify-between h-full space-y-2">
                                <button 
                                    onClick={() => handleCall(item.name)}
                                    className="h-10 w-10 rounded-full bg-agri-green hover:bg-agri-dark text-white flex items-center justify-center shadow-lg shadow-green-200 transition-colors"
                                    title={t.call}
                                >
                                    <Phone className="h-5 w-5" />
                                </button>
                                <button 
                                    onClick={() => handleOpenMap(item.lat, item.lng)}
                                    className="h-8 w-8 rounded-full bg-gray-100 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors"
                                    title={t.viewOnMap}
                                >
                                    <Map className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </>
      )}

      {/* Post Job Modal */}
      {isPostingJob && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
             <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6">
                 <div className="flex justify-between items-center mb-6">
                     <h3 className="text-xl font-bold text-gray-800">{t.postJob}</h3>
                     <button onClick={() => setIsPostingJob(false)} className="p-2 bg-gray-100 rounded-full"><X className="h-5 w-5 text-gray-500"/></button>
                 </div>
                 <form onSubmit={handlePostJob} className="space-y-4">
                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.workType}</label>
                         <input required type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-agri-green" placeholder="e.g. Wheat Harvesting" 
                             value={jobForm.workType} onChange={e => setJobForm({...jobForm, workType: e.target.value})}
                         />
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.dailyWage} (₹)</label>
                         <input required type="number" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-agri-green" placeholder="e.g. 500" 
                             value={jobForm.wage} onChange={e => setJobForm({...jobForm, wage: e.target.value})}
                         />
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.description}</label>
                         <textarea className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-agri-green" rows={3} placeholder="Details about the work..."
                             value={jobForm.description} onChange={e => setJobForm({...jobForm, description: e.target.value})}
                         ></textarea>
                     </div>
                     <button type="submit" className="w-full bg-agri-green text-white py-3 rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-agri-dark mt-4">
                         {t.postJobBtn}
                     </button>
                 </form>
             </div>
          </div>
      )}
    </div>
  );
};

export default FarmerDashboard;
