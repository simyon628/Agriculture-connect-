
export enum UserRole {
  FARMER = 'FARMER',
  WORKER = 'WORKER',
  PROVIDER = 'PROVIDER',
  NONE = 'NONE'
}

export enum Language {
  EN = 'English',
  HI = 'Hindi',
  TE = 'Telugu',
  ES = 'Spanish'
}

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  location: string;
  lat: number;
  lng: number;
}

export interface Job {
  id: string;
  farmerId: string;
  farmerName: string;
  workType: string;
  date: string;
  wage: number;
  location: string; // Text description
  distance: number; // km from user
  rating: number;
  description?: string;
  status: 'OPEN' | 'FILLED' | 'COMPLETED' | 'CANCELLED';
  lat: number;
  lng: number;
}

export interface WorkerProfile {
  id: string;
  name: string;
  skills: string[];
  rating: number;
  distance: number; // km
  available: boolean;
  image?: string;
  lat: number;
  lng: number;
}

export interface Equipment {
  id: string;
  providerId: string;
  type: string;
  name: string;
  image: string;
  rentPerDay: number;
  available: boolean;
  location: string;
  distance: number; // km
  rating: number;
  lat: number;
  lng: number;
  // New Fields
  manufacturer?: string;
  model?: string;
  year?: string;
}

export interface RentalHistory {
  id: string;
  equipmentName: string;
  farmerName: string;
  date: string;
  amount: number;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: 'JOB' | 'WORKER' | 'SYSTEM';
  read: boolean;
  timestamp: number;
}
