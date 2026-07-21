const axios = require('axios');

const testForgotPassword = async () => {
  try {
    console.log('--- Testing Forgot Password ---');
    const response = await axios.post('http://localhost:5000/api/auth/forgot-password', {
      email: 'juan.test@example.com'
    });
    console.log('Success!');
    console.log('Username:', response.data.username);
    console.log('Temp Password:', response.data.tempPassword);
  } catch (err) {
    console.log('ERROR DETAILS:');
    console.log('Message:', err.message);
    console.log('Code:', err.code);
    if (err.response) {
      console.log('Status:', err.response.status);
      console.log('Data:', err.response.data);
    }
  }
};

testForgotPassword();