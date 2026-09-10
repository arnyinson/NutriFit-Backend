const axios = require('axios');

const RAPIDAPI_HOST = 'exercisedb.p.rapidapi.com';

const headers = () => ({
  'x-rapidapi-host': RAPIDAPI_HOST,
  'x-rapidapi-key': process.env.RAPIDAPI_KEY,
});

// Basic word-overlap similarity score between two exercise names
const similarityScore = (a, b) => {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  let overlap = 0;
  wordsA.forEach((w) => {
    if (wordsB.has(w)) overlap++;
  });
  return overlap;
};

const trySearch = async (query) => {
  try {
    const response = await axios.get(
      `https://${RAPIDAPI_HOST}/exercises/name/${encodeURIComponent(query)}`,
      { headers: headers(), params: { limit: 10 } }
    );
    return response.data || [];
  } catch (err) {
    console.error(`ExerciseDB search error for "${query}":`, err.message);
    return [];
  }
};

// Search ExerciseDB for the best-matching exercise, return its exerciseId.
// Tries several search strategies and scores results by word overlap with the
// original exercise name, to avoid picking an unrelated exercise that happens
// to share only one common (and often generic) word.
const findExerciseId = async (exerciseName) => {
  const cleanName = exerciseName.trim();
  const words = cleanName.split(/\s+/).filter((w) => w.length > 2); // ignore tiny words like "of", "on"

  // Build a list of search queries to try, from most specific to most generic:
  // 1. Full name
  // 2. Each individual significant word (longest first, more likely to be specific)
  const queries = [cleanName, ...[...words].sort((a, b) => b.length - a.length)];

  let bestMatch = null;
  let bestScore = 0;

  for (const query of queries) {
    const results = await trySearch(query);
    if (results.length === 0) continue;

    for (const result of results) {
      const score = similarityScore(cleanName, result.name);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = result;
      }
    }

    // If we already found a strong match (2+ overlapping words), stop searching further
    if (bestScore >= 2) break;
  }

  return bestMatch ? bestMatch.id : null;
};

// Downloads the actual image bytes from RapidAPI (with proper auth headers),
// so the backend can stream them back to the mobile app.
const downloadExerciseImage = async (exerciseId) => {
  const response = await axios.get(`https://${RAPIDAPI_HOST}/image`, {
    params: { exerciseId, resolution: '360' },
    headers: headers(),
    responseType: 'arraybuffer',
  });
  return {
    data: response.data,
    contentType: response.headers['content-type'] || 'image/gif',
  };
};

module.exports = { findExerciseId, downloadExerciseImage };