const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();
require('./config/database');

const authRoutes = require('./routes/authRoutes');
const mealRoutes = require('./routes/mealRoutes');
const workoutRoutes = require('./routes/workoutRoutes');
const progressRoutes = require('./routes/progressRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const achievementRoutes = require('./routes/achievementRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const { initMealReminders } = require('./config/mealReminders');
const { initWorkoutReminders } = require('./config/workoutReminders');
const { initAutoArchive } = require('./config/autoArchive');
const { initProgressReminders } = require('./config/progressReminders');
const { initSocket, emitToAdmins } = require('./config/socket');

const app = express();

app.use(cors());
app.use(express.json());

// Live updates for the admin site: after any successful change (POST / PUT /
// PATCH / DELETE) the admins get a "data:changed" signal and reload silently.
// Bursts of requests are merged into ONE signal (500 ms window).
// Tickets have their own event, and notifications / progress syncs do not
// change anything shown on the admin pages, so they are skipped.
const LIVE_SKIP = ['/api/tickets', '/api/notifications', '/api/progress'];
let liveTimer = null;
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !LIVE_SKIP.some((p) => req.originalUrl.startsWith(p))) {
    res.on('finish', () => {
      if (res.statusCode >= 400 || liveTimer) return;
      liveTimer = setTimeout(() => {
        liveTimer = null;
        emitToAdmins('data:changed', {});
      }, 500);
    });
  }
  next();
});

// Test route
app.get('/', (req, res) => {
  res.json({ message: '🥗 NutriFit API is running!' });
});

// Auth routes
app.use('/api/auth', authRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/upload', uploadRoutes);

const PORT = process.env.PORT || 5000;

// Plain HTTP server so Socket.IO (live updates) shares the same port as the API
const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  initMealReminders();
  initWorkoutReminders();
  initAutoArchive();
  initProgressReminders();
});