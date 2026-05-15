const { Router } = require('express');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const ctrl = require('../controllers/commentController');

const router = Router();
router.get('/', optionalAuth, ctrl.list);          // 可选认证：登录后可见 pending
router.post('/', ctrl.create);                     // 公开提交
router.put('/:id', requireAuth, ctrl.update);      // 审核
router.delete('/:id', requireAuth, ctrl.remove);

module.exports = router;