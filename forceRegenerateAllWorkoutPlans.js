const pool = require('./src/config/database');
require('dotenv').config();

// Kaparehong logic ng getCurrentWeekMonday sa workoutController.js —
// Philippine Time, Monday bilang unang araw ng linggo
const getCurrentWeekMonday = () => {
  const phTime = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })
  );
  const dayOfWeek = phTime.getDay();
  const monday = new Date(
    phTime.getFullYear(),
    phTime.getMonth(),
    phTime.getDate()
  );
  monday.setDate(monday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  return monday;
};

const formatLocalDate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Tinatanggal ang AI-GENERATED na workout plans lang (is_custom = false) ng
// KASALUKUYANG linggo, para sa LAHAT ng user. Awtomatiko itong mare-regenerate
// gamit ang bagong equipment-aware logic sa susunod na buksan ng bawat user
// ang Dashboard o Workout screen — walang direktang tawag sa ML API dito.
//
// Ligtas ito:
// - Hindi nagagalaw ang mga custom-logged workout entries (is_custom = true)
// - Hindi nagagalaw ang mga nakaraang linggo (history sa Calendar)
// - Hindi nagagalaw ang "done" status, dahil buong row ang tinatanggal at
//   muling gagawin — pero ito rin ang epekto: mawawala ang "done" checkmarks
//   ng kasalukuyang linggo para sa lahat, dahil bagong plan na ang gagawin.
const forceRegenerate = async () => {
  try {
    const weekStart = formatLocalDate(getCurrentWeekMonday());
    console.log(`Deleting AI-generated workout plans for week_start = ${weekStart}...`);

    const result = await pool.query(
      `DELETE FROM workout_plans
       WHERE week_start = $1 AND is_custom = false
       RETURNING id`,
      [weekStart]
    );

    console.log(`✅ Deleted ${result.rows.length} row(s) across all users.`);
    console.log('Each user will get a freshly generated plan using their real available_equipment the next time they open the Dashboard or Workout screen.');
    process.exit(0);
  } catch (err) {
    console.error('Force regenerate error:', err.message);
    process.exit(1);
  }
};

forceRegenerate();