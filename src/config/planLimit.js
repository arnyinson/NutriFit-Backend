const pool = require('./database');

// Max plan regenerations per week (shared by meal + workout plans).
// Week = Monday to Sunday, Philippine time.
const MAX_REGEN_PER_WEEK = 7;

const manilaToday = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  return parts; // YYYY-MM-DD
};

const toYmd = (d) => d.toISOString().slice(0, 10);

// Monday of the current week (YYYY-MM-DD) and the next Monday (reset day)
const weekInfo = () => {
  const [y, m, d] = manilaToday().split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  const dow = (base.getUTCDay() + 6) % 7; // Monday = 0
  const monday = new Date(base.getTime() - dow * 86400000);
  const nextMonday = new Date(monday.getTime() + 7 * 86400000);
  return { today: toYmd(base), monday: toYmd(monday), nextMonday };
};

// A regeneration only counts when the user ALREADY has a plan. The first plan of
// a new user, or of a new week (nothing to replace), is free.
const hasAnyActivePlan = async (userId) => {
  const { today, monday } = weekInfo();
  const meals = await pool.query(
    'SELECT 1 FROM meal_plans WHERE user_id = $1 AND plan_date >= $2 LIMIT 1',
    [userId, today]
  );
  if (meals.rows.length > 0) return true;
  const workouts = await pool.query(
    'SELECT 1 FROM workout_plans WHERE user_id = $1 AND week_start = $2 AND is_custom = false LIMIT 1',
    [userId, monday]
  );
  return workouts.rows.length > 0;
};

// Takes one regeneration for this week. ONE atomic query, so two quick requests
// can never both pass the limit. Returns { ok, used, max }.
const consumeRegen = async (userId) => {
  const { monday } = weekInfo();
  const res = await pool.query(
    `UPDATE users SET
       regen_week_start = $1::date,
       regen_count = CASE WHEN regen_week_start = $1::date THEN COALESCE(regen_count, 0) + 1 ELSE 1 END
     WHERE id = $2
       AND (regen_week_start IS DISTINCT FROM $1::date OR COALESCE(regen_count, 0) < $3)
     RETURNING regen_count`,
    [monday, userId, MAX_REGEN_PER_WEEK]
  );
  if (res.rows.length === 0) return { ok: false, used: MAX_REGEN_PER_WEEK, max: MAX_REGEN_PER_WEEK };
  return { ok: true, used: Number(res.rows[0].regen_count), max: MAX_REGEN_PER_WEEK };
};

// Gives the regeneration back when it failed (the user should not lose a try)
const refundRegen = async (userId) => {
  try {
    const { monday } = weekInfo();
    await pool.query(
      `UPDATE users SET regen_count = GREATEST(COALESCE(regen_count, 0) - 1, 0)
       WHERE id = $1 AND regen_week_start = $2::date`,
      [userId, monday]
    );
  } catch (err) {
    console.error('Refund regen error:', err.message);
  }
};

const resetLabel = () => {
  const { nextMonday } = weekInfo();
  return nextMonday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

const limitMessage = () =>
  `You reached the limit of ${MAX_REGEN_PER_WEEK} plan updates this week. Your plan stays the same until Monday (${resetLabel()}).`;

module.exports = { MAX_REGEN_PER_WEEK, hasAnyActivePlan, consumeRegen, refundRegen, limitMessage };