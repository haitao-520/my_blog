const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/tags
async function list(req, res) {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { posts: true } } },
    });
    res.json(tags);
  } catch (err) {
    console.error('[tags:list]', err);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
}

// GET /api/tags/:slug
async function get(req, res) {
  try {
    const tag = await prisma.tag.findUnique({
      where: { slug: req.params.slug },
      include: { _count: { select: { posts: true } } },
    });
    if (!tag) return res.status(404).json({ error: 'Tag not found' });
    res.json(tag);
  } catch (err) {
    console.error('[tags:get]', err);
    res.status(500).json({ error: 'Failed to fetch tag' });
  }
}

// POST /api/tags
async function create(req, res) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const slug = toSlug(name);
    const tag = await prisma.tag.create({ data: { name, slug } });
    res.status(201).json(tag);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Tag already exists' });
    console.error('[tags:create]', err);
    res.status(500).json({ error: 'Failed to create tag' });
  }
}

// PUT /api/tags/:id
async function update(req, res) {
  try {
    const { name } = req.body;
    const data = name !== undefined ? { name, slug: toSlug(name) } : {};
    const tag = await prisma.tag.update({ where: { id: req.params.id }, data });
    res.json(tag);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Tag not found' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Slug conflict' });
    console.error('[tags:update]', err);
    res.status(500).json({ error: 'Failed to update tag' });
  }
}

// DELETE /api/tags/:id
async function remove(req, res) {
  try {
    await prisma.tag.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Tag not found' });
    console.error('[tags:delete]', err);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
}

function toSlug(s) {
  return s.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

module.exports = { list, get, create, update, remove };