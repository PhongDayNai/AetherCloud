const express = require('express');
const { getStorageUsage } = require('../lib/storage');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

router.get('/usage', requireAuth, async (_req, res) => {
  try {
    const usage = await getStorageUsage();
    return res.json(usage);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

module.exports = router;
