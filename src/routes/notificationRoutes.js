const express = require('express');
const router = express.Router();
const {
  getMyNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require('../controllers/notificationController');
const verifyToken = require('../middleware/auth');

router.get('/', verifyToken, getMyNotifications);
router.post('/', createNotification); // internal/system use
router.patch('/:id/read', verifyToken, markAsRead);
router.patch('/read-all', verifyToken, markAllAsRead);
router.delete('/:id', verifyToken, deleteNotification);

module.exports = router;