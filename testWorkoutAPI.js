const axios = require('axios');

const testWorkoutAPI = async () => {
  try {
    console.log('--- Logging in ---');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'juandelacruz',
      password: 'password123'
    });
    const token = loginRes.data.token;
    console.log('Logged in!');

    console.log('\n--- Generating Workout Plan ---');
    const genRes = await axios.post(
      'http://localhost:5000/api/workouts/plan/generate',
      {
        mode: 'weekly',
        experience_level: 'Beginner',
        available_equipment: ['Bodyweight', 'Dumbbell']
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Workout plan generated!');

    console.log('\n--- Getting My Workout Plan ---');
    const planRes = await axios.get(
      'http://localhost:5000/api/workouts/plan/me',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Workout Plan:');
    planRes.data.workoutPlan.forEach(day => {
      console.log(`\n${day.day}:`);
      day.exercises.forEach(ex => {
        console.log(`  ${ex.exercise.name} - ${ex.sets} sets x ${ex.reps} (${ex.exercise.muscle_group}) - Done: ${ex.done}`);
      });
    });

    if (planRes.data.workoutPlan.length > 0) {
      const firstExercise = planRes.data.workoutPlan[0].exercises[0];
      console.log(`\n--- Marking "${firstExercise.exercise.name}" as done ---`);
      await axios.patch(
        `http://localhost:5000/api/workouts/plan/${firstExercise.plan_id}/toggle`,
        { done: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Exercise marked as done!');

      console.log('\n--- Logging workout ---');
      await axios.post(
        'http://localhost:5000/api/workouts/log',
        {
          exercise_id: firstExercise.exercise.id,
          sets_completed: firstExercise.sets,
          reps_completed: firstExercise.reps,
          weight_used: 'BW'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Workout logged!');
    }

  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
};

testWorkoutAPI();