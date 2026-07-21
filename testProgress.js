const axios = require('axios');

const testProgressAPI = async () => {
  try {
    console.log('--- Logging in ---');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'juandelacruz',
      password: 'password123'
    });
    const token = loginRes.data.token;
    console.log('Logged in!');

    // Log progress for today
    console.log('\n--- Logging Progress (Today) ---');
    await axios.post(
      'http://localhost:5000/api/progress/log',
      {
        weight: 68.5,
        calories_consumed: 1650,
        calories_target: 1994,
        protein_consumed: 120,
        carbs_consumed: 180,
        fats_consumed: 55,
        workout_completed: true,
        meals_taken: 3,
        total_meals: 3,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Progress logged!');

    // Log progress for yesterday (simulate history)
    console.log('\n--- Logging Progress (Yesterday) ---');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await axios.post(
      'http://localhost:5000/api/progress/log',
      {
        date: yesterday.toISOString().split('T')[0],
        weight: 69.0,
        calories_consumed: 1800,
        calories_target: 1994,
        protein_consumed: 110,
        carbs_consumed: 200,
        fats_consumed: 60,
        workout_completed: false,
        meals_taken: 2,
        total_meals: 3,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Yesterday progress logged!');

    // Get weekly summary
    console.log('\n--- Getting Weekly Summary ---');
    const summaryRes = await axios.get(
      'http://localhost:5000/api/progress/weekly-summary',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Weekly Summary:');
    console.log(JSON.stringify(summaryRes.data.summary, null, 2));

    // Get weight history
    console.log('\n--- Getting Weight History ---');
    const weightRes = await axios.get(
      'http://localhost:5000/api/progress/weight-history?range=1M',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Weight History:', weightRes.data.weightHistory);

  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
};

testProgressAPI();