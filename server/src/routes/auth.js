const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { login, changePassword } = require('../controllers/authController');

const router = Router();
router.post('/login', login);
router.put('/password', requireAuth, changePassword);

module.exports = router;