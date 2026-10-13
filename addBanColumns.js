const pool = require('./src/config/database');
require('dotenv').config();

// Mga bagong column para sa Ban feature:
//  - banned     : true kapag permanenteng na-ban ang account
//  - ban_reason : dahilan na ipapakita sa user kapag nag-login siya
//  - banned_at  : kailan na-ban
// Naiiba ito sa "Deactivate" (is_active = false), na pansamantala lang.
const migrate = async () => {
  try {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS banned BOOL NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS ban_reason STRING,
      ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ
    `);
    console.log('✅ Added banned, ban_reason, banned_at columns to users table');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
};

migrate();