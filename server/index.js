
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// --- IN-MEMORY DATABASE ---
let users = [];
let jobs = [];
let equipment = [];
let notifications = [];

// --- HELPER: Haversine Formula for Distance (km) ---
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
};

// --- HELPER: Create Notifications ---
const createNotification = (targetUserId, message, type) => {
  notifications.push({
    id: `notif_${Date.now()}_${Math.random()}`,
    userId: targetUserId,
    message,
    type,
    read: false,
    timestamp: Date.now()
  });
};

// --- ROUTES ---

// 1. LOGIN / SAVE USER (Upsert)
app.post('/api/login', (req, res) => {
  const { id, name, phone, role, location, lat, lng } = req.body;

  if (!phone || !role) {
    return res.status(400).json({ error: "Phone and Role are required" });
  }

  const existingIndex = users.findIndex(u => u.phone === phone);
  
  const userObj = {
    id: id || `user_${Date.now()}`,
    name,
    phone,
    role,
    location,
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    available: true // Default availability
  };

  if (existingIndex >= 0) {
    // Preserve ID and Availability if updating
    userObj.id = users[existingIndex].id;
    if (users[existingIndex].available !== undefined) {
        userObj.available = users[existingIndex].available;
    }
    // Only update fields that are present in the request (partial update/merge)
    // This prevents overwriting with nulls if a basic login request comes in
    users[existingIndex] = { ...users[existingIndex], ...userObj };
    
    // If name was missing in request (login only), ensure we don't save undefined
    if (!name) users[existingIndex].name = users[existingIndex].name || "Unknown";
    
    res.json(users[existingIndex]);
  } else {
    // New User
    users.push(userObj);
    
    // Notify nearby Farmers if a new Worker joins
    if (role === 'WORKER') {
      const nearbyFarmers = users.filter(u => u.role === 'FARMER' && calculateDistance(userObj.lat, userObj.lng, u.lat, u.lng) <= 20);
      nearbyFarmers.forEach(farmer => {
        createNotification(farmer.id, `New worker ${name} joined near ${location}`, 'WORKER');
      });
    }

    res.json(userObj);
  }
});

// 1b. GET USER BY PHONE (Lookup for Login)
app.get('/api/users/lookup', (req, res) => {
  const { phone } = req.query;
  const user = users.find(u => u.phone === phone);
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ error: "User not found" });
  }
});

// 1a. UPDATE USER (Profile/Availability)
app.patch('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const index = users.findIndex(u => u.id === id);

    if (index === -1) return res.status(404).json({ error: "User not found" });

    users[index] = { ...users[index], ...updates };
    console.log(`User ${users[index].name} updated:`, updates);
    res.json(users[index]);
});

// 2. GET WORKERS (Nearby)
app.get('/api/workers', (req, res) => {
  const { lat, lng, radius = 10 } = req.query;
  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);

  const nearbyWorkers = users
    .filter(u => u.role === 'WORKER')
    .map(u => {
      const dist = calculateDistance(userLat, userLng, u.lat, u.lng);
      return { ...u, distance: parseFloat(dist.toFixed(1)) };
    })
    .filter(u => u.distance <= parseFloat(radius))
    .sort((a, b) => a.distance - b.distance);

  res.json(nearbyWorkers);
});

// 3. POST JOB
app.post('/api/jobs', (req, res) => {
  const job = {
    ...req.body,
    id: `job_${Date.now()}`,
    status: 'OPEN'
  };
  jobs.push(job);
  
  // Notify nearby Workers
  const nearbyWorkers = users.filter(u => u.role === 'WORKER' && calculateDistance(job.lat, job.lng, u.lat, u.lng) <= 20);
  nearbyWorkers.forEach(worker => {
      createNotification(worker.id, `New Job: ${job.workType} at ${job.farmerName}`, 'JOB');
  });

  console.log(`Job posted: ${job.workType}`);
  res.json(job);
});

// 3a. UPDATE JOB STATUS
app.patch('/api/jobs/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const job = jobs.find(j => j.id === id);
    if (job) {
        job.status = status;
        res.json(job);
    } else {
        res.status(404).json({error: "Job not found"});
    }
});

// 4. GET JOBS 
// - If 'farmerId' is provided, return jobs for that farmer.
// - Else return nearby OPEN jobs.
app.get('/api/jobs', (req, res) => {
  const { lat, lng, radius = 10, farmerId } = req.query;

  if (farmerId) {
      // Get My Jobs
      const myJobs = jobs.filter(j => j.farmerId === farmerId);
      return res.json(myJobs);
  }

  // Get Nearby Jobs
  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);

  const nearbyJobs = jobs
    .filter(j => j.status === 'OPEN') // Only show open jobs to workers
    .map(j => {
      const dist = calculateDistance(userLat, userLng, j.lat, j.lng);
      return { ...j, distance: parseFloat(dist.toFixed(1)) };
    })
    .filter(j => j.distance <= parseFloat(radius))
    .sort((a, b) => a.distance - b.distance);

  res.json(nearbyJobs);
});

// 5. ADD EQUIPMENT
app.post('/api/equipment', (req, res) => {
  const item = {
    ...req.body,
    id: `equip_${Date.now()}`
  };
  equipment.push(item);
  res.json(item);
});

// 6. GET EQUIPMENT
app.get('/api/equipment', (req, res) => {
  const { lat, lng, radius = 10 } = req.query;
  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);

  const nearbyEquipment = equipment
    .map(e => {
      const dist = calculateDistance(userLat, userLng, e.lat, e.lng);
      return { ...e, distance: parseFloat(dist.toFixed(1)) };
    })
    .filter(e => e.distance <= parseFloat(radius))
    .sort((a, b) => a.distance - b.distance);

  res.json(nearbyEquipment);
});

// 7. GET NOTIFICATIONS
app.get('/api/notifications', (req, res) => {
    const { userId } = req.query;
    const userNotifs = notifications.filter(n => n.userId === userId).sort((a,b) => b.timestamp - a.timestamp);
    res.json(userNotifs);
});

// Start Server
app.listen(PORT, () => {
  console.log(`AgriConnect Backend running on http://localhost:${PORT}`);
});
