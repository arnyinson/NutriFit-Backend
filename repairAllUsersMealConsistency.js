const pool = require('./src/config/database');
require('dotenv').config();

const repairAllUsers = async () => {
  try {
    // Kunin ang lahat ng users na may progress data sa nakaraang 7 araw
    const usersResult = await pool.query(`
      SELECT DISTINCT user_id FROM progress WHERE date >= current_date() - 6
    `);

    console.log(`Found ${usersResult.rows.length} users to check.`);

    for (const { user_id } of usersResult.rows) {
      const progressRows = await pool.query(
        `SELECT id, date FROM progress WHERE user_id = $1 AND date >= current_date() - 6`,
        [user_id]
      );

      for (const row of progressRows.rows) {
        const dateStr = row.date.toISOString().split('T')[0];

        // Alamin kung anong mode(s) ang meron para sa araw na ito
        const modesResult = await pool.query(
          `SELECT DISTINCT mode FROM meal_plans WHERE user_id = $1 AND plan_date = $2`,
          [user_id, dateStr]
        );

        if (modesResult.rows.length === 0) {
          // Walang meal plan talaga sa araw na ito, itakda sa 0/0
          await pool.query(
            `UPDATE progress SET meals_taken = 0, total_meals = 0 WHERE id = $1`,
            [row.id]
          );
          continue;
        }

        // Kung DALAWANG mode ang magkasabay (weekly + continuous), piliin ang mode
        // na may PINAKAMARAMING entries (mas malamang ito ang "totoong" ginagamit)
        let bestMode = modesResult.rows[0].mode;
        if (modesResult.rows.length > 1) {
          let maxCount = 0;
          for (const { mode } of modesResult.rows) {
            const countResult = await pool.query(
              `SELECT COUNT(*) FROM meal_plans WHERE user_id = $1 AND plan_date = $2 AND mode = $3`,
              [user_id, dateStr, mode]
            );
            const count = parseInt(countResult.rows[0].count, 10);
            if (count > maxCount) {
              maxCount = count;
              bestMode = mode;
            }
          }
        }

        // I-recompute gamit lang ang napiling mode
        const mealResult = await pool.query(
          `SELECT taken FROM meal_plans WHERE user_id = $1 AND plan_date = $2 AND mode = $3`,
          [user_id, dateStr, bestMode]
        );
        const totalMeals = mealResult.rows.length;
        const mealsTaken = mealResult.rows.filter(m => m.taken).length;

        await pool.query(
          `UPDATE progress SET meals_taken = $1, total_meals = $2 WHERE id = $3`,
          [mealsTaken, totalMeals, row.id]
        );
      }
      console.log(`✅ Repaired user ${user_id}`);
    }

    console.log('🎉 All users repaired successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Repair error:', err.message);
    process.exit(1);
  }
};

repairAllUsers();