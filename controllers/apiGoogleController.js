// controllers/apiGoogleController.js
const axios = require('axios');
const logger = require('../utils/logger');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'TU_API_KEY';
const PLACE_ID = process.env.PLACE_ID || 'TU_PLACE_ID';
const GOOGLE_PLACE_DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';
const GOOGLE_PLACE_FIELDS = 'name,rating,user_ratings_total,url,reviews';
const REVIEW_SORTS = ['most_relevant', 'newest'];

const hasReadableName = (name = '') => {
  const trimmedName = name.trim();

  if (!trimmedName) return false;
  if (/[\u201c\u201d"@_]/.test(trimmedName)) return false;
  if (/^[a-z0-9.-]+$/.test(trimmedName)) return false;
  if (/^[A-Z]\s/.test(trimmedName)) return false;

  return true;
};

const scoreReview = (review) => {
  let score = 0;
  const textLength = (review.text || '').trim().length;

  if (hasReadableName(review.author_name)) score += 50;
  if (textLength > 0) score += 30;
  if (textLength >= 80) score += 10;
  if (review.rating >= 5) score += 5;
  if (review.profile_photo_url) score += 3;

  return score;
};

const normalizeReview = (review) => ({
  author_name: review.author_name,
  author_url: review.author_url,
  profile_photo_url: review.profile_photo_url,
  rating: review.rating,
  text: review.text,
  time: review.time,
  relative_time_description: review.relative_time_description
});

const getReviewKey = (review) =>
  review.author_url || `${review.author_name}-${review.time}-${review.text || ''}`;

const fetchPlaceDetails = async (reviewsSort) => {
  const response = await axios.get(GOOGLE_PLACE_DETAILS_URL, {
    params: {
      placeid: PLACE_ID,
      fields: GOOGLE_PLACE_FIELDS,
      language: 'es',
      reviews_sort: reviewsSort,
      key: GOOGLE_API_KEY
    }
  });

  if (response.data.status !== 'OK') {
    throw new Error(response.data.error_message || 'Error al obtener las resenas desde Google Places');
  }

  return response.data.result;
};

const selectBestReviews = (reviews) => {
  const uniqueReviews = Array.from(
    reviews.reduce((reviewMap, review) => {
      reviewMap.set(getReviewKey(review), review);
      return reviewMap;
    }, new Map()).values()
  );

  return uniqueReviews
    .sort((a, b) => {
      const scoreDiff = scoreReview(b) - scoreReview(a);
      if (scoreDiff !== 0) return scoreDiff;
      return (b.time || 0) - (a.time || 0);
    })
    .slice(0, 5)
    .map(normalizeReview);
};

exports.getReviews = async (req, res) => {
  try {
    const placeDetails = await Promise.all(REVIEW_SORTS.map(fetchPlaceDetails));
    const firstPlaceDetails = placeDetails[0] || {};
    const reviews = selectBestReviews(placeDetails.flatMap(place => place.reviews || []));

    res.json({
      reviews,
      rating: firstPlaceDetails.rating,
      user_ratings_total: firstPlaceDetails.user_ratings_total,
      google_url: firstPlaceDetails.url
    });
  } catch (error) {
    logger.error('Error en getReviews:', error);
    res.status(500).json({ error: error.message });
  }
};
