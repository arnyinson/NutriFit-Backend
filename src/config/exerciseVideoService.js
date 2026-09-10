const axios = require('axios');

const RAPIDAPI_HOST = 'exercisedb.p.rapidapi.com';

// Search for a matching exercise in ExerciseDB by name, return its image/GIF URL.
// Falls back to searching by the exercise's last significant word if the full
// name doesn't match anything (e.g. "Back Squat" -> try "squat").
const findExerciseGif = async (exerciseName) => {
  try {
    const exerciseId = await searchForExerciseId(exerciseName);
    if (!exerciseId) return null;

    const imageUrl = `https://${RAPIDAPI_HOST}/image?exerciseId=${exerciseId}&resolution=360`;
    return imageUrl;
  } catch (err) {
    console.error('ExerciseDB lookup error:', err.message);
    return null;
  }
};

const searchForExerciseId = async (exerciseName) => {
  const headers = {
    'x-rapidapi-host': RAPIDAPI_HOST,
    'x-rapidapi-key': process.env.RAPIDAPI_KEY,
  };

  // Try the full name first
  let results = await trySearch(exerciseName, headers);
  if (results && results.length > 0) return results[0].id;

  // Fall back to just the last word (e.g. "Back Squat" -> "squat", "Bench Press" -> "press")
  const words = exerciseName.trim().split(/\s+/);
  const lastWord = words[words.length - 1];
  if (lastWord && lastWord.toLowerCase() !== exerciseName.toLowerCase()) {
    results = await trySearch(lastWord, headers);
    if (results && results.length > 0) return results[0].id;
  }

  return null;
};

const trySearch = async (query, headers) => {
  try {
    const response = await axios.get(
      `https://${RAPIDAPI_HOST}/exercises/name/${encodeURIComponent(query)}`,
      { headers, params: { limit: 1 } }
    );
    return response.data;
  } catch (err) {
    console.error(`ExerciseDB search error for "${query}":`, err.message);
    return null;
  }
};

module.exports = { findExerciseGif };