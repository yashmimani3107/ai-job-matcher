const axios = require('axios');
require('dotenv').config();

// Adzuna API configuration
const ADZUNA_CONFIG = {
  appId: process.env.ADZUNA_APP_ID || 'YOUR_APP_ID_HERE',
  apiKey: process.env.ADZUNA_API_KEY || 'YOUR_API_KEY_HERE'
};

const scrapeJobs = async (keyword, location) => {
  try {
    console.log(`Fetching jobs from Adzuna API for "${keyword}" in "${location}"`);
    
    const jobs = await fetchAdzunaJobs(keyword, location);
    
    if (jobs && jobs.length > 0) {
      console.log(`✅ Found ${jobs.length} jobs from Adzuna API!`);
      return jobs;
    }
    
    throw new Error('No jobs found from Adzuna API');
    
  } catch (error) {
    console.error('Adzuna API error:', error.message);
    throw error;
  }
};

const fetchAdzunaJobs = async (keyword, location) => {
  try {
    // Validate API credentials
    if (ADZUNA_CONFIG.appId === 'YOUR_APP_ID_HERE' || ADZUNA_CONFIG.apiKey === 'YOUR_API_KEY_HERE') {
      throw new Error('Please set ADZUNA_APP_ID and ADZUNA_API_KEY environment variables or update the config');
    }

    // Build API URL with correct format for Adzuna API
    // Format: https://api.adzuna.com/v1/api/jobs/{country}/search/{page}
    const page = 1;
    const baseUrl = `https://api.adzuna.com/v1/api/jobs/in/search/${page}`;
    
    const params = new URLSearchParams({
      app_id: ADZUNA_CONFIG.appId,
      app_key: ADZUNA_CONFIG.apiKey,
      results_per_page: '10',
      what: keyword,
      where: location
    });

    const apiUrl = `${baseUrl}?${params.toString()}`;
    
    console.log('Making request to Adzuna API...');
    console.log('API URL:', apiUrl.replace(ADZUNA_CONFIG.apiKey, 'HIDDEN'));
    
    const response = await axios.get(apiUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Job-Scraper/1.0',
        'Accept': 'application/json'
      }
    });

    if (!response.data || !response.data.results) {
      throw new Error('Invalid response format from Adzuna API');
    }

    const jobs = response.data.results.map(job => ({
      title: job.title || 'No title available',
      company: job.company?.display_name || 'Company not specified',
      location: job.location?.display_name || location,
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
      // API returned an error response
      const status = error.response.status;
      const data = error.response.data;
      const message = data?.message || data?.error || error.response.statusText;
      
      console.error('Adzuna API Response Error:');
      console.error('Status:', status);
      console.error('Response Data:', JSON.stringify(data, null, 2));
      
      if (status === 401) {
        throw new Error('Invalid Adzuna API credentials. Please check your APP_ID and API_KEY.');
      } else if (status === 429) {
        throw new Error('Adzuna API rate limit exceeded. Please try again later.');
      } else if (status === 400) {
        throw new Error(`Adzuna API bad request: ${message}. Check your search parameters.`);
      } else if (status >= 500) {
        throw new Error('Adzuna API server error. Please try again later.');
      } else {
        throw new Error(`Adzuna API error (${status}): ${message}`);
      }
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Adzuna API is taking too long to respond.');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new Error('Network error. Unable to connect to Adzuna API.');
    } else {
      throw new Error(`Adzuna API request failed: ${error.message}`);
    }
  }
};

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

module.exports = {
  scrapeJobs
};
