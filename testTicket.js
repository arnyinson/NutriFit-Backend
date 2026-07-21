const axios = require('axios');

const testTicketAPI = async () => {
  try {
    console.log('--- Logging in ---');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'juandelacruz',
      password: 'password123'
    });
    const token = loginRes.data.token;
    console.log('Logged in!');

    // Submit a ticket
    console.log('\n--- Submitting Ticket ---');
    const submitRes = await axios.post(
      'http://localhost:5000/api/tickets',
      {
        type: 'Suggestion',
        message: 'Please add a dark mode toggle in the settings.',
        rating: 5,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Ticket submitted!', submitRes.data.ticket);
    const ticketId = submitRes.data.ticket.id;

    // Get my tickets
    console.log('\n--- Getting My Tickets ---');
    const myTicketsRes = await axios.get(
      'http://localhost:5000/api/tickets/me',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('My Tickets:', myTicketsRes.data.tickets.length, 'ticket(s)');

    // Admin: Get all tickets
    console.log('\n--- Admin: Getting All Tickets ---');
    const allTicketsRes = await axios.get('http://localhost:5000/api/tickets');
    console.log('Summary:', allTicketsRes.data.summary);

    // Admin: Respond to ticket
    console.log('\n--- Admin: Responding to Ticket ---');
    await axios.patch(
      `http://localhost:5000/api/tickets/${ticketId}/respond`,
      {
        admin_response: 'Thanks for the suggestion! Dark mode is already available in the Profile settings.',
        status: 'Resolved',
      }
    );
    console.log('Ticket responded and resolved!');

    // Verify
    console.log('\n--- Verifying Ticket Detail ---');
    const detailRes = await axios.get(`http://localhost:5000/api/tickets/${ticketId}`);
    console.log('Ticket Detail:', detailRes.data.ticket);

  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
};

testTicketAPI();