const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.stats = async (req, res) => {
  try {
    const [posts, comments, media, categories, tags] = await Promise.all([
      prisma.post.count(),
      prisma.comment.count(),
      prisma.media.count(),
      prisma.category.count(),
      prisma.tag.count({ where: { posts: { some: {} } } }),
    ]);
    res.json({ posts, comments, media, categories, tags });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};