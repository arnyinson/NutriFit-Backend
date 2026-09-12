const axios = require('axios');

const RAPIDAPI_HOST = 'exercisedb.p.rapidapi.com';

// ============================================
// PRIMARY: YouTube Data API v3
// ============================================
const findYoutubeVideo = async (exerciseName) => {
  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: `${exerciseName} exercise tutorial proper form`,
        type: 'video',
        maxResults: 1,
        videoEmbeddable: 'true',
        key: process.env.YOUTUBE_API_KEY,
      },
    });

    const items = response.data.items;
    if (!items || items.length === 0) return null;

    return items[0].id.videoId; // return just the video ID
  } catch (err) {
    console.error('YouTube search error:', err.message);
    return null; // fail silently, let the ExerciseDB fallback take over
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
  // Try YouTube first (primary)
  const youtubeVideoId = await findYoutubeVideo(exerciseName);
  if (youtubeVideoId) {
    return { type: 'youtube', videoId: youtubeVideoId };
  }

  // Fall back to ExerciseDB
  const exerciseDbId = await findExerciseDbId(exerciseName);
  if (exerciseDbId) {
    return { type: 'exercisedb', exerciseDbId };
  }

  return null;
};

module.exports = { findExerciseVideoSource, downloadExerciseImage };