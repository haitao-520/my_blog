const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/categories
async function list(req, res) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { posts: true } } },
    });
    res.json(categories);
  } catch (err) {
    console.error('[categories:list]', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
}

// GET /api/categories/:slug
async function get(req, res) {
  try {
    const cat = await prisma.category.findUnique({
      where: { slug: req.params.slug },
      include: {
        children: true,
        parent: true,
        _count: { select: { posts: true } },
      },
    });
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    res.json(cat);
  } catch (err) {
    console.error('[categories:get]', err);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
}

// POST /api/categories
async function create(req, res) {
  try {
    const { name, parentId } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const slug = toSlug(name);
    const cat = await prisma.category.create({
      data: { name, slug, parentId: parentId || null },
    });
    res.status(201).json(cat);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Category already exists' });
    console.error('[categories:create]', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
}

// PUT /api/categories/:id
async function update(req, res) {
  try {
    const { name, parentId } = req.body;
    const data = {};
    if (name !== undefined) { data.name = name; data.slug = toSlug(name); }
    if (parentId !== undefined) data.parentId = parentId;
    const cat = await prisma.category.update({ where: { id: req.params.id }, data });
    res.json(cat);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Category not found' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Slug conflict' });
    console.error('[categories:update]', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
}

// DELETE /api/categories/:id
async function remove(req, res) {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Category not found' });
    console.error('[categories:delete]', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
}

function toSlug(s) {
  return s.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

module.exports = { list, get, create, update, remove };