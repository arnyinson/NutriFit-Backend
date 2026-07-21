const express = require('express');
const router = express.Router();
const {
  submitTicket,
  getMyTickets,
  getAllTickets,
  getTicketById,
  respondToTicket,
  updateTicketStatus,
} = require('../controllers/ticketController');
const verifyToken = require('../middleware/auth');

// User routes (require auth)
router.post('/', verifyToken, submitTicket);
router.get('/me', verifyToken, getMyTickets);

// Admin routes (walang auth muna dahil admin web ay may sariling login, hindi pa naka-connect sa JWT system natin)
router.get('/', getAllTickets);
router.get('/:id', getTicketById);
router.patch('/:id/respond', respondToTicket);
router.patch('/:id/status', updateTicketStatus);

module.exports = router;