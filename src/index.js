const express = require('express');
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

const app = express();

app.use(cors());
app.use(express.json());

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


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});