
import { User, Job, Equipment, WorkerProfile, Notification, UserRole } from '../types';
import { calculateDistance } from '../constants';

const API_URL = 'http://localhost:3001/api';
const LOCAL_USERS_KEY = 'agri_users';
const LOCAL_JOBS_KEY = 'agri_jobs';
const LOCAL_EQUIP_KEY = 'agri_equipment';

// --- Local Storage Helpers ---
const getLocalList = <T>(key: string): T[] => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : [];
    } catch { return []; }
};

const saveLocalList = <T>(key: string, list: T[]) => {
    localStorage.setItem(key, JSON.stringify(list));
};

export const storageService = {
  // USER OPERATIONS

  // 1. Fetch User by Phone (For Login)
  getUserByPhone: async (phone: string): Promise<User | null> => {
      // Try Backend First
      try {
          const response = await fetch(`${API_URL}/users/lookup?phone=${phone}`);
          if (response.ok) {
              return await response.json();
          }
      } catch (error) {
          console.log("Backend lookup failed, checking local.");
      }

      // Fallback to Local Storage
      const users = getLocalList<User>(LOCAL_USERS_KEY);
      const user = users.find(u => u.phone === phone);
      return user || null;
  },

  // 2. Save/Register User (For Signup)
  saveUser: async (user: User): Promise<User> => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      if (!response.ok) throw new Error('Backend unavailable');
      return await response.json();
    } catch (error) {
      console.log("Backend offline. Saving user locally.");
      const users = getLocalList<User>(LOCAL_USERS_KEY);
      const existingIdx = users.findIndex(u => u.phone === user.phone);
      
      if (existingIdx >= 0) {
          // Update existing
          const updated = { ...users[existingIdx], ...user };
          users[existingIdx] = updated;
          saveLocalList(LOCAL_USERS_KEY, users);
          return updated;
      } else {
          // Add new
          // Ensure availability is set for workers
          const newUser = { ...user, available: true };
          users.push(newUser);
          saveLocalList(LOCAL_USERS_KEY, users);
          return newUser;
      }
    }
  },

  updateUser: async (id: string, updates: Partial<User> | { available: boolean }): Promise<User | null> => {
      try {
          const response = await fetch(`${API_URL}/users/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates)
          });
          if (!response.ok) throw new Error('Backend unavailable');
          return await response.json();
      } catch (error) {
          console.log("Backend offline. Updating user locally.");
          const users = getLocalList<User>(LOCAL_USERS_KEY);
          const idx = users.findIndex(u => u.id === id);
          if (idx !== -1) {
              users[idx] = { ...users[idx], ...updates };
              saveLocalList(LOCAL_USERS_KEY, users);
              return users[idx];
          }
          return null;
      }
  },

  getWorkers: async (lat: number, lng: number, radius: number = 50): Promise<WorkerProfile[]> => {
    try {
      const response = await fetch(`${API_URL}/workers?lat=${lat}&lng=${lng}&radius=${radius}`);
      if (!response.ok) throw new Error('Backend unavailable');
      const workers = await response.json();
      
      // Transform backend user format to UI WorkerProfile format
      return workers.map((u: any) => ({
        id: u.id,
        name: u.name,
        skills: ['General Labor'], 
        rating: 5.0,
        distance: u.distance,
        available: u.available !== undefined ? u.available : true, 
        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`,
        lat: u.lat,
        lng: u.lng
      }));
    } catch (error) {
      console.log("Using Local Real-time Data Only");
      
      // Get Local Storage Users (Role = WORKER)
      const localUsers = getLocalList<User>(LOCAL_USERS_KEY);
      
      return localUsers
        .filter(u => u.role === UserRole.WORKER)
        .map(u => ({
            id: u.id,
            name: u.name,
            skills: ['General Labor'], // Default skill for new signups
            rating: 5.0, // Default rating
            distance: calculateDistance(lat, lng, u.lat, u.lng),
            available: (u as any).available ?? true,
            image: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`,
            lat: u.lat,
            lng: u.lng
        }))
        .filter(w => w.distance <= radius)
        .sort((a, b) => a.distance - b.distance);
    }
  },

  // JOB OPERATIONS
  postJob: async (job: Job) => {
    try {
      await fetch(`${API_URL}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job)
      });
    } catch (error) {
      console.log("Backend offline. Saving job locally.");
      const jobs = getLocalList<Job>(LOCAL_JOBS_KEY);
      const newJob = { ...job, id: `job_local_${Date.now()}` };
      jobs.push(newJob);
      saveLocalList(LOCAL_JOBS_KEY, jobs);
    }
  },

  updateJobStatus: async (id: string, status: string) => {
      try {
        await fetch(`${API_URL}/jobs/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
      } catch (error) {
         console.log("Backend offline. updating job locally.");
         const jobs = getLocalList<Job>(LOCAL_JOBS_KEY);
         const idx = jobs.findIndex(j => j.id === id);
         if (idx !== -1) {
             jobs[idx].status = status as any;
             saveLocalList(LOCAL_JOBS_KEY, jobs);
         }
      }
  },

  getJobs: async (lat: number, lng: number, radius: number = 50): Promise<Job[]> => {
    try {
      const response = await fetch(`${API_URL}/jobs?lat=${lat}&lng=${lng}&radius=${radius}`);
      if (!response.ok) throw new Error('Backend unavailable');
      return await response.json();
    } catch (error) {
      console.log("Using Local Real-time Jobs Only");

      // Local Storage Jobs
      const localJobsRaw = getLocalList<Job>(LOCAL_JOBS_KEY);
      
      return localJobsRaw.map(j => ({
          ...j,
          distance: calculateDistance(lat, lng, j.lat, j.lng)
      }))
      .filter(j => j.distance <= radius && j.status === 'OPEN')
      .sort((a, b) => a.distance - b.distance);
    }
  },

  getMyJobs: async (farmerId: string): Promise<Job[]> => {
      try {
          const response = await fetch(`${API_URL}/jobs?farmerId=${farmerId}`);
          if (!response.ok) throw new Error('Backend unavailable');
          return await response.json();
      } catch (error) {
          // Filter local jobs for this farmer
          const localJobs = getLocalList<Job>(LOCAL_JOBS_KEY);
          return localJobs.filter(j => j.farmerId === farmerId);
      }
  },

  // EQUIPMENT OPERATIONS
  addEquipment: async (item: Equipment) => {
    try {
      await fetch(`${API_URL}/equipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
    } catch (error) {
      console.log("Backend offline. Saving equipment locally.");
      const equip = getLocalList<Equipment>(LOCAL_EQUIP_KEY);
      const newItem = { ...item, id: `eq_local_${Date.now()}` };
      equip.push(newItem);
      saveLocalList(LOCAL_EQUIP_KEY, equip);
    }
  },

  getEquipment: async (lat: number, lng: number, radius: number = 50): Promise<Equipment[]> => {
    try {
      const response = await fetch(`${API_URL}/equipment?lat=${lat}&lng=${lng}&radius=${radius}`);
      if (!response.ok) throw new Error('Backend unavailable');
      return await response.json();
    } catch (error) {
      console.log("Using Local Real-time Equipment Only");

      // Local Storage
      const localEquipRaw = getLocalList<Equipment>(LOCAL_EQUIP_KEY);
      
      return localEquipRaw.map(e => ({
          ...e,
          distance: calculateDistance(lat, lng, e.lat, e.lng)
      }))
      .filter(e => e.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
    }
  },

  // NOTIFICATIONS (Simulated locally if offline)
  getNotifications: async (userId: string): Promise<Notification[]> => {
      try {
          const response = await fetch(`${API_URL}/notifications?userId=${userId}`);
          if (!response.ok) throw new Error('Backend unavailable');
          return await response.json();
      } catch (error) {
          return [];
      }
  }
};
