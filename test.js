const axios = require('axios');

const testRecommend = async () => {
  try {
    const response = await axios.post('http://localhost:5001/recommend', {
      weight: 69,
      height: 170,
      age: 30,
      sex: 'Male',
      activity_level: 'Moderate Active (3-4 days per week)',
      dietary_goal: 'Cutting',
      allergens: ['Fish', 'Soy'],
      mode: 'weekly'
    });

    console.log('✅ ML API Response:');
    console.log('TDEE:', response.data.data.tdee);
    console.log('Target Calories:', response.data.data.target_calories);
    console.log('Macro Targets:', response.data.data.macro_targets);
    console.log('\n📅 7-Day Meal Plan:');
    response.data.data.meal_plan.forEach(day => {
      console.log(`\n${day.day}:`);
      console.log(`  🌅 Breakfast: ${day.breakfast?.name} (${day.breakfast?.calories} kcal)`);
      console.log(`  ☀️  Lunch: ${day.lunch?.name} (${day.lunch?.calories} kcal)`);
      console.log(`  🌙 Dinner: ${day.dinner?.name} (${day.dinner?.calories} kcal)`);
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
};

testRecommend();