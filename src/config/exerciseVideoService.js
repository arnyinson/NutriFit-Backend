const axios = require('axios');

const RAPIDAPI_HOST = 'exercisedb.p.rapidapi.com';

// Search for a matching exercise in ExerciseDB by name, return its GIF URL
const findExerciseGif = async (exerciseName) => {
  try {
    const response = await axios.get(
      `https://${RAPIDAPI_HOST}/exercises/name/${encodeURIComponent(exerciseName)}`,
      {
        headers: {
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        },
      }
    );

    const results = response.data;
    if (!results || results.length === 0) return null;

    // Take the first (best) match
    return results[0].gifUrl || null;
  } catch (err) {
    console.error('ExerciseDB lookup error:', err.message);
    return null;
  }
};

module.exports = { findExerciseGif };