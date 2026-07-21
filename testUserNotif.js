const axios = require('axios');

const testUserNotifAPI = async () => {
  try {
    console.log('--- Logging in ---');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'juandelacruz',
      password: 'password123'
    });
    const token = loginRes.data.token;
    console.log('Logged in!');

    // Get my profile
    console.log('\n--- Getting My Profile ---');
    const profileRes = await axios.get(
      'http://localhost:5000/api/users/me',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Profile:', profileRes.data.user.name, '- BMI:', profileRes.data.user.bmi, '- TDEE:', profileRes.data.user.tdee);

    // Update profile
    console.log('\n--- Updating Profile (weight change) ---');
    const updateRes = await axios.put(
      'http://localhost:5000/api/users/me',
      { weight: 67, dietary_goal: 'Maintenance' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Updated! New BMI:', updateRes.data.user.bmi, '- New TDEE:', updateRes.data.user.tdee, '- Goal:', updateRes.data.user.dietary_goal);

    // Admin: Get dashboard stats
    console.log('\n--- Admin: Getting Dashboard Stats ---');
    const statsRes = await axios.get('http://localhost:5000/api/users/admin/dashboard-stats');
    console.log('Stats:', statsRes.data.stats);
    console.log('Goal Distribution:', statsRes.data.goalDistribution);

    // Admin: Get all users
    console.log('\n--- Admin: Getting All Users ---');
    const usersRes = await axios.get('http://localhost:5000/api/users');
    console.log('Total users:', usersRes.data.users.length);

    // Create a test notification
    console.log('\n--- Creating Notification ---');
    const userId = profileRes.data.user.id;
    await axios.post('http://localhost:5000/api/notifications', {
      user_id: userId,
      title: 'Welcome to NutriFit!',
      message: 'Your account has been set up successfully.',
      type: 'system',
    });
    console.log('Notification created!');

    // Get my notifications
    console.log('\n--- Getting My Notifications ---');
    const notifRes = await axios.get(
      'http://localhost:5000/api/notifications',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Notifications:', notifRes.data.notifications.length, '- Unread:', notifRes.data.unreadCount);

  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
};

testUserNotifAPI();