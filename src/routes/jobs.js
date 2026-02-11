const express = require('express');
const router = express.Router();
const { searchJobs } = require('../services/adzunaService');

// GET /api/jobs/search?what=developer&where=bangalore
router.get('/search', async (req, res, next) => {
  try {
    const { what, where, page, results_per_page } = req.query;
    if (!what || !where) {
      return res.status(400).json({ error: 'Missing required query params: what, where' });
    }
    const jobs = await searchJobs({ what, where, page, results_per_page });
    res.json({ count: jobs.length, jobs });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
