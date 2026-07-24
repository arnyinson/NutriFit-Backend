const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadProfilePicture, uploadExerciseVideo } = require('../controllers/uploadController');
const verifyToken = require('../middleware/auth');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max (para sa video)
});

router.post('/avatar', verifyToken, upload.single('image'), uploadProfilePicture);
router.post('/exercise-video/:exerciseId', upload.single('video'), uploadExerciseVideo);

module.exports = router;