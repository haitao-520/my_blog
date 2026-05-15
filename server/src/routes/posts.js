const { Router } = require('express');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { listPosts, getPost, createPost, updatePost, deletePost, likePost } = require('../controllers/postController');

const router = Router();

// 公开（可选认证：登录后可见草稿）
router.get('/', optionalAuth, listPosts);
router.get('/:slug', getPost);

// 需认证
router.post('/', requireAuth, createPost);
router.put('/:id', requireAuth, updatePost);
router.delete('/:id', requireAuth, deletePost);

// 点赞（公开）
router.post('/:id/like', likePost);

module.exports = router;