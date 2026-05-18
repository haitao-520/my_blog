const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.stats = async (req, res) => {
  try {
    const [posts, comments, media, categories, tags, siteViewsRow] = await Promise.all([
      prisma.post.count(),
      prisma.comment.count(),
      prisma.media.count(),
      prisma.category.count(),
      prisma.tag.count({ where: { posts: { some: {} } } }),
      prisma.setting.findUnique({ where: { key: 'siteViews' } }),
    ]);
    const siteViews = parseInt(siteViewsRow?.value || '0', 10);
    res.json({ posts, comments, media, categories, tags, siteViews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --------------- 公开统计（无需认证）---------------
exports.publicStats = async (req, res) => {
  try {
    const [posts, comments, siteViewsRow] = await Promise.all([
      prisma.post.count({ where: { status: 'published', visibility: 'public' } }),
      prisma.comment.count({ where: { status: 'approved' } }),
      prisma.setting.findUnique({ where: { key: 'siteViews' } }),
    ]);
    const siteViews = parseInt(siteViewsRow?.value || '0', 10);
    res.json({ posts, comments, siteViews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --------------- 记录站点访问 ---------------
exports.recordSiteView = async (req, res) => {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'siteViews' } });
    const current = parseInt(row?.value || '0', 10);
    await prisma.setting.upsert({
      where: { key: 'siteViews' },
      update: { value: String(current + 1) },
      create: { key: 'siteViews', value: '1' },
    });
    res.json({ siteViews: current + 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};