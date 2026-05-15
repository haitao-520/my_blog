const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/comments?postId=&status=&page=&limit=
async function list(req, res) {
  try {
    const { postId, status, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const where = {};
    if (postId) where.postId = postId;
    if (status) where.status = status;
    // 公开接口默认只返回已批准评论
    if (!req.user && !status) where.status = 'approved';

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: { post: { select: { id: true, title: true, slug: true } } },
      }),
      prisma.comment.count({ where }),
    ]);
    res.json({
      data: comments,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error('[comments:list]', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
}

// POST /api/comments （公开）
async function create(req, res) {
  try {
    const { postId, authorName, email, content } = req.body;
    if (!postId) return res.status(400).json({ error: 'postId is required' });
    if (!authorName) return res.status(400).json({ error: 'authorName is required' });
    if (!content) return res.status(400).json({ error: 'content is required' });

    // 验证文章存在
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comment = await prisma.comment.create({
      data: {
        postId,
        authorName,
        email: email || '',
        content,
        status: 'pending',
      },
    });
    res.status(201).json(comment);
  } catch (err) {
    console.error('[comments:create]', err);
    res.status(500).json({ error: 'Failed to create comment' });
  }
}

// PUT /api/comments/:id （需认证，审核用）
async function update(req, res) {
  try {
    const { status } = req.body;
    if (!status || !['pending', 'approved', 'spam'].includes(status)) {
      return res.status(400).json({ error: 'Valid status required: pending | approved | spam' });
    }
    const comment = await prisma.comment.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(comment);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Comment not found' });
    console.error('[comments:update]', err);
    res.status(500).json({ error: 'Failed to update comment' });
  }
}

// DELETE /api/comments/:id （需认证）
async function remove(req, res) {
  try {
    await prisma.comment.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Comment not found' });
    console.error('[comments:delete]', err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
}

module.exports = { list, create, update, remove };