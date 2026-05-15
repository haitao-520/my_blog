const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// multer 配置
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
// 确保目录存在
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8) + ext;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg|bmp|pdf|mp4|webm|mp3|wav/;
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    cb(null, allowed.test(ext));
  },
});

// GET /api/media
async function list(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const [files, total] = await Promise.all([
      prisma.media.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.media.count(),
    ]);
    res.json({
      data: files,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[media:list]', err);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
}

// POST /api/media
const uploadSingle = upload.single('file');

async function create(req, res) {
  uploadSingle(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large (max 10MB)' });
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
      const record = await prisma.media.create({
        data: {
          filename: req.file.filename,
          url: '/uploads/' + req.file.filename,
          alt: req.body.alt || null,
        },
      });
      res.status(201).json(record);
    } catch (e) {
      console.error('[media:create]', e);
      res.status(500).json({ error: 'Failed to save media record' });
    }
  });
}

// DELETE /api/media/:id
async function remove(req, res) {
  try {
    const media = await prisma.media.findUnique({ where: { id: req.params.id } });
    if (!media) return res.status(404).json({ error: 'Media not found' });

    // 删除物理文件
    const filePath = path.join(UPLOADS_DIR, media.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.media.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Media not found' });
    console.error('[media:delete]', err);
    res.status(500).json({ error: 'Failed to delete media' });
  }
}

module.exports = { list, create, remove };