const axios = require('axios');

const RAPIDAPI_HOST = 'exercisedb.p.rapidapi.com';

// Search ExerciseDB for a matching exercise, return its exerciseId (not the image itself)
const findExerciseId = async (exerciseName) => {
  const headers = {
    'x-rapidapi-host': RAPIDAPI_HOST,
    'x-rapidapi-key': process.env.RAPIDAPI_KEY,
  };

  // Try the full name first
  let id = await trySearch(exerciseName, headers);
  if (id) return id;

  // Fall back to just the last word (e.g. "Back Squat" -> "squat")
  const words = exerciseName.trim().split(/\s+/);
  const lastWord = words[words.length - 1];
  if (lastWord && lastWord.toLowerCase() !== exerciseName.toLowerCase()) {
    id = await trySearch(lastWord, headers);
    if (id) return id;
  }

  return null;
};

const trySearch = async (query, headers) => {
  try {
    const response = await axios.get(
      `https://${RAPIDAPI_HOST}/exercises/name/${encodeURIComponent(query)}`,
      { headers, params: { limit: 1 } }
    );
    if (response.data && response.data.length > 0) {
      return response.data[0].id;
    }
    return null;
  } catch (err) {
    console.error(`ExerciseDB search error for "${query}":`, err.message);
    return null;
  }
};

// Downloads the actual image bytes from RapidAPI (with proper auth headers),
// so the backend can stream them back to the mobile app.
const downloadExerciseImage = async (exerciseId) => {
  const response = await axios.get(`https://${RAPIDAPI_HOST}/image`, {
    params: { exerciseId, resolution: '360' },
    headers: {
      'x-rapidapi-host': RAPIDAPI_HOST,
      'x-rapidapi-key': process.env.RAPIDAPI_KEY,
    },
    responseType: 'arraybuffer', // get raw binary data, not text/json
  });
  return {
    data: response.data,
    contentType: response.headers['content-type'] || 'image/gif',
  };
};

module.exports = { findExerciseId, downloadExerciseImage };