const express = require('express');
const router = express.Router();
const {
  getMyProfile,
  updateMyProfile,
  changePassword,
  getAllUsers,
  toggleUserStatus,
  unarchiveUser,
  getDashboardStats,
  savePushToken,
} = require('../controllers/userController');
const verifyToken = require('../middleware/auth');

// User routes (require auth)
router.get('/me', verifyToken, getMyProfile);
router.put('/me', verifyToken, updateMyProfile);
router.post('/change-password', verifyToken, changePassword);
router.post('/push-token', verifyToken, savePushToken);
// Admin routes
router.get('/', getAllUsers);
router.patch('/:id/status', toggleUserStatus);
router.patch('/:id/unarchive', unarchiveUser);
router.get('/admin/dashboard-stats', getDashboardStats);

module.exports = router;