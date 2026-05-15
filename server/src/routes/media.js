const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/mediaController');

const router = Router();
router.get('/', ctrl.list);
router.post('/', requireAuth, ctrl.create);
router.delete('/:id', requireAuth, ctrl.remove);

module.exports = router;