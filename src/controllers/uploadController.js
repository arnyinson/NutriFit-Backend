const cloudinary = require('../config/cloudinary');
const pool = require('../config/database');
const streamifier = require('streamifier');

// Helper: i-upload ang buffer papunta sa Cloudinary
const uploadToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (result) resolve(result);
      else reject(error);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// ============================================
// UPLOAD PROFILE PICTURE (Mobile App)
// ============================================
const uploadProfilePicture = async (req, res) => {
  try {
    const userId = req.userId;

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }

    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'nutrifit/avatars',
      transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
    });

    await pool.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [result.secure_url, userId]);

    res.json({ success: true, message: 'Profile picture updated!', avatar_url: result.secure_url });

  } catch (err) {
    console.error('Upload profile picture error:', err.message);
    res.status(500).json({ error: 'Unable to upload image. Please try again.' });
  }
};

// ============================================
// UPLOAD EXERCISE VIDEO (Admin Web)
// ============================================
const uploadExerciseVideo = async (req, res) => {
  try {
    const { exerciseId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided.' });
    }

    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'nutrifit/exercise-videos',
      resource_type: 'video',
    });

    await pool.query('UPDATE exercises SET video_url = $1 WHERE id = $2', [result.secure_url, exerciseId]);

    res.json({ success: true, message: 'Video uploaded!', video_url: result.secure_url });

  } catch (err) {
    console.error('Upload exercise video error:', err.message);
    res.status(500).json({ error: 'Unable to upload video. Please try again.' });
  }
};

module.exports = { uploadProfilePicture, uploadExerciseVideo };