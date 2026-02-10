const express = require('express');
const fs = require('fs');
const path = require('path');
const { scrapeJobs } = require('./scrapers/indeed');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Job scraper is running',
    timestamp: new Date().toISOString() 
  });
});

// Scraper route
app.get('/scrape', async (req, res) => {
  try {
    const { keyword = 'nodejs', location = 'bangalore' } = req.query;
    
    console.log(`Scraping jobs for: ${keyword} in ${location}`);
    
    // Scrape jobs
    const jobs = await scrapeJobs(keyword, location);
    
    // Save to JSON file
    const filename = `jobs_${keyword}_${location}_${Date.now()}.json`;
    const filepath = path.join(dataDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(jobs, null, 2));
    
    res.json({
      message: 'Scraping completed successfully',
      keyword,
      location,
      jobsFound: jobs.length,
      savedTo: filename,
      jobs: jobs
    });
    
  } catch (error) {
    console.error('Scraping error:', error.message);
    res.status(500).json({
      error: 'Scraping failed',
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Scrape jobs: http://localhost:${PORT}/scrape?keyword=reactjs&location=bangalore`);
});
