const pool = require('./src/config/database');
require('dotenv').config();

// Bagong column para sa totoong equipment ng user — dating hardcoded na lang
// sa mobile app ang ["Bodyweight", "Dumbbell"], ngayon totoong sagot na ng
// user ang gagamitin. Default sa "Bodyweight" lang ang mga existing user
// (pinaka-ligtas na assumption, dahil pinaka-madalas available ito).
const migrate = async () => {
  try {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS available_equipment STRING[] DEFAULT ARRAY['Bodyweight']
    `);
    console.log('✅ Added available_equipment column to users table');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
};

migrate();