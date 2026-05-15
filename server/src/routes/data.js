const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { exportJSON, exportMarkdown, importData } = require('../controllers/dataController');

const router = Router();

router.post('/export', requireAuth, exportJSON);
router.get('/export/markdown', requireAuth, exportMarkdown);
router.post('/import', requireAuth, importData);

module.exports = router;