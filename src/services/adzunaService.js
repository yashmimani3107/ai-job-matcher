const axios = require('axios');
require('dotenv').config();

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;
const ADZUNA_COUNTRY = process.env.ADZUNA_COUNTRY || 'in'; // Default to India

console.log('Adzuna config:', { 
  ADZUNA_APP_ID: ADZUNA_APP_ID ? 'SET' : 'MISSING', 
  ADZUNA_APP_KEY: ADZUNA_APP_KEY ? 'SET' : 'MISSING', 
  ADZUNA_COUNTRY 
});

if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
  throw new Error('Adzuna credentials missing in environment variables');
}

/**
 * Search jobs using Adzuna API
 * @param {Object} params - { what, where, page, results_per_page }
 * @returns {Promise<Array>} - Array of job objects
 */
async function searchJobs(params) {
  const { what, where, page = 1, results_per_page = 10 } = params;
  const url = `https://api.adzuna.com/v1/api/jobs/${ADZUNA_COUNTRY}/search/${page}`;
  
  const queryParams = {
    app_id: ADZUNA_APP_ID,
    app_key: ADZUNA_APP_KEY,
    what: what || '',
    where: where || '',
    results_per_page: Math.min(results_per_page, 50) // Adzuna max is 50
  };

  console.log('Adzuna API Request:', url);
  console.log('Query params:', { ...queryParams, app_key: 'HIDDEN' });

  try {
    const response = await axios.get(url, {
      params: queryParams,
      timeout: 15000,
      headers: {
        'User-Agent': 'Job-Scraper/1.0',
        'Accept': 'application/json'
      }
    });

    if (!response.data || !response.data.results) {
      throw new Error('Invalid response format from Adzuna API');
    }

    // Format the jobs to match our expected structure
    const jobs = response.data.results.map(job => ({
      title: job.title || 'No title available',
      company: job.company?.display_name || 'Company not specified',
      location: job.location?.display_name || where || 'Location not specified',
      description: job.description ? 
        job.description.replace(/<[^>]*>/g, '').substring(0, 300) + '...' : 
        'No description available',
      salary: formatSalary(job.salary_min, job.salary_max),
      link: job.redirect_url || '#',
      source: 'adzuna',
      postedDate: job.created ? new Date(job.created).toISOString() : new Date().toISOString(),
      category: job.category?.label || 'Not specified'
    }));

    return jobs;

  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      console.error('Adzuna API Response Error:');
      console.error('Status:', status);
      console.error('Response Data:', typeof data === 'string' ? data.substring(0, 500) : JSON.stringify(data, null, 2));
      
      if (status === 401) {
        throw new Error('Invalid Adzuna API credentials. Please check your APP_ID and API_KEY.');
      } else if (status === 429) {
        throw new Error('Adzuna API rate limit exceeded. Please try again later.');
      } else if (status === 400) {
        throw new Error('Bad request to Adzuna API. Check your search parameters.');
      } else if (status >= 500) {
        throw new Error('Adzuna API server error. Please try again later.');
      } else {
        throw new Error(`Adzuna API error (${status})`);
      }
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Adzuna API is taking too long to respond.');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new Error('Network error. Unable to connect to Adzuna API.');
    } else {
      console.error('Adzuna API error:', error.message);
      throw new Error('Failed to fetch jobs from Adzuna');
    }
  }
}

const formatSalary = (salaryMin, salaryMax) => {
  if (!salaryMin && !salaryMax) {
    return 'Not specified';
  }
  
  const formatAmount = (amount) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(0)}K`;
    } else {
      return `₹${amount}`;
    }
  };
  
  if (salaryMin && salaryMax) {
    return `${formatAmount(salaryMin)} - ${formatAmount(salaryMax)}`;
  } else if (salaryMin) {
    return `${formatAmount(salaryMin)}+`;
  } else {
    return `Up to ${formatAmount(salaryMax)}`;
  }
};

module.exports = { searchJobs };
