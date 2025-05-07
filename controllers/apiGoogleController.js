// controllers/apiGoogleController.js
const axios = require('axios');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'TU_API_KEY';
const PLACE_ID = process.env.PLACE_ID || 'TU_PLACE_ID';

exports.getReviews = async (req, res) => {
  try {
    // Agregamos language=es para solicitar las reseñas en español
    const googleUrl = `https://maps.googleapis.com/maps/api/place/details/json?placeid=${PLACE_ID}&fields=reviews&language=es&key=${GOOGLE_API_KEY}`;
    console.log(googleUrl)
    const response = await axios.get(googleUrl);

    if (response.data.status !== 'OK') {
      return res.status(500).json({
        error: response.data.error_message || 'Error al obtener las reseñas desde Google Places'
      });
    }

    // Extraemos la información relevante de cada reseña
    const reviews = response.data.result.reviews.map(review => ({
      author_name: review.author_name,
      rating: review.rating,
      text: review.text,
      time: review.time,
      relative_time_description: review.relative_time_description
    }));

    res.json({ reviews });
  } catch (error) {
    console.error('Error en getReviews:', error);
    res.status(500).json({ error: error.message });
  }
};
