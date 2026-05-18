const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { login, changePassword, getCaptcha } = require('../controllers/authController');

const router = Router();
router.get('/captcha', getCaptcha);
router.post('/login', login);
router.put('/password', requireAuth, changePassword);

module.exports = router;