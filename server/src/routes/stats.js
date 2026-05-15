const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { stats } = require('../controllers/statsController');
const router = Router();
router.get('/', requireAuth, stats);
module.exports = router;