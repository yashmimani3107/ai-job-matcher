const axios = require('axios');

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;
const ADZUNA_COUNTRY = process.env.ADZUNA_COUNTRY || 'in'; // Default to India

if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
  throw new Error('Adzuna credentials missing in environment variables');
}

/**
 * Search jobs using Adzuna API
 * @param {Object} params - { what, where, page, results_per_page }
 * @returns {Promise<Array>} - Array of job objects
 */
async function searchJobs(params) {
  const { what, where, page = 1, results_per_page = 20 } = params;
  const url = `https://api.adzuna.com/v1/api/jobs/${ADZUNA_COUNTRY}/search/${page}`;
  try {
    const response = await axios.get(url, {
      params: {
        app_id: ADZUNA_APP_ID,
        app_key: ADZUNA_APP_KEY,
        what,
        where,
        results_per_page,
        contentType: 'application/json',
      },
    });
    return response.data.results;
  } catch (error) {
    // Log error and rethrow for route to handle
    console.error('Adzuna API error:', error.response?.data || error.message);
    throw new Error('Failed to fetch jobs from Adzuna');
  }
}

module.exports = { searchJobs };
