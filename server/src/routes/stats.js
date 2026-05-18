const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { stats, publicStats, recordSiteView } = require('../controllers/statsController');
const router = Router();

// 需认证的后台统计
router.get('/', requireAuth, stats);

// 公开统计
router.get('/public', publicStats);

// 记录站点访问
router.post('/site-view', recordSiteView);

module.exports = router;