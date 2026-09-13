const axios = require('axios');

const RAPIDAPI_HOST = 'exercisedb.p.rapidapi.com';

// ============================================
// PRIMARY: YouTube Data API v3
// ============================================
const findYoutubeVideos = async (exerciseName) => {
  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: `${exerciseName} exercise tutorial proper form`,
        type: 'video',
        maxResults: 5, // fetch several candidates - not all will have embedding disabled
        videoEmbeddable: 'true',
        key: process.env.YOUTUBE_API_KEY,
      },
    });

    const items = response.data.items;
    if (!items || items.length === 0) return [];

    return items.map((item) => item.id.videoId);
  } catch (err) {
    console.error('YouTube search error:', err.message);
    return [];
  }
};

// ============================================
// BACKUP: ExerciseDB (RapidAPI)
// ============================================
const headers = () => ({
  'x-rapidapi-host': RAPIDAPI_HOST,
  'x-rapidapi-key': process.env.RAPIDAPI_KEY,
});

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

const findExerciseDbId = async (exerciseName) => {
  const cleanName = exerciseName.trim();
  const words = cleanName.split(/\s+/).filter((w) => w.length > 2);
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
    if (bestScore >= 2) break;
  }

  return bestMatch ? bestMatch.id : null;
};

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

// ============================================
// MAIN LOOKUP: try YouTube first, fall back to ExerciseDB if it fails
// ============================================
const findExerciseVideoSource = async (exerciseName) => {
  // Try YouTube first (primary) - return multiple candidates so the app can
  // try each one in case some have embedding disabled by the video owner
  const youtubeVideoIds = await findYoutubeVideos(exerciseName);
  if (youtubeVideoIds.length > 0) {
    return { type: 'youtube', videoIds: youtubeVideoIds };
  }

  // Fall back to ExerciseDB
  const exerciseDbId = await findExerciseDbId(exerciseName);
  if (exerciseDbId) {
    return { type: 'exercisedb', exerciseDbId };
  }

  return null;
};

module.exports = { findExerciseVideoSource, downloadExerciseImage };