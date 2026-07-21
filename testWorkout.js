const axios = require('axios');

const testWorkoutRecommend = async () => {
  try {
    const response = await axios.post('http://localhost:5001/recommend-workout', {
      experience_level: 'Beginner',
      available_equipment: ['Bodyweight', 'Dumbbell'],
      mode: 'weekly'
    });

    console.log('✅ Workout ML API Response:');
    console.log('Mode:', response.data.data.mode);
    console.log('\n📅 7-Day Workout Plan:');
    response.data.data.workout_plan.forEach(day => {
      console.log(`\n${day.day} — ${day.focus}`);
      if (day.is_rest) {
        console.log('  😴 Rest Day');
      } else {
        day.exercises.forEach(ex => {
          console.log(`  💪 ${ex.name} — ${ex.sets} sets x ${ex.reps} (${ex.muscle_group}, ${ex.equipment})`);
        });
      }
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('❌ Details:', err.response?.data);
  }
};

testWorkoutRecommend();