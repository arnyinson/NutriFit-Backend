const axios = require('axios');

const testAuth = async () => {
  try {
    // Test Register
    console.log('--- Testing Register ---');
    const registerRes = await axios.post('http://localhost:5000/api/auth/register', {
      name: 'Juan Dela Cruz',
      email: 'juan.test@example.com',
      password: 'password123',
      username: 'juandelacruz',
      birthday: '1995-05-15',
      sex: 'Male',
      height: 170,
      weight: 70,
      dietary_goal: 'Cutting',
      activity_level: 'Moderate Active (3-4 days per week)',
      allergens: ['Fish']
    });
    console.log('✅ Register success:', registerRes.data);

    const token = registerRes.data.token;

    // Test Login
    console.log('\n--- Testing Login ---');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'juandelacruz',
      password: 'password123'
    });
    console.log('✅ Login success:', loginRes.data);

    // Test Get Current User
    console.log('\n--- Testing Get Current User ---');
    const meRes = await axios.get('http://localhost:5000/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get current user success:', meRes.data);

  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
  }
};

testAuth();