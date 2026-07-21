const axios = require('axios');

const testMealAPI = async () => {
  try {
    // Login muna para makakuha ng token
    console.log('--- Logging in ---');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'juandelacruz',
      password: 'password123'
    });
    const token = loginRes.data.token;
    console.log('✅ Logged in!');

    // Generate meal plan
    console.log('\n--- Generating Meal Plan ---');
    const genRes = await axios.post(
      'http://localhost:5000/api/meals/plan/generate',
      { mode: 'weekly' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Meal plan generated!');
    console.log('TDEE:', genRes.data.data.tdee);
    console.log('Target Calories:', genRes.data.data.target_calories);

    // Get my meal plan
    console.log('\n--- Getting My Meal Plan ---');
    const planRes = await axios.get(
      'http://localhost:5000/api/meals/plan/me?mode=weekly',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Meal Plan:');
    planRes.data.mealPlan.forEach(day => {
      console.log(`\n${day.day} (${day.date}):`);
      day.meals.forEach(m => {
        console.log(`  ${m.meal_type}: ${m.meal.name} (${m.meal.calories} kcal) - Taken: ${m.taken}`);
      });
    });

    // Toggle first meal as taken
    if (planRes.data.mealPlan.length > 0) {
      const firstMeal = planRes.data.mealPlan[0].meals[0];
      console.log(`\n--- Marking "${firstMeal.meal.name}" as taken ---`);
      await axios.patch(
        `http://localhost:5000/api/meals/plan/${firstMeal.plan_id}/toggle`,
        { taken: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('✅ Meal marked as taken!');
    }

  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
  }
};

testMealAPI();